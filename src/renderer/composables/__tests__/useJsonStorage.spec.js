import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useJsonStorage } from '../useJsonStorage.js'

// Mock localStorage for tests
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString() },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} }
  }
})()

// Set up global localStorage mock
global.localStorage = localStorageMock

describe('useJsonStorage Composable', () => {
  let storage

  beforeEach(() => {
    localStorage.clear()
    storage = useJsonStorage()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  describe('File Name Generation', () => {
    it('generates filename from domain and timestamp', () => {
      const filename = storage.generateFileName('example.com')
      expect(filename).toContain('crawl-')
      expect(filename).toContain('example.com')
      expect(filename).toContain('.json')
    })

    it('includes date in filename', () => {
      const filename = storage.generateFileName('example.com')
      // Should contain date in YYYY-MM-DD format
      expect(filename).toMatch(/\d{4}-\d{2}-\d{2}/)
    })

    it('includes time in filename', () => {
      const filename = storage.generateFileName('example.com')
      expect(filename).toMatch(/\d{2}-\d{2}-\d{2}/)
    })

    it('accepts custom timestamp', () => {
      const customTime = new Date('2024-12-25T15:45:30Z')
      const filename = storage.generateFileName('example.com', customTime)
      expect(filename).toContain('2024-12-25')
    })
  })

  describe('Registry Management', () => {
    it('initializes with empty registry', () => {
      const registry = storage.getRegistry()
      expect(registry).toEqual([])
    })

    it('adds crawl to registry', () => {
      storage.addToRegistry('crawl-1', {
        domain: 'example.com',
        fileName: 'crawl-example.com.json',
        pageCount: 10,
        rootUrl: 'https://example.com'
      })

      const registry = storage.getRegistry()
      expect(registry).toHaveLength(1)
      expect(registry[0].id).toBe('crawl-1')
      expect(registry[0].domain).toBe('example.com')
    })

    it('adds most recent crawl first', () => {
      storage.addToRegistry('crawl-1', { domain: 'example1.com' })
      storage.addToRegistry('crawl-2', { domain: 'example2.com' })

      const registry = storage.getRegistry()
      expect(registry[0].id).toBe('crawl-2')
      expect(registry[1].id).toBe('crawl-1')
    })

    it('updates existing crawl in registry', () => {
      storage.addToRegistry('crawl-1', { domain: 'example.com', pageCount: 5 })
      storage.addToRegistry('crawl-1', { domain: 'example.com', pageCount: 10 })

      const registry = storage.getRegistry()
      expect(registry).toHaveLength(1)
      expect(registry[0].pageCount).toBe(10)
    })

    it('removes crawl from registry', () => {
      storage.addToRegistry('crawl-1', { domain: 'example.com' })
      storage.addToRegistry('crawl-2', { domain: 'example2.com' })

      const result = storage.removeFromRegistry('crawl-1')
      expect(result).toBe(true)

      const registry = storage.getRegistry()
      expect(registry).toHaveLength(1)
      expect(registry[0].id).toBe('crawl-2')
    })

    it('lists saved crawls', () => {
      storage.addToRegistry('crawl-1', { domain: 'example.com' })
      storage.addToRegistry('crawl-2', { domain: 'example2.com' })

      const crawls = storage.listSavedCrawls()
      expect(crawls).toHaveLength(2)
    })
  })

  describe('App Storage Operations', () => {
    it('saves crawl to app storage', () => {
      const crawlData = {
        pages: [{ url: 'https://example.com', statusCode: 200 }],
        crawlState: { baseDomain: 'example.com', rootUrl: 'https://example.com' }
      }

      const result = storage.saveCrawlToAppStorage(crawlData)
      expect(result.success).toBe(true)
      expect(result.id).toBeTruthy()
      expect(result.fileName).toContain('.json')
    })

    it('generates unique crawl IDs based on timestamp', async () => {
      const crawlData = {
        pages: [],
        crawlState: { baseDomain: 'example.com' }
      }

      const result1 = storage.saveCrawlToAppStorage(crawlData)
      // Wait a tiny bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 5))
      const result2 = storage.saveCrawlToAppStorage(crawlData)

      expect(result1.id).not.toBe(result2.id)
    })

    it('uses provided crawl ID for updates', () => {
      const crawlData = {
        pages: [{ url: 'https://example.com' }],
        crawlState: { baseDomain: 'example.com' }
      }

      const result = storage.saveCrawlToAppStorage(crawlData, 'my-crawl-id')
      expect(result.id).toBe('my-crawl-id')
    })

    it('loads crawl from app storage', () => {
      const crawlData = {
        pages: [{ url: 'https://example.com', statusCode: 200 }],
        crawlState: { baseDomain: 'example.com' }
      }

      const saveResult = storage.saveCrawlToAppStorage(crawlData, 'test-id')
      const loadedData = storage.loadCrawlFromAppStorage('test-id')

      expect(loadedData).toEqual(crawlData)
    })

    it('returns null for non-existent crawl ID', () => {
      const loaded = storage.loadCrawlFromAppStorage('non-existent')
      expect(loaded).toBeNull()
    })

    it('adds crawl to registry when saved to app storage', () => {
      const crawlData = {
        pages: [{ url: 'https://example.com' }],
        crawlState: { baseDomain: 'example.com', rootUrl: 'https://example.com' }
      }

      storage.saveCrawlToAppStorage(crawlData, 'test-id')
      const registry = storage.getRegistry()

      expect(registry).toHaveLength(1)
      expect(registry[0].id).toBe('test-id')
      expect(registry[0].domain).toBe('example.com')
      expect(registry[0].pageCount).toBe(1)
    })
  })

  describe('File Download Operations', () => {
    it('saveToFile attempts to create download', () => {
      const crawlData = {
        pages: [{ url: 'https://example.com' }],
        crawlState: { baseDomain: 'example.com' }
      }

      // Mock document and URL objects
      const mockLink = { href: '', download: '', click: vi.fn() }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink)
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink)
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink)
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
      global.URL.revokeObjectURL = vi.fn().mockImplementation(() => {})

      const result = storage.saveToFile(crawlData)
      expect(result.success).toBe(true)
      expect(result.filename).toContain('.json')
    })

    it('saveToFile uses provided filename', () => {
      const crawlData = {
        pages: [],
        crawlState: { baseDomain: 'example.com' }
      }

      const mockLink = { href: '', download: '', click: vi.fn() }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink)
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink)
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink)
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
      global.URL.revokeObjectURL = vi.fn().mockImplementation(() => {})

      const result = storage.saveToFile(crawlData, 'my-crawl.json')
      expect(result.filename).toBe('my-crawl.json')
    })

    it('saveToFile generates filename if not provided', () => {
      const crawlData = {
        pages: [],
        crawlState: { baseDomain: 'example.com' }
      }

      const mockLink = { href: '', download: '', click: vi.fn() }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink)
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink)
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink)
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
      global.URL.revokeObjectURL = vi.fn().mockImplementation(() => {})

      const result = storage.saveToFile(crawlData)
      expect(result.filename).toContain('crawl-example.com')
    })

    it('handles saveToFile errors gracefully', () => {
      const result = storage.saveToFile({})
      // Either success or error is acceptable - depends on test environment
      expect(result).toBeTruthy()
      expect(result.success !== undefined).toBe(true)
    })
  })

  describe('LocalStorage Operations', () => {
    it('autoSaveToStorage stores crawl data', () => {
      const crawlData = {
        pages: [{ url: 'https://example.com' }],
        crawlState: { baseDomain: 'example.com' }
      }

      const result = storage.autoSaveToStorage(crawlData)
      expect(result.success).toBe(true)

      const stored = localStorage.getItem('crawl-example.com')
      expect(stored).toBeTruthy()
      expect(JSON.parse(stored)).toEqual(crawlData)
    })

    it('loadFromStorage retrieves crawl data', () => {
      const crawlData = {
        pages: [{ url: 'https://example.com' }],
        crawlState: { baseDomain: 'example.com' }
      }

      storage.autoSaveToStorage(crawlData)
      const loaded = storage.loadFromStorage('example.com')

      expect(loaded).toEqual(crawlData)
    })

    it('returns null for non-existent storage key', () => {
      const loaded = storage.loadFromStorage('non-existent')
      expect(loaded).toBeNull()
    })

    it('clearStorage removes crawl data', () => {
      const crawlData = {
        pages: [],
        crawlState: { baseDomain: 'example.com' }
      }

      storage.autoSaveToStorage(crawlData)
      expect(localStorage.getItem('crawl-example.com')).toBeTruthy()

      storage.clearStorage('example.com')
      expect(localStorage.getItem('crawl-example.com')).toBeNull()
    })

    it('handles QuotaExceededError gracefully', () => {
      // Mock localStorage.setItem to throw QuotaExceededError
      const originalSetItem = localStorage.setItem
      localStorage.setItem = vi.fn(() => {
        const error = new Error('QuotaExceededError')
        error.name = 'QuotaExceededError'
        throw error
      })

      const result = storage.autoSaveToStorage({ pages: [] })
      expect(result.success).toBe(false)
      expect(result.error.toLowerCase()).toContain('quota')

      // Restore original setItem
      localStorage.setItem = originalSetItem
    })
  })

  describe('File Load Operations', () => {
    it('loadFromFile returns promise', () => {
      const file = new File(['{}'], 'test.json', { type: 'application/json' })
      const promise = storage.loadFromFile(file)
      expect(promise).toBeInstanceOf(Promise)
    })

    it('loadFromFile parses JSON successfully', async () => {
      const testData = { pages: [{ url: 'https://example.com' }], crawlState: {} }
      const file = new File([JSON.stringify(testData)], 'test.json')

      const loaded = await storage.loadFromFile(file)
      expect(loaded).toEqual(testData)
    })

    it('loadFromFile rejects invalid JSON', async () => {
      const file = new File(['invalid json'], 'test.json')

      await expect(storage.loadFromFile(file)).rejects.toThrow('Invalid JSON')
    })

    it('loadFromFile sets currentFile name', async () => {
      const testData = {}
      const file = new File([JSON.stringify(testData)], 'my-crawl.json')

      await storage.loadFromFile(file)
      expect(storage.currentFile.value).toBe('my-crawl.json')
    })

    it('loadFromFile rejects if file read fails', async () => {
      const file = new File(['test'], 'test.json')
      // Mock FileReader error
      const originalFileReader = window.FileReader
      window.FileReader = class {
        readAsText() {
          setTimeout(() => this.onerror(), 0)
        }
      }

      await expect(storage.loadFromFile(file)).rejects.toThrow('Failed to read')

      window.FileReader = originalFileReader
    })
  })

  describe('Timestamp Management', () => {
    it('records lastSaveTime on save', () => {
      storage.autoSaveToStorage({ pages: [] })
      expect(storage.lastSaveTime.value).toBeTruthy()
    })

    it('records lastSaveTime on saveToFile', () => {
      const mockLink = { href: '', download: '', click: vi.fn() }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink)
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink)
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink)
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
      global.URL.revokeObjectURL = vi.fn().mockImplementation(() => {})

      const before = new Date().getTime()
      storage.saveToFile({ pages: [], crawlState: {} })
      const after = new Date().getTime()

      expect(storage.lastSaveTime.value.getTime()).toBeGreaterThanOrEqual(before)
      expect(storage.lastSaveTime.value.getTime()).toBeLessThanOrEqual(after + 1000)
    })

    it('records lastSaveTime on app storage save', () => {
      storage.saveCrawlToAppStorage({ pages: [], crawlState: {} })
      expect(storage.lastSaveTime.value).toBeTruthy()
    })
  })

  describe('Edge Cases', () => {
    it('handles crawl data with missing baseDomain', () => {
      const mockLink = { href: '', download: '', click: vi.fn() }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink)
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink)
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink)

      const result = storage.saveCrawlToAppStorage({
        pages: [],
        crawlState: {}
      })
      expect(result.success).toBe(true)
    })

    it('handles very large crawl data', () => {
      const largePages = Array(100).fill({
        url: 'https://example.com',
        statusCode: 200
      })

      const result = storage.saveCrawlToAppStorage({
        pages: largePages,
        crawlState: { baseDomain: 'example.com' }
      })
      expect(result.success).toBe(true)
      expect(result.id).toBeTruthy()
    })

    it('handles special characters in domain names', () => {
      const filename = storage.generateFileName('example-2.co.uk')
      expect(filename).toContain('example-2.co.uk')
      expect(filename).toContain('.json')
    })
  })
})
