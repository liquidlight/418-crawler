import { ref } from 'vue'

/**
 * Composable for managing crawl data as JSON files
 * Handles auto-save, import/export, and resume functionality
 */
export function useJsonStorage() {
  const currentFile = ref(null)
  const lastSaveTime = ref(null)

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
   * List all stored crawls in localStorage
   */
  function listStoredCrawls() {
    try {
      const crawls = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key.startsWith('crawl-')) {
          const data = JSON.parse(localStorage.getItem(key))
          crawls.push({
            domain: data.crawlState?.baseDomain,
            fileName: key.replace('crawl-', ''),
            pageCount: data.pages?.length || 0,
            savedAt: data.exportedAt,
            key
          })
        }
      }
      return crawls
    } catch (error) {
      console.error('Error listing stored crawls:', error)
      return []
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
    listStoredCrawls
  }
}
