import { ref, computed } from 'vue'

/**
 * Composable for managing crawl data as JSON files
 * Stores crawls in app's own folder via localStorage registry
 * When converted to Electron, this registry maps to actual file system
 */
export function useJsonStorage() {
  const currentFile = ref(null)
  const lastSaveTime = ref(null)
  const REGISTRY_KEY = 'crawl-registry' // Stores list of all crawls

  /**
   * Generate filename from domain and timestamp
   */
  function generateFileName(baseDomain, timestamp = new Date()) {
    const date = timestamp.toISOString().split('T')[0]
    const time = timestamp.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-')
    return `crawl-${baseDomain}-${date}-${time}.json`
  }

  /**
   * Save crawl data to JSON file (downloads to user's downloads folder)
   */
  function saveToFile(data, fileName = null) {
    try {
      const domain = data.crawlState?.baseDomain || 'unknown'
      const filename = fileName || generateFileName(domain)

      const jsonString = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      lastSaveTime.value = new Date()
      return { success: true, filename }
    } catch (error) {
      console.error('Error saving to file:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Auto-save to browser's local storage (in-memory for session recovery)
   * This is faster than downloading and works for recovery during same session
   */
  function autoSaveToStorage(data) {
    try {
      const storageKey = `crawl-${data.crawlState?.baseDomain || 'current'}`
      localStorage.setItem(storageKey, JSON.stringify(data))
      lastSaveTime.value = new Date()
      return { success: true }
    } catch (error) {
      // localStorage quota exceeded
      if (error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded, skipping auto-save')
        return { success: false, error: 'Storage quota exceeded' }
      }
      console.error('Error auto-saving to storage:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Load crawl data from local storage
   */
  function loadFromStorage(baseDomain) {
    try {
      const storageKey = `crawl-${baseDomain}`
      const data = localStorage.getItem(storageKey)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Error loading from storage:', error)
      return null
    }
  }

  /**
   * Load crawl data from uploaded JSON file
   */
  function loadFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          currentFile.value = file.name
          resolve(data)
        } catch (error) {
          reject(new Error('Invalid JSON file'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  /**
   * Clear stored crawl data
   */
  function clearStorage(baseDomain) {
    try {
      const storageKey = `crawl-${baseDomain}`
      localStorage.removeItem(storageKey)
      return { success: true }
    } catch (error) {
      console.error('Error clearing storage:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get the crawl registry (list of all saved crawls)
   */
  function getRegistry() {
    try {
      const registry = localStorage.getItem(REGISTRY_KEY)
      return registry ? JSON.parse(registry) : []
    } catch (error) {
      console.error('Error reading crawl registry:', error)
      return []
    }
  }

  /**
   * Add a crawl to the registry
   */
  function addToRegistry(id, metadata) {
    try {
      const registry = getRegistry()
      // Remove if already exists
      const filtered = registry.filter(c => c.id !== id)
      // Add new entry at the beginning (most recent first)
      const updated = [
        {
          id,
          domain: metadata.domain,
          fileName: metadata.fileName,
          pageCount: metadata.pageCount || 0,
          savedAt: metadata.savedAt || new Date().toISOString(),
          rootUrl: metadata.rootUrl
        },
        ...filtered
      ]
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(updated))
      return true
    } catch (error) {
      console.error('Error adding to crawl registry:', error)
      return false
    }
  }

  /**
   * Remove a crawl from the registry
   */
  function removeFromRegistry(id) {
    try {
      const registry = getRegistry()
      const updated = registry.filter(c => c.id !== id)
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(updated))
      // Also remove the crawl data itself
      localStorage.removeItem(`crawl-data-${id}`)
      return true
    } catch (error) {
      console.error('Error removing from crawl registry:', error)
      return false
    }
  }

  /**
   * List all saved crawls from registry
   */
  function listSavedCrawls() {
    return getRegistry()
  }

  /**
   * Save crawl to app storage (not just localStorage, but registered)
   * @param {Object} data - The crawl data to save
   * @param {string} crawlId - Optional: Use existing crawl ID to update same entry (for auto-save). If not provided, generates new ID.
   */
  function saveCrawlToAppStorage(data, crawlId) {
    try {
      const domain = data.crawlState?.baseDomain || 'unknown'
      // Use provided crawl ID (for auto-save updates) or generate new one
      const id = crawlId || `${domain}-${Date.now()}`
      const fileName = generateFileName(domain)

      // Store the actual crawl data
      localStorage.setItem(`crawl-data-${id}`, JSON.stringify(data))

      // Add to registry (will update if id already exists)
      addToRegistry(id, {
        domain,
        fileName,
        pageCount: data.pages?.length || 0,
        rootUrl: data.crawlState?.rootUrl
      })

      lastSaveTime.value = new Date()
      return { success: true, id, fileName }
    } catch (error) {
      console.error('Error saving crawl to app storage:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Load a crawl from app storage by ID
   */
  function loadCrawlFromAppStorage(id) {
    try {
      const data = localStorage.getItem(`crawl-data-${id}`)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Error loading crawl from app storage:', error)
      return null
    }
  }

  return {
    currentFile,
    lastSaveTime,
    generateFileName,
    saveToFile,
    autoSaveToStorage,
    loadFromStorage,
    loadFromFile,
    clearStorage,
    listSavedCrawls,
    saveCrawlToAppStorage,
    loadCrawlFromAppStorage,
    removeFromRegistry,
    getRegistry
  }
}
