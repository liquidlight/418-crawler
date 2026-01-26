import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CrawlerInput from '../CrawlerInput.vue'

describe('CrawlerInput Component', () => {
  describe('Full View', () => {
    it('renders full input view by default', () => {
      const wrapper = mount(CrawlerInput)
      expect(wrapper.find('.crawler-input').exists()).toBe(true)
      expect(wrapper.find('.input-group').exists()).toBe(true)
    })

    it('displays label and input field', () => {
      const wrapper = mount(CrawlerInput)
      expect(wrapper.find('label').exists()).toBe(true)
      expect(wrapper.find('label').text()).toBe('Website URL')
      expect(wrapper.find('input').exists()).toBe(true)
    })

    it('displays crawl button', () => {
      const wrapper = mount(CrawlerInput)
      const button = wrapper.find('.btn-primary')
      expect(button.exists()).toBe(true)
      expect(button.text()).toBe('Crawl')
    })

    it('shows placeholder text', () => {
      const wrapper = mount(CrawlerInput)
      const input = wrapper.find('input')
      expect(input.attributes('placeholder')).toBe('https://example.com')
    })
  })

  describe('Input Only View', () => {
    it('renders input-only view when prop set', () => {
      const wrapper = mount(CrawlerInput, {
        props: { inputOnly: true }
      })
      expect(wrapper.find('.crawler-input-header').exists()).toBe(true)
      expect(wrapper.find('.crawler-input').exists()).toBe(false)
    })

    it('does not show label in input-only view', () => {
      const wrapper = mount(CrawlerInput, {
        props: { inputOnly: true }
      })
      expect(wrapper.find('label').exists()).toBe(false)
    })

    it('hides button in input-only view', () => {
      const wrapper = mount(CrawlerInput, {
        props: { inputOnly: true }
      })
      expect(wrapper.find('.btn-primary').exists()).toBe(false)
    })
  })

  describe('Input Handling', () => {
    it('updates input model on typing', async () => {
      const wrapper = mount(CrawlerInput)
      const input = wrapper.find('input')

      await input.setValue('https://example.com')
      expect(wrapper.vm.inputUrl).toBe('https://example.com')
    })

    it('initializes with url prop', () => {
      const wrapper = mount(CrawlerInput, {
        props: { url: 'https://example.com' }
      })
      expect(wrapper.vm.inputUrl).toBe('https://example.com')
    })

    it('maintains independent local state from prop', async () => {
      const wrapper = mount(CrawlerInput, {
        props: { url: 'https://example.com' }
      })

      await wrapper.find('input').setValue('https://other.com')
      expect(wrapper.vm.inputUrl).toBe('https://other.com')
    })
  })

  describe('Domain Extraction', () => {
    it('extracts domain from URL', () => {
      const wrapper = mount(CrawlerInput)
      wrapper.vm.inputUrl = 'https://example.com/path'

      expect(wrapper.vm.extractedDomain).toBe('example.com')
    })

    it('displays extracted domain in full view', async () => {
      const wrapper = mount(CrawlerInput, {
        props: { inputOnly: false }
      })

      await wrapper.find('input').setValue('https://example.com/page')

      expect(wrapper.find('.domain-info').exists()).toBe(true)
      expect(wrapper.find('.domain-info').text()).toContain('example.com')
    })

    it('returns null for empty input', () => {
      const wrapper = mount(CrawlerInput)
      expect(wrapper.vm.extractedDomain).toBeNull()
    })

    it('handles invalid URLs gracefully', async () => {
      const wrapper = mount(CrawlerInput)
      await wrapper.find('input').setValue('not a valid url')

      // Should return null instead of erroring
      expect(wrapper.vm.extractedDomain).toBeNull()
    })

    it('does not display domain in input-only view', async () => {
      const wrapper = mount(CrawlerInput, {
        props: { inputOnly: true }
      })

      await wrapper.find('input').setValue('https://example.com')
      expect(wrapper.find('.domain-info').exists()).toBe(false)
    })
  })

  describe('Button State', () => {
    it('disables button when input is empty', () => {
      const wrapper = mount(CrawlerInput)
      expect(wrapper.find('.btn-primary').attributes('disabled')).toBeDefined()
    })

    it('disables button when input has only whitespace', async () => {
      const wrapper = mount(CrawlerInput)
      await wrapper.find('input').setValue('   ')

      expect(wrapper.find('.btn-primary').attributes('disabled')).toBeDefined()
    })

    it('enables button when input has valid URL', async () => {
      const wrapper = mount(CrawlerInput)
      await wrapper.find('input').setValue('https://example.com')

      expect(wrapper.find('.btn-primary').attributes('disabled')).toBeUndefined()
    })

    it('disables button when component disabled prop is true', async () => {
      const wrapper = mount(CrawlerInput, {
        props: { disabled: true }
      })

      await wrapper.find('input').setValue('https://example.com')
      expect(wrapper.find('.btn-primary').attributes('disabled')).toBeDefined()
    })

    it('disables input field when disabled prop is true', () => {
      const wrapper = mount(CrawlerInput, {
        props: { disabled: true }
      })

      expect(wrapper.find('input').attributes('disabled')).toBeDefined()
    })
  })

  describe('Form Submission', () => {
    it('emits crawl event with URL on button click', async () => {
      const wrapper = mount(CrawlerInput)
      const url = 'https://example.com'

      await wrapper.find('input').setValue(url)
      await wrapper.find('.btn-primary').trigger('click')

      expect(wrapper.emitted('crawl')).toBeTruthy()
      expect(wrapper.emitted('crawl')[0]).toEqual([url])
    })

    it('emits crawl event on Enter key press', async () => {
      const wrapper = mount(CrawlerInput)
      const url = 'https://example.com'

      await wrapper.find('input').setValue(url)
      await wrapper.find('input').trigger('keyup.enter')

      expect(wrapper.emitted('crawl')).toBeTruthy()
      expect(wrapper.emitted('crawl')[0]).toEqual([url])
    })

    it('trims whitespace before emitting', async () => {
      const wrapper = mount(CrawlerInput)
      const url = '  https://example.com  '

      await wrapper.find('input').setValue(url)
      await wrapper.find('.btn-primary').trigger('click')

      expect(wrapper.emitted('crawl')[0]).toEqual(['https://example.com'])
    })

    it('does not emit if disabled', async () => {
      const wrapper = mount(CrawlerInput, {
        props: { disabled: true }
      })

      await wrapper.find('input').setValue('https://example.com')
      await wrapper.find('.btn-primary').trigger('click')

      expect(wrapper.emitted('crawl')).toBeFalsy()
    })

    it('does not emit with empty input', async () => {
      const wrapper = mount(CrawlerInput)
      await wrapper.find('input').setValue('')
      await wrapper.find('.btn-primary').trigger('click')

      expect(wrapper.emitted('crawl')).toBeFalsy()
    })

    it('does not emit with whitespace-only input', async () => {
      const wrapper = mount(CrawlerInput)
      await wrapper.find('input').setValue('   ')
      await wrapper.find('.btn-primary').trigger('click')

      expect(wrapper.emitted('crawl')).toBeFalsy()
    })
  })

  describe('Edge Cases', () => {
    it('handles URLs with special characters', async () => {
      const wrapper = mount(CrawlerInput)
      const url = 'https://example.com/page?id=123&name=test'

      await wrapper.find('input').setValue(url)
      await wrapper.find('.btn-primary').trigger('click')

      expect(wrapper.emitted('crawl')[0]).toEqual([url])
    })

    it('handles HTTPS URLs', async () => {
      const wrapper = mount(CrawlerInput)
      await wrapper.find('input').setValue('https://example.com')

      expect(wrapper.vm.extractedDomain).toBe('example.com')
    })

    it('handles HTTP URLs', async () => {
      const wrapper = mount(CrawlerInput)
      await wrapper.find('input').setValue('http://example.com')

      // extractDomain adds https
      expect(wrapper.vm.extractedDomain).toBe('example.com')
    })

    it('handles URLs with subdomains', async () => {
      const wrapper = mount(CrawlerInput)
      await wrapper.find('input').setValue('https://sub.example.com')

      expect(wrapper.vm.extractedDomain).toBe('sub.example.com')
    })

    it('handles localhost URLs', async () => {
      const wrapper = mount(CrawlerInput)
      await wrapper.find('input').setValue('http://localhost:3000')

      expect(wrapper.vm.extractedDomain).toBe('localhost')
    })
  })

  describe('Accessibility', () => {
    it('has proper input id for label association', () => {
      const wrapper = mount(CrawlerInput)
      const label = wrapper.find('label')
      const input = wrapper.find('input')

      expect(label.attributes('for')).toBe('url-input')
      expect(input.attributes('id')).toBe('url-input')
    })

    it('input has type text', () => {
      const wrapper = mount(CrawlerInput)
      expect(wrapper.find('input').attributes('type')).toBe('text')
    })
  })
})
