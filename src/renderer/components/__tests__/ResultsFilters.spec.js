import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ResultsFilters from '../ResultsFilters.vue'

describe('ResultsFilters Component', () => {
  let mockPages
  const defaultProps = {
    selectedStatusCodes: [],
    selectedFileTypes: [],
    searchTerm: ''
  }

  const createWrapper = (props = {}) =>
    mount(ResultsFilters, {
      props: { ...defaultProps, pages: mockPages, ...props }
    })

  beforeEach(() => {
    mockPages = [
      { url: 'https://example.com', statusCode: 200, fileType: 'html' },
      { url: 'https://example.com/about', statusCode: 200, fileType: 'html' },
      { url: 'https://example.com/style.css', statusCode: 200, fileType: 'css' },
      { url: 'https://example.com/404', statusCode: 404, fileType: 'html' },
      { url: 'https://example.com/error', statusCode: 500, fileType: 'html' },
      { url: 'https://example.com/pending', statusCode: null, fileType: 'html' }
    ]
  })

  describe('Rendering', () => {
    it('renders filters container', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })
      expect(wrapper.find('.results-filters').exists()).toBe(true)
    })

    it('renders filter title', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })
      expect(wrapper.text()).toContain('Filters')
    })

    it('renders all filter groups', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      expect(wrapper.text()).toContain('Status Codes')
      expect(wrapper.text()).toContain('File Types')
      expect(wrapper.text()).toContain('Search')
    })

    it('renders clear all filters button', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      expect(wrapper.find('.btn-clear').exists()).toBe(true)
      expect(wrapper.find('.btn-clear').text()).toBe('Clear All Filters')
    })
  })

  describe('Status Code Filter', () => {
    it('displays status code groups with counts', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      expect(wrapper.text()).toContain('2XX')
      expect(wrapper.text()).toContain('4XX')
      expect(wrapper.text()).toContain('5XX')
    })

    it.each([
      ['2XX', '2XX (3)'],
      ['4XX', '4XX (1)'],
      ['5XX', '5XX (1)']
    ])('shows correct count for %s status codes', (statusGroup, expectedCount) => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      expect(wrapper.text()).toContain(expectedCount)
    })

    it('status code checkboxes are clickable', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      expect(checkboxes.length).toBeGreaterThan(0)
    })
  })

  describe('File Type Filter', () => {
    it('displays all available file types', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      expect(wrapper.text()).toContain('css')
      expect(wrapper.text()).toContain('html')
    })

    it.each([
      ['html', 'html (5)'],
      ['css', 'css (1)']
    ])('shows correct count for %s files', (fileType, expectedCount) => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      expect(wrapper.text()).toContain(expectedCount)
    })

    it('has file type labels', () => {
      const pages = [
        { url: 'https://example.com/a.z', fileType: 'z' },
        { url: 'https://example.com/b.a', fileType: 'a' },
        { url: 'https://example.com/c.m', fileType: 'm' }
      ]

      const wrapper = createWrapper({ pages })

      // Should have file type checkboxes
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      expect(checkboxes.length).toBeGreaterThan(0)
    })
  })

  describe('Search Filter', () => {
    it('displays search input field', () => {
      const wrapper = createWrapper()

      const searchInput = wrapper.find('.search-input')
      expect(searchInput.exists()).toBe(true)
      expect(searchInput.attributes('placeholder')).toBe('Search URLs or titles...')
    })

    it('displays current search term value', async () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: 'example'
        }
      })

      expect(wrapper.find('.search-input').element.value).toBe('example')
    })

    it('updates search term on input', async () => {
      const wrapper = createWrapper()

      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('test search')

      expect(wrapper.emitted('search')).toBeTruthy()
      expect(wrapper.emitted('search')[0]).toEqual(['test search'])
    })
  })

  describe('Event Emissions', () => {
    it('emits toggle-status event when status checkbox clicked', async () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      await checkboxes[0].trigger('change')

      expect(wrapper.emitted('toggle-status')).toBeTruthy()
    })

    it('emits toggle-type event when file type checkbox clicked', async () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      // Find a file type checkbox
      const fileTypeCheckboxes = checkboxes.slice(checkboxes.length - 2)
      await fileTypeCheckboxes[0].trigger('change')

      expect(wrapper.emitted('toggle-type')).toBeTruthy()
    })

    it('emits search event when search input changes', async () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('test')

      expect(wrapper.emitted('search')).toBeTruthy()
      expect(wrapper.emitted('search')[0]).toEqual(['test'])
    })

    it('emits clear event when clear button clicked', async () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: ['2XX'],
          selectedFileTypes: ['html'],
          searchTerm: 'test'
        }
      })

      await wrapper.find('.btn-clear').trigger('click')

      expect(wrapper.emitted('clear')).toBeTruthy()
    })
  })

  describe('Clear Button State', () => {
    it('enables clear button when filters active', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: ['2XX'],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      expect(wrapper.find('.btn-clear').attributes('disabled')).toBeUndefined()
    })

    it('disables clear button when no filters active', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      expect(wrapper.find('.btn-clear').attributes('disabled')).toBeDefined()
    })

    it('enables clear button when status code selected', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: ['2XX'],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      expect(wrapper.vm.hasActiveFilters).toBe(true)
    })

    it('enables clear button when file type selected', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: ['html'],
          searchTerm: ''
        }
      })

      expect(wrapper.vm.hasActiveFilters).toBe(true)
    })

    it('enables clear button when search term present', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: 'search'
        }
      })

      expect(wrapper.vm.hasActiveFilters).toBe(true)
    })
  })

  describe('Checkbox State', () => {
    it('marks checkbox as checked when selected', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: ['2XX'],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      // At least one checkbox should be checked
      const isAnyChecked = checkboxes.some(cb => cb.element.checked)
      expect(isAnyChecked).toBe(true)
    })

    it('marks checkbox as unchecked when not selected', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      checkboxes.forEach(cb => {
        expect(cb.element.checked).toBe(false)
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles pages with null statusCode', () => {
      const pages = [
        { url: 'https://example.com', statusCode: null, fileType: 'html' }
      ]

      const wrapper = mount(ResultsFilters, {
        props: {
          pages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('handles pages with missing fileType', () => {
      const pages = [
        { url: 'https://example.com', statusCode: 200 }
      ]

      const wrapper = mount(ResultsFilters, {
        props: {
          pages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('handles empty pages array', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: [],
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      expect(wrapper.find('.results-filters').exists()).toBe(true)
    })

    it('handles many status codes gracefully', () => {
      const pages = [
        { url: 'https://example.com/1', statusCode: 200, fileType: 'html' },
        { url: 'https://example.com/2', statusCode: 201, fileType: 'html' },
        { url: 'https://example.com/3', statusCode: 204, fileType: 'html' },
        { url: 'https://example.com/4', statusCode: 301, fileType: 'html' },
        { url: 'https://example.com/5', statusCode: 400, fileType: 'html' },
        { url: 'https://example.com/6', statusCode: 404, fileType: 'html' },
        { url: 'https://example.com/7', statusCode: 500, fileType: 'html' },
        { url: 'https://example.com/8', statusCode: 503, fileType: 'html' }
      ]

      const wrapper = mount(ResultsFilters, {
        props: {
          pages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.findAll('input[type="checkbox"]').length).toBeGreaterThan(0)
    })

    it('handles many file types gracefully', () => {
      const pages = [
        { url: 'https://example.com/1.html', statusCode: 200, fileType: 'html' },
        { url: 'https://example.com/2.css', statusCode: 200, fileType: 'css' },
        { url: 'https://example.com/3.js', statusCode: 200, fileType: 'js' },
        { url: 'https://example.com/4.json', statusCode: 200, fileType: 'json' },
        { url: 'https://example.com/5.png', statusCode: 200, fileType: 'png' },
        { url: 'https://example.com/6.svg', statusCode: 200, fileType: 'svg' }
      ]

      const wrapper = mount(ResultsFilters, {
        props: {
          pages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('File Type Count Method', () => {
    it('calculates file type count correctly', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      expect(wrapper.vm.getFileTypeCount('html')).toBe(5)
      expect(wrapper.vm.getFileTypeCount('css')).toBe(1)
    })

    it('returns 0 for non-existent file type', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      expect(wrapper.vm.getFileTypeCount('pdf')).toBe(0)
    })
  })

  describe('Active Filters Computation', () => {
    it('detects when status codes are selected', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: ['2XX', '4XX'],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      expect(wrapper.vm.hasActiveFilters).toBe(true)
    })

    it('detects when file types are selected', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: ['html'],
          searchTerm: ''
        }
      })

      expect(wrapper.vm.hasActiveFilters).toBe(true)
    })

    it('detects when search term is present', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: 'test'
        }
      })

      expect(wrapper.vm.hasActiveFilters).toBe(true)
    })

    it('returns false when no filters active', () => {
      const wrapper = mount(ResultsFilters, {
        props: {
          pages: mockPages,
          selectedStatusCodes: [],
          selectedFileTypes: [],
          searchTerm: ''
        }
      })

      expect(wrapper.vm.hasActiveFilters).toBe(false)
    })
  })
})
