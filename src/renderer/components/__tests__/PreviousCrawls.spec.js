import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PreviousCrawls from '../PreviousCrawls.vue'

describe('PreviousCrawls Component', () => {
  let mockCrawls

  const createWrapper = (crawls = 'default') => {
    const crawlsToUse = crawls === 'default' ? mockCrawls : crawls
    return mount(PreviousCrawls, {
      props: { savedCrawls: crawlsToUse }
    })
  }

  beforeEach(() => {
    mockCrawls = [
      {
        id: 'crawl-1',
        domain: 'example.com',
        savedAt: new Date(new Date().getTime() - 1000 * 60 * 60).toISOString(),
        pageCount: 42,
        errorCount: 0
      },
      {
        id: 'crawl-2',
        domain: 'another.com',
        savedAt: new Date(new Date().getTime() - 1000 * 60 * 60 * 24).toISOString(),
        pageCount: 156,
        errorCount: 3
      },
      {
        id: 'crawl-3',
        domain: 'old.com',
        savedAt: new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        pageCount: 89,
        errorCount: 0
      }
    ]
  })

  describe('Rendering', () => {
    it.each([
      ['.section-header', true, 'component container'],
      ['.crawl-list', true, 'crawl list when crawls exist']
    ])('renders %s for %s', (selector, shouldExist, description) => {
      const wrapper = createWrapper()
      expect(wrapper.find(selector).exists()).toBe(shouldExist)
    })

    it('renders section title', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Previous Crawls')
    })

    it('displays crawl count in title', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.section-count').exists()).toBe(true)
      expect(wrapper.text()).toContain('3')
    })

    it('displays empty state when no crawls', () => {
      const wrapper = createWrapper([])
      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.text()).toContain('No previous crawls')
    })

    it('displays empty text message', () => {
      const wrapper = createWrapper([])
      expect(wrapper.text()).toContain('Your crawl history will appear here')
    })

    it('hides empty state when crawls exist', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.empty-state').exists()).toBe(false)
    })

    it('renders crawl card for each crawl', () => {
      const wrapper = createWrapper()
      const cards = wrapper.findAll('.crawl-card')
      expect(cards).toHaveLength(3)
    })

    it('displays domain in each crawl card', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('example.com')
      expect(wrapper.text()).toContain('another.com')
    })

    it('displays page count in crawl card', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('42 pages')
      expect(wrapper.text()).toContain('156 pages')
    })
  })

  describe('Empty State', () => {
    it.each([
      ['.clear-link', false, []],
      ['.clear-link', true, 'default'],
      ['.section-count', false, []],
      ['.empty-icon', true, []]
    ])('handles empty state for %s', (selector, shouldExist, crawls) => {
      const wrapper = createWrapper(crawls)
      expect(wrapper.find(selector).exists()).toBe(shouldExist)
    })
  })

  describe('Date Formatting', () => {
    const createCrawlWithDate = (daysOffset) => [{
      id: 'crawl-1',
      domain: 'example.com',
      savedAt: new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * daysOffset).toISOString(),
      pageCount: 10,
      errorCount: 0
    }]

    it.each([
      [0, 'Today'],
      [1, 'Yesterday'],
      [3, 'days ago']
    ])('formats dates correctly for %d days ago', (daysOffset, expectedContent) => {
      const crawls = createCrawlWithDate(daysOffset)
      const wrapper = createWrapper(crawls)
      expect(wrapper.text()).toContain(expectedContent)
    })

    it('formats older dates with month and day', () => {
      const crawls = createCrawlWithDate(14)
      const wrapper = createWrapper(crawls)
      // Should not contain "Today" or "Yesterday"
      expect(wrapper.text()).not.toContain('Today')
      expect(wrapper.text()).not.toContain('Yesterday')
    })
  })

  describe('Date Formatting - Edge Cases', () => {
    const createCrawlWithDate = (daysOffset) => [{
      id: 'crawl-1',
      domain: 'example.com',
      savedAt: new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * daysOffset).toISOString(),
      pageCount: 10,
      errorCount: 0
    }]

    it.each([
      [null],
      [undefined]
    ])('handles %s savedAt gracefully', (savedAtValue) => {
      const crawls = [{
        id: 'crawl-1',
        domain: 'example.com',
        savedAt: savedAtValue,
        pageCount: 10,
        errorCount: 0
      }]
      const wrapper = createWrapper(crawls)
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Error Display', () => {
    it('displays error count when errors exist', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('3 errors')
    })

    it('displays "No errors" when errorCount is 0', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('No errors')
    })

    it('handles null errorCount gracefully', () => {
      const crawls = [
        {
          id: 'crawl-1',
          domain: 'example.com',
          savedAt: new Date().toISOString(),
          pageCount: 10,
          errorCount: null
        }
      ]
      const wrapper = createWrapper(crawls)
      expect(wrapper.text()).toContain('No errors')
    })

    it('displays colored stat indicators', () => {
      const wrapper = createWrapper()
      const errorStats = wrapper.findAll('.crawl-stat.error')
      const successStats = wrapper.findAll('.crawl-stat.success')
      expect(errorStats.length).toBeGreaterThan(0)
      expect(successStats.length).toBeGreaterThan(0)
    })
  })

  describe('Event Emissions', () => {
    it('emits load event when card clicked', async () => {
      const wrapper = createWrapper()
      const card = wrapper.find('.crawl-card')
      await card.trigger('click')
      expect(wrapper.emitted('load')).toBeTruthy()
      expect(wrapper.emitted('load')[0][0]).toBe('crawl-1')
    })

    it('emits load event when load button clicked', async () => {
      const wrapper = createWrapper()
      const loadButton = wrapper.find('.action-btn:not(.delete)')
      await loadButton.trigger('click')
      expect(wrapper.emitted('load')).toBeTruthy()
    })

    it('emits delete event when delete confirmed', async () => {
      const wrapper = createWrapper()
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      const deleteButton = wrapper.find('.action-btn.delete')
      await deleteButton.trigger('click')
      expect(wrapper.emitted('delete')).toBeTruthy()
      expect(wrapper.emitted('delete')[0][0]).toBe('crawl-1')
    })

    it('does not emit delete event when delete cancelled', async () => {
      const wrapper = createWrapper()
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      const deleteButton = wrapper.find('.action-btn.delete')
      await deleteButton.trigger('click')
      expect(wrapper.emitted('delete')).toBeFalsy()
    })

    it('emits correct crawl ID on load', async () => {
      const wrapper = createWrapper()
      const cards = wrapper.findAll('.crawl-card')
      await cards[1].trigger('click')
      expect(wrapper.emitted('load')[0][0]).toBe('crawl-2')
    })

    it('emits correct crawl ID on delete', async () => {
      const wrapper = createWrapper()
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      const deleteButtons = wrapper.findAll('.action-btn.delete')
      await deleteButtons[2].trigger('click')
      expect(wrapper.emitted('delete')[0][0]).toBe('crawl-3')
    })

    it('emits clear-all event when clear-all confirmed', async () => {
      const wrapper = createWrapper()
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      const clearLink = wrapper.find('.clear-link')
      await clearLink.trigger('click')
      expect(wrapper.emitted('clear-all')).toBeTruthy()
    })

    it('does not emit clear-all when cancelled', async () => {
      const wrapper = createWrapper()
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      const clearLink = wrapper.find('.clear-link')
      await clearLink.trigger('click')
      expect(wrapper.emitted('clear-all')).toBeFalsy()
    })

    it('delete button click does not trigger card click (stopPropagation)', async () => {
      const wrapper = createWrapper()
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      const deleteButton = wrapper.find('.action-btn.delete')
      await deleteButton.trigger('click')
      // Should have emitted delete (from button) not load (from card)
      expect(wrapper.emitted('load')).toBeFalsy()
    })
  })

  describe('Confirmation Dialogs', () => {
    it('shows delete confirmation dialog', async () => {
      const wrapper = createWrapper()
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
      const deleteButton = wrapper.find('.action-btn.delete')
      await deleteButton.trigger('click')
      expect(confirmSpy).toHaveBeenCalledWith('Delete this crawl?')
    })

    it('shows clear-all confirmation dialog', async () => {
      const wrapper = createWrapper()
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
      const clearLink = wrapper.find('.clear-link')
      await clearLink.trigger('click')
      expect(confirmSpy).toHaveBeenCalledWith('Delete all saved crawls? This cannot be undone.')
    })
  })

  describe('Card Information Display', () => {
    it('displays crawl domain correctly', () => {
      const wrapper = createWrapper()
      const urls = wrapper.findAll('.crawl-url')
      expect(urls[0].text()).toBe('example.com')
      expect(urls[1].text()).toBe('another.com')
    })

    it('displays crawl icon', () => {
      const wrapper = createWrapper()
      const icons = wrapper.findAll('.crawl-icon')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('displays action buttons on card', () => {
      const wrapper = createWrapper()
      const cards = wrapper.findAll('.crawl-card')
      cards.forEach(card => {
        expect(card.find('.crawl-actions').exists()).toBe(true)
      })
    })

    it('displays load and delete buttons', () => {
      const wrapper = createWrapper()
      const loadButtons = wrapper.findAll('.action-btn:not(.delete)')
      const deleteButtons = wrapper.findAll('.action-btn.delete')
      expect(loadButtons.length).toBeGreaterThan(0)
      expect(deleteButtons.length).toBeGreaterThan(0)
    })

    it('has title attributes on action buttons', () => {
      const wrapper = createWrapper()
      const actionButtons = wrapper.findAll('.action-btn')
      actionButtons.forEach(btn => {
        expect(btn.attributes('title')).toBeTruthy()
      })
    })
  })

  describe('Reactivity', () => {
    it('updates when savedCrawls prop changes', async () => {
      const wrapper = createWrapper([])
      expect(wrapper.text()).toContain('No previous crawls')

      await wrapper.setProps({ savedCrawls: mockCrawls })
      expect(wrapper.findAll('.crawl-card')).toHaveLength(3)
    })

    it('updates crawl count when crawls added', async () => {
      const wrapper = createWrapper(mockCrawls.slice(0, 1))
      expect(wrapper.find('.section-count').text()).toBe('1')

      await wrapper.setProps({ savedCrawls: mockCrawls })
      expect(wrapper.find('.section-count').text()).toBe('3')
    })

    it('shows empty state when crawls cleared', async () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.empty-state').exists()).toBe(false)

      await wrapper.setProps({ savedCrawls: [] })
      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })

    it('updates crawl cards when crawls updated', async () => {
      const wrapper = createWrapper(mockCrawls.slice(0, 1))
      expect(wrapper.findAll('.crawl-card')).toHaveLength(1)

      await wrapper.setProps({ savedCrawls: mockCrawls })
      expect(wrapper.findAll('.crawl-card')).toHaveLength(3)
    })
  })

  describe('Edge Cases', () => {
    it('handles null savedCrawls prop', () => {
      const wrapper = createWrapper(null)
      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })

    it('handles crawl with missing pageCount', () => {
      const crawls = [
        {
          id: 'crawl-1',
          domain: 'example.com',
          savedAt: new Date().toISOString(),
          pageCount: undefined,
          errorCount: 0
        }
      ]
      const wrapper = createWrapper(crawls)
      expect(wrapper.exists()).toBe(true)
    })

    it('handles crawl with very long domain name', () => {
      const longDomain = 'a'.repeat(100) + '.com'
      const crawls = [
        {
          id: 'crawl-1',
          domain: longDomain,
          savedAt: new Date().toISOString(),
          pageCount: 10,
          errorCount: 0
        }
      ]
      const wrapper = createWrapper(crawls)
      expect(wrapper.exists()).toBe(true)
    })

    it('handles crawl with very large page count', () => {
      const crawls = [
        {
          id: 'crawl-1',
          domain: 'example.com',
          savedAt: new Date().toISOString(),
          pageCount: 999999,
          errorCount: 0
        }
      ]
      const wrapper = createWrapper(crawls)
      expect(wrapper.text()).toContain('999999 pages')
    })

    it('handles crawl with large error count', () => {
      const crawls = [
        {
          id: 'crawl-1',
          domain: 'example.com',
          savedAt: new Date().toISOString(),
          pageCount: 100,
          errorCount: 50
        }
      ]
      const wrapper = createWrapper(crawls)
      expect(wrapper.text()).toContain('50 errors')
    })

    it('handles multiple crawls with mixed data', () => {
      const mixedCrawls = [
        {
          id: 'crawl-1',
          domain: 'example.com',
          savedAt: new Date().toISOString(),
          pageCount: 10,
          errorCount: 0
        },
        {
          id: 'crawl-2',
          domain: 'test.org',
          savedAt: null,
          pageCount: 5,
          errorCount: 2
        },
        {
          id: 'crawl-3',
          domain: 'another.co.uk',
          savedAt: new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 30).toISOString(),
          pageCount: 100,
          errorCount: null
        }
      ]
      const wrapper = createWrapper(mixedCrawls)
      expect(wrapper.findAll('.crawl-card')).toHaveLength(3)
    })
  })

  describe('CSS Classes', () => {
    it('applies correct classes to all elements', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.section-header').exists()).toBe(true)
      expect(wrapper.find('.section-title').exists()).toBe(true)
      expect(wrapper.find('.crawl-list').exists()).toBe(true)
      expect(wrapper.find('.crawl-card').exists()).toBe(true)
    })

    it('applies delete class to delete button', () => {
      const wrapper = createWrapper()
      const deleteBtn = wrapper.find('.action-btn.delete')
      expect(deleteBtn.exists()).toBe(true)
    })

    it('crawl card has correct hover behavior classes', () => {
      const wrapper = createWrapper()
      const card = wrapper.find('.crawl-card')
      expect(card.classes()).toContain('crawl-card')
    })
  })

  describe('Key Binding', () => {
    it('uses crawl id as key for list items', () => {
      const wrapper = createWrapper()
      const cards = wrapper.findAll('.crawl-card')
      expect(cards).toHaveLength(3)
    })

    it('renders all crawls even with duplicate domains', () => {
      const crawls = [
        {
          id: 'crawl-1',
          domain: 'example.com',
          savedAt: new Date().toISOString(),
          pageCount: 10,
          errorCount: 0
        },
        {
          id: 'crawl-2',
          domain: 'example.com',
          savedAt: new Date(new Date().getTime() - 1000 * 60 * 60).toISOString(),
          pageCount: 15,
          errorCount: 0
        }
      ]
      const wrapper = createWrapper(crawls)
      expect(wrapper.findAll('.crawl-card')).toHaveLength(2)
    })
  })

  describe('Text Content', () => {
    it('displays correct section title', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.section-title').text()).toContain('Previous Crawls')
    })

    it('displays empty state title', () => {
      const wrapper = createWrapper([])
      expect(wrapper.find('.empty-title').text()).toBe('No previous crawls')
    })

    it('displays empty state description', () => {
      const wrapper = createWrapper([])
      expect(wrapper.find('.empty-text').text()).toContain('Your crawl history will appear here')
    })

    it('clear link has correct text', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.clear-link').text()).toContain('Clear all')
    })
  })
})
