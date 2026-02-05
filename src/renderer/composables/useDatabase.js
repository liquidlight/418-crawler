import { ref } from 'vue'
import { isSameDomain, normalizeUrl } from '../utils/url.js'

/**
 * Composable for managing crawl data using localStorage as a buffer
 * Pages are stored in-memory cache during crawl, then flushed to localStorage explicitly
 */
export function useDatabase() {
  const isInitialized = ref(false)
  const error = ref(null)
  const PAGES_KEY = 'crawl-pages-buffer'
  const STATE_KEY = 'crawl-state-buffer'

  // In-memory cache to avoid parse/stringify per operation
  let pagesCache = []

  /**
   * Initialize the buffer (load cache from localStorage)
   */
  async function init() {
    try {
      // Load pages from localStorage into cache on init
      const stored = localStorage.getItem(PAGES_KEY)
      pagesCache = stored ? JSON.parse(stored) : []
      isInitialized.value = true
      error.value = null
    } catch (e) {
      error.value = e.message
      console.error('Failed to initialize storage:', e)
      throw e
    }
  }

  /**
   * Save a page to the in-memory cache (NOT to localStorage yet)
   */
  async function savePage(page) {
    try {
      const pageData = page.toJSON ? page.toJSON() : page
      // Ensure normalizedUrl is present
      if (!pageData.normalizedUrl) {
        pageData.normalizedUrl = normalizeUrl(pageData.url) || pageData.url
      }

      // Update or add page in cache
      const index = pagesCache.findIndex(p => p.normalizedUrl === pageData.normalizedUrl)
      if (index >= 0) {
        pagesCache[index] = pageData
      } else {
        pagesCache.push(pageData)
      }

      return pageData.normalizedUrl
    } catch (e) {
      console.error('Error saving page:', e)
      throw e
    }
  }

  /**
   * Get a page from the cache by URL
   */
  async function getPage(url) {
    const normalized = normalizeUrl(url) || url
    return pagesCache.find(p => p.normalizedUrl === normalized) || null
  }

  /**
   * Get all pages from the cache
   */
  async function getAllPages() {
    return pagesCache
  }

  /**
   * Internal: Get pages cache (no localStorage read)
   */
  function getPageBuffer() {
    return pagesCache
  }

  /**
   * Flush cache to localStorage (called explicitly)
   * Handles quota exceeded by keeping only recent pages
   */
  async function flushToStorage() {
    try {
      const fullJson = JSON.stringify(pagesCache)

      try {
        localStorage.setItem(PAGES_KEY, fullJson)
        return true
      } catch (quotaError) {
        if (quotaError.name === 'QuotaExceededError') {
          // If full save fails, keep only the most recent pages
          console.warn(`Storage quota exceeded. Keeping last 500 of ${pagesCache.length} pages`)

          const recentPages = pagesCache.slice(-500)
          const recentJson = JSON.stringify(recentPages)
          localStorage.setItem(PAGES_KEY, recentJson)
          return true
        }
        throw quotaError
      }
    } catch (e) {
      console.error('Error flushing pages to storage:', e)
      throw e
    }
  }

  /**
   * Get pages by index (filter by property)
   */
  async function getPagesByIndex(indexName, value) {
    const pages = getPageBuffer()
    return pages.filter(p => p[indexName] === value)
  }

  /**
   * Delete a page from the cache
   */
  async function deletePage(url) {
    const normalized = normalizeUrl(url) || url
    pagesCache = pagesCache.filter(p => p.normalizedUrl !== normalized)
    return true
  }

  /**
   * Clear all pages from the cache
   */
  async function clearPages() {
    pagesCache = []
    return true
  }

  /**
   * Add an in-link to a page
   * Creates the page entry if it doesn't exist
   */
  async function addInLink(toUrl, fromUrl, baseDomain = '', rootUrl = '') {
    const normalizedTo = normalizeUrl(toUrl) || toUrl
    const normalizedFrom = normalizeUrl(fromUrl) || fromUrl

    let page = pagesCache.find(p => p.normalizedUrl === normalizedTo)
    if (!page) {
      // Determine if this URL is external using actual root URL for consistency
      // Use the actual root URL from crawler state instead of reconstructing it
      const baseUrlForCheck = rootUrl || (baseDomain ? `https://${baseDomain}` : fromUrl)
      const isExternal = !isSameDomain(normalizedTo, baseUrlForCheck, baseDomain)

      // Create a new placeholder page
      page = {
        url: normalizedTo, // Use normalized as canonical URL to match crawler behavior
        normalizedUrl: normalizedTo,
        domain: baseDomain,
        statusCode: null,
        isCrawled: false,
        isExternal,
        inLinks: [normalizedFrom],
        outLinks: [],
        externalLinks: [],
        assets: []
      }
      pagesCache.push(page)
    } else {
      // Add to existing page's in-links
      if (!page.inLinks) page.inLinks = []
      if (!page.inLinks.includes(normalizedFrom)) {
        page.inLinks.push(normalizedFrom)
      }
    }

    return normalizedTo
  }

  /**
   * Add multiple in-links in a batch (for performance)
   * Updates all toUrls with fromUrl in a single pass
   */
  async function addInLinksBatch(fromUrl, toUrls, baseDomain = '', rootUrl = '') {
    const normalizedFrom = normalizeUrl(fromUrl) || fromUrl
    const changedPages = []

    for (const toUrl of toUrls) {
      const normalizedTo = normalizeUrl(toUrl) || toUrl

      let page = pagesCache.find(p => p.normalizedUrl === normalizedTo)
      if (!page) {
        // Determine if this URL is external
        const baseUrlForCheck = rootUrl || (baseDomain ? `https://${baseDomain}` : fromUrl)
        const isExternal = !isSameDomain(normalizedTo, baseUrlForCheck, baseDomain)

        // Create a new placeholder page
        page = {
          url: normalizedTo,
          normalizedUrl: normalizedTo,
          domain: baseDomain,
          statusCode: null,
          isCrawled: false,
          isExternal,
          inLinks: [normalizedFrom],
          outLinks: [],
          externalLinks: [],
          assets: []
        }
        pagesCache.push(page)
        changedPages.push(normalizedTo)
      } else {
        // Add to existing page's in-links
        if (!page.inLinks) page.inLinks = []
        if (!page.inLinks.includes(normalizedFrom)) {
          page.inLinks.push(normalizedFrom)
          changedPages.push(normalizedTo)
        }
      }
    }

    return changedPages
  }

  /**
   * Save crawler state to buffer
   */
  async function saveCrawlState(state) {
    try {
      const stateData = state.toJSON ? state.toJSON() : state
      localStorage.setItem(STATE_KEY, JSON.stringify(stateData))
      return true
    } catch (e) {
      console.error('Error saving crawl state:', e)
      throw e
    }
  }

  /**
   * Get crawler state from buffer
   */
  async function getCrawlState() {
    try {
      const data = localStorage.getItem(STATE_KEY)
      if (data) {
        const state = JSON.parse(data)
        return {
          id: state.id,
          rootUrl: state.rootUrl,
          baseDomain: state.baseDomain,
          isActive: state.isActive,
          isPaused: state.isPaused,
          queueSize: state.queueSize,
          visitedCount: state.visitedCount,
          inProgressCount: state.inProgressCount,
          totalTime: state.totalTime,
          stats: state.stats
        }
      }
      return null
    } catch (e) {
      console.warn('Error reading crawl state:', e)
      return null
    }
  }

  /**
   * Delete crawler state (reset crawl)
   */
  async function deleteCrawlState() {
    localStorage.removeItem(STATE_KEY)
    return true
  }

  /**
   * Get all pages count
   */
  async function getPagesCount() {
    const pages = getPageBuffer()
    return pages.length
  }

  /**
   * Clear entire buffer (all pages and state)
   */
  async function clearAll() {
    pagesCache = []
    localStorage.removeItem(PAGES_KEY)
    localStorage.removeItem(STATE_KEY)
    return true
  }

  /**
   * Export all data as JSON
   */
  async function exportData() {
    const pages = await getAllPages()
    const state = await getCrawlState()
    return {
      pages,
      crawlState: state,
      exportedAt: new Date().toISOString()
    }
  }

  /**
   * Get pages by status code
   */
  async function getPagesByStatus(statusCode) {
    const allPages = await getAllPages()
    return allPages.filter(p => p.statusCode === statusCode)
  }

  /**
   * Get pages by file type
   */
  async function getPagesByFileType(fileType) {
    return await getPagesByIndex('fileType', fileType)
  }

  /**
   * Get uncrawled pages
   */
  async function getUncrawledPages() {
    const allPages = await getAllPages()
    return allPages.filter(p => p.isCrawled === false)
  }

  /**
   * Flush buffer to registry (called periodically during crawl)
   */
  async function flushToRegistry(registrySaveFunction) {
    try {
      const data = await exportData()
      const result = registrySaveFunction(data)
      if (result.success) {
        // Clear the cache and localStorage after successful flush
        pagesCache = []
        localStorage.removeItem(PAGES_KEY)
        localStorage.removeItem(STATE_KEY)
      }
      return result
    } catch (e) {
      console.error('Error flushing to registry:', e)
      throw e
    }
  }

  return {
    isInitialized,
    error,
    init,
    savePage,
    getPage,
    getAllPages,
    getPagesByIndex,
    deletePage,
    clearPages,
    addInLink,
    addInLinksBatch,
    flushToStorage,
    saveCrawlState,
    getCrawlState,
    deleteCrawlState,
    getPagesCount,
    clearAll,
    exportData,
    flushToRegistry,
    getPagesByStatus,
    getPagesByFileType,
    getUncrawledPages
  }
}
