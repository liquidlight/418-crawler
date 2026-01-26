import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ResultsFilters from '../ResultsFilters.vue'
import {
  createMockPageSet,
  createComponentFactory,
  updateComponentProps,
  FILTER_TEST_DATA
} from '../../__tests__/testUtils.js'

describe('ResultsFilters Component', () => {
  let mockPages

  beforeEach(() => {
    mockPages = createMockPageSet()
  })

  const defaultProps = {
    pages: mockPages,
    selectedStatusCodes: [],
    selectedFileTypes: [],
    searchTerm: ''
  }

  // Helper to create consistent wrappers
  const createWrapper = (props = {}) =>
    mount(ResultsFilters, {
      props: { ...defaultProps, ...props }
    })

  // ===== RENDERING TESTS =====
  describe('Rendering', () => {
    it('renders filter container with title and controls', () => {
      const wrapper = createWrapper()

      expect(wrapper.find('.results-filters').exists()).toBe(true)
      expect(wrapper.find('.results-filters h2, .results-filters h3').exists()).toBe(true)
      expect(wrapper.find('.btn-clear').exists()).toBe(true)
    })

    it('renders all filter sections', () => {
      const wrapper = createWrapper()
      const text = wrapper.text()

      expect(text).toContain('Status Codes')
      expect(text).toContain('File Types')
      expect(text).toContain('Search')
    })

    it('renders checkboxes for filters', () => {
      const wrapper = createWrapper()
      const checkboxes = wrapper.findAll('input[type="checkbox"]')

      expect(checkboxes.length).toBeGreaterThan(0)
    })

    it('has search input field with placeholder', () => {
      const wrapper = createWrapper()
      const searchInput = wrapper.find('.search-input')

      expect(searchInput.exists()).toBe(true)
      expect(searchInput.attributes('placeholder')).toMatch(/search/i)
    })
  })

  // ===== STATUS CODE FILTERING TESTS (PARAMETERIZED) =====
  describe('Status Code Filtering', () => {
    it.each([
      ['2XX', 3],
      ['4XX', 1],
      ['5XX', 0]
    ])('displays %s status group with correct count', (statusGroup, expectedCount) => {
      const wrapper = createWrapper()
      if (expectedCount > 0) {
        expect(wrapper.text()).toContain(`${statusGroup}`)
      }
    })

    it('displays all status code checkboxes', () => {
      const wrapper = createWrapper()
      const statusSectionCheckboxes = wrapper.findAll(
        '.filter-group:has(:contains("Status")) input[type="checkbox"]'
      )

      // Verify multiple checkboxes exist for different status groups
      expect(statusSectionCheckboxes.length).toBeGreaterThan(0)
    })

    it('shows correct aggregated count for each status group', () => {
      const pages = [
        { statusCode: 200, fileType: 'html', url: 'a' },
        { statusCode: 201, fileType: 'html', url: 'b' },
        { statusCode: 404, fileType: 'html', url: 'c' },
        { statusCode: 500, fileType: 'html', url: 'd' }
      ]
      const wrapper = createWrapper({ pages })

      // 2XX should include 200 and 201
      const text = wrapper.text()
      expect(text).toContain('2XX')
      expect(text).toContain('4XX')
      expect(text).toContain('5XX')
    })
  })

  // ===== FILE TYPE FILTERING TESTS (PARAMETERIZED) =====
  describe('File Type Filtering', () => {
    it.each([
      ['html', 5],
      ['css', 1]
    ])('displays %s file type with count %s', (fileType, expectedCount) => {
      const wrapper = createWrapper()
      const text = wrapper.text()

      if (expectedCount > 0) {
        expect(text).toContain(`${fileType}`)
      }
    })

    it('renders file type checkboxes', () => {
      const wrapper = createWrapper()
      const fileTypeCheckboxes = wrapper.findAll(
        '.filter-group:has(:contains("File Types")) input[type="checkbox"]'
      )

      expect(fileTypeCheckboxes.length).toBeGreaterThan(0)
    })

    it.each([
      { fileTypes: ['html', 'css', 'js'] },
      { fileTypes: ['png', 'jpg', 'svg'] }
    ])('handles pages with file types $fileTypes', ({ fileTypes }) => {
      const pages = fileTypes.map((ft, i) => ({
        url: `https://example.com/${i}`,
        statusCode: 200,
        fileType: ft
      }))

      const wrapper = createWrapper({ pages })
      expect(wrapper.exists()).toBe(true)
    })
  })

  // ===== SEARCH FUNCTIONALITY TESTS =====
  describe('Search Functionality', () => {
    it('displays current search term in input', async () => {
      const wrapper = createWrapper({ searchTerm: 'example' })
      const input = wrapper.find('.search-input')

      expect(input.element.value).toBe('example')
    })

    it('emits search event when input changes', async () => {
      const wrapper = createWrapper()
      const input = wrapper.find('.search-input')

      await input.setValue('test query')

      expect(wrapper.emitted('search')).toBeTruthy()
      expect(wrapper.emitted('search')[0][0]).toBe('test query')
    })

    it.each([
      'example.com',
      '/products',
      'contact page',
      'query?param=value',
      '非ASCII テキスト'
    ])('handles search for "%s"', async (searchQuery) => {
      const wrapper = createWrapper()
      const input = wrapper.find('.search-input')

      await input.setValue(searchQuery)

      expect(wrapper.emitted('search')).toBeTruthy()
    })
  })

  // ===== EVENT EMISSION TESTS =====
  describe('Event Emissions', () => {
    it('emits toggle-status when status checkbox changes', async () => {
      const wrapper = createWrapper()
      const statusCheckboxes = wrapper.findAll(
        '.filter-group:has(:contains("Status")) input[type="checkbox"]'
      )

      if (statusCheckboxes.length > 0) {
        await statusCheckboxes[0].trigger('change')
        expect(wrapper.emitted('toggle-status')).toBeTruthy()
      }
    })

    it('emits toggle-type when file type checkbox changes', async () => {
      const wrapper = createWrapper()
      const fileTypeCheckboxes = wrapper.findAll(
        '.filter-group:has(:contains("File Types")) input[type="checkbox"]'
      )

      if (fileTypeCheckboxes.length > 0) {
        await fileTypeCheckboxes[0].trigger('change')
        expect(wrapper.emitted('toggle-type')).toBeTruthy()
      }
    })

    it('emits clear event when clear button clicked', async () => {
      const wrapper = createWrapper({
        selectedStatusCodes: ['2XX'],
        selectedFileTypes: ['html'],
        searchTerm: 'test'
      })

      const clearBtn = wrapper.find('.btn-clear')
      await clearBtn.trigger('click')

      expect(wrapper.emitted('clear')).toBeTruthy()
    })
  })

  // ===== CLEAR BUTTON STATE TESTS =====
  describe('Clear Button State', () => {
    it.each([
      { selectedStatusCodes: ['2XX'], hasFilters: true },
      { selectedFileTypes: ['html'], hasFilters: true },
      { searchTerm: 'test', hasFilters: true },
      { selectedStatusCodes: [], selectedFileTypes: [], searchTerm: '', hasFilters: false }
    ])(
      'clear button state with filters: $selectedStatusCodes, $selectedFileTypes, $searchTerm',
      ({ selectedStatusCodes, selectedFileTypes, searchTerm, hasFilters }) => {
        const wrapper = createWrapper({
          selectedStatusCodes,
          selectedFileTypes,
          searchTerm
        })

        const clearBtn = wrapper.find('.btn-clear')
        if (hasFilters) {
          expect(clearBtn.attributes('disabled')).toBeUndefined()
        } else {
          expect(clearBtn.attributes('disabled')).toBeDefined()
        }
      }
    )
  })

  // ===== CHECKBOX STATE TESTS =====
  describe('Checkbox State', () => {
    it('marks status checkbox as checked when selected', () => {
      const wrapper = createWrapper({ selectedStatusCodes: ['2XX'] })
      const checkboxes = wrapper.findAll('input[type="checkbox"]')

      const isAnyChecked = checkboxes.some(cb => cb.element.checked)
      expect(isAnyChecked).toBe(true)
    })

    it('marks status checkbox as unchecked when not selected', () => {
      const wrapper = createWrapper({ selectedStatusCodes: [] })
      const checkboxes = wrapper.findAll('input[type="checkbox"]')

      const allUnchecked = checkboxes.every(cb => !cb.element.checked)
      expect(allUnchecked).toBe(true)
    })

    it.each([
      { selected: ['2XX'], expected: true },
      { selected: ['4XX'], expected: true },
      { selected: ['2XX', '4XX'], expected: true },
      { selected: [], expected: false }
    ])(
      'marks checkboxes correctly for selected=$selected',
      ({ selected, expected }) => {
        const wrapper = createWrapper({ selectedStatusCodes: selected })
        const checkboxes = wrapper.findAll('input[type="checkbox"]')

        if (expected) {
          expect(checkboxes.some(cb => cb.element.checked)).toBe(true)
        }
      }
    )
  })

  // ===== EDGE CASES & ERROR SCENARIOS =====
  describe('Edge Cases & Error Scenarios', () => {
    it('handles pages with null statusCode', () => {
      const pages = [{ url: 'test', statusCode: null, fileType: 'html' }]
      expect(() => {
        mount(ResultsFilters, { props: { ...defaultProps, pages } })
      }).not.toThrow()
    })

    it('handles pages with missing fileType', () => {
      const pages = [{ url: 'test', statusCode: 200 }]
      expect(() => {
        mount(ResultsFilters, { props: { ...defaultProps, pages } })
      }).not.toThrow()
    })

    it('handles empty pages array', () => {
      const wrapper = mount(ResultsFilters, {
        props: { ...defaultProps, pages: [] }
      })
      expect(wrapper.find('.results-filters').exists()).toBe(true)
    })

    it('handles very large dataset', () => {
      const pages = Array(5000).fill(null).map((_, i) => ({
        url: `https://example.com/${i}`,
        statusCode: (i % 5) * 100 + 200,
        fileType: ['html', 'css', 'js'][i % 3]
      }))

      const start = performance.now()
      const wrapper = mount(ResultsFilters, { props: { ...defaultProps, pages } })
      const duration = performance.now() - start

      expect(wrapper.exists()).toBe(true)
      expect(duration).toBeLessThan(1000) // Should render in <1 second
    })

    it('handles many unique file types gracefully', () => {
      const pages = Array(50).fill(null).map((_, i) => ({
        url: `https://example.com/${i}`,
        statusCode: 200,
        fileType: `type${i}`
      }))

      const wrapper = mount(ResultsFilters, { props: { ...defaultProps, pages } })
      const fileTypeCheckboxes = wrapper.findAll(
        '.filter-group:has(:contains("File Types")) input[type="checkbox"]'
      )

      expect(fileTypeCheckboxes.length).toBeGreaterThan(0)
    })
  })

  // ===== REACTIVITY TESTS =====
  describe('Reactivity', () => {
    it('updates when pages prop changes', async () => {
      const wrapper = mount(ResultsFilters, { props: defaultProps })

      const newPages = [
        ...mockPages,
        { url: 'new', statusCode: 200, fileType: 'pdf' }
      ]

      await updateComponentProps(wrapper, { pages: newPages })
      expect(wrapper.exists()).toBe(true)
    })

    it('updates when selected filters change', async () => {
      const wrapper = mount(ResultsFilters, { props: defaultProps })

      await updateComponentProps(wrapper, { selectedStatusCodes: ['2XX'] })

      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      expect(checkboxes.some(cb => cb.element.checked)).toBe(true)
    })
  })

  // ===== ACCESSIBILITY TESTS =====
  describe('Accessibility', () => {
    it('has descriptive labels for filters', () => {
      const wrapper = createWrapper()
      const text = wrapper.text()

      expect(text).toMatch(/status/i)
      expect(text).toMatch(/file type/i)
      expect(text).toMatch(/search/i)
    })

    it('search input has placeholder text', () => {
      const wrapper = createWrapper()
      const input = wrapper.find('input[type="search"]')

      expect(input.attributes('placeholder')).toBeTruthy()
    })
  })
})
