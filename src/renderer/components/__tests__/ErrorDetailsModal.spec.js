import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ErrorDetailsModal from '../ErrorDetailsModal.vue'

describe('ErrorDetailsModal Component', () => {
  const mockPages = [
    {
      url: 'https://example.com/page1',
      statusCode: 500,
      errorMessage: 'Internal Server Error',
      responseTime: 150,
      crawledAt: '2024-01-26T10:00:00Z'
    },
    {
      url: 'https://example.com/page2',
      statusCode: 503,
      errorMessage: 'Service Unavailable',
      responseTime: 200,
      crawledAt: '2024-01-26T10:05:00Z'
    },
    {
      url: 'https://example.com/page3',
      errorMessage: 'Connection timeout',
      responseTime: 5000,
      crawledAt: '2024-01-26T10:10:00Z'
    },
    {
      url: 'https://example.com/good-page',
      statusCode: 200,
      responseTime: 100,
      crawledAt: '2024-01-26T10:15:00Z'
    }
  ]

  describe('Modal Visibility', () => {
    it('does not render when isOpen is false', () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: false
        }
      })

      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('renders when isOpen is true', () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
      expect(wrapper.find('.modal-dialog').exists()).toBe(true)
    })
  })

  describe('Error Filtering', () => {
    it('filters pages with statusCode >= 500', () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      expect(wrapper.vm.errorPages).toHaveLength(3)
    })

    it('includes pages with errorMessage', () => {
      const pages = [
        {
          url: 'https://example.com/error',
          errorMessage: 'Network error'
        },
        {
          url: 'https://example.com/ok',
          statusCode: 200
        }
      ]
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages,
          isOpen: true
        }
      })

      expect(wrapper.vm.errorPages).toHaveLength(1)
      expect(wrapper.vm.errorPages[0].errorMessage).toBe('Network error')
    })

    it('excludes 4xx errors', () => {
      const pages = [
        { url: 'https://example.com/404', statusCode: 404 },
        { url: 'https://example.com/500', statusCode: 500 }
      ]
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages,
          isOpen: true
        }
      })

      expect(wrapper.vm.errorPages).toHaveLength(1)
      expect(wrapper.vm.errorPages[0].statusCode).toBe(500)
    })

    it('handles null pages prop', () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: null,
          isOpen: true
        }
      })

      expect(wrapper.vm.errorPages).toEqual([])
    })

    it('handles empty pages array', () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: [],
          isOpen: true
        }
      })

      expect(wrapper.vm.errorPages).toEqual([])
    })
  })

  describe('Modal Header', () => {
    it('displays error count in header', () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      expect(wrapper.find('.modal-header h2').text()).toContain('Errors (3)')
    })

    it('updates error count when pages change', async () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      expect(wrapper.find('.modal-header h2').text()).toContain('(3)')

      await wrapper.setProps({
        pages: [{ url: 'https://example.com', statusCode: 500 }]
      })

      expect(wrapper.find('.modal-header h2').text()).toContain('(1)')
    })

    it('renders close button', () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      expect(wrapper.find('.btn-close').exists()).toBe(true)
    })
  })

  describe('Error Items', () => {
    it('displays each error item', () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      const errorItems = wrapper.findAll('.error-item')
      expect(errorItems).toHaveLength(3)
    })

    it('displays error URL', () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      expect(wrapper.text()).toContain('https://example.com/page1')
    })

    it('displays error status code badge', () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      expect(wrapper.text()).toContain('500')
      expect(wrapper.text()).toContain('503')
    })

    it('displays error message when present', () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      expect(wrapper.text()).toContain('Internal Server Error')
      expect(wrapper.text()).toContain('Connection timeout')
    })

    it('hides error message when not present', () => {
      const pages = [
        {
          url: 'https://example.com',
          statusCode: 500
        }
      ]
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages,
          isOpen: true
        }
      })

      // The component still renders but message div should not exist
      const errorMessages = wrapper.findAll('.error-message')
      expect(errorMessages).toHaveLength(0)
    })
  })

  describe('Error Metadata', () => {
    it('displays response time when > 0', () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      expect(wrapper.text()).toContain('Response time: 150ms')
      expect(wrapper.text()).toContain('Response time: 200ms')
    })

    it('hides response time when 0', () => {
      const pages = [
        {
          url: 'https://example.com',
          statusCode: 500,
          responseTime: 0
        }
      ]
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages,
          isOpen: true
        }
      })

      expect(wrapper.text()).not.toContain('Response time:')
    })

    it('displays crawled date', () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      expect(wrapper.text()).toContain('Crawled:')
    })
  })

  describe('Date Formatting', () => {
    it('formats valid dates correctly', () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      const formatted = wrapper.vm.formatDate('2024-01-26T10:00:00Z')
      expect(formatted).toContain('2024')
      expect(formatted).toMatch(/\d+\/\d+\/\d+/)
    })

    it('returns empty string for null date', () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      expect(wrapper.vm.formatDate(null)).toBe('')
    })

    it('returns empty string for undefined date', () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      expect(wrapper.vm.formatDate(undefined)).toBe('')
    })

    it('handles invalid dates gracefully', () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      const invalidDate = 'not-a-date'
      const result = wrapper.vm.formatDate(invalidDate)
      // Function catches error and returns original string
      expect(result).toBeTruthy()
    })
  })

  describe('Empty State', () => {
    it('displays empty state message when no errors', () => {
      const pages = [
        { url: 'https://example.com', statusCode: 200 },
        { url: 'https://example.com/2', statusCode: 404 }
      ]
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages,
          isOpen: true
        }
      })

      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.text()).toContain('No errors found')
    })

    it('hides empty state when errors exist', () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      expect(wrapper.find('.empty-state').exists()).toBe(false)
    })
  })

  describe('Events', () => {
    it('emits close event when close button clicked', async () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      await wrapper.find('.btn-close').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('emits close event when footer close button clicked', async () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      await wrapper.find('.modal-footer .btn').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('emits close event when clicking modal overlay', async () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      await wrapper.find('.modal-overlay').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('does not emit close when clicking modal dialog', async () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      // Clear any previous emissions
      wrapper.vm.$options.emits = {}

      await wrapper.find('.modal-dialog').trigger('click')
      // Should not emit because @click.self on overlay
      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  describe('Status Badge Class', () => {
    it('uses correct status badge class', () => {
      const wrapper = mount(ErrorDetailsModal, {
        props: {
          pages: mockPages,
          isOpen: true
        }
      })

      expect(wrapper.vm.getStatusBadgeClass(500)).toBe('s5xx')
      expect(wrapper.vm.getStatusBadgeClass(503)).toBe('s5xx')
    })
  })
})
