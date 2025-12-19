import { ref } from 'vue'
import { isSameDomain, normalizeUrl } from '../utils/url.js'

/**
 * Composable for managing crawl data using localStorage as a buffer
 * Pages are stored in localStorage during crawl, then flushed to JSON registry
 */
export function useDatabase() {
  const isInitialized = ref(false)
  const error = ref(null)
  const PAGES_KEY = 'crawl-pages-buffer'
  const STATE_KEY = 'crawl-state-buffer'

  /**
   * Initialize the buffer (localStorage)
   */
  async function init() {
    try {
      isInitialized.value = true
      error.value = null
    } catch (e) {
      error.value = e.message
      console.error('Failed to initialize storage:', e)
      throw e
    }
  }

  /**
   * Save a page to the localStorage buffer
   */
  async function savePage(page) {
    try {
      const pageData = page.toJSON ? page.toJSON() : page
      // Ensure normalizedUrl is present
      if (!pageData.normalizedUrl) {
        pageData.normalizedUrl = normalizeUrl(pageData.url) || pageData.url
      }

      // Get existing pages from buffer
      let pages = getPageBuffer()

      // Update or add page
      const index = pages.findIndex(p => p.normalizedUrl === pageData.normalizedUrl)
      if (index >= 0) {
        pages[index] = pageData
      } else {
        pages.push(pageData)
      }

      // Save back to buffer
      localStorage.setItem(PAGES_KEY, JSON.stringify(pages))
      return pageData.normalizedUrl
    } catch (e) {
      console.error('Error saving page:', e)
      throw e
    }
  }

  /**
   * Get a page from the buffer by URL
   */
  async function getPage(url) {
    const normalized = normalizeUrl(url) || url
    const pages = getPageBuffer()
    return pages.find(p => p.normalizedUrl === normalized) || null
  }

  /**
   * Get all pages from the buffer
   */
  async function getAllPages() {
    return getPageBuffer()
  }

  /**
   * Internal: Get pages buffer from localStorage
   */
  function getPageBuffer() {
    try {
      const data = localStorage.getItem(PAGES_KEY)
      return data ? JSON.parse(data) : []
    } catch (e) {
      console.warn('Error reading page buffer:', e)
      return []
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
   * Delete a page from the buffer
   */
  async function deletePage(url) {
    const normalized = normalizeUrl(url) || url
    let pages = getPageBuffer()
    pages = pages.filter(p => p.normalizedUrl !== normalized)
    localStorage.setItem(PAGES_KEY, JSON.stringify(pages))
    return true
  }

  /**
   * Clear all pages from the buffer
   */
  async function clearPages() {
    localStorage.removeItem(PAGES_KEY)
    return true
  }

  /**
   * Add an in-link to a page
   * Creates the page entry if it doesn't exist
   */
  async function addInLink(toUrl, fromUrl, baseDomain = '', rootUrl = '') {
    const normalizedTo = normalizeUrl(toUrl) || toUrl
    const normalizedFrom = normalizeUrl(fromUrl) || fromUrl

    let page = await getPage(normalizedTo)
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
    } else {
      // Add to existing page's in-links
      if (!page.inLinks) page.inLinks = []
      if (!page.inLinks.includes(normalizedFrom)) {
        page.inLinks.push(normalizedFrom)
      }
    }

    return await savePage(page)
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
        // Clear the buffer after successful flush
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
