import { describe, it, expect } from 'vitest'
import { pagesToCSV, generateCSVFileName } from '../csvExport.js'

describe('CSV Export utilities', () => {
  const mockPages = [
    {
      url: 'https://example.com',
      statusCode: 200,
      title: 'Home Page',
      responseTime: 150,
      fileType: 'html',
      isExternal: false,
      crawledAt: '2024-01-26T10:00:00Z'
    },
    {
      url: 'https://example.com/about',
      statusCode: 200,
      title: 'About Us',
      responseTime: 200,
      fileType: 'html',
      isExternal: false,
      crawledAt: '2024-01-26T10:05:00Z'
    },
    {
      url: 'https://external.com',
      statusCode: 404,
      title: 'Not Found',
      responseTime: 50,
      fileType: 'html',
      isExternal: true,
      crawledAt: '2024-01-26T10:10:00Z'
    }
  ]

  describe('pagesToCSV', () => {
    it('should generate valid CSV format', () => {
      const csv = pagesToCSV(mockPages)
      const lines = csv.split('\n')

      expect(lines.length).toBe(4) // header + 3 pages
      expect(lines[0]).toContain('URL')
      expect(lines[0]).toContain('Status Code')
      expect(lines[0]).toContain('Title')
    })

    it('should include all columns in header', () => {
      const csv = pagesToCSV(mockPages)
      const header = csv.split('\n')[0]

      expect(header).toContain('URL')
      expect(header).toContain('Status Code')
      expect(header).toContain('Title')
      expect(header).toContain('Response Time (ms)')
      expect(header).toContain('File Type')
      expect(header).toContain('External')
      expect(header).toContain('Crawled At')
    })

    it('should escape quotes in URL and title', () => {
      const pages = [{
        url: 'https://example.com/page"with"quotes',
        statusCode: 200,
        title: 'Title "with" quotes',
        responseTime: 100,
        fileType: 'html',
        isExternal: false
      }]

      const csv = pagesToCSV(pages)
      const lines = csv.split('\n')
      const dataLine = lines[1]

      // Quotes should be escaped as ""
      expect(dataLine).toContain('page""with""quotes')
      expect(dataLine).toContain('Title ""with"" quotes')
    })

    it('should handle missing values', () => {
      const pages = [{
        url: 'https://example.com',
        statusCode: null,
        title: null,
        responseTime: null,
        fileType: null,
        isExternal: false
      }]

      const csv = pagesToCSV(pages)
      const dataLine = csv.split('\n')[1]

      expect(dataLine).toContain('"https://example.com"')
      expect(dataLine).toContain('""') // empty title
    })

    it('should convert isExternal to Yes/No', () => {
      const csv = pagesToCSV(mockPages)
      const lines = csv.split('\n')

      // First page is not external
      expect(lines[1]).toContain('No')
      // Third page is external
      expect(lines[3]).toContain('Yes')
    })

    it('should format crawledAt as ISO string', () => {
      const csv = pagesToCSV(mockPages)
      const lines = csv.split('\n')
      const dataLine = lines[1]

      expect(dataLine).toContain('2024-01-26T10:00:00.000Z')
    })

    it('should return header only for empty pages array', () => {
      const csv = pagesToCSV([])
      expect(csv).toBe('URL,Status Code,Title,Response Time (ms),File Type\n')
    })

    it('should handle null pages', () => {
      const csv = pagesToCSV(null)
      expect(csv).toBe('URL,Status Code,Title,Response Time (ms),File Type\n')
    })

    it('should quote all string fields', () => {
      const csv = pagesToCSV(mockPages)
      const lines = csv.split('\n')
      const dataLine = lines[1]

      // URL and title should be quoted
      expect(dataLine).toMatch(/"https:\/\/example\.com"/)
      expect(dataLine).toMatch(/"Home Page"/)
    })

    it('should not quote numeric fields', () => {
      const csv = pagesToCSV(mockPages)
      const lines = csv.split('\n')
      const dataLine = lines[1]

      // Status code and response time should not be quoted
      const fields = dataLine.split(',')
      expect(fields[1]).toBe('200') // status code
      expect(fields[3]).toBe('150') // response time
    })

    it('should handle multiple pages with different statuses', () => {
      const csv = pagesToCSV(mockPages)
      const lines = csv.split('\n')

      expect(lines[1]).toContain('200') // first page 200
      expect(lines[2]).toContain('200') // second page 200
      expect(lines[3]).toContain('404') // third page 404
    })
  })

  describe('generateCSVFileName', () => {
    it('should generate filename with domain and date', () => {
      const fileName = generateCSVFileName('example.com')
      expect(fileName).toMatch(/^crawl-example\.com-\d{4}-\d{2}-\d{2}\.csv$/)
    })

    it('should include filter info if provided', () => {
      const fileName = generateCSVFileName('example.com', 'filtered')
      expect(fileName).toMatch(/^crawl-example\.com-filtered-\d{4}-\d{2}-\d{2}\.csv$/)
    })

    it('should use today\'s date', () => {
      const today = new Date().toISOString().split('T')[0]
      const fileName = generateCSVFileName('example.com')
      expect(fileName).toContain(today)
    })

    it('should handle domain without filter info', () => {
      const fileName = generateCSVFileName('test.org')
      expect(fileName).toMatch(/^crawl-test\.org-\d{4}-\d{2}-\d{2}\.csv$/)
    })

    it('should handle empty filter info as no suffix', () => {
      const fileName1 = generateCSVFileName('example.com', '')
      const fileName2 = generateCSVFileName('example.com')
      expect(fileName1).toBe(fileName2)
    })

    it('should generate valid CSV filename', () => {
      const fileName = generateCSVFileName('example.com', 'status-200')
      expect(fileName).toMatch(/\.csv$/)
      expect(fileName).not.toContain('/')
      expect(fileName).not.toContain('\\')
    })
  })
})
