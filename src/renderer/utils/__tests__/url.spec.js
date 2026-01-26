import { describe, it, expect } from 'vitest'
import { normalizeUrl, isSameDomain, extractDomain, getFileType } from '../url.js'

describe('URL utilities', () => {
  describe('normalizeUrl', () => {
    it('should normalize a basic URL', () => {
      const result = normalizeUrl('https://example.com/path')
      expect(result).toBe('https://example.com/path')
    })

    it('should remove hash fragments', () => {
      const result = normalizeUrl('https://example.com/path#section')
      expect(result).toBe('https://example.com/path')
    })

    it('should sort query parameters alphabetically', () => {
      const result = normalizeUrl('https://example.com?z=1&a=2&m=3')
      expect(result).toBe('https://example.com/?a=2&m=3&z=1')
    })

    it('should lowercase protocol and hostname', () => {
      const result = normalizeUrl('HTTPS://EXAMPLE.COM/Path')
      expect(result).toBe('https://example.com/Path')
    })

    it('should upgrade http to https', () => {
      const result = normalizeUrl('http://example.com/path')
      expect(result).toBe('https://example.com/path')
    })

    it('should convert protocol-relative URLs to https', () => {
      const result = normalizeUrl('//example.com/path')
      expect(result).toBe('https://example.com/path')
    })

    it('should handle relative URLs with baseUrl', () => {
      const result = normalizeUrl('/path/to/page', 'https://example.com')
      expect(result).toBe('https://example.com/path/to/page')
    })

    it('should return null for hash-only URLs', () => {
      expect(normalizeUrl('#section')).toBeNull()
    })

    it('should return null for empty strings', () => {
      expect(normalizeUrl('')).toBeNull()
    })

    it('should return null for null/undefined', () => {
      expect(normalizeUrl(null)).toBeNull()
      expect(normalizeUrl(undefined)).toBeNull()
    })

    it('should return null for relative URLs without baseUrl', () => {
      expect(normalizeUrl('/path/to/page')).toBeNull()
    })

    it('should return null for invalid URLs', () => {
      expect(normalizeUrl('not a valid url')).toBeNull()
    })

    it('should handle URLs with multiple query parameters correctly', () => {
      const result = normalizeUrl('https://example.com?foo=bar&baz=qux&alpha=beta')
      expect(result).toContain('alpha=beta')
      expect(result).toContain('baz=qux')
      expect(result).toContain('foo=bar')
    })

    it('should trim whitespace', () => {
      const result = normalizeUrl('  https://example.com/path  ')
      expect(result).toBe('https://example.com/path')
    })
  })

  describe('isSameDomain', () => {
    it('should recognize same domain', () => {
      expect(isSameDomain('https://example.com', 'https://example.com/page')).toBe(true)
    })

    it('should ignore www prefix', () => {
      expect(isSameDomain('https://www.example.com', 'https://example.com')).toBe(true)
      expect(isSameDomain('https://example.com', 'https://www.example.com')).toBe(true)
    })

    it('should be case insensitive', () => {
      expect(isSameDomain('https://EXAMPLE.COM', 'https://example.com')).toBe(true)
    })

    it('should recognize different domains', () => {
      expect(isSameDomain('https://example.com', 'https://other.com')).toBe(false)
    })

    it('should handle baseDomain parameter', () => {
      const baseDomain = 'example.com'
      expect(isSameDomain('https://example.com/page', 'https://sub.example.com/page', baseDomain)).toBe(false)
    })

    it('should return false for invalid inputs', () => {
      expect(isSameDomain(null, 'https://example.com')).toBe(false)
      expect(isSameDomain('https://example.com', undefined)).toBe(false)
      expect(isSameDomain('', '')).toBe(false)
    })

    it('should return false for malformed URLs', () => {
      expect(isSameDomain('not a url', 'https://example.com')).toBe(false)
    })
  })

  describe('extractDomain', () => {
    it('should extract domain from URL', () => {
      expect(extractDomain('https://example.com/path')).toBe('example.com')
    })

    it('should lowercase the domain', () => {
      expect(extractDomain('https://EXAMPLE.COM')).toBe('example.com')
    })

    it('should add https protocol if missing', () => {
      expect(extractDomain('example.com/path')).toBe('example.com')
    })

    it('should return null for invalid URLs', () => {
      expect(extractDomain('not a url')).toBeNull()
    })

    it('should return null for null/undefined', () => {
      expect(extractDomain(null)).toBeNull()
      expect(extractDomain(undefined)).toBeNull()
    })

    it('should handle subdomains', () => {
      expect(extractDomain('https://sub.example.com')).toBe('sub.example.com')
    })

    it('should handle URLs with paths and queries', () => {
      expect(extractDomain('https://example.com/path?query=value#hash')).toBe('example.com')
    })
  })

  describe('getFileType', () => {
    it('should detect HTML from content type', () => {
      expect(getFileType('https://example.com', 'text/html')).toBe('html')
      expect(getFileType('https://example.com', 'application/xhtml')).toBe('html')
    })

    it('should detect PDF from content type', () => {
      expect(getFileType('https://example.com', 'application/pdf')).toBe('pdf')
    })

    it('should detect images from content type', () => {
      expect(getFileType('https://example.com', 'image/png')).toBe('image')
      expect(getFileType('https://example.com', 'image/jpeg')).toBe('image')
    })

    it('should detect CSS from content type', () => {
      expect(getFileType('https://example.com', 'text/css')).toBe('css')
    })

    it('should detect JavaScript from content type', () => {
      expect(getFileType('https://example.com', 'application/javascript')).toBe('js')
    })

    it('should detect file type from URL extension', () => {
      expect(getFileType('https://example.com/file.pdf')).toBe('pdf')
      expect(getFileType('https://example.com/image.png')).toBe('image')
      expect(getFileType('https://example.com/style.css')).toBe('css')
      expect(getFileType('https://example.com/script.js')).toBe('js')
    })

    it('should be case insensitive for extensions', () => {
      expect(getFileType('https://example.com/file.PDF')).toBe('pdf')
      expect(getFileType('https://example.com/image.PNG')).toBe('image')
    })

    it('should return other for unknown file types', () => {
      expect(getFileType('https://example.com')).toBe('other')
      expect(getFileType('https://example.com/file.txt')).toBe('other')
    })

    it('should return other for null/invalid URLs', () => {
      expect(getFileType(null)).toBe('other')
      expect(getFileType(undefined)).toBe('other')
      expect(getFileType('')).toBe('other')
    })

    it('should prioritize content type over extension', () => {
      expect(getFileType('https://example.com/file.txt', 'text/html')).toBe('html')
    })

    it('should handle URLs with query parameters', () => {
      expect(getFileType('https://example.com/file.pdf?v=1')).toBe('pdf')
    })
  })
})
