import { ref, computed, watch, markRaw, shallowRef } from 'vue'
import { Crawler } from '../services/crawler.js'
import { useDatabase } from './useDatabase.js'

export function useCrawler() {
  const db = useDatabase()
  let crawlerInstance = null

  // Reactive state
  const crawlState = ref({
    isActive: false,
    isPaused: false,
    rootUrl: '',
    baseDomain: '',
    queueSize: 0,
    visitedCount: 0,
    inProgressCount: 0,
    totalTime: 0,
    stats: {
      pagesFound: 0,
      pagesCrawled: 0,
      queueSize: 0,
      errors: 0
    }
  })

  const pages = shallowRef([])
  const error = ref(null)
  const isInitialized = ref(false)

  // Computed properties
  const statusCounts = computed(() => {
    const counts = {}
    pages.value.forEach(page => {
      const code = page.statusCode
      counts[code] = (counts[code] || 0) + 1
    })
    return counts
  })

  const fileTypeCounts = computed(() => {
    const counts = {}
    pages.value.forEach(page => {
      const type = page.fileType
      counts[type] = (counts[type] || 0) + 1
    })
    return counts
  })

  const queueUrls = computed(() => {
    return crawlerInstance ? crawlerInstance.getQueueUrls() : []
  })

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
        // Restore the crawl state - only copy primitive properties to avoid circular refs
        crawlState.value = {
          isActive: savedState.isActive || false,
          isPaused: savedState.isPaused || false,
          rootUrl: savedState.rootUrl || '',
          baseDomain: savedState.baseDomain || '',
          queueSize: savedState.queueSize || 0,
          visitedCount: savedState.visitedCount || 0,
          inProgressCount: savedState.inProgressCount || 0,
          totalTime: savedState.totalTime || 0,
          stats: {
            pagesFound: savedState.stats?.pagesFound || 0,
            pagesCrawled: savedState.stats?.pagesCrawled || 0,
            queueSize: savedState.stats?.queueSize || 0,
            errors: savedState.stats?.errors || 0
          }
        }
        // Load the saved pages
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

      // Start crawling
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
      crawlerInstance.stop()
      crawlState.value.isActive = false
      await db.saveCrawlState(crawlerInstance.getSaveableState())
    }
  }

  /**
   * Reset the crawler
   */
  async function resetCrawl() {
    try {
      await db.clearAll()
      pages.value = []  // Reset pages array
      crawlState.value = {
        isActive: false,
        isPaused: false,
        rootUrl: '',
        baseDomain: '',
        queueSize: 0,
        visitedCount: 0,
        inProgressCount: 0,
        totalTime: 0,
        stats: {
          pagesFound: 0,
          pagesCrawled: 0,
          queueSize: 0,
          errors: 0
        }
      }
      crawlerInstance = null
      error.value = null
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
   * Handle progress updates
   */
  async function handleProgress(state) {
    crawlState.value = {
      isActive: state.isActive,
      isPaused: state.isPaused,
      rootUrl: state.rootUrl,
      baseDomain: state.baseDomain,
      queueSize: state.queueSize,
      visitedCount: state.visitedCount,
      inProgressCount: state.inProgressCount,
      totalTime: state.totalTime,
      stats: { ...state.stats }
    }
    await db.saveCrawlState(crawlerInstance.getSaveableState())
  }

  /**
   * Handle page processed event
   */
  async function handlePageProcessed(page) {
    // Check if this is a URL discovery event
    if (page.type === 'url-discovered') {
      addDiscoveredUrl(page.url, page.depth)
    }
    // Check if this is an in-link update
    else if (page.type === 'inlink-update') {
      await db.addInLink(page.toUrl, page.fromUrl)
      // Reload the page from database to get updated inLinks
      const updatedPage = await db.getPage(page.toUrl)
      if (updatedPage) {
        const existingIndex = pages.value.findIndex(p => p.url === page.toUrl)
        if (existingIndex >= 0) {
          const updated = [...pages.value]
          updated[existingIndex] = markRaw(updatedPage)
          pages.value = updated
        }
      }
    }
    // Regular page crawled
    else {
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
   * Add a discovered URL (pending crawl) to the pages list
   */
  function addDiscoveredUrl(url, depth = 0) {
    // Check if URL already exists in pages
    const exists = pages.value.find(p => p.url === url)
    if (exists) return

    // Create a pending page placeholder
    const pendingPage = {
      url,
      normalizedUrl: url,
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
      isCrawled: false,  // Mark as not yet crawled
      isExternal: false,
      depth,
      crawledAt: null
    }

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
    crawlState.value = {
      isActive: state.isActive,
      isPaused: state.isPaused,
      rootUrl: state.rootUrl,
      baseDomain: state.baseDomain,
      queueSize: state.queueSize,
      visitedCount: state.visitedCount,
      inProgressCount: state.inProgressCount,
      totalTime: state.totalTime,
      stats: { ...state.stats }
    }
    await db.saveCrawlState(crawlerInstance.getSaveableState())
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
    getPageByUrl,
    getPagesByStatus,
    getPagesByFileType
  }
}
