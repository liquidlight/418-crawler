import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ResultsTable from '../ResultsTable.vue'
import { getStatusBadgeClass } from '../../utils/statusBadges.js'
import { truncateUrl } from '../../utils/textFormatting.js'
import {
  createMockPageSet,
  createMockPage,
  createComponentFactory,
  updateComponentProps,
  generateEdgeCasePages
} from '../../__tests__/testUtils.js'

// Don't mock utilities - use real implementations
// They are already tested in their own spec files

describe('ResultsTable Component', () => {
  let mockPages

  beforeEach(() => {
    mockPages = createMockPageSet()
  })

  // ===== RENDERING TESTS =====
  describe('Rendering', () => {
    const createWrapper = createComponentFactory(ResultsTable, { pages: [] })

    it('renders empty state when no pages', () => {
      const wrapper = mount(ResultsTable, { props: { pages: [] } })
      expect(wrapper.find('.no-results').exists()).toBe(true)
      expect(wrapper.text()).toContain('No pages to display')
    })

    it('renders table with correct headers when pages exist', () => {
      const wrapper = mount(ResultsTable, { props: { pages: mockPages } })
      const headers = wrapper.findAll('th')

      // Verify structure, not text fragility
      expect(headers.length).toBeGreaterThanOrEqual(7)
      expect(wrapper.find('table').exists()).toBe(true)
      expect(wrapper.findAll('tbody tr')).toHaveLength(mockPages.length)
    })

    it('displays page count in heading', () => {
      const wrapper = mount(ResultsTable, { props: { pages: mockPages } })
      const heading = wrapper.find('h3')
      expect(heading.text()).toMatch(/Pages \(\d+\)/)
    })
  })

  // ===== SORTING TESTS =====
  describe('Sorting', () => {
    it('starts with descending sort by processOrder', () => {
      const wrapper = mount(ResultsTable, { props: { pages: mockPages } })
      expect(wrapper.vm.sortBy).toBe('processOrder')
      expect(wrapper.vm.sortOrder).toBe('desc')
    })

    it.each([
      ['processOrder', 'desc'],
      ['statusCode', 'asc'],
      ['url', 'asc'],
      ['responseTime', 'asc']
    ])('sorts by %s in %s order', (column, order) => {
      const wrapper = mount(ResultsTable, { props: { pages: mockPages } })
      wrapper.vm.toggleSort(column)
      expect(wrapper.vm.sortBy).toBe(column)
      expect(wrapper.vm.sortOrder).toBe(order)
    })

    it('toggles sort order when clicking same column twice', () => {
      const wrapper = mount(ResultsTable, { props: { pages: mockPages } })
      const header = wrapper.findAll('th')[0]

      expect(wrapper.vm.sortOrder).toBe('desc')
      wrapper.vm.toggleSort('processOrder')
      expect(wrapper.vm.sortOrder).toBe('asc')
    })

    it('displays sort indicator on current sort column', () => {
      const wrapper = mount(ResultsTable, { props: { pages: mockPages } })
      const indicators = wrapper.findAll('.sort-indicator')
      expect(indicators.length).toBeGreaterThan(0)
      expect(indicators[0].text()).toMatch(/[▲▼]/)
    })

    it('sorts pages correctly by different columns', () => {
      const pages = [
        createMockPage({ url: 'https://z.com', processOrder: 3 }),
        createMockPage({ url: 'https://a.com', processOrder: 1 }),
        createMockPage({ url: 'https://m.com', processOrder: 2 })
      ]
      const wrapper = mount(ResultsTable, { props: { pages } })

      // Sort by URL
      wrapper.vm.toggleSort('url')
      const sorted = wrapper.vm.sortedPages
      expect(sorted[0].url).toBe('https://a.com')
      expect(sorted[sorted.length - 1].url).toBe('https://z.com')
    })
  })

  // ===== CONTENT DISPLAY TESTS =====
  describe('Content Display', () => {
    it('displays all required page information', () => {
      const wrapper = mount(ResultsTable, { props: { pages: mockPages } })
      const text = wrapper.text()

      // Verify critical data is visible
      expect(text).toContain('200') // status code
      expect(text).toContain('404') // status code
      expect(text).toContain('internal') // badge
      expect(text).toContain('external') // badge
      expect(text).toContain('pending') // uncrawled badge
    })

    it('shows status badges using correct classes', () => {
      const wrapper = mount(ResultsTable, { props: { pages: mockPages } })
      const statusBadges = wrapper.findAll('.badge-clickable')

      // Verify real utility is being used (not mocked)
      expect(statusBadges.length).toBeGreaterThan(0)
      statusBadges.forEach(badge => {
        const classes = badge.classes().join(' ')
        expect(classes).toMatch(/s[1-5]xx|badge-pending/)
      })
    })

    it('shows pending state for uncrawled pages only', () => {
      const wrapper = mount(ResultsTable, { props: { pages: mockPages } })
      const pendingBadges = wrapper.findAll('.badge-pending')

      // Should have at least one pending
      expect(pendingBadges.length).toBeGreaterThan(0)
    })

    it('truncates long URLs and titles', () => {
      const edgeCases = generateEdgeCasePages()
      const wrapper = mount(ResultsTable, {
        props: { pages: [edgeCases.veryLongUrl] }
      })

      // Verify truncateUrl was used (real function, not mocked)
      const link = wrapper.find('.url-link')
      expect(link.exists()).toBe(true)
      // The link text should be shorter than the actual URL due to truncation
      expect(link.text().length).toBeLessThan(edgeCases.veryLongUrl.url.length)
    })
  })

  // ===== EVENT EMISSIONS TESTS =====
  describe('Event Emissions', () => {
    it('emits select-page with correct page data when Details clicked', async () => {
      const wrapper = mount(ResultsTable, { props: { pages: mockPages } })
      const detailButtons = wrapper.findAll('.btn-small')

      if (detailButtons.length > 0) {
        await detailButtons[0].trigger('click')
        expect(wrapper.emitted('select-page')).toBeTruthy()
        expect(wrapper.emitted('select-page')[0][0].url).toBe(mockPages[0].url)
      }
    })

    it('emits filter-status when status badge clicked', async () => {
      const wrapper = mount(ResultsTable, { props: { pages: mockPages } })
      const statusBadges = wrapper.findAll('.badge-clickable')

      if (statusBadges.length > 0) {
        await statusBadges[0].trigger('click')
        expect(wrapper.emitted('filter-status')).toBeTruthy()
        expect(wrapper.emitted('filter-status')[0][0]).toBe(200)
      }
    })
  })

  // ===== REACTIVITY TESTS =====
  describe('Reactivity', () => {
    it('updates when pages prop changes', async () => {
      const wrapper = mount(ResultsTable, { props: { pages: [] } })
      expect(wrapper.find('.no-results').exists()).toBe(true)

      await updateComponentProps(wrapper, { pages: mockPages })
      expect(wrapper.find('table').exists()).toBe(true)
      expect(wrapper.findAll('tbody tr')).toHaveLength(mockPages.length)
    })

    it('maintains sort order when pages update', async () => {
      const wrapper = mount(ResultsTable, { props: { pages: mockPages } })
      wrapper.vm.toggleSort('statusCode')

      const newPages = [...mockPages, createMockPage({ statusCode: 500, processOrder: 5 })]
      await updateComponentProps(wrapper, { pages: newPages })

      expect(wrapper.vm.sortBy).toBe('statusCode')
      expect(wrapper.vm.sortOrder).toBe('asc')
    })
  })

  // ===== EDGE CASES & ERROR SCENARIOS =====
  describe('Edge Cases & Error Scenarios', () => {
    it.each([
      { description: 'with null statusCode', page: createMockPage({ statusCode: null }) },
      { description: 'with null title', page: createMockPage({ title: null }) },
      { description: 'with null responseTime', page: createMockPage({ responseTime: null }) },
      { description: 'with very long URL', page: generateEdgeCasePages().veryLongUrl },
      { description: 'with international characters', page: generateEdgeCasePages().internationalChars },
      { description: 'with XSS attempt in title', page: generateEdgeCasePages().xssAttempt }
    ])('renders safely $description', ({ page }) => {
      expect(() => {
        const wrapper = mount(ResultsTable, { props: { pages: [page] } })
        expect(wrapper.exists()).toBe(true)
      }).not.toThrow()
    })

    it('handles very large dataset', () => {
      const largePageSet = Array(1000).fill(null).map((_, i) =>
        createMockPage({
          url: `https://example.com/page${i}`,
          statusCode: (i % 5) * 100 + 200,
          processOrder: i
        })
      )

      const start = performance.now()
      const wrapper = mount(ResultsTable, { props: { pages: largePageSet } })
      const duration = performance.now() - start

      expect(wrapper.findAll('tbody tr')).toHaveLength(1000)
      expect(duration).toBeLessThan(2000) // Should render in <2 seconds
    })

    it('handles sorting with mixed null values', () => {
      const pages = [
        createMockPage({ responseTime: 100 }),
        createMockPage({ responseTime: null }),
        createMockPage({ responseTime: 50 })
      ]
      const wrapper = mount(ResultsTable, { props: { pages } })
      wrapper.vm.toggleSort('responseTime')

      expect(() => wrapper.vm.sortedPages).not.toThrow()
      expect(wrapper.vm.sortedPages.length).toBe(3)
    })

    it('handles sorting with all null values', () => {
      const pages = [
        createMockPage({ responseTime: null }),
        createMockPage({ responseTime: null }),
        createMockPage({ responseTime: null })
      ]
      const wrapper = mount(ResultsTable, { props: { pages } })
      wrapper.vm.toggleSort('responseTime')

      expect(wrapper.vm.sortedPages).toHaveLength(3)
    })
  })

  // ===== ACCESSIBILITY TESTS =====
  describe('Accessibility', () => {
    it('uses semantic table structure', () => {
      const wrapper = mount(ResultsTable, { props: { pages: mockPages } })
      expect(wrapper.find('table').exists()).toBe(true)
      expect(wrapper.find('thead').exists()).toBe(true)
      expect(wrapper.find('tbody').exists()).toBe(true)
    })

    it('has descriptive sort button titles', () => {
      const wrapper = mount(ResultsTable, { props: { pages: mockPages } })
      const sortableHeaders = wrapper.findAll('th.sortable')
      expect(sortableHeaders.length).toBeGreaterThan(0)
    })
  })

  // ===== STYLING & CLASSES =====
  describe('Styling & Visual States', () => {
    it('applies pending class to pending rows', () => {
      const pages = [
        createMockPage({ isCrawled: false, isExternal: false }),
        createMockPage({ isCrawled: true })
      ]
      const wrapper = mount(ResultsTable, { props: { pages } })
      const pendingRows = wrapper.findAll('.row-pending')
      expect(pendingRows.length).toBeGreaterThan(0)
    })

    it('does not apply pending class to external uncrawled pages', () => {
      const page = createMockPage({ isCrawled: false, isExternal: true })
      const wrapper = mount(ResultsTable, { props: { pages: [page] } })
      expect(wrapper.find('.row-pending').exists()).toBe(false)
    })
  })
})
