import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CrawlerProgress from '../CrawlerProgress.vue'

describe('CrawlerProgress Component', () => {
  const mockState = {
    isActive: false,
    isPaused: false,
    stats: {
      pagesFound: 100,
      pagesCrawled: 50,
      errors: 0,
      queueSize: 50
    },
    totalTime: 30000,
    inProgressCount: 0,
    queueSize: 50,
    backoffState: null
  }

  const mockQueueUrls = [
    'https://example.com/page1',
    'https://example.com/page2',
    'https://example.com/page3',
    'https://example.com/page4'
  ]

  describe('Status Indicator', () => {
    it('renders status section', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: mockState,
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.find('.status-section').exists()).toBe(true)
    })

    it('displays idle status when not active and no pages crawled', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: {
            ...mockState,
            isActive: false,
            stats: { pagesFound: 0, pagesCrawled: 0, errors: 0 }
          },
          pagesCount: 0,
          queueUrls: []
        }
      })

      expect(wrapper.vm.statusText).toBe('Idle')
      expect(wrapper.vm.statusColor).toBe('secondary')
    })

    it('displays crawling status when active', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: { ...mockState, isActive: true },
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.vm.statusText).toBe('Crawling...')
      expect(wrapper.vm.statusColor).toBe('info')
    })

    it('displays paused status when paused', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: { ...mockState, isActive: true, isPaused: true },
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.vm.statusText).toBe('Paused')
      expect(wrapper.vm.statusColor).toBe('warning')
    })

    it('displays complete status when done', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: {
            ...mockState,
            isActive: false,
            stats: { pagesFound: 10, pagesCrawled: 10, errors: 0 }
          },
          pagesCount: 10,
          queueUrls: []
        }
      })

      expect(wrapper.vm.statusText).toBe('Complete')
      expect(wrapper.vm.statusColor).toBe('success')
    })

    it('displays danger status when errors exist', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: {
            ...mockState,
            isActive: false,
            stats: { pagesFound: 10, pagesCrawled: 10, errors: 2 }
          },
          pagesCount: 10,
          queueUrls: []
        }
      })

      expect(wrapper.vm.statusColor).toBe('danger')
    })
  })

  describe('Stats Grid', () => {
    it('displays pages found count', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: mockState,
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.text()).toContain('Pages Found')
      expect(wrapper.text()).toContain('100')
    })

    it('displays pages crawled count', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: mockState,
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.text()).toContain('Pages Crawled')
      expect(wrapper.text()).toContain('50')
    })

    it('displays queue size', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: mockState,
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.text()).toContain('In Queue')
      expect(wrapper.text()).toContain('50')
    })

    it('displays error count', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: mockState,
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.text()).toContain('Errors')
    })
  })

  describe('Progress Bar', () => {
    it('calculates correct progress percentage', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: { ...mockState, stats: { pagesFound: 100, pagesCrawled: 50, errors: 0 } },
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.vm.progressPercent).toBe(50)
    })

    it('displays progress bar with correct width', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: mockState,
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      const fill = wrapper.find('.progress-fill')
      expect(fill.attributes('style')).toContain('50%')
    })

    it('shows progress labels correctly', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: mockState,
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.text()).toContain('50 crawled')
      expect(wrapper.text()).toContain('50 pending')
      expect(wrapper.text()).toContain('50%')
    })

    it('calculates pending count correctly', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: mockState,
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.vm.pendingCount).toBe(50)
    })

    it('hides progress section when no pages found', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: { ...mockState, stats: { pagesFound: 0, pagesCrawled: 0, errors: 0 } },
          pagesCount: 0,
          queueUrls: []
        }
      })

      expect(wrapper.find('.progress-section').exists()).toBe(false)
    })
  })

  describe('Performance Metrics', () => {
    it('calculates crawl speed correctly', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: {
            ...mockState,
            isActive: true,
            totalTime: 10000,
            stats: { pagesFound: 20, pagesCrawled: 20, errors: 0 }
          },
          pagesCount: 20,
          queueUrls: mockQueueUrls
        }
      })

      // 20 pages / 10 seconds = 2 pages/sec
      expect(wrapper.vm.crawlSpeed).toBe(2)
    })

    it('displays performance metrics when crawling', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: {
            ...mockState,
            isActive: true,
            inProgressCount: 3
          },
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.text()).toContain('Crawl Speed')
      expect(wrapper.text()).toContain('Concurrent')
    })

    it('hides performance metrics when not active', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: mockState,
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.find('.performance-metrics').exists()).toBe(false)
    })

    it('hides performance metrics when crawl speed is 0', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: {
            ...mockState,
            isActive: true,
            totalTime: 0,
            stats: { pagesFound: 0, pagesCrawled: 0, errors: 0 }
          },
          pagesCount: 0,
          queueUrls: []
        }
      })

      expect(wrapper.find('.performance-metrics').exists()).toBe(false)
    })
  })

  describe('Queue Section', () => {
    it('displays queue section when URLs in queue', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: mockState,
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.find('.queue-section').exists()).toBe(true)
      expect(wrapper.text()).toContain('Queue')
    })

    it('hides queue section when empty queue', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: { ...mockState, queueSize: 0 },
          pagesCount: 100,
          queueUrls: []
        }
      })

      expect(wrapper.find('.queue-section').exists()).toBe(false)
    })

    it('displays queue preview with first 3 URLs', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: mockState,
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.vm.queuePreview).toHaveLength(3)
      expect(wrapper.vm.queuePreview[0]).toBe('https://example.com/page1')
    })

    it('displays more count when queue exceeds preview', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: mockState,
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      // When 4 URLs exist and 3 are shown in preview, should show "+1 more"
      expect(wrapper.text()).toMatch(/\+\d+ more in queue/)
    })

    it('shows loading message when queue URLs not available', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: mockState,
          pagesCount: 100,
          queueUrls: []
        }
      })

      expect(wrapper.text()).toContain('Loading queue...')
    })
  })

  describe('Timing Information', () => {
    it('displays total time when > 0', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: { ...mockState, totalTime: 125000 },
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.text()).toContain('Total time:')
      expect(wrapper.text()).toContain('2m 5s')
    })

    it('hides total time when 0', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: { ...mockState, totalTime: 0 },
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.find('.timing').exists()).toBe(false)
    })
  })

  describe('Database Pages Count', () => {
    it('displays pages count in database', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: mockState,
          pagesCount: 150,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.text()).toContain('150')
      expect(wrapper.text()).toContain('pages stored in database')
    })

    it('hides pages count when 0', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: mockState,
          pagesCount: 0,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.find('.pages-count').exists()).toBe(false)
    })
  })

  describe('Backoff State', () => {
    it('displays backoff warning when in backoff', () => {
      const backoffState = {
        isInBackoff: true,
        maxBackoffReached: false,
        attemptCount: 1,
        backoffEndTime: Date.now() + 5000
      }
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: { ...mockState, backoffState },
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.find('.backoff-section').exists()).toBe(true)
      expect(wrapper.text()).toContain('Server Overload Detected')
    })

    it('displays backoff status as warning color', () => {
      const backoffState = {
        isInBackoff: true,
        maxBackoffReached: false,
        attemptCount: 1,
        backoffEndTime: Date.now() + 5000
      }
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: { ...mockState, backoffState },
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.vm.statusColor).toBe('warning')
    })

    it('displays max backoff reached message', () => {
      const backoffState = {
        isInBackoff: true,
        maxBackoffReached: true,
        attemptCount: 3
      }
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: { ...mockState, backoffState },
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.text()).toContain('Server consistently overloaded')
      expect(wrapper.find('.backoff-section.max-reached').exists()).toBe(true)
    })

    it('displays max backoff status as danger color', () => {
      const backoffState = {
        isInBackoff: true,
        maxBackoffReached: true,
        attemptCount: 3
      }
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: { ...mockState, backoffState },
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.vm.statusColor).toBe('danger')
    })

    it('hides backoff section when not in backoff', () => {
      const wrapper = mount(CrawlerProgress, {
        props: {
          state: mockState,
          pagesCount: 100,
          queueUrls: mockQueueUrls
        }
      })

      expect(wrapper.find('.backoff-section').exists()).toBe(false)
    })
  })
})
