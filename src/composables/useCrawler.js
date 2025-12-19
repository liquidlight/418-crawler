import { ref, computed, watch, markRaw, shallowRef } from 'vue'
import { Crawler } from '../services/crawler.js'
import { useDatabase } from './useDatabase.js'
import { useJsonStorage } from './useJsonStorage.js'
import { normalizeUrl } from '../utils/url.js'

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
  }
}

export function useCrawler() {
  const db = useDatabase()
  const jsonStorage = useJsonStorage()
  let crawlerInstance = null
  let autoSaveInterval = null

  const crawlState = ref({ ...DEFAULT_CRAWL_STATE })

  const pages = shallowRef([])
  const error = ref(null)
  const isInitialized = ref(false)
  const isStopping = ref(false)

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
      stats: { ...state.stats }
    }
  }

  /**
   * Initialize the crawler
   */
  async function initialize() {
    try {
      await db.init()
      isInitialized.value = true

      // Try to load previous crawl state
      const savedState = await db.getCrawlState()
      if (savedState && savedState.rootUrl) {
        updateCrawlState(savedState)
        await loadPages()
      }
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
      error.value = null
      isStopping.value = false
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
   * Auto-save crawl progress to JSON every 30 seconds
   */
  function startAutoSave(interval = 30000) {
    // Clear any existing interval
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval)
    }

    autoSaveInterval = setInterval(async () => {
      try {
        const data = await db.exportData()
        jsonStorage.autoSaveToStorage(data)
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
   * Load crawl from saved JSON file (for resume functionality)
   */
  async function loadFromFile(file) {
    try {
      const data = await jsonStorage.loadFromFile(file)

      // Clear current crawl
      await db.clearAll()

      // Restore pages and state
      if (data.pages && Array.isArray(data.pages)) {
        for (const page of data.pages) {
          await db.savePage(page)
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
      crawledAt: null
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

    // Stop auto-save and do final save
    stopAutoSave()
    try {
      const data = await db.exportData()
      jsonStorage.autoSaveToStorage(data)
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

    // Methods
    initialize,
    startCrawl,
    pauseCrawl,
    resumeCrawl,
    stopCrawl,
    resetCrawl,
    loadPages,
    exportResults,
    loadFromFile,
    saveToFile,
    startAutoSave,
    stopAutoSave,
    getPageByUrl,
    getPagesByStatus,
    getPagesByFileType
  }
}
