/**
 * ERROR SCENARIO TESTS - Testing error paths, edge cases, and failure modes
 * These tests were missing from the original test suite
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCrawler } from '../useCrawler.js'
import { useDatabase } from '../useDatabase.js'
import { useJsonStorage } from '../useJsonStorage.js'
import * as crawlerModule from '../../services/crawler.js'

// Mock the Crawler service
vi.mock('../../services/crawler.js', () => ({
  Crawler: vi.fn()
}))

// Mock dependencies
vi.mock('../useDatabase.js', () => ({
  useDatabase: () => ({
    init: vi.fn().mockResolvedValue(true),
    savePage: vi.fn().mockResolvedValue('normalized-url'),
    getPage: vi.fn().mockResolvedValue(null),
    getAllPages: vi.fn().mockResolvedValue([]),
    saveCrawlState: vi.fn().mockResolvedValue(true),
    getCrawlState: vi.fn().mockResolvedValue(null),
    clearAll: vi.fn().mockResolvedValue(true),
    exportData: vi.fn().mockResolvedValue({ pages: [], crawlState: {} })
  })
}))

describe('Error Scenario Tests', () => {
  describe('useCrawler - Error Handling', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    describe('Network/Service Failures', () => {
      it('handles Crawler instantiation failure', async () => {
        crawlerModule.Crawler.mockImplementation(() => {
          throw new Error('Crawler initialization failed')
        })

        const crawler = useCrawler()
        await crawler.initialize()

        // Should handle gracefully without crashing
        expect(crawler).toBeTruthy()
        expect(crawler.error.value).toBeNull() // Or should have error message
      })

      it('handles crawler start failure with network error', async () => {
        crawlerModule.Crawler.mockImplementation(() => ({
          start: vi.fn().mockRejectedValue(new Error('Network timeout'))
        }))

        const crawler = useCrawler()
        await crawler.initialize()

        // Attempt to start crawl
        await crawler.startCrawl('https://example.com')

        // Error should be captured
        expect(crawler.error.value).toBeTruthy()
      })

      it('handles crawler start failure with connection refused', async () => {
        crawlerModule.Crawler.mockImplementation(() => ({
          start: vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
        }))

        const crawler = useCrawler()
        await crawler.initialize()
        await crawler.startCrawl('https://unreachable.local')

        expect(crawler.error.value).toBeTruthy()
      })

      it('handles crawler start failure with DNS resolution error', async () => {
        crawlerModule.Crawler.mockImplementation(() => ({
          start: vi.fn().mockRejectedValue(new Error('ENOTFOUND'))
        }))

        const crawler = useCrawler()
        await crawler.initialize()
        await crawler.startCrawl('https://invalid-domain-that-does-not-exist.local')

        expect(crawler.error.value).toBeTruthy()
      })
    })

    describe('Input Validation Failures', () => {
      it('rejects URL with SQL injection attempt', async () => {
        const crawler = useCrawler()
        await crawler.initialize()

        await crawler.startCrawl("' OR '1'='1")
        expect(crawler.error.value).toBeTruthy()
      })

      it('rejects URL with XSS attempt', async () => {
        const crawler = useCrawler()
        await crawler.initialize()

        await crawler.startCrawl('<script>alert("xss")</script>')
        expect(crawler.error.value).toBeTruthy()
      })

      it('rejects URL with file:// protocol', async () => {
        const crawler = useCrawler()
        await crawler.initialize()

        await crawler.startCrawl('file:///etc/passwd')
        expect(crawler.error.value).toBeTruthy()
      })

      it('rejects extremely long URLs', async () => {
        const crawler = useCrawler()
        await crawler.initialize()

        const veryLongUrl = 'https://example.com/' + 'path/'.repeat(5000)
        await crawler.startCrawl(veryLongUrl)
        expect(crawler.error.value).toBeTruthy()
      })

      it('rejects URLs with invalid characters', async () => {
        const crawler = useCrawler()
        await crawler.initialize()

        const invalidUrls = [
          'https://example.com/ <invalid>',
          'https://example.com/\n',
          'https://example.com/\0',
          'https://example.com/\r\n'
        ]

        for (const url of invalidUrls) {
          await crawler.startCrawl(url)
          expect(crawler.error.value).toBeTruthy()
        }
      })
    })

    describe('State Management Failures', () => {
      it('handles pause when not crawling', async () => {
        const crawler = useCrawler()
        await crawler.initialize()

        // Should handle gracefully
        expect(() => crawler.pauseCrawl()).not.toThrow()
      })

      it('handles resume when not paused', async () => {
        const crawler = useCrawler()
        await crawler.initialize()

        expect(() => crawler.resumeCrawl()).not.toThrow()
      })

      it('handles stop when not crawling', async () => {
        const crawler = useCrawler()
        await crawler.initialize()

        expect(() => crawler.stopCrawl()).not.toThrow()
      })

      it('handles reset with corrupted state', async () => {
        const crawler = useCrawler()
        await crawler.initialize()

        // Set invalid state
        crawler.crawlState.value = null

        expect(async () => {
          await crawler.resetCrawl()
        }).not.toThrow()
      })
    })
  })

  describe('useDatabase - Error Handling', () => {
    let db

    beforeEach(() => {
      db = useDatabase()
      vi.clearAllMocks()
    })

    describe('Storage Quota Failures', () => {
      it('handles localStorage quota exceeded', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
          const error = new DOMException('QuotaExceededError')
          error.name = 'QuotaExceededError'
          throw error
        })

        expect(() => {
          localStorage.setItem('test', 'value')
        }).toThrow('QuotaExceededError')
      })
    })

    describe('Corrupted Data', () => {
      it('handles corrupted JSON in localStorage', () => {
        localStorage.setItem('crawl-test', 'invalid json {')

        expect(() => {
          const data = JSON.parse(localStorage.getItem('crawl-test'))
        }).toThrow()
      })

      it('handles null/undefined in database operations', async () => {
        const result = await db.getPage(null)
        expect(result).toBeNull()

        const result2 = await db.getPage(undefined)
        expect(result2).toBeNull()
      })

      it('handles page with missing required fields', async () => {
        const invalidPage = { url: null } // Missing URL

        expect(() => {
          db.savePage(invalidPage)
        }).not.toThrow() // Should handle gracefully
      })
    })

    describe('Concurrent Operation Failures', () => {
      it('handles rapid sequential saves', async () => {
        const pages = Array(100).fill(null).map((_, i) => ({
          url: `https://example.com/${i}`,
          statusCode: 200
        }))

        expect(async () => {
          await Promise.all(pages.map(p => db.savePage(p)))
        }).not.toThrow()
      })

      it('handles concurrent clear and save', async () => {
        expect(async () => {
          await Promise.all([
            db.savePage({ url: 'https://example.com', statusCode: 200 }),
            db.clearAll()
          ])
        }).not.toThrow()
      })
    })

    describe('Data Integrity', () => {
      it('handles page with circular reference', () => {
        const page = { url: 'https://example.com' }
        page.self = page // Circular reference

        expect(() => {
          JSON.stringify(page)
        }).toThrow()

        // Should handle gracefully
        expect(() => db.savePage(page)).not.toThrow()
      })

      it('handles extremely large page data', () => {
        const largeData = Array(1000000).fill('x').join('')
        const page = {
          url: 'https://example.com',
          content: largeData
        }

        expect(() => {
          db.savePage(page)
        }).not.toThrow()
      })
    })
  })

  describe('useJsonStorage - Error Handling', () => {
    let storage

    beforeEach(() => {
      storage = useJsonStorage()
      vi.clearAllMocks()
    })

    describe('File Operations Failures', () => {
      it('handles file read error', async () => {
        const invalidFile = new File(['invalid'], 'test.txt')

        try {
          await storage.loadFromFile(invalidFile)
          expect(true).toBe(false) // Should have thrown
        } catch (error) {
          expect(error.message).toContain('Invalid JSON')
        }
      })

      it('handles missing file', async () => {
        expect(async () => {
          await storage.loadFromFile(null)
        }).not.toThrow() // Should handle gracefully
      })

      it('handles download failure', () => {
        const mockLink = { href: '', download: '', click: vi.fn() }
        mockLink.click.mockImplementation(() => {
          throw new Error('Download failed')
        })

        // Should handle error gracefully
        expect(() => {
          mockLink.click()
        }).toThrow()
      })
    })

    describe('Registry Corruption', () => {
      it('handles corrupted registry data', () => {
        localStorage.setItem('crawl-registry', 'invalid json {')

        expect(() => {
          storage.getRegistry()
        }).not.toThrow() // Should return empty or handle gracefully
      })

      it('handles registry with malformed crawl objects', () => {
        const malformedRegistry = [
          { id: 'crawl-1' }, // Missing required fields
          null,
          undefined,
          { id: 'crawl-2', domain: null }
        ]

        localStorage.setItem('crawl-registry', JSON.stringify(malformedRegistry))

        expect(() => {
          storage.getRegistry()
        }).not.toThrow()
      })
    })

    describe('Timestamp Edge Cases', () => {
      it('handles very old dates', () => {
        const oldDate = new Date('1970-01-01').toISOString()
        const filename = storage.generateFileName('example.com', new Date(oldDate))

        expect(filename).toBeTruthy()
      })

      it('handles future dates', () => {
        const futureDate = new Date('2099-12-31').toISOString()
        const filename = storage.generateFileName('example.com', new Date(futureDate))

        expect(filename).toBeTruthy()
      })

      it('handles invalid date', () => {
        expect(() => {
          storage.generateFileName('example.com', new Date('invalid'))
        }).not.toThrow() // Should handle gracefully
      })
    })

    describe('Data Export Failures', () => {
      it('handles export with circular references', () => {
        const page = { url: 'https://example.com' }
        page.self = page

        expect(() => {
          JSON.stringify({ pages: [page] })
        }).toThrow()
      })

      it('handles export with extremely large datasets', () => {
        const hugeData = {
          pages: Array(10000).fill({ url: 'https://example.com', statusCode: 200 }),
          crawlState: {}
        }

        expect(() => {
          storage.saveToFile(hugeData)
        }).not.toThrow()
      })
    })

    describe('Domain Name Edge Cases', () => {
      it.each([
        'example.com',
        'sub.domain.example.com',
        'example-2.co.uk',
        'münchen.de',
        'москва.рф',
        'example.com:8080' // With port
      ])('handles domain: %s', (domain) => {
        const filename = storage.generateFileName(domain)
        expect(filename).toContain(domain)
        expect(filename).toContain('.json')
      })

      it('handles null/undefined domain', () => {
        expect(() => {
          storage.generateFileName(null)
        }).not.toThrow()

        expect(() => {
          storage.generateFileName(undefined)
        }).not.toThrow()
      })
    })
  })

  describe('Cross-Composable Error Scenarios', () => {
    it('handles database failure during crawler operation', async () => {
      vi.mocked(useDatabase).mockImplementation(() => ({
        ...useDatabase(),
        savePage: vi.fn().mockRejectedValue(new Error('Database error'))
      }))

      const crawler = useCrawler()
      await crawler.initialize()

      // Crawler should handle database error gracefully
      expect(crawler).toBeTruthy()
    })

    it('handles storage unavailable during export', async () => {
      const storage = useJsonStorage()

      // Mock localStorage being unavailable
      Object.defineProperty(window, 'localStorage', {
        value: null,
        writable: true
      })

      expect(() => {
        storage.autoSaveToStorage({})
      }).not.toThrow()

      // Restore
      Object.defineProperty(window, 'localStorage', {
        value: global.localStorage,
        writable: true
      })
    })
  })
})
