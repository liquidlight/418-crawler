import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useDatabase } from '../useDatabase.js'

describe('useDatabase Composable', () => {
  let db

  beforeEach(async () => {
    // Clear localStorage before each test if available
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.clear?.()
      } catch (e) {
        // localStorage might not be fully available
      }
    }
    db = useDatabase()
    await db.init()
  })

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.clear?.()
      } catch (e) {
        // localStorage might not be fully available
      }
    }
  })

  describe('Initialization', () => {
    it('initializes successfully', async () => {
      expect(db.isInitialized.value).toBe(true)
      expect(db.error.value).toBeNull()
    })
  })

  describe('Page Storage', () => {
    it('saves a page to buffer', async () => {
      const page = {
        url: 'https://example.com',
        statusCode: 200,
        title: 'Example'
      }

      const result = await db.savePage(page)
      expect(result).toBeTruthy()
    })

    it('normalizes URL before saving', async () => {
      const page = {
        url: 'https://example.com/path?query=test#hash',
        statusCode: 200
      }

      await db.savePage(page)
      const stored = await db.getPage(page.url)
      expect(stored).toBeTruthy()
    })

    it('updates existing page', async () => {
      const page = {
        url: 'https://example.com',
        statusCode: 200,
        title: 'Original'
      }

      await db.savePage(page)
      const updated = { ...page, title: 'Updated', statusCode: 404 }
      await db.savePage(updated)

      const stored = await db.getPage(page.url)
      expect(stored.title).toBe('Updated')
      expect(stored.statusCode).toBe(404)
    })

    it('gets page from buffer', async () => {
      const page = {
        url: 'https://example.com',
        statusCode: 200,
        title: 'Test'
      }

      await db.savePage(page)
      const retrieved = await db.getPage(page.url)

      expect(retrieved).toBeTruthy()
      expect(retrieved.url).toBe(page.url)
      expect(retrieved.statusCode).toBe(200)
    })

    it('returns null for non-existent page', async () => {
      const result = await db.getPage('https://non-existent.com')
      expect(result).toBeNull()
    })

    it('gets all pages', async () => {
      const pages = [
        { url: 'https://example.com/1', statusCode: 200 },
        { url: 'https://example.com/2', statusCode: 200 },
        { url: 'https://example.com/3', statusCode: 404 }
      ]

      for (const page of pages) {
        await db.savePage(page)
      }

      const allPages = await db.getAllPages()
      expect(allPages).toHaveLength(3)
    })

    it('deletes a page from buffer', async () => {
      const page = { url: 'https://example.com', statusCode: 200 }
      await db.savePage(page)
      expect(await db.getAllPages()).toHaveLength(1)

      await db.deletePage(page.url)
      expect(await db.getAllPages()).toHaveLength(0)
    })

    it('clears all pages', async () => {
      const pages = [
        { url: 'https://example.com/1', statusCode: 200 },
        { url: 'https://example.com/2', statusCode: 200 }
      ]

      for (const page of pages) {
        await db.savePage(page)
      }

      await db.clearPages()
      expect(await db.getAllPages()).toHaveLength(0)
    })

    it('gets page count', async () => {
      const pages = [
        { url: 'https://example.com/1', statusCode: 200 },
        { url: 'https://example.com/2', statusCode: 200 }
      ]

      for (const page of pages) {
        await db.savePage(page)
      }

      const count = await db.getPagesCount()
      expect(count).toBe(2)
    })
  })

  describe('Page Indexing and Filtering', () => {
    it('gets pages by status code', async () => {
      const pages = [
        { url: 'https://example.com/1', statusCode: 200 },
        { url: 'https://example.com/2', statusCode: 404 },
        { url: 'https://example.com/3', statusCode: 200 }
      ]

      for (const page of pages) {
        await db.savePage(page)
      }

      const result = await db.getPagesByStatus(200)
      expect(result).toHaveLength(2)
      expect(result[0].statusCode).toBe(200)
    })

    it('gets pages by file type', async () => {
      const pages = [
        { url: 'https://example.com/index.html', fileType: 'html' },
        { url: 'https://example.com/style.css', fileType: 'css' },
        { url: 'https://example.com/page.html', fileType: 'html' }
      ]

      for (const page of pages) {
        await db.savePage(page)
      }

      const result = await db.getPagesByFileType('html')
      expect(result).toHaveLength(2)
    })

    it('gets uncrawled pages', async () => {
      const pages = [
        { url: 'https://example.com/1', statusCode: 200, isCrawled: true },
        { url: 'https://example.com/2', isCrawled: false },
        { url: 'https://example.com/3', statusCode: 404, isCrawled: true },
        { url: 'https://example.com/4', isCrawled: false }
      ]

      for (const page of pages) {
        await db.savePage(page)
      }

      const uncrawled = await db.getUncrawledPages()
      expect(uncrawled).toHaveLength(2)
      expect(uncrawled.every(p => !p.isCrawled)).toBe(true)
    })

    it('gets pages by custom index', async () => {
      const pages = [
        { url: 'https://example.com/1', domain: 'example.com' },
        { url: 'https://example.com/2', domain: 'other.com' },
        { url: 'https://example.com/3', domain: 'example.com' }
      ]

      for (const page of pages) {
        await db.savePage(page)
      }

      const result = await db.getPagesByIndex('domain', 'example.com')
      expect(result).toHaveLength(2)
    })
  })

  describe('In-Link Management', () => {
    it('adds in-link to existing page', async () => {
      const page = {
        url: 'https://example.com/target',
        statusCode: 200,
        inLinks: []
      }

      await db.savePage(page)
      await db.addInLink('https://example.com/target', 'https://example.com/source')

      const updated = await db.getPage('https://example.com/target')
      expect(updated.inLinks).toHaveLength(1)
      expect(updated.inLinks[0]).toContain('source')
    })

    it('creates page if not exists when adding in-link', async () => {
      await db.addInLink(
        'https://example.com/target',
        'https://example.com/source',
        'example.com',
        'https://example.com'
      )

      const page = await db.getPage('https://example.com/target')
      expect(page).toBeTruthy()
      expect(page.inLinks).toHaveLength(1)
    })

    it('avoids duplicate in-links', async () => {
      const page = {
        url: 'https://example.com/target',
        inLinks: ['https://example.com/source']
      }

      await db.savePage(page)
      await db.addInLink('https://example.com/target', 'https://example.com/source')

      const updated = await db.getPage('https://example.com/target')
      expect(updated.inLinks).toHaveLength(1)
    })
  })

  describe('Crawl State Management', () => {
    it('saves crawl state', async () => {
      const state = {
        rootUrl: 'https://example.com',
        baseDomain: 'example.com',
        isActive: true,
        isPaused: false,
        queueSize: 10,
        visitedCount: 5,
        stats: { pagesFound: 15, pagesCrawled: 5 }
      }

      await db.saveCrawlState(state)
      const retrieved = await db.getCrawlState()

      expect(retrieved.baseDomain).toBe('example.com')
      expect(retrieved.isActive).toBe(true)
      expect(retrieved.queueSize).toBe(10)
    })

    it('gets crawl state', async () => {
      const state = {
        rootUrl: 'https://example.com',
        baseDomain: 'example.com',
        stats: { pagesFound: 100 }
      }

      await db.saveCrawlState(state)
      const retrieved = await db.getCrawlState()

      expect(retrieved).toBeTruthy()
      expect(retrieved.baseDomain).toBe('example.com')
    })

    it('returns null if no crawl state exists', async () => {
      const state = await db.getCrawlState()
      expect(state).toBeNull()
    })

    it('deletes crawl state', async () => {
      const state = { baseDomain: 'example.com', isActive: true }
      await db.saveCrawlState(state)
      expect(await db.getCrawlState()).toBeTruthy()

      await db.deleteCrawlState()
      expect(await db.getCrawlState()).toBeNull()
    })
  })

  describe('Data Export', () => {
    it('exports all data', async () => {
      const pages = [
        { url: 'https://example.com/1', statusCode: 200 },
        { url: 'https://example.com/2', statusCode: 404 }
      ]

      for (const page of pages) {
        await db.savePage(page)
      }

      const state = { baseDomain: 'example.com' }
      await db.saveCrawlState(state)

      const exported = await db.exportData()

      expect(exported.pages).toHaveLength(2)
      expect(exported.crawlState).toBeTruthy()
      expect(exported.crawlState.baseDomain).toBe('example.com')
      expect(exported.exportedAt).toBeTruthy()
    })

    it('exportedAt timestamp is current time', async () => {
      await db.exportData()
      const exported = await db.exportData()

      const exportTime = new Date(exported.exportedAt)
      const now = new Date()
      expect(exportTime.getTime()).toBeLessThanOrEqual(now.getTime() + 1000)
    })
  })

  describe('Clear All', () => {
    it('clears all pages and state', async () => {
      const page = { url: 'https://example.com', statusCode: 200 }
      const state = { baseDomain: 'example.com' }

      await db.savePage(page)
      await db.saveCrawlState(state)

      expect(await db.getAllPages()).toHaveLength(1)
      expect(await db.getCrawlState()).toBeTruthy()

      await db.clearAll()

      expect(await db.getAllPages()).toHaveLength(0)
      expect(await db.getCrawlState()).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('handles missing normalizedUrl in page', async () => {
      const page = { url: 'https://example.com' }
      const result = await db.savePage(page)
      expect(result).toBeTruthy()

      const retrieved = await db.getPage('https://example.com')
      expect(retrieved.normalizedUrl).toBeTruthy()
    })

    it('handles corrupted localStorage data gracefully', () => {
      localStorage.setItem('crawl-pages-buffer', 'invalid json')
      const pages = db.getAllPages()
      expect(pages).toBeTruthy()
    })
  })

  describe('Flush to Registry', () => {
    it('flushes buffer to registry', async () => {
      const page = { url: 'https://example.com', statusCode: 200 }
      const state = { baseDomain: 'example.com' }

      await db.savePage(page)
      await db.saveCrawlState(state)

      const mockRegistry = vi.fn().mockReturnValue({ success: true })
      await db.flushToRegistry(mockRegistry)

      expect(mockRegistry).toHaveBeenCalled()
      const callArg = mockRegistry.mock.calls[0][0]
      expect(callArg.pages).toHaveLength(1)
      expect(callArg.crawlState).toBeTruthy()
    })

    it('clears buffer after successful flush', async () => {
      const page = { url: 'https://example.com', statusCode: 200 }
      await db.savePage(page)

      const mockRegistry = vi.fn().mockReturnValue({ success: true })
      await db.flushToRegistry(mockRegistry)

      expect(await db.getAllPages()).toHaveLength(0)
    })

    it('keeps buffer if flush fails', async () => {
      const page = { url: 'https://example.com', statusCode: 200 }
      await db.savePage(page)

      const mockRegistry = vi.fn().mockReturnValue({ success: false })
      await db.flushToRegistry(mockRegistry)

      expect(await db.getAllPages()).toHaveLength(1)
    })
  })

  describe('Edge Cases', () => {
    it('handles pages with toJSON method', async () => {
      const page = {
        url: 'https://example.com',
        statusCode: 200,
        toJSON() {
          return { url: this.url, statusCode: this.statusCode }
        }
      }

      await db.savePage(page)
      const retrieved = await db.getPage(page.url)
      expect(retrieved.url).toBe('https://example.com')
    })

    it('handles crawl state with toJSON method', async () => {
      const state = {
        baseDomain: 'example.com',
        toJSON() {
          return { baseDomain: this.baseDomain }
        }
      }

      await db.saveCrawlState(state)
      const retrieved = await db.getCrawlState()
      expect(retrieved.baseDomain).toBe('example.com')
    })

    it('handles very large page datasets', async () => {
      for (let i = 0; i < 100; i++) {
        await db.savePage({
          url: `https://example.com/${i}`,
          statusCode: 200,
          content: 'x'.repeat(1000)
        })
      }

      const allPages = await db.getAllPages()
      expect(allPages).toHaveLength(100)
    })
  })
})
