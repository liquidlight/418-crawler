import { describe, it, expect } from 'vitest'
import { filterByStatusCode, filterByFileType, filterBySearch, applyFilters } from '../filters.js'

describe('Filter utilities', () => {
  const mockPages = [
    { url: 'https://example.com', title: 'Home Page', statusCode: 200, fileType: 'html' },
    { url: 'https://example.com/about', title: 'About Us', statusCode: 200, fileType: 'html' },
    { url: 'https://example.com/redirect', title: 'Redirect', statusCode: 301, fileType: 'html' },
    { url: 'https://example.com/notfound', title: 'Not Found', statusCode: 404, fileType: 'html' },
    { url: 'https://example.com/error', title: 'Server Error', statusCode: 500, fileType: 'html' },
    { url: 'https://example.com/style.css', title: '', statusCode: 200, fileType: 'css' },
    { url: 'https://example.com/image.png', title: 'Image', statusCode: 200, fileType: 'image' }
  ]

  describe('filterByStatusCode', () => {
    it('should filter by specific status code', () => {
      const result = filterByStatusCode(mockPages, ['200'])
      expect(result).toHaveLength(4)
      expect(result.every(p => p.statusCode === 200)).toBe(true)
    })

    it('should filter by grouped status codes', () => {
      const result = filterByStatusCode(mockPages, ['2XX'])
      expect(result).toHaveLength(4)
      expect(result.every(p => p.statusCode >= 200 && p.statusCode < 300)).toBe(true)
    })

    it('should filter by multiple status codes', () => {
      const result = filterByStatusCode(mockPages, ['200', '404'])
      expect(result).toHaveLength(5)
      expect(result.some(p => p.statusCode === 200)).toBe(true)
      expect(result.some(p => p.statusCode === 404)).toBe(true)
    })

    it('should filter by grouped and specific codes', () => {
      const result = filterByStatusCode(mockPages, ['2XX', '404'])
      expect(result).toHaveLength(5)
    })

    it('should filter multiple groups', () => {
      const result = filterByStatusCode(mockPages, ['3XX', '4XX'])
      expect(result).toHaveLength(2)
      expect(result.some(p => p.statusCode === 301)).toBe(true)
      expect(result.some(p => p.statusCode === 404)).toBe(true)
    })

    it('should return all pages if no filters provided', () => {
      expect(filterByStatusCode(mockPages, [])).toEqual(mockPages)
      expect(filterByStatusCode(mockPages, null)).toEqual(mockPages)
    })

    it('should exclude pages with null statusCode', () => {
      const pages = [...mockPages, { url: 'test', statusCode: null }]
      const result = filterByStatusCode(pages, ['200'])
      expect(result).toHaveLength(4)
    })

    it('should handle 5XX codes', () => {
      const result = filterByStatusCode(mockPages, ['5XX'])
      expect(result).toHaveLength(1)
      expect(result[0].statusCode).toBe(500)
    })
  })

  describe('filterByFileType', () => {
    it('should filter by single file type', () => {
      const result = filterByFileType(mockPages, ['html'])
      expect(result).toHaveLength(5)
      expect(result.every(p => p.fileType === 'html')).toBe(true)
    })

    it('should filter by multiple file types', () => {
      const result = filterByFileType(mockPages, ['html', 'css'])
      expect(result).toHaveLength(6)
      expect(result.some(p => p.fileType === 'html')).toBe(true)
      expect(result.some(p => p.fileType === 'css')).toBe(true)
    })

    it('should return all pages if no filters provided', () => {
      expect(filterByFileType(mockPages, [])).toEqual(mockPages)
      expect(filterByFileType(mockPages, null)).toEqual(mockPages)
    })

    it('should filter by image type', () => {
      const result = filterByFileType(mockPages, ['image'])
      expect(result).toHaveLength(1)
      expect(result[0].fileType).toBe('image')
    })
  })

  describe('filterBySearch', () => {
    it('should search in URL', () => {
      const result = filterBySearch(mockPages, 'about')
      expect(result).toHaveLength(1)
      expect(result[0].url).toContain('about')
    })

    it('should search in title', () => {
      const result = filterBySearch(mockPages, 'Image')
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Image')
    })

    it('should be case insensitive', () => {
      const result = filterBySearch(mockPages, 'ABOUT')
      expect(result).toHaveLength(1)
    })

    it('should return all pages if search term is empty', () => {
      expect(filterBySearch(mockPages, '')).toEqual(mockPages)
      expect(filterBySearch(mockPages, null)).toEqual(mockPages)
      expect(filterBySearch(mockPages, '   ')).toEqual(mockPages)
    })

    it('should find multiple matches', () => {
      const result = filterBySearch(mockPages, 'example.com')
      expect(result.length).toBeGreaterThan(1)
    })

    it('should handle pages without title', () => {
      const result = filterBySearch(mockPages, 'style')
      expect(result).toHaveLength(1)
      expect(result[0].url).toContain('style')
    })
  })

  describe('applyFilters', () => {
    it('should apply no filters if none provided', () => {
      const result = applyFilters(mockPages, {})
      expect(result).toEqual(mockPages)
    })

    it('should apply status code filter', () => {
      const result = applyFilters(mockPages, { statusCodes: ['200'] })
      expect(result).toHaveLength(4)
    })

    it('should apply file type filter', () => {
      const result = applyFilters(mockPages, { fileTypes: ['css'] })
      expect(result).toHaveLength(1)
    })

    it('should apply search filter', () => {
      const result = applyFilters(mockPages, { searchTerm: 'about' })
      expect(result).toHaveLength(1)
    })

    it('should apply multiple filters in sequence (AND logic)', () => {
      const result = applyFilters(mockPages, {
        statusCodes: ['200'],
        fileTypes: ['html']
      })
      expect(result).toHaveLength(2)
      expect(result.every(p => p.statusCode === 200 && p.fileType === 'html')).toBe(true)
    })

    it('should apply all three filters together', () => {
      const result = applyFilters(mockPages, {
        statusCodes: ['200'],
        fileTypes: ['html'],
        searchTerm: 'about'
      })
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('About Us')
    })
  })
})
