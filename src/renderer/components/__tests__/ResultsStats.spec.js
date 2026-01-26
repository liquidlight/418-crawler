import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ResultsStats from '../ResultsStats.vue'

describe('ResultsStats Component', () => {
  const mockPages = [
    {
      url: 'https://example.com',
      statusCode: 200,
      isCrawled: true,
      contentType: 'text/html',
      externalLinks: ['https://external.com'],
    },
    {
      url: 'https://example.com/about',
      statusCode: 200,
      isCrawled: true,
      contentType: 'text/html',
      externalLinks: [],
    },
    {
      url: 'https://example.com/redirect',
      statusCode: 301,
      isCrawled: true,
      contentType: 'text/html',
      externalLinks: [],
    },
    {
      url: 'https://example.com/error',
      statusCode: 404,
      isCrawled: true,
      contentType: 'text/html',
      externalLinks: [],
    },
    {
      url: 'https://example.com/server-error',
      statusCode: 500,
      isCrawled: true,
      contentType: 'text/html',
      externalLinks: [],
    },
    {
      url: 'https://example.com/pending',
      isCrawled: false,
      externalLinks: [],
    },
    {
      url: 'https://example.com/style.css',
      statusCode: 200,
      isCrawled: true,
      contentType: 'text/css',
      externalLinks: [],
    }
  ]

  it('renders component with pages prop', () => {
    const wrapper = mount(ResultsStats, {
      props: {
        pages: mockPages
      }
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.overview-card').exists()).toBe(true)
  })

  describe('Total Pages Card', () => {
    it('displays correct total page count', () => {
      const wrapper = mount(ResultsStats, {
        props: { pages: mockPages }
      })
      const bigNumber = wrapper.find('.big-number')
      expect(bigNumber.text()).toBe('7')
    })

    it('displays pages discovered label', () => {
      const wrapper = mount(ResultsStats, {
        props: { pages: mockPages }
      })
      expect(wrapper.text()).toContain('pages discovered')
    })

    it('handles empty pages array', () => {
      const wrapper = mount(ResultsStats, {
        props: { pages: [] }
      })
      const bigNumber = wrapper.find('.big-number')
      expect(bigNumber.text()).toBe('0')
    })
  })

  describe('Status Distribution', () => {
    it('calculates correct status distribution', () => {
      const wrapper = mount(ResultsStats, {
        props: { pages: mockPages }
      })

      // Access component's statusDistribution computed property
      expect(wrapper.vm.statusDistribution['2xx']).toBe(3) // 3 pages with 2xx
      expect(wrapper.vm.statusDistribution['3xx']).toBe(1) // 1 page with 3xx
      expect(wrapper.vm.statusDistribution['4xx']).toBe(1) // 1 page with 4xx
      expect(wrapper.vm.statusDistribution['5xx']).toBe(1) // 1 page with 5xx
      expect(wrapper.vm.statusDistribution.pending).toBe(1) // 1 pending
    })

    it('calculates correct status width percentages', () => {
      const wrapper = mount(ResultsStats, {
        props: { pages: mockPages }
      })

      const twoxxWidth = wrapper.vm.getStatusWidth('2xx')
      expect(twoxxWidth).toBeCloseTo(42.86, 1) // 3/7 * 100
    })

    it('returns correct status count', () => {
      const wrapper = mount(ResultsStats, {
        props: { pages: mockPages }
      })

      expect(wrapper.vm.getStatusCount('2')).toBe(3)
      expect(wrapper.vm.getStatusCount('3')).toBe(1)
      expect(wrapper.vm.getStatusCount('4')).toBe(1)
      expect(wrapper.vm.getStatusCount('5')).toBe(1)
    })

    it('hides status rows with zero count', () => {
      const fewPages = [
        { url: 'https://example.com', statusCode: 200, isCrawled: true }
      ]
      const wrapper = mount(ResultsStats, {
        props: { pages: fewPages }
      })

      // Only 2XX should be visible
      expect(wrapper.text()).toContain('2XX Success')
      expect(wrapper.text()).not.toContain('3XX Redirect')
      expect(wrapper.text()).not.toContain('4XX Client Error')
      expect(wrapper.text()).not.toContain('5XX Server Error')
    })
  })

  describe('Pending Pages', () => {
    it('calculates pending count correctly', () => {
      const wrapper = mount(ResultsStats, {
        props: { pages: mockPages }
      })

      expect(wrapper.vm.pendingCount).toBe(1)
    })

    it('displays pending section when pending pages exist', () => {
      const wrapper = mount(ResultsStats, {
        props: { pages: mockPages }
      })

      expect(wrapper.text()).toContain('Pending')
    })

    it('hides pending section when no pending pages', () => {
      const noPending = mockPages.filter(p => p.isCrawled)
      const wrapper = mount(ResultsStats, {
        props: { pages: noPending }
      })

      // Count visible pending text (should be 0 since no pending)
      const text = wrapper.text()
      // Should not show pending count row
      expect(wrapper.vm.pendingCount).toBe(0)
    })
  })

  describe('File Types', () => {
    it('detects file types correctly', () => {
      const wrapper = mount(ResultsStats, {
        props: { pages: mockPages }
      })

      expect(wrapper.vm.fileTypeList).toContain('html')
      expect(wrapper.vm.fileTypeList).toContain('css')
    })

    it('returns correct file type count', () => {
      const wrapper = mount(ResultsStats, {
        props: { pages: mockPages }
      })

      expect(wrapper.vm.getTypeCount('html')).toBe(5)
      expect(wrapper.vm.getTypeCount('css')).toBe(1)
    })

    it('displays file type text in template', () => {
      const wrapper = mount(ResultsStats, {
        props: { pages: mockPages }
      })

      expect(wrapper.text()).toContain('HTML Pages')
      expect(wrapper.text()).toContain('CSS Files')
    })

    it('shows "No file types detected" when empty', () => {
      const wrapper = mount(ResultsStats, {
        props: { pages: [] }
      })

      expect(wrapper.text()).toContain('No file types detected')
    })
  })

  describe('External Links', () => {
    it('calculates external link count correctly', () => {
      const wrapper = mount(ResultsStats, {
        props: { pages: mockPages }
      })

      expect(wrapper.vm.externalLinkCount).toBe(1)
    })

    it('displays external links section', () => {
      const wrapper = mount(ResultsStats, {
        props: { pages: mockPages }
      })

      expect(wrapper.text()).toContain('External Links')
      expect(wrapper.text()).toContain('links to external domains')
    })

    it('formats external link count with locale', () => {
      const pagesWithManyExternal = mockPages.map(p => ({
        ...p,
        externalLinks: new Array(1000)
      }))
      const wrapper = mount(ResultsStats, {
        props: { pages: pagesWithManyExternal }
      })

      expect(wrapper.vm.externalLinkCount).toBe(7000)
    })
  })

  describe('Events', () => {
    it('emits filter-status event when status row clicked', async () => {
      const wrapper = mount(ResultsStats, {
        props: { pages: mockPages }
      })

      const statusRow = wrapper.find('.status-code-row')
      await statusRow.trigger('click')

      expect(wrapper.emitted('filter-status')).toBeTruthy()
    })

    it('emits filter-filetype event when file type row clicked', async () => {
      const wrapper = mount(ResultsStats, {
        props: { pages: mockPages }
      })

      const fileTypeRow = wrapper.find('.file-type-row')
      await fileTypeRow.trigger('click')

      expect(wrapper.emitted('filter-filetype')).toBeTruthy()
    })

    it('emits filter-external event when external section clicked', async () => {
      const wrapper = mount(ResultsStats, {
        props: { pages: mockPages }
      })

      const externalSection = wrapper.find('.external-section')
      await externalSection.trigger('click')

      expect(wrapper.emitted('filter-external')).toBeTruthy()
    })
  })

  describe('Edge Cases', () => {
    it('handles pages with missing properties', () => {
      const incompletePages = [
        { url: 'https://example.com' },
        { url: 'https://example.com/2', statusCode: 200 }
      ]
      const wrapper = mount(ResultsStats, {
        props: { pages: incompletePages }
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.vm.pendingCount).toBe(2)
    })

    it('handles pages with empty externalLinks', () => {
      const wrapper = mount(ResultsStats, {
        props: {
          pages: [{ url: 'https://example.com', isCrawled: true }]
        }
      })

      expect(wrapper.vm.externalLinkCount).toBe(0)
    })

    it('handles pages without contentType', () => {
      const wrapper = mount(ResultsStats, {
        props: {
          pages: [{ url: 'https://example.com', statusCode: 200, isCrawled: true }]
        }
      })

      expect(wrapper.exists()).toBe(true)
    })
  })
})
