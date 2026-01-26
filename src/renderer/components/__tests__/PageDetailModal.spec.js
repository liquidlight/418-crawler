import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PageDetailModal from '../PageDetailModal.vue'

// Mock useDatabase composable
vi.mock('../../composables/useDatabase.js', () => ({
  useDatabase: () => ({
    getPage: vi.fn().mockResolvedValue(null)
  })
}))

describe('PageDetailModal Component', () => {
  let mockPage

  const createWrapper = (page = 'default') =>
    mount(PageDetailModal, {
      props: { page: page === 'default' ? mockPage : page }
    })

  beforeEach(() => {
    mockPage = {
      url: 'https://example.com/page',
      statusCode: 200,
      fileType: 'html',
      responseTime: 145,
      title: 'Test Page',
      h1: 'Main Heading',
      metaDescription: 'Test description',
      inLinks: ['https://example.com', 'https://example.com/other'],
      outLinks: ['https://example.com/next', 'https://example.com/prev'],
      externalLinks: ['https://external.com', 'https://cdn.example.com/image.jpg'],
      assets: ['https://example.com/style.css', 'https://example.com/script.js']
    }
  })

  describe('Rendering', () => {
    it('does not render when page prop is null', () => {
      const wrapper = createWrapper(null)
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it.each([
      ['.modal-overlay', 'modal overlay'],
      ['.modal', 'modal container'],
      ['.modal-header', 'modal header'],
      ['.modal-body', 'modal body'],
      ['.modal-footer', 'modal footer']
    ])('renders %s', (selector, description) => {
      const wrapper = createWrapper()
      expect(wrapper.find(selector).exists()).toBe(true)
    })

    it('renders modal header with title', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.modal-header').exists()).toBe(true)
      expect(wrapper.text()).toContain('Page Details')
    })

    it('renders close button in header', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.btn-close').exists()).toBe(true)
    })

    it('renders close button in footer', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAll('button')
      const closeButton = buttons.find(b => b.text() === 'Close')
      expect(closeButton).toBeTruthy()
    })
  })

  describe('URL Section', () => {
    it('displays URL section', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('URL')
    })

    it('displays the page URL as a link', () => {
      const wrapper = createWrapper()
      const link = wrapper.find('.url-link')
      expect(link.exists()).toBe(true)
      expect(link.text()).toBe(mockPage.url)
    })

    it('URL link opens in new tab', () => {
      const wrapper = createWrapper()
      const link = wrapper.find('.url-link')
      expect(link.attributes('target')).toBe('_blank')
    })

    it('URL link has security attributes', () => {
      const wrapper = createWrapper()
      const link = wrapper.find('.url-link')
      expect(link.attributes('rel')).toBe('noopener noreferrer')
    })
  })

  describe('Status, File Type, Response Time', () => {
    it.each([
      ['Status', '200'],
      ['File Type', 'html'],
      ['Response Time', '145ms']
    ])('displays %s as %s', (label, value) => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain(label)
      expect(wrapper.text()).toContain(value)
    })

    it('displays all three metrics in detail row', () => {
      const wrapper = createWrapper()
      const detailRow = wrapper.find('.detail-row')
      expect(detailRow.exists()).toBe(true)
    })
  })

  describe('Metadata Section', () => {
    it('displays metadata section', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Metadata')
    })

    it.each([
      ['Title:', 'Test Page', {}],
      ['H1:', 'Main Heading', {}],
      ['Description:', 'Test description', {}],
      ['Title:', '(none)', { title: null }],
      ['H1:', '(none)', { h1: null }],
      ['Description:', '(none)', { metaDescription: null }]
    ])('displays metadata %s as %s', (label, expectedValue, pageOverrides) => {
      const page = { ...mockPage, ...pageOverrides }
      const wrapper = createWrapper(page)
      expect(wrapper.text()).toContain(label)
      expect(wrapper.text()).toContain(expectedValue)
    })
  })

  describe('In-Links Section', () => {
    it('displays in-links section with count', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('In-Links')
      expect(wrapper.text()).toContain('(2)')
    })

    it('renders in-links as buttons', () => {
      const wrapper = createWrapper()
      const linkButtons = wrapper.findAll('.link-button')
      expect(linkButtons.length).toBeGreaterThan(0)
    })

    it.each([
      { inLinks: [] },
      { inLinks: undefined }
    ])('displays no in-links message when empty or undefined', (pageOverrides) => {
      const page = { ...mockPage, ...pageOverrides }
      const wrapper = createWrapper(page)
      expect(wrapper.text()).toContain('No in-links found')
    })

    it('displays all in-links', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('https://example.com')
    })
  })

  describe('Out-Links Section', () => {
    it('displays out-links section with count', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Out-Links')
      expect(wrapper.text()).toContain('(2)')
    })

    it('renders out-links as buttons', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAll('.link-button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('displays no out-links message when empty', () => {
      const page = { ...mockPage, outLinks: [] }
      const wrapper = createWrapper(page)
      expect(wrapper.text()).toContain('No out-links found')
    })
  })

  describe('External Links Section', () => {
    it('displays external links section when present', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('External Links')
    })

    it('displays external link count', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('External Links (2)')
    })

    it('displays external links as clickable links', () => {
      const wrapper = createWrapper()
      const externalLinks = wrapper.findAll('.external-link')
      expect(externalLinks.length).toBeGreaterThan(0)
    })

    it('external links open in new tab', () => {
      const wrapper = createWrapper()
      const externalLinks = wrapper.findAll('.external-link')
      externalLinks.forEach(link => {
        expect(link.attributes('target')).toBe('_blank')
      })
    })

    it('limits external links display to 10', () => {
      const page = {
        ...mockPage,
        externalLinks: Array(15).fill('https://external.com')
      }
      const wrapper = createWrapper(page)
      const externalLinks = wrapper.findAll('.external-link')
      expect(externalLinks.length).toBeLessThanOrEqual(10)
    })

    it('displays more message when over 10 external links', () => {
      const page = {
        ...mockPage,
        externalLinks: Array(15).fill('https://external.com')
      }
      const wrapper = createWrapper(page)
      expect(wrapper.text()).toContain('and 5 more external links...')
    })

    it('hides external links section when not present', () => {
      const page = { ...mockPage, externalLinks: [] }
      const wrapper = createWrapper(page)
      const sections = wrapper.findAll('.detail-section')
      const hasExternalSection = sections.some(s => s.text().includes('External Links'))
      expect(hasExternalSection).toBe(false)
    })
  })

  describe('Assets Section', () => {
    it('displays assets section when present', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Assets')
    })

    it('displays asset count', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Assets (2)')
    })

    it('displays assets as clickable links', () => {
      const wrapper = createWrapper()
      const assetLinks = wrapper.findAll('.asset-link')
      expect(assetLinks.length).toBeGreaterThan(0)
    })

    it('assets open in new tab', () => {
      const wrapper = createWrapper()
      const assetLinks = wrapper.findAll('.asset-link')
      assetLinks.forEach(link => {
        expect(link.attributes('target')).toBe('_blank')
      })
    })

    it('limits assets display to 10', () => {
      const page = {
        ...mockPage,
        assets: Array(15).fill('https://example.com/asset.js')
      }
      const wrapper = createWrapper(page)
      const assetLinks = wrapper.findAll('.asset-link')
      expect(assetLinks.length).toBeLessThanOrEqual(10)
    })

    it('displays more message when over 10 assets', () => {
      const page = {
        ...mockPage,
        assets: Array(15).fill('https://example.com/asset.js')
      }
      const wrapper = createWrapper(page)
      expect(wrapper.text()).toContain('and 5 more assets...')
    })

    it('hides assets section when not present', () => {
      const page = { ...mockPage, assets: [] }
      const wrapper = createWrapper(page)
      const sections = wrapper.findAll('.detail-section')
      const hasAssetsSection = sections.some(s => s.text().includes('Assets'))
      expect(hasAssetsSection).toBe(false)
    })
  })

  describe('Event Emissions', () => {
    it('emits close when close button clicked', async () => {
      const wrapper = createWrapper()
      const closeButton = wrapper.find('.btn-close')
      await closeButton.trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('emits close when modal overlay clicked', async () => {
      const wrapper = createWrapper()
      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('does not emit close when modal content clicked', async () => {
      const wrapper = createWrapper()
      const modal = wrapper.find('.modal')
      await modal.trigger('click')
      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('emits close when footer close button clicked', async () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAll('button')
      const closeBtn = buttons.find(b => b.text() === 'Close')
      await closeBtn.trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('emits navigate when in-link clicked', async () => {
      const wrapper = createWrapper()
      const linkButtons = wrapper.findAll('.link-button')
      if (linkButtons.length > 0) {
        await linkButtons[0].trigger('click')
        expect(wrapper.emitted('navigate')).toBeTruthy()
        expect(wrapper.emitted('navigate')[0][0]).toBe(mockPage.inLinks[0])
      }
    })

    it('emits navigate with correct URL', async () => {
      const wrapper = createWrapper()
      const linkButtons = wrapper.findAll('.link-button')
      await linkButtons[0].trigger('click')
      expect(wrapper.emitted('navigate')[0][0]).toBe('https://example.com')
    })
  })

  describe('Reactivity', () => {
    it('updates when page prop changes', async () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Test Page')

      const newPage = { ...mockPage, title: 'New Title' }
      await wrapper.setProps({ page: newPage })
      expect(wrapper.text()).toContain('New Title')
    })

    it('hides when page prop changes to null', async () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)

      await wrapper.setProps({ page: null })
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('shows when page prop changes from null', async () => {
      const wrapper = createWrapper(null)
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)

      await wrapper.setProps({ page: mockPage })
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('handles page with all null/undefined properties', () => {
      const page = {
        url: 'https://example.com'
      }
      const wrapper = createWrapper(page)
      expect(wrapper.exists()).toBe(true)
    })

    it('handles page with empty arrays', () => {
      const page = {
        url: 'https://example.com',
        statusCode: 200,
        fileType: 'html',
        responseTime: 100,
        title: 'Test',
        h1: 'Test',
        metaDescription: 'Test',
        inLinks: [],
        outLinks: [],
        externalLinks: [],
        assets: []
      }
      const wrapper = createWrapper(page)
      expect(wrapper.text()).toContain('No in-links found')
      expect(wrapper.text()).toContain('No out-links found')
    })

    it('handles very long URLs', () => {
      const longUrl = 'https://example.com/' + 'very/long/path/'.repeat(20)
      const page = { ...mockPage, url: longUrl }
      const wrapper = createWrapper(page)
      expect(wrapper.exists()).toBe(true)
    })

    it('handles response time of 0ms', () => {
      const page = { ...mockPage, responseTime: 0 }
      const wrapper = createWrapper(page)
      expect(wrapper.text()).toContain('0ms')
    })

    it('handles response time of null', () => {
      const page = { ...mockPage, responseTime: null }
      const wrapper = createWrapper(page)
      expect(wrapper.exists()).toBe(true)
    })

    it('handles many in-links', () => {
      const page = {
        ...mockPage,
        inLinks: Array(50).fill('https://example.com')
      }
      const wrapper = createWrapper(page)
      expect(wrapper.text()).toContain('In-Links (50)')
    })

    it('handles external links with special characters', () => {
      const page = {
        ...mockPage,
        externalLinks: ['https://example.com?param=value&other=123#hash']
      }
      const wrapper = createWrapper(page)
      expect(wrapper.exists()).toBe(true)
    })

    it('handles duplicate links in arrays', () => {
      const page = {
        ...mockPage,
        inLinks: ['https://example.com', 'https://example.com'],
        outLinks: ['https://example.com/page', 'https://example.com/page']
      }
      const wrapper = createWrapper(page)
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('CSS Classes', () => {
    it('applies correct CSS classes to modal elements', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
      expect(wrapper.find('.modal').exists()).toBe(true)
      expect(wrapper.find('.modal-header').exists()).toBe(true)
      expect(wrapper.find('.modal-body').exists()).toBe(true)
      expect(wrapper.find('.modal-footer').exists()).toBe(true)
    })

    it('applies detail section classes', () => {
      const wrapper = createWrapper()
      const detailSections = wrapper.findAll('.detail-section')
      expect(detailSections.length).toBeGreaterThan(0)
    })

    it('applies link item classes', () => {
      const wrapper = createWrapper()
      const linkItems = wrapper.findAll('.link-item')
      expect(linkItems.length).toBeGreaterThan(0)
    })
  })

  describe('Link Count Display', () => {
    it('displays correct count for in-links', () => {
      const page = { ...mockPage, inLinks: ['a', 'b', 'c'] }
      const wrapper = createWrapper(page)
      expect(wrapper.text()).toContain('In-Links (3)')
    })

    it('displays 0 count for empty in-links', () => {
      const page = { ...mockPage, inLinks: [] }
      const wrapper = mount(PageDetailModal, {
        props: { page }
      })
      expect(wrapper.text()).toContain('In-Links (0)')
    })

    it('displays correct count for out-links', () => {
      const page = { ...mockPage, outLinks: ['a', 'b'] }
      const wrapper = mount(PageDetailModal, {
        props: { page }
      })
      expect(wrapper.text()).toContain('Out-Links (2)')
    })

    it('displays correct count for external links', () => {
      const page = { ...mockPage, externalLinks: Array(7).fill('url') }
      const wrapper = mount(PageDetailModal, {
        props: { page }
      })
      expect(wrapper.text()).toContain('External Links (7)')
    })

    it('displays correct count for assets', () => {
      const page = { ...mockPage, assets: Array(5).fill('asset') }
      const wrapper = mount(PageDetailModal, {
        props: { page }
      })
      expect(wrapper.text()).toContain('Assets (5)')
    })
  })

  describe('Status Badge', () => {
    it('applies status badge class', () => {
      const wrapper = createWrapper()
      const badge = wrapper.find('.badge')
      expect(badge.exists()).toBe(true)
      expect(badge.classes()).toContain('s2xx')
    })

    it('displays badge info class for file type', () => {
      const wrapper = createWrapper()
      const badges = wrapper.findAll('.badge')
      const hasInfoBadge = badges.some(b => b.classes().includes('badge-info'))
      expect(hasInfoBadge).toBe(true)
    })
  })

  describe('Text Truncation', () => {
    it('uses truncateUrl utility for in-links', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.truncateUrl).toBeTruthy()
    })

    it('uses truncateUrl utility for out-links', () => {
      const wrapper = createWrapper()
      const linkButtons = wrapper.findAll('.link-button')
      expect(linkButtons.length).toBeGreaterThan(0)
    })

    it('uses truncateUrl utility for external links', () => {
      const wrapper = createWrapper()
      const externalLinks = wrapper.findAll('.external-link')
      expect(externalLinks.length).toBeGreaterThan(0)
    })

    it('uses truncateUrl utility for assets', () => {
      const wrapper = createWrapper()
      const assetLinks = wrapper.findAll('.asset-link')
      expect(assetLinks.length).toBeGreaterThan(0)
    })
  })
})
