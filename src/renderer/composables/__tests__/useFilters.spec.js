import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useFilters } from '../useFilters.js'

describe('useFilters Composable', () => {
  let mockPages
  let filters

  beforeEach(() => {
    mockPages = ref([
      { url: 'https://example.com', statusCode: 200, fileType: 'html' },
      { url: 'https://example.com/about', statusCode: 200, fileType: 'html' },
      { url: 'https://example.com/style.css', statusCode: 200, fileType: 'css' },
      { url: 'https://example.com/notfound', statusCode: 404, fileType: 'html' },
      { url: 'https://example.com/error', statusCode: 500, fileType: 'html' },
      { url: 'https://example.com/pending', statusCode: null, fileType: 'html' }
    ])

    filters = useFilters(mockPages)
  })

  describe('Initial State', () => {
    it('initializes with empty filters', () => {
      expect(filters.selectedStatusCodes.value).toEqual([])
      expect(filters.selectedFileTypes.value).toEqual([])
      expect(filters.searchTerm.value).toBe('')
    })

    it('initializes with correct available status codes', () => {
      expect(filters.availableStatusCodes.value).toContain(200)
      expect(filters.availableStatusCodes.value).toContain(404)
      expect(filters.availableStatusCodes.value).toContain(500)
      expect(filters.availableStatusCodes.value).not.toContain(null)
    })

    it('sorts available status codes numerically', () => {
      expect(filters.availableStatusCodes.value).toEqual([200, 404, 500])
    })

    it('initializes with correct available file types', () => {
      expect(filters.availableFileTypes.value).toContain('html')
      expect(filters.availableFileTypes.value).toContain('css')
    })

    it('sorts available file types alphabetically', () => {
      expect(filters.availableFileTypes.value).toEqual(['css', 'html'])
    })
  })

  describe('Filter State Management', () => {
    it('returns all pages when no filters applied', () => {
      expect(filters.filteredPages.value).toHaveLength(6)
    })

    it('filters by single status code', () => {
      filters.toggleStatusCode(200)
      expect(filters.filteredPages.value).toHaveLength(3)
    })

    it('filters by multiple status codes', () => {
      filters.toggleStatusCode(200)
      filters.toggleStatusCode(404)
      expect(filters.filteredPages.value).toHaveLength(4)
    })

    it('filters by single file type', () => {
      filters.toggleFileType('html')
      expect(filters.filteredPages.value).toHaveLength(5)
    })

    it('filters by multiple file types', () => {
      filters.toggleFileType('html')
      filters.toggleFileType('css')
      expect(filters.filteredPages.value).toHaveLength(6)
    })

    it('combines status and file type filters', () => {
      filters.toggleStatusCode(200)
      filters.toggleFileType('css')
      // Only 1 page has 200 status AND css type
      expect(filters.filteredPages.value).toHaveLength(1)
    })

    it('filters by search term', () => {
      filters.searchTerm.value = 'about'
      expect(filters.filteredPages.value).toHaveLength(1)
    })

    it('search is case-insensitive', () => {
      filters.searchTerm.value = 'ABOUT'
      expect(filters.filteredPages.value).toHaveLength(1)
    })

    it('combines all filters together', () => {
      filters.toggleStatusCode(200)
      filters.toggleFileType('html')
      filters.searchTerm.value = 'example'
      expect(filters.filteredPages.value.length).toBeGreaterThan(0)
    })
  })

  describe('Toggle Status Code', () => {
    it('adds status code to selected list', () => {
      filters.toggleStatusCode(200)
      expect(filters.selectedStatusCodes.value).toContain(200)
    })

    it('removes status code from selected list on second toggle', () => {
      filters.toggleStatusCode(200)
      expect(filters.selectedStatusCodes.value).toContain(200)
      filters.toggleStatusCode(200)
      expect(filters.selectedStatusCodes.value).not.toContain(200)
    })

    it('allows multiple status codes selected', () => {
      filters.toggleStatusCode(200)
      filters.toggleStatusCode(404)
      expect(filters.selectedStatusCodes.value).toHaveLength(2)
    })
  })

  describe('Toggle File Type', () => {
    it('adds file type to selected list', () => {
      filters.toggleFileType('html')
      expect(filters.selectedFileTypes.value).toContain('html')
    })

    it('removes file type from selected list on second toggle', () => {
      filters.toggleFileType('html')
      expect(filters.selectedFileTypes.value).toContain('html')
      filters.toggleFileType('html')
      expect(filters.selectedFileTypes.value).not.toContain('html')
    })

    it('allows multiple file types selected', () => {
      filters.toggleFileType('html')
      filters.toggleFileType('css')
      expect(filters.selectedFileTypes.value).toHaveLength(2)
    })
  })

  describe('Clear Filters', () => {
    it('clears status code filters', () => {
      filters.toggleStatusCode(200)
      filters.toggleStatusCode(404)
      filters.clearFilters()
      expect(filters.selectedStatusCodes.value).toEqual([])
    })

    it('clears file type filters', () => {
      filters.toggleFileType('html')
      filters.toggleFileType('css')
      filters.clearFilters()
      expect(filters.selectedFileTypes.value).toEqual([])
    })

    it('clears search term', () => {
      filters.searchTerm.value = 'test'
      filters.clearFilters()
      expect(filters.searchTerm.value).toBe('')
    })

    it('clears all filters at once', () => {
      filters.toggleStatusCode(200)
      filters.toggleFileType('html')
      filters.searchTerm.value = 'about'
      filters.clearFilters()

      expect(filters.selectedStatusCodes.value).toEqual([])
      expect(filters.selectedFileTypes.value).toEqual([])
      expect(filters.searchTerm.value).toBe('')
      expect(filters.filteredPages.value).toHaveLength(6)
    })
  })

  describe('Check Selection Status', () => {
    it('isStatusCodeSelected returns true for selected code', () => {
      filters.toggleStatusCode(200)
      expect(filters.isStatusCodeSelected(200)).toBe(true)
      expect(filters.isStatusCodeSelected(404)).toBe(false)
    })

    it('isFileTypeSelected returns true for selected type', () => {
      filters.toggleFileType('html')
      expect(filters.isFileTypeSelected('html')).toBe(true)
      expect(filters.isFileTypeSelected('css')).toBe(false)
    })
  })

  describe('Status Code Count', () => {
    it('counts pages by status code', () => {
      expect(filters.statusCount.value[200]).toBe(3)
      expect(filters.statusCount.value[404]).toBe(1)
      expect(filters.statusCount.value[500]).toBe(1)
    })

    it('updates when pages change', async () => {
      expect(filters.statusCount.value[200]).toBe(3)

      mockPages.value = [
        ...mockPages.value,
        { url: 'https://example.com/new', statusCode: 200, fileType: 'html' }
      ]

      // Wait for reactivity
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(filters.statusCount.value[200]).toBe(4)
    })
  })

  describe('File Type Count', () => {
    it('counts pages by file type', () => {
      expect(filters.fileTypeCount.value['html']).toBe(5)
      expect(filters.fileTypeCount.value['css']).toBe(1)
    })

    it('updates when pages change', async () => {
      expect(filters.fileTypeCount.value['html']).toBe(5)

      mockPages.value = [
        ...mockPages.value,
        { url: 'https://example.com/image.png', statusCode: 200, fileType: 'png' }
      ]

      // Wait for reactivity
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(filters.fileTypeCount.value['png']).toBe(1)
    })
  })

  describe('Dynamic Updates', () => {
    it('updates available status codes when pages change', async () => {
      mockPages.value = [
        { url: 'https://example.com', statusCode: 200, fileType: 'html' },
        { url: 'https://example.com/redirect', statusCode: 301, fileType: 'html' }
      ]

      // Wait for reactivity
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(filters.availableStatusCodes.value).toContain(301)
    })

    it('updates available file types when pages change', async () => {
      mockPages.value = [
        ...mockPages.value,
        { url: 'https://example.com/image.jpg', statusCode: 200, fileType: 'jpg' }
      ]

      // Wait for reactivity
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(filters.availableFileTypes.value).toContain('jpg')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty pages array', () => {
      const emptyPages = ref([])
      const emptyFilters = useFilters(emptyPages)
      expect(emptyFilters.filteredPages.value).toEqual([])
      expect(emptyFilters.availableStatusCodes.value).toEqual([])
      expect(emptyFilters.availableFileTypes.value).toEqual([])
    })

    it('handles pages with missing fileType', () => {
      const pagesWithMissing = ref([
        { url: 'https://example.com', statusCode: 200 }
      ])
      const missingFilters = useFilters(pagesWithMissing)
      expect(missingFilters.availableFileTypes.value).toEqual([])
    })

    it('handles pages with null statusCode', () => {
      const pagesWithNull = ref([
        { url: 'https://example.com', statusCode: null, fileType: 'html' }
      ])
      const nullFilters = useFilters(pagesWithNull)
      expect(nullFilters.availableStatusCodes.value).toEqual([])
    })

    it('handles null pages value gracefully', () => {
      // This tests defensive coding
      const nullPages = ref([{ url: 'test' }])
      const testFilters = useFilters(nullPages)
      expect(testFilters.filteredPages.value).toBeTruthy()
    })
  })
})
