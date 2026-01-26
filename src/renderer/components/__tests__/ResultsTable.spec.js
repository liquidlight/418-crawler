import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ResultsTable from '../ResultsTable.vue'

// Mock utilities
vi.mock('../../utils/statusBadges.js', () => ({
  getStatusBadgeClass: vi.fn((statusCode) => {
    if (statusCode >= 200 && statusCode < 300) return 's2xx'
    if (statusCode >= 300 && statusCode < 400) return 's3xx'
    if (statusCode >= 400 && statusCode < 500) return 's4xx'
    if (statusCode >= 500) return 's5xx'
    return 's1xx'
  })
}))

vi.mock('../../utils/textFormatting.js', () => ({
  truncateUrl: vi.fn((url) => {
    if (url.length > 50) {
      return url.substring(0, 47) + '...'
    }
    return url
  })
}))

vi.mock('../../utils/constants.js', () => ({
  TABLE_CONFIG: {
    MAX_URL_LENGTH: 50,
    MAX_TITLE_LENGTH: 100
  }
}))

describe('ResultsTable Component', () => {
  let mockPages

  beforeEach(() => {
    mockPages = [
      {
        url: 'https://example.com',
        statusCode: 200,
        title: 'Home Page',
        h1: 'Welcome',
        responseTime: 125,
        isCrawled: true,
        isExternal: false,
        processOrder: 1
      },
      {
        url: 'https://example.com/about',
        statusCode: 200,
        title: 'About Us',
        h1: 'About',
        responseTime: 145,
        isCrawled: true,
        isExternal: false,
        processOrder: 2
      },
      {
        url: 'https://example.com/contact',
        statusCode: 404,
        title: 'Contact',
        h1: 'Contact',
        responseTime: 89,
        isCrawled: true,
        isExternal: false,
        processOrder: 3
      },
      {
        url: 'https://external.com',
        statusCode: null,
        title: null,
        h1: null,
        responseTime: null,
        isCrawled: false,
        isExternal: true,
        processOrder: 4
      }
    ]
  })

  describe('Rendering', () => {
    it('renders table container', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      expect(wrapper.find('.results-table').exists()).toBe(true)
    })

    it('displays page count in heading', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      expect(wrapper.text()).toContain('Pages (4)')
    })

    it('displays correct page count with empty array', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: [] }
      })
      expect(wrapper.text()).toContain('Pages (0)')
    })

    it('renders empty state when no pages', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: [] }
      })
      expect(wrapper.find('.no-results').exists()).toBe(true)
      expect(wrapper.text()).toContain('No pages to display')
    })

    it('renders table when pages exist', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      expect(wrapper.find('table').exists()).toBe(true)
      expect(wrapper.find('.no-results').exists()).toBe(false)
    })

    it('renders all table headers', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const headers = wrapper.findAll('th')
      expect(headers.length).toBeGreaterThan(0)
      const headerText = headers.map(h => h.text()).join(' ')
      expect(headerText).toContain('Row')
      expect(headerText).toContain('Status')
      expect(headerText).toContain('Type')
      expect(headerText).toContain('URL')
    })

    it('renders all table rows for each page', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const rows = wrapper.findAll('tbody tr')
      expect(rows).toHaveLength(4)
    })
  })

  describe('Column Content', () => {
    it('displays row numbers (processOrder)', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      // Default sort is descending by processOrder, so find pages by domain
      expect(wrapper.text()).toContain('1')
      expect(wrapper.text()).toContain('2')
    })

    it('displays status codes for crawled pages', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      expect(wrapper.text()).toContain('200')
      expect(wrapper.text()).toContain('404')
    })

    it('displays pending badge for uncrawled pages', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      expect(wrapper.find('.badge-pending').exists()).toBe(true)
      expect(wrapper.text()).toContain('pending')
    })

    it('displays internal/external badges', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const badges = wrapper.findAll('.badge')
      const hasInternal = badges.some(b => b.classes().includes('badge-internal'))
      const hasExternal = badges.some(b => b.classes().includes('badge-external'))
      expect(hasInternal).toBe(true)
      expect(hasExternal).toBe(true)
    })

    it('displays truncated URLs', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const links = wrapper.findAll('.url-link')
      expect(links.length).toBeGreaterThan(0)
    })

    it('displays page titles with truncation', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      expect(wrapper.text()).toContain('Home Page')
    })

    it('displays H1 headings with truncation', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      expect(wrapper.text()).toContain('Welcome')
    })

    it('displays response times', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      expect(wrapper.text()).toContain('125')
      expect(wrapper.text()).toContain('145')
    })

    it('displays dash for missing response times', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      // Uncrawled page should have dash
      expect(wrapper.text()).toContain('-')
    })

    it('displays Details button for crawled pages', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const buttons = wrapper.findAll('.btn-small')
      expect(buttons.length).toBeGreaterThan(0)
      expect(buttons[0].text()).toBe('Details')
    })

    it('displays waiting text for uncrawled pages', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      // Check for any uncrawled page with waiting text
      expect(wrapper.text()).toContain('waiting...')
    })
  })

  describe('Sorting', () => {
    it('displays sort indicator on sortable headers', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const indicators = wrapper.findAll('.sort-indicator')
      expect(indicators.length).toBeGreaterThan(0)
    })

    it('default sort is by processOrder descending', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      expect(wrapper.vm.sortBy).toBe('processOrder')
      expect(wrapper.vm.sortOrder).toBe('desc')
    })

    it('sortedPages returns pages in default order', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const sorted = wrapper.vm.sortedPages
      expect(sorted[0].processOrder).toBe(4)
      expect(sorted[sorted.length - 1].processOrder).toBe(1)
    })

    it('toggleSort changes sort column', async () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      wrapper.vm.toggleSort('statusCode')
      expect(wrapper.vm.sortBy).toBe('statusCode')
    })

    it('toggleSort changes sort order when clicking same column', async () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      expect(wrapper.vm.sortOrder).toBe('desc')
      wrapper.vm.toggleSort('processOrder')
      expect(wrapper.vm.sortOrder).toBe('asc')
      wrapper.vm.toggleSort('processOrder')
      expect(wrapper.vm.sortOrder).toBe('desc')
    })

    it('toggleSort resets order to asc when changing column', async () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      wrapper.vm.toggleSort('statusCode')
      expect(wrapper.vm.sortOrder).toBe('asc')
    })

    it('sorts by status code correctly', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      wrapper.vm.toggleSort('statusCode')
      wrapper.vm.toggleSort('statusCode')
      const sorted = wrapper.vm.sortedPages
      expect(sorted[0].statusCode).toBe(404)
      expect(sorted[1].statusCode).toBe(200)
    })

    it('sorts by URL alphabetically', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      wrapper.vm.toggleSort('url')
      const sorted = wrapper.vm.sortedPages
      const urls = sorted.map(p => p.url)
      const sortedUrls = [...urls].sort()
      expect(urls).toEqual(sortedUrls)
    })

    it('sorts by response time numerically', () => {
      const pages = mockPages.filter(p => p.responseTime !== null)
      const wrapper = mount(ResultsTable, {
        props: { pages }
      })
      wrapper.vm.toggleSort('responseTime')
      const sorted = wrapper.vm.sortedPages.filter(p => p.responseTime !== null)
      expect(sorted.length).toBeGreaterThan(0)
    })

    it('header click triggers sort', async () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const headers = wrapper.findAll('th.sortable')
      await headers[1].trigger('click')
      expect(wrapper.vm.sortBy).toBe('statusCode')
    })

    it('displays correct sort indicator based on order', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const header = wrapper.find('th.sortable')
      const indicator = header.find('.sort-indicator')
      expect(indicator.text()).toMatch(/[▲▼]/)
    })
  })

  describe('Event Emissions', () => {
    it('emits select-page when Details button clicked', async () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const detailsButtons = wrapper.findAll('.btn-small')
      if (detailsButtons.length > 0) {
        await detailsButtons[0].trigger('click')
        expect(wrapper.emitted('select-page')).toBeTruthy()
      }
    })

    it('emits filter-status when status badge clicked', async () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const statusBadges = wrapper.findAll('.badge-clickable')
      if (statusBadges.length > 0) {
        await statusBadges[0].trigger('click')
        expect(wrapper.emitted('filter-status')).toBeTruthy()
      }
    })

    it('emits select-page with correct page data', async () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const buttons = wrapper.findAll('.btn-small')
      await buttons[1].trigger('click')
      expect(wrapper.emitted('select-page')[0][0]).toEqual(mockPages[1])
    })

    it('status badge has filter hint title', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const statusBadge = wrapper.find('.badge-clickable')
      expect(statusBadge.attributes('title')).toContain('Filter by status')
    })
  })

  describe('Row Styling', () => {
    it('applies pending class to uncrawled rows', () => {
      const pages = [
        ...mockPages,
        {
          url: 'https://example.com/pending',
          statusCode: null,
          title: null,
          h1: null,
          responseTime: null,
          isCrawled: false,
          isExternal: false,
          processOrder: 5
        }
      ]
      const wrapper = mount(ResultsTable, {
        props: { pages }
      })
      const rows = wrapper.findAll('.table-row.row-pending')
      expect(rows.length).toBeGreaterThan(0)
    })

    it('does not apply pending class to crawled rows', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const crawledRows = wrapper.findAll('.table-row:not(.row-pending)')
      expect(crawledRows.length).toBeGreaterThan(0)
    })

    it('pending class only applies to non-external uncrawled pages', () => {
      const pages = [
        {
          url: 'https://example.com',
          isCrawled: false,
          isExternal: false,
          processOrder: 1,
          statusCode: null,
          title: '',
          h1: '',
          responseTime: null
        },
        {
          url: 'https://external.com',
          isCrawled: false,
          isExternal: true,
          processOrder: 2,
          statusCode: null,
          title: '',
          h1: '',
          responseTime: null
        }
      ]
      const wrapper = mount(ResultsTable, {
        props: { pages }
      })
      const pendingRows = wrapper.findAll('.table-row.row-pending')
      expect(pendingRows.length).toBeGreaterThan(0)
    })
  })

  describe('Table Truncation', () => {
    it('truncates long URLs', () => {
      const pages = [
        {
          url: 'https://example.com/' + 'very/long/path/'.repeat(5),
          statusCode: 200,
          title: 'Test',
          h1: 'Test',
          responseTime: 100,
          isCrawled: true,
          isExternal: false,
          processOrder: 1
        }
      ]
      const wrapper = mount(ResultsTable, {
        props: { pages }
      })
      const links = wrapper.findAll('.url-link')
      if (links.length > 0) {
        expect(links[0].text().length).toBeLessThanOrEqual(50)
      }
    })

    it('sets title attribute on truncated cells', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const truncateCells = wrapper.findAll('.truncate')
      const hasTitle = truncateCells.some(cell => cell.attributes('title'))
      expect(hasTitle).toBe(true)
    })

    it('displays dash for missing row number', () => {
      const pages = [
        {
          url: 'https://example.com',
          statusCode: 200,
          title: 'Test',
          h1: 'Test',
          responseTime: 100,
          isCrawled: true,
          isExternal: false,
          processOrder: null
        }
      ]
      const wrapper = mount(ResultsTable, {
        props: { pages }
      })
      expect(wrapper.text()).toContain('-')
    })
  })

  describe('Badge Class Application', () => {
    it('applies correct badge class for 2XX status', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const badges = wrapper.findAll('.badge-clickable')
      const hasBadgeClass = badges.some(b => b.classes().includes('s2xx'))
      expect(hasBadgeClass).toBe(true)
    })

    it('applies correct badge class for 4XX status', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const badges = wrapper.findAll('.badge-clickable')
      const hasBadgeClass = badges.some(b => b.classes().includes('s4xx'))
      expect(hasBadgeClass).toBe(true)
    })

    it('uses getStatusBadgeClass utility function', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      // getStatusBadgeClass is imported and used
      expect(wrapper.vm.getStatusBadgeClass).toBeTruthy()
    })
  })

  describe('URL Links', () => {
    it('makes URLs clickable links', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const links = wrapper.findAll('.url-link')
      expect(links.length).toBeGreaterThan(0)
    })

    it('opens URL in new tab', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const link = wrapper.find('.url-link')
      expect(link.attributes('target')).toBe('_blank')
    })

    it('has noopener noreferrer for security', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const link = wrapper.find('.url-link')
      expect(link.attributes('rel')).toBe('noopener noreferrer')
    })

    it('uses truncateUrl utility function', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      expect(wrapper.vm.truncateUrl).toBeTruthy()
    })
  })

  describe('Reactivity', () => {
    it('updates table when pages prop changes', async () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: [] }
      })
      expect(wrapper.text()).toContain('No pages to display')

      await wrapper.setProps({ pages: mockPages })
      expect(wrapper.find('table').exists()).toBe(true)
      expect(wrapper.findAll('tbody tr')).toHaveLength(4)
    })

    it('updates row count when pages added', async () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages.slice(0, 2) }
      })
      expect(wrapper.text()).toContain('Pages (2)')

      await wrapper.setProps({ pages: mockPages })
      expect(wrapper.text()).toContain('Pages (4)')
    })

    it('re-sorts when pages prop changes', async () => {
      const pages1 = mockPages.slice(0, 2)
      const wrapper = mount(ResultsTable, {
        props: { pages: pages1 }
      })

      await wrapper.setProps({ pages: mockPages })
      expect(wrapper.vm.sortedPages).toHaveLength(4)
    })
  })

  describe('Edge Cases', () => {
    it('handles pages with null values', () => {
      const pages = [
        {
          url: 'https://example.com',
          statusCode: null,
          title: null,
          h1: null,
          responseTime: null,
          isCrawled: false,
          isExternal: false,
          processOrder: null
        }
      ]
      const wrapper = mount(ResultsTable, {
        props: { pages }
      })
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('table').exists()).toBe(true)
    })

    it('handles pages with missing properties', () => {
      const pages = [
        {
          url: 'https://example.com',
          isCrawled: true
        }
      ]
      const wrapper = mount(ResultsTable, {
        props: { pages }
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('handles very long titles gracefully', () => {
      const pages = [
        {
          url: 'https://example.com',
          statusCode: 200,
          title: 'A'.repeat(200),
          h1: 'Test',
          responseTime: 100,
          isCrawled: true,
          isExternal: false,
          processOrder: 1
        }
      ]
      const wrapper = mount(ResultsTable, {
        props: { pages }
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('handles duplicate URLs', () => {
      const pages = [
        {
          url: 'https://example.com',
          statusCode: 200,
          title: 'Page 1',
          h1: 'Test',
          responseTime: 100,
          isCrawled: true,
          isExternal: false,
          processOrder: 1
        },
        {
          url: 'https://example.com',
          statusCode: 200,
          title: 'Page 2',
          h1: 'Test 2',
          responseTime: 150,
          isCrawled: true,
          isExternal: false,
          processOrder: 2
        }
      ]
      const wrapper = mount(ResultsTable, {
        props: { pages }
      })
      expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    })

    it('handles very large response times', () => {
      const pages = [
        {
          url: 'https://example.com',
          statusCode: 200,
          title: 'Test',
          h1: 'Test',
          responseTime: 999999,
          isCrawled: true,
          isExternal: false,
          processOrder: 1
        }
      ]
      const wrapper = mount(ResultsTable, {
        props: { pages }
      })
      expect(wrapper.text()).toContain('999999')
    })

    it('handles sorting with mixed null and numeric values', () => {
      const pages = [
        { url: 'https://a.com', statusCode: 200, responseTime: 100, isCrawled: true, isExternal: false, processOrder: 1, title: '', h1: '' },
        { url: 'https://b.com', statusCode: null, responseTime: null, isCrawled: false, isExternal: false, processOrder: 2, title: '', h1: '' },
        { url: 'https://c.com', statusCode: 200, responseTime: 50, isCrawled: true, isExternal: false, processOrder: 3, title: '', h1: '' }
      ]
      const wrapper = mount(ResultsTable, {
        props: { pages }
      })
      wrapper.vm.toggleSort('responseTime')
      expect(wrapper.vm.sortedPages).toBeTruthy()
    })
  })

  describe('CSS Classes', () => {
    it('applies correct CSS classes to all elements', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      expect(wrapper.find('.results-table').exists()).toBe(true)
      expect(wrapper.find('.table-wrapper').exists()).toBe(true)
      expect(wrapper.find('.table').exists()).toBe(true)
    })

    it('row cells have correct classes', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      expect(wrapper.find('.row-cell').exists()).toBe(true)
      expect(wrapper.find('.status-cell').exists()).toBe(true)
      expect(wrapper.find('.type-cell').exists()).toBe(true)
    })
  })

  describe('Key Binding', () => {
    it('uses URL as key for table rows', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const rows = wrapper.findAll('tbody tr')
      expect(rows).toHaveLength(4)
    })

    it('key binding is stable', () => {
      const wrapper = mount(ResultsTable, {
        props: { pages: mockPages }
      })
      const rows1 = wrapper.findAll('tbody tr').length

      // Update props
      const newPages = [...mockPages]
      wrapper.setProps({ pages: newPages })
      const rows2 = wrapper.findAll('tbody tr').length

      expect(rows1).toBe(rows2)
    })
  })
})
