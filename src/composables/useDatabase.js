import { ref } from 'vue'
import { openDB } from 'idb'
import { SCHEMA, initializeSchema } from '../db/schema.js'
import { CrawlState } from '../models/CrawlState.js'
import { isSameDomain } from '../utils/url.js'

let db = null

/**
 * Composable for managing IndexedDB operations
 */
export function useDatabase() {
  const isInitialized = ref(false)
  const error = ref(null)

  /**
   * Initialize the IndexedDB database
   */
  async function init() {
    try {
      db = await openDB(SCHEMA.name, SCHEMA.version, {
        upgrade(db, oldVersion, newVersion, transaction) {
          initializeSchema(db)
        }
      })
      isInitialized.value = true
      error.value = null
    } catch (e) {
      error.value = e.message
      console.error('Failed to initialize database:', e)
      throw e
    }
  }

  /**
   * Save a page to the database
   */
  async function savePage(page) {
    if (!db) throw new Error('Database not initialized')
    const pageData = page.toJSON ? page.toJSON() : page
    return await db.put('pages', pageData)
  }

  /**
   * Get a page by URL
   */
  async function getPage(url) {
    if (!db) throw new Error('Database not initialized')
    return await db.get('pages', url)
  }

  /**
   * Get all pages
   */
  async function getAllPages() {
    if (!db) throw new Error('Database not initialized')
    return await db.getAll('pages')
  }

  /**
   * Get pages by index (e.g., by status code)
   */
  async function getPagesByIndex(indexName, value) {
    if (!db) throw new Error('Database not initialized')
    const tx = db.transaction('pages', 'readonly')
    const index = tx.objectStore('pages').index(indexName)
    return await index.getAll(value)
  }

  /**
   * Delete a page
   */
  async function deletePage(url) {
    if (!db) throw new Error('Database not initialized')
    return await db.delete('pages', url)
  }

  /**
   * Clear all pages
   */
  async function clearPages() {
    if (!db) throw new Error('Database not initialized')
    return await db.clear('pages')
  }

  /**
   * Add an in-link to a page
   * Creates the page entry if it doesn't exist
   */
  async function addInLink(toUrl, fromUrl, baseDomain = '', rootUrl = '') {
    if (!db) throw new Error('Database not initialized')

    let page = await getPage(toUrl)
    if (!page) {
      // Determine if this URL is external using actual root URL for consistency
      // Use the actual root URL from crawler state instead of reconstructing it
      const baseUrlForCheck = rootUrl || (baseDomain ? `https://${baseDomain}` : fromUrl)
      const isExternal = !isSameDomain(toUrl, baseUrlForCheck, baseDomain)

      // Create a new placeholder page
      page = {
        url: toUrl,
        normalizedUrl: toUrl,
        domain: baseDomain,
        statusCode: null,
        isCrawled: false,
        isExternal,
        inLinks: [fromUrl],
        outLinks: [],
        externalLinks: [],
        assets: []
      }
    } else {
      // Add to existing page's in-links
      if (!page.inLinks) page.inLinks = []
      if (!page.inLinks.includes(fromUrl)) {
        page.inLinks.push(fromUrl)
      }
    }

    return await savePage(page)
  }

  /**
   * Save crawler state
   */
  async function saveCrawlState(state) {
    if (!db) throw new Error('Database not initialized')
    const stateData = state.toJSON ? state.toJSON() : state
    return await db.put('crawlState', { id: 'current', ...stateData })
  }

  /**
   * Get crawler state
   */
  async function getCrawlState() {
    if (!db) throw new Error('Database not initialized')
    const state = await db.get('crawlState', 'current')
    // Return plain data object, not CrawlState instance to avoid circular refs in Vue reactivity
    if (state) {
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
  }

  /**
   * Delete crawler state (reset crawl)
   */
  async function deleteCrawlState() {
    if (!db) throw new Error('Database not initialized')
    return await db.delete('crawlState', 'current')
  }

  /**
   * Get all pages count
   */
  async function getPagesCount() {
    if (!db) throw new Error('Database not initialized')
    return await db.count('pages')
  }

  /**
   * Clear entire database
   */
  async function clearAll() {
    if (!db) throw new Error('Database not initialized')
    await db.clear('pages')
    await db.clear('crawlState')
    await db.clear('settings')
  }

  /**
   * Export all data as JSON
   */
  async function exportData() {
    if (!db) throw new Error('Database not initialized')
    const pages = await getAllPages()
    const state = await db.get('crawlState', 'current')
    return {
      pages,
      crawlState: state,
      exportedAt: new Date().toISOString()
    }
  }

  /**
   * Get pages by status code range or specific code
   */
  async function getPagesByStatus(statusCode) {
    return await getPagesByIndex('statusCode', statusCode)
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
    return await getPagesByIndex('isCrawled', false)
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
    getPagesByStatus,
    getPagesByFileType,
    getUncrawledPages
  }
}
