import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProgressBars from '../ProgressBars.vue'

describe('ProgressBars Component', () => {
  describe('Rendering', () => {
    it('renders container element', () => {
      const wrapper = mount(ProgressBars, {
        props: { pageProgress: [] }
      })
      expect(wrapper.find('.progress-bars-container').exists()).toBe(true)
    })

    it('renders no bars when pageProgress is empty', () => {
      const wrapper = mount(ProgressBars, {
        props: { pageProgress: [] }
      })
      expect(wrapper.findAll('.progress-bar-vertical')).toHaveLength(0)
    })

    it('renders bars for each progress item', () => {
      const progress = [
        { url: 'https://example.com/1', stage: 1 },
        { url: 'https://example.com/2', stage: 2 },
        { url: 'https://example.com/3', stage: 3 }
      ]

      const wrapper = mount(ProgressBars, {
        props: { pageProgress: progress }
      })
      expect(wrapper.findAll('.progress-bar-vertical')).toHaveLength(3)
    })
  })

  describe('Stage Filtering', () => {
    it('filters items to stages 1-3 only', () => {
      const progress = [
        { url: 'https://example.com/1', stage: 0 },
        { url: 'https://example.com/2', stage: 1 },
        { url: 'https://example.com/3', stage: 2 },
        { url: 'https://example.com/4', stage: 3 },
        { url: 'https://example.com/5', stage: 4 },
        { url: 'https://example.com/6', stage: null }
      ]

      const wrapper = mount(ProgressBars, {
        props: { pageProgress: progress }
      })

      // Should only render stages 1, 2, 3 (three bars)
      expect(wrapper.findAll('.progress-bar-vertical')).toHaveLength(3)
    })

    it('includes stage 1 items', () => {
      const progress = [{ url: 'https://example.com/1', stage: 1 }]
      const wrapper = mount(ProgressBars, {
        props: { pageProgress: progress }
      })
      expect(wrapper.findAll('.progress-bar-vertical')).toHaveLength(1)
    })

    it('excludes stage 0 items', () => {
      const progress = [{ url: 'https://example.com/1', stage: 0 }]
      const wrapper = mount(ProgressBars, {
        props: { pageProgress: progress }
      })
      expect(wrapper.findAll('.progress-bar-vertical')).toHaveLength(0)
    })

    it('excludes stage 4 and above', () => {
      const progress = [
        { url: 'https://example.com/1', stage: 4 },
        { url: 'https://example.com/2', stage: 5 },
        { url: 'https://example.com/3', stage: 10 }
      ]
      const wrapper = mount(ProgressBars, {
        props: { pageProgress: progress }
      })
      expect(wrapper.findAll('.progress-bar-vertical')).toHaveLength(0)
    })
  })

  describe('Bar Limiting', () => {
    it('limits visible bars to 5 maximum', () => {
      const progress = Array(10).fill(null).map((_, i) => ({
        url: `https://example.com/${i}`,
        stage: 1
      }))

      const wrapper = mount(ProgressBars, {
        props: { pageProgress: progress }
      })
      expect(wrapper.findAll('.progress-bar-vertical')).toHaveLength(5)
    })

    it('shows first 5 bars when more than 5 items', () => {
      const progress = [
        { url: 'https://example.com/1', stage: 1 },
        { url: 'https://example.com/2', stage: 1 },
        { url: 'https://example.com/3', stage: 1 },
        { url: 'https://example.com/4', stage: 1 },
        { url: 'https://example.com/5', stage: 1 },
        { url: 'https://example.com/6', stage: 1 }
      ]

      const wrapper = mount(ProgressBars, {
        props: { pageProgress: progress }
      })

      const bars = wrapper.findAll('.progress-bar-vertical')
      expect(bars).toHaveLength(5)
      expect(bars[0].attributes('title')).toContain('example.com/1')
      expect(bars[4].attributes('title')).toContain('example.com/5')
    })

    it('shows fewer bars if fewer items available', () => {
      const progress = [
        { url: 'https://example.com/1', stage: 1 },
        { url: 'https://example.com/2', stage: 1 }
      ]

      const wrapper = mount(ProgressBars, {
        props: { pageProgress: progress }
      })
      expect(wrapper.findAll('.progress-bar-vertical')).toHaveLength(2)
    })
  })

  describe('Height Calculation', () => {
    it('calculates correct height for stage 1 (25%)', () => {
      const wrapper = mount(ProgressBars, {
        props: { pageProgress: [] }
      })

      expect(wrapper.vm.getHeight(1)).toBe('25%')
    })

    it('calculates correct height for stage 2 (50%)', () => {
      const wrapper = mount(ProgressBars, {
        props: { pageProgress: [] }
      })

      expect(wrapper.vm.getHeight(2)).toBe('50%')
    })

    it('calculates correct height for stage 3 (75%)', () => {
      const wrapper = mount(ProgressBars, {
        props: { pageProgress: [] }
      })

      expect(wrapper.vm.getHeight(3)).toBe('75%')
    })

    it('returns 0% for unknown stages', () => {
      const wrapper = mount(ProgressBars, {
        props: { pageProgress: [] }
      })

      expect(wrapper.vm.getHeight(4)).toBe('0%')
      expect(wrapper.vm.getHeight(0)).toBe('0%')
      expect(wrapper.vm.getHeight(null)).toBe('0%')
    })

    it('applies height style to progress bar fill', () => {
      const progress = [{ url: 'https://example.com', stage: 2 }]
      const wrapper = mount(ProgressBars, {
        props: { pageProgress: progress }
      })

      const fill = wrapper.find('.progress-bar-fill')
      expect(fill.attributes('style')).toContain('50%')
    })
  })

  describe('Data Attributes', () => {
    it('sets data-stage attribute from stage value', () => {
      const progress = [
        { url: 'https://example.com/1', stage: 1 },
        { url: 'https://example.com/2', stage: 2 },
        { url: 'https://example.com/3', stage: 3 }
      ]

      const wrapper = mount(ProgressBars, {
        props: { pageProgress: progress }
      })

      const bars = wrapper.findAll('.progress-bar-vertical')
      expect(bars[0].attributes('data-stage')).toBe('1')
      expect(bars[1].attributes('data-stage')).toBe('2')
      expect(bars[2].attributes('data-stage')).toBe('3')
    })

    it('sets title attribute to URL', () => {
      const progress = [
        { url: 'https://example.com/page1', stage: 1 },
        { url: 'https://example.com/page2', stage: 2 }
      ]

      const wrapper = mount(ProgressBars, {
        props: { pageProgress: progress }
      })

      const bars = wrapper.findAll('.progress-bar-vertical')
      expect(bars[0].attributes('title')).toBe('https://example.com/page1')
      expect(bars[1].attributes('title')).toBe('https://example.com/page2')
    })
  })

  describe('Key Binding', () => {
    it('uses unique keys for list items', () => {
      const progress = [
        { url: 'https://example.com/1', stage: 1 },
        { url: 'https://example.com/1', stage: 2 }
      ]

      const wrapper = mount(ProgressBars, {
        props: { pageProgress: progress }
      })

      // Component should render both even with same URL
      expect(wrapper.findAll('.progress-bar-vertical')).toHaveLength(2)
    })
  })

  describe('Reactivity', () => {
    it('updates bars when pageProgress prop changes', async () => {
      const wrapper = mount(ProgressBars, {
        props: { pageProgress: [] }
      })

      expect(wrapper.findAll('.progress-bar-vertical')).toHaveLength(0)

      await wrapper.setProps({
        pageProgress: [
          { url: 'https://example.com/1', stage: 1 },
          { url: 'https://example.com/2', stage: 2 }
        ]
      })

      expect(wrapper.findAll('.progress-bar-vertical')).toHaveLength(2)
    })

    it('updates bars when items are added', async () => {
      const wrapper = mount(ProgressBars, {
        props: {
          pageProgress: [{ url: 'https://example.com/1', stage: 1 }]
        }
      })

      expect(wrapper.findAll('.progress-bar-vertical')).toHaveLength(1)

      await wrapper.setProps({
        pageProgress: [
          { url: 'https://example.com/1', stage: 1 },
          { url: 'https://example.com/2', stage: 2 },
          { url: 'https://example.com/3', stage: 3 }
        ]
      })

      expect(wrapper.findAll('.progress-bar-vertical')).toHaveLength(3)
    })

    it('respects 5 bar limit after update', async () => {
      const wrapper = mount(ProgressBars, {
        props: {
          pageProgress: Array(3).fill(null).map((_, i) => ({
            url: `https://example.com/${i}`,
            stage: 1
          }))
        }
      })

      expect(wrapper.findAll('.progress-bar-vertical')).toHaveLength(3)

      await wrapper.setProps({
        pageProgress: Array(10).fill(null).map((_, i) => ({
          url: `https://example.com/${i}`,
          stage: 1
        }))
      })

      expect(wrapper.findAll('.progress-bar-vertical')).toHaveLength(5)
    })
  })

  describe('Edge Cases', () => {
    it('handles default pageProgress prop', () => {
      const wrapper = mount(ProgressBars, {
        props: {}
      })
      expect(wrapper.exists()).toBe(true)
      // Default is empty array
      expect(wrapper.findAll('.progress-bar-vertical')).toHaveLength(0)
    })

    it('handles pageProgress as array (default)', () => {
      const wrapper = mount(ProgressBars, {
        props: { pageProgress: [] }
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('handles items with missing url property', () => {
      const progress = [
        { stage: 1 },
        { url: '', stage: 2 }
      ]

      const wrapper = mount(ProgressBars, {
        props: { pageProgress: progress }
      })

      expect(wrapper.findAll('.progress-bar-vertical')).toHaveLength(2)
    })

    it('handles items with missing stage property', () => {
      const progress = [
        { url: 'https://example.com', stage: undefined },
        { url: 'https://example.com' }
      ]

      const wrapper = mount(ProgressBars, {
        props: { pageProgress: progress }
      })

      expect(wrapper.findAll('.progress-bar-vertical')).toHaveLength(0)
    })

    it('handles very long URLs', () => {
      const longUrl = 'https://example.com/' + 'path/'.repeat(50)
      const progress = [{ url: longUrl, stage: 1 }]

      const wrapper = mount(ProgressBars, {
        props: { pageProgress: progress }
      })

      expect(wrapper.find('.progress-bar-vertical').attributes('title')).toBe(longUrl)
    })
  })

  describe('CSS Classes', () => {
    it('applies correct classes to all elements', () => {
      const progress = [{ url: 'https://example.com', stage: 1 }]
      const wrapper = mount(ProgressBars, {
        props: { pageProgress: progress }
      })

      expect(wrapper.find('.progress-bars-container').exists()).toBe(true)
      expect(wrapper.find('.progress-bar-vertical').exists()).toBe(true)
      expect(wrapper.find('.progress-bar-fill').exists()).toBe(true)
    })
  })
})
