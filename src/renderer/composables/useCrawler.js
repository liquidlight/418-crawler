import { ref, computed, watch, markRaw, shallowRef } from 'vue'
import { Crawler } from '../services/crawler.js'
import { useDatabase } from './useDatabase.js'
import { useJsonStorage } from './useJsonStorage.js'
import { normalizeUrl } from '../utils/url.js'
import { exportPagesToCSV, generateCSVFileName } from '../utils/csvExport.js'

const DEFAULT_CRAWL_STATE = {
  isActive: false,
  isPaused: false,
  rootUrl: '',
  baseDomain: '',
  queueSize: 0,
  visitedCount: 0,
  inProgressCount: 0,
  startTime: 0,
  totalTime: 0,
  stats: {
    pagesFound: 0,
    pagesCrawled: 0,
    queueSize: 0,
    errors: 0
  },
  pageProgress: []
}

export function useCrawler() {
  const db = useDatabase()
  const jsonStorage = useJsonStorage()
  let crawlerInstance = null
  let autoSaveInterval = null
  let currentCrawlId = null
  let processOrder = 0  // Track the order pages are processed

  const crawlState = ref({ ...DEFAULT_CRAWL_STATE })

  const pages = shallowRef([])
  const error = ref(null)
  const isInitialized = ref(false)
  const isStopping = ref(false)
  const savedCrawlsList = ref([])

  // Computed properties
  const statusCounts = computed(() => {
    const counts = {}
    pages.value.forEach(page => {
      const code = page.statusCode
      // Only count crawled pages with actual status codes (not pending pages with null)
      if (code !== null && code !== undefined) {
        const count = counts[code] || 0
        counts[code] = count + 1
      }
    })
    // Create a completely new plain object with no reactive proxies
    const plainCounts = {}
    for (const key in counts) {
      plainCounts[key] = Number(counts[key])
    }
    return plainCounts
  })

  const fileTypeCounts = computed(() => {
    const counts = {}
    pages.value.forEach(page => {
      const type = page.fileType
      if (type) {
        const count = counts[type] || 0
        counts[type] = count + 1
      }
    })
    // Create a completely new plain object with no reactive proxies
    const plainCounts = {}
    for (const key in counts) {
      plainCounts[key] = Number(counts[key])
    }
    return plainCounts
  })

  const queueUrls = computed(() => {
    return crawlerInstance ? crawlerInstance.getQueueUrls() : []
  })

  const isBackoffMaxReached = computed(() => {
    return crawlState.value.backoffState?.maxBackoffReached === true
  })

  function updateCrawlState(state) {
    crawlState.value = {
      isActive: state.isActive || false,
      isPaused: state.isPaused || false,
      rootUrl: state.rootUrl || '',
      baseDomain: state.baseDomain || '',
      queueSize: state.queueSize || 0,
      visitedCount: state.visitedCount || 0,
      inProgressCount: state.inProgressCount || 0,
      startTime: state.startTime || 0,
      totalTime: state.totalTime || 0,
      stats: { ...state.stats },
      pageProgress: state.pageProgress || []
    }
  }

  /**
   * Initialize the crawler
   */
  async function initialize() {
    try {
      await db.init()
      isInitialized.value = true

      // Load saved crawls list (for manual resumption via Previous Crawls)
      refreshSavedCrawlsList()

      // Always start with a fresh state, never auto-restore previous crawl
      // Users can manually resume from "Previous Crawls" section if desired
      crawlState.value = { ...DEFAULT_CRAWL_STATE }
    } catch (e) {
      error.value = e.message
      console.error('Failed to initialize crawler:', e)
    }
  }

  /**
   * Start a new crawl
   */
  async function startCrawl(url) {
    try {
      error.value = null

      // Validate URL
      if (!url || typeof url !== 'string') {
        throw new Error('Please enter a valid URL')
      }

      const urlStr = url.trim()
      if (urlStr.length === 0) {
        throw new Error('URL cannot be empty')
      }

      // Try to parse the URL (with protocol if missing)
      let testUrl = urlStr
      if (!testUrl.match(/^https?:\/\//i)) {
        testUrl = 'https://' + testUrl
      }
      // Upgrade http:// to https:// for proxy compatibility
      else if (testUrl.match(/^http:\/\//i)) {
        testUrl = 'https:' + testUrl.substring(5)
      }

      try {
        new URL(testUrl)
      } catch (e) {
        throw new Error(`Invalid URL: "${urlStr}" - ${e.message}`)
      }

      // Clear previous data
      await db.clearAll()
      await loadPages()

      // Create new crawler instance
      crawlerInstance = new Crawler(url, {
        maxConcurrent: 5,
        requestDelay: 100,
        requestTimeout: 30000,
        onProgress: handleProgress,
        onPageProcessed: handlePageProcessed,
        onError: handleError,
        onComplete: handleComplete
      })

      // Generate unique crawl ID for this session
      const baseDomain = crawlerInstance.getSaveableState().baseDomain
      currentCrawlId = `${baseDomain}-${Date.now()}`

      // Save initial state
      await db.saveCrawlState(crawlerInstance.getSaveableState())

      // Start auto-save (every 30 seconds)
      startAutoSave(30000)

      // Start crawling
      isStopping.value = false
      crawlerInstance.start()
    } catch (e) {
      error.value = e.message
      console.error('Failed to start crawl:', e)
    }
  }

  /**
   * Pause the crawl
   */
  async function pauseCrawl() {
    if (crawlerInstance && crawlState.value.isActive) {
      crawlerInstance.pause()
      crawlState.value.isPaused = true
      await db.saveCrawlState(crawlerInstance.getSaveableState())
      await saveProgress()
    }
  }

  /**
   * Resume the crawl
   */
  async function resumeCrawl() {
    if (crawlerInstance && crawlState.value.isPaused) {
      crawlerInstance.resume()
      crawlState.value.isPaused = false
      await db.saveCrawlState(crawlerInstance.getSaveableState())
      crawlerInstance.start()
    }
  }

  /**
   * Stop the crawl
   */
  async function stopCrawl() {
    if (crawlerInstance && crawlState.value.isActive) {
      isStopping.value = true
      crawlerInstance.stop()
      // We don't manually set isActive=false here, we let handleProgress do it
      // masking the actual winding-down state of the crawler
      await db.saveCrawlState(crawlerInstance.getSaveableState())
      await saveProgress()
    }
  }

  /**
   * Continue crawling despite backoff max being reached, or resume processing pending URLs
   */
  async function continueAnyway() {
    if (!crawlerInstance) {
      error.value = 'No crawler instance available'
      return
    }

    // If we're in backoff mode, cancel it and resume
    if (isBackoffMaxReached.value) {
      crawlerInstance.backoffManager.cancelBackoff()
      await resumeCrawl()
      return
    }

    // If crawler is not active but has pending URLs, restart it
    if (!crawlState.value.isActive) {
      try {
        // Load all uncrawled pages (pending URLs)
        const uncrawledPages = await db.getUncrawledPages()

        console.log(`Found ${uncrawledPages?.length || 0} uncrawled pages`)
        console.log(`Queue size before: ${crawlerInstance.state.queue.length}`)
        console.log(`Visited set size before: ${crawlerInstance.state.visited.size}`)

        if (uncrawledPages && uncrawledPages.length > 0) {
          // Add pending URLs back to the crawler queue
          let queuedCount = 0
          const internalUncrawled = uncrawledPages.filter(p => !p.isExternal)
          console.log(`Internal uncrawled pages: ${internalUncrawled.length}`)

          // Build a set of URLs being re-queued for quick lookup
          const requeuingUrls = new Set(internalUncrawled.map(p => p.url))

          internalUncrawled.forEach(page => {
            // Remove from visited set so it can be queued again
            crawlerInstance.state.visited.delete(page.url)
            crawlerInstance.state.addToQueue(page.url, page.depth || 0)
            queuedCount++
          })

          // Also update the pages in memory to mark them as not crawled
          const updatedPages = pages.value.map(page => {
            if (requeuingUrls.has(page.url)) {
              return markRaw({
                ...page,
                isCrawled: false,
                statusCode: null,
                title: null,
                contentType: null,
                fileType: null,
                redirectUrl: null,
                responseTime: null
              })
            }
            return page
          })
          pages.value = updatedPages

          // Save the reset pages back to the database to keep in sync
          for (const page of updatedPages) {
            if (requeuingUrls.has(page.url)) {
              await db.savePage(page)
            }
          }

          console.log(`Re-queued ${queuedCount} internal pending URLs for processing`)
          console.log(`Queue size after: ${crawlerInstance.state.queue.length}`)
          console.log(`Visited set size after: ${crawlerInstance.state.visited.size}`)

          // Ensure crawler state is reset before restarting
          console.log(`Crawler isActive before restart: ${crawlerInstance.state.isActive}`)
          if (crawlerInstance.state.isActive) {
            console.warn('Crawler isActive is true, resetting to false')
            crawlerInstance.state.isActive = false
          }
        }

        isStopping.value = false
        console.log('Starting crawler...')

        // Start auto-save if it's not already running
        startAutoSave(30000)

        await crawlerInstance.start()
      } catch (e) {
        error.value = 'Failed to continue crawl: ' + e.message
        console.error('Error in continueAnyway:', e)
      }
    }
  }

  /**
   * Reset the crawler
   */
  async function resetCrawl() {
    try {
      stopAutoSave()
      await db.clearAll()
      pages.value = []
      crawlState.value = { ...DEFAULT_CRAWL_STATE }
      crawlerInstance = null
      currentCrawlId = null
      error.value = null
      isStopping.value = false
      processOrder = 0  // Reset process order counter
    } catch (e) {
      error.value = e.message
      console.error('Failed to reset crawl:', e)
    }
  }

  /**
   * Load pages from database
   */
  async function loadPages() {
    try {
      const loadedPages = await db.getAllPages()
      const markedPages = loadedPages.map(p => markRaw(p))
      pages.value = markedPages
    } catch (e) {
      console.error('Failed to load pages:', e)
    }
  }

  /**
   * Export crawl results
   */
  async function exportResults() {
    try {
      return await db.exportData()
    } catch (e) {
      error.value = e.message
      console.error('Failed to export results:', e)
    }
  }

  /**
   * Auto-save crawl progress to app storage every 30 seconds
   */
  function startAutoSave(interval = 30000) {
    // Clear any existing interval
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval)
    }

    autoSaveInterval = setInterval(async () => {
      try {
        const data = await db.exportData()
        // Save to app's internal storage with registry, using the same crawl ID
        jsonStorage.saveCrawlToAppStorage(data, currentCrawlId)
      } catch (e) {
        console.warn('Auto-save failed:', e)
      }
    }, interval)
  }

  /**
   * Stop auto-saving
   */
  function stopAutoSave() {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval)
      autoSaveInterval = null
    }
  }

  /**
   * Manually save progress to app storage
   */
  async function saveProgress() {
    try {
      const data = await db.exportData()
      const result = jsonStorage.saveCrawlToAppStorage(data, currentCrawlId)
      if (result.success) {
        refreshSavedCrawlsList()
      }
      return result
    } catch (e) {
      console.warn('Save progress failed:', e)
      return { success: false, error: e.message }
    }
  }

  /**
   * Load crawl from saved JSON file (for resume functionality)
   */
  async function loadFromFile(file) {
    try {
      const data = await jsonStorage.loadFromFile(file)

      // Clear current crawl
      await db.clearAll()

      // Restore pages and state in parallel batches
      if (data.pages && Array.isArray(data.pages)) {
        const batchSize = 100
        for (let i = 0; i < data.pages.length; i += batchSize) {
          const batch = data.pages.slice(i, i + batchSize)
          await Promise.all(batch.map(page => db.savePage(page)))
        }
      }

      if (data.crawlState) {
        await db.saveCrawlState(data.crawlState)
        updateCrawlState(data.crawlState)
      }

      await loadPages()
      return { success: true }
    } catch (e) {
      error.value = e.message
      console.error('Failed to load from file:', e)
      return { success: false, error: e.message }
    }
  }

  /**
   * Load crawl from app storage registry by ID
   */
  async function loadFromAppStorage(crawlId) {
    try {
      const data = jsonStorage.loadCrawlFromAppStorage(crawlId)
      if (!data) {
        throw new Error('Crawl not found')
      }

      // Clear current crawl
      await db.clearAll()

      // Restore pages and state in parallel batches
      if (data.pages && Array.isArray(data.pages)) {
        const batchSize = 100
        for (let i = 0; i < data.pages.length; i += batchSize) {
          const batch = data.pages.slice(i, i + batchSize)
          await Promise.all(batch.map(page => db.savePage(page)))
        }
      }

      if (data.crawlState) {
        await db.saveCrawlState(data.crawlState)
        updateCrawlState(data.crawlState)
      }

      await loadPages()
      return { success: true }
    } catch (e) {
      error.value = e.message
      console.error('Failed to load from app storage:', e)
      return { success: false, error: e.message }
    }
  }

  /**
   * Refresh the saved crawls list from storage
   */
  function refreshSavedCrawlsList() {
    savedCrawlsList.value = jsonStorage.listSavedCrawls()
  }

  /**
   * Get list of saved crawls from registry
   */
  function getSavedCrawls() {
    return savedCrawlsList.value
  }

  /**
   * Delete a crawl from app storage
   */
  function deleteSavedCrawl(crawlId) {
    const result = jsonStorage.removeFromRegistry(crawlId)
    if (result) {
      refreshSavedCrawlsList()
    }
    return result
  }

  /**
   * Save current crawl to downloadable JSON file
   */
  async function saveToFile(fileName = null) {
    try {
      const data = await db.exportData()
      const result = jsonStorage.saveToFile(data, fileName)
      return result
    } catch (e) {
      error.value = e.message
      console.error('Failed to save to file:', e)
      return { success: false, error: e.message }
    }
  }

  /**
   * Export filtered pages as CSV
   */
  function exportFilteredResults(filteredPages, filterDescription = '') {
    try {
      const domain = crawlState.value.baseDomain || 'unknown'
      const fileName = generateCSVFileName(domain, filterDescription)
      const result = exportPagesToCSV(filteredPages, fileName)
      return result
    } catch (e) {
      error.value = e.message
      console.error('Failed to export filtered results:', e)
      return { success: false, error: e.message }
    }
  }

  /**
   * Handle progress updates
   */
  async function handleProgress(state) {
    // If we are in the process of stopping, force UI to show stopped
    if (isStopping.value) {
      state.isActive = false
    }
    updateCrawlState(state)
    await db.saveCrawlState(crawlerInstance.getSaveableState())
  }

  /**
   * Handle page processed event
   */
  async function handlePageProcessed(page) {
    // Handle request for orphaned URLs (internal URLs with null statusCode)
    if (page.type === 'get-orphaned-urls') {
      const uncrawledPages = await db.getUncrawledPages()
      // Filter to only internal pages with null status code
      const orphanedUrls = uncrawledPages
        .filter(p => !p.isExternal && p.statusCode === null)
        .map(p => p.url)

      console.debug(`Found ${orphanedUrls.length} orphaned internal URLs in database`)

      if (page.callback) {
        page.callback(orphanedUrls)
      }
      return
    }

    // Check if this is a URL discovery event
    if (page.type === 'url-discovered') {
      await addDiscoveredUrl(page.url, page.depth, page.isExternal)
    }
    // Check if this is an in-link update
    else if (page.type === 'inlink-update') {
      await db.addInLink(page.toUrl, page.fromUrl, crawlState.value.baseDomain, crawlState.value.rootUrl)
      // Reload the page from database to get updated inLinks
      // Use normalizeUrl(page.toUrl) because addInLink uses that as the key
      const lookupUrl = normalizeUrl(page.toUrl) || page.toUrl
      const updatedPage = await db.getPage(lookupUrl)
      if (updatedPage) {
        const existingIndex = pages.value.findIndex(p => p.url === updatedPage.url)
        if (existingIndex >= 0) {
          const updated = [...pages.value]
          updated[existingIndex] = markRaw(updatedPage)
          pages.value = updated
        }
      }
    }
    // Regular page crawled
    else {
      // Check if this page already exists in the database (e.g., was discovered before)
      const existingPage = await db.getPage(page.url)

      // Preserve any existing inLinks that were added via inlink-update events
      if (existingPage && existingPage.inLinks && existingPage.inLinks.length > 0) {
        page.inLinks = existingPage.inLinks
      }

      // Preserve or set processOrder
      if (existingPage && existingPage.processOrder) {
        page.processOrder = existingPage.processOrder
      } else if (!page.processOrder) {
        page.processOrder = ++processOrder  // Assign order if not already set
      }

      // Save page to database
      await db.savePage(page)

      // Add to pages array - use markRaw to prevent circular references in reactivity
      const existingIndex = pages.value.findIndex(p => p.url === page.url)

      if (existingIndex >= 0) {
        const updated = [...pages.value]
        updated[existingIndex] = markRaw(page)
        pages.value = updated
      } else {
        pages.value = [...pages.value, markRaw(page)]
      }
    }
  }

  /**
   * Add a discovered URL (pending crawl) to the pages list and database
   */
  async function addDiscoveredUrl(url, depth = 0, isExternal = false) {
    const normalizedUrl = normalizeUrl(url) || url

    // Check if URL already exists in pages (by canonical url)
    const exists = pages.value.find(p => p.url === normalizedUrl)
    if (exists) return

    // Create a pending page placeholder
    const pendingPage = {
      url: normalizedUrl, // Use normalized as canonical URL
      normalizedUrl,
      domain: crawlState.value.baseDomain || '',
      statusCode: null,
      title: '(pending)',
      metaDescription: '',
      h1: '',
      fileType: 'html',
      contentType: '',
      responseTime: 0,
      size: 0,
      outLinks: [],
      inLinks: [],
      externalLinks: [],
      assets: [],
      // All discovered links (internal and external) should be crawled to get status codes
      // Mark as not crawled so they will be fetched and processed
      isCrawled: false,
      isExternal: isExternal,  // Use the passed isExternal value
      depth,
      crawledAt: null,
      processOrder: ++processOrder  // Track order of discovery
    }

    // Save to database so orphaned URL detection can find it
    await db.savePage(pendingPage)

    pages.value = [...pages.value, markRaw(pendingPage)]
  }

  /**
   * Handle error events
   */
  function handleError(err) {
    error.value = err.message || 'An error occurred during crawling'
    console.error('Crawl error:', err)
  }

  /**
   * Handle crawl complete event
   */
  async function handleComplete(state) {
    isStopping.value = false
    updateCrawlState(state)
    await db.saveCrawlState(crawlerInstance.getSaveableState())

    // Stop auto-save and do final save to app storage
    stopAutoSave()
    try {
      const data = await db.exportData()
      jsonStorage.saveCrawlToAppStorage(data, currentCrawlId)
    } catch (e) {
      console.warn('Final auto-save failed:', e)
    }
  }

  /**
   * Get page by URL
   */
  async function getPageByUrl(url) {
    return await db.getPage(url)
  }

  /**
   * Get pages by status code
   */
  async function getPagesByStatus(statusCode) {
    return await db.getPagesByStatus(statusCode)
  }

  /**
   * Get pages by file type
   */
  async function getPagesByFileType(fileType) {
    return await db.getPagesByFileType(fileType)
  }

  /**
   * Re-queue a page for processing (remove from results and add back to pending)
   */
  async function requeuePage(url) {
    try {
      const normalizedUrl = normalizeUrl(url) || url

      // Find the page in the pages array
      const pageIndex = pages.value.findIndex(p => p.url === normalizedUrl)
      if (pageIndex === -1) {
        throw new Error('Page not found')
      }

      const page = pages.value[pageIndex]

      // Create a new page object with crawled state reset
      const reQueuedPage = {
        ...page,
        isCrawled: false,
        statusCode: null,
        title: null,
        contentType: null,
        fileType: null,
        redirectUrl: null,
        responseTime: null
      }

      // Update in database
      await db.savePage(reQueuedPage)

      // Update in pages array
      const updated = [...pages.value]
      updated[pageIndex] = markRaw(reQueuedPage)
      pages.value = updated

      // Add back to crawler queue if crawler is running
      if (crawlerInstance && crawlerInstance.state) {
        // Remove from visited set so it can be queued again
        crawlerInstance.state.visited.delete(normalizedUrl)
        crawlerInstance.state.addToQueue(normalizedUrl, 0)
      }

      return reQueuedPage
    } catch (e) {
      error.value = e.message
      console.error('Failed to re-queue page:', e)
      throw e
    }
  }

  // Auto-save state periodically when crawling
  watch(
    () => crawlState.value.visitedCount,
    async () => {
      if (crawlerInstance && crawlState.value.isActive) {
        await db.saveCrawlState(crawlerInstance.getSaveableState())
      }
    }
  )

  return {
    // State
    crawlState,
    pages,
    error,
    isInitialized,

    // Computed
    statusCounts,
    fileTypeCounts,
    queueUrls,
    isBackoffMaxReached,

    // Methods
    initialize,
    startCrawl,
    pauseCrawl,
    resumeCrawl,
    stopCrawl,
    continueAnyway,
    resetCrawl,
    loadPages,
    exportResults,
    saveProgress,
    loadFromFile,
    loadFromAppStorage,
    saveToFile,
    exportFilteredResults,
    startAutoSave,
    stopAutoSave,
    getSavedCrawls,
    deleteSavedCrawl,
    getPageByUrl,
    getPagesByStatus,
    getPagesByFileType,
    requeuePage
  }
}
