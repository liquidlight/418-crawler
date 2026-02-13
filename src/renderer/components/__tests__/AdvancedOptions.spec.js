import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AdvancedOptions from '../AdvancedOptions.vue'

describe('AdvancedOptions Component', () => {
  let mockElectronAPI

  beforeEach(() => {
    // Mock the Electron API
    mockElectronAPI = {
      openAuthBrowser: vi.fn(),
      clearStoredCookies: vi.fn()
    }

    // Set up window.electronAPI
    global.window = global.window || {}
    global.window.electronAPI = mockElectronAPI
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('renders the toggle button', () => {
      const wrapper = mount(AdvancedOptions)
      expect(wrapper.find('.toggle-btn').exists()).toBe(true)
      expect(wrapper.find('.toggle-btn').text()).toContain('Advanced Options')
    })

    it('renders chevron icon in toggle button', () => {
      const wrapper = mount(AdvancedOptions)
      expect(wrapper.find('.chevron').exists()).toBe(true)
    })

    it('does not show options panel by default', () => {
      const wrapper = mount(AdvancedOptions)
      expect(wrapper.find('.options-panel').exists()).toBe(false)
    })

    it('shows options panel when expanded', async () => {
      const wrapper = mount(AdvancedOptions)
      await wrapper.find('.toggle-btn').trigger('click')
      expect(wrapper.find('.options-panel').exists()).toBe(true)
    })

    it('displays cookie authentication section when expanded', async () => {
      const wrapper = mount(AdvancedOptions)
      await wrapper.find('.toggle-btn').trigger('click')

      expect(wrapper.text()).toContain('Cookie Authentication')
      expect(wrapper.text()).toContain('Open the target site in a browser to log in')
    })

    it('displays launch browser button when expanded', async () => {
      const wrapper = mount(AdvancedOptions)
      await wrapper.find('.toggle-btn').trigger('click')

      const button = wrapper.find('.btn-secondary')
      expect(button.exists()).toBe(true)
      expect(button.text()).toBe('Launch Browser to Authenticate')
    })
  })

  describe('Toggle Functionality', () => {
    it('toggles panel visibility on button click', async () => {
      const wrapper = mount(AdvancedOptions)

      // Initially collapsed
      expect(wrapper.find('.options-panel').exists()).toBe(false)

      // Expand
      await wrapper.find('.toggle-btn').trigger('click')
      expect(wrapper.find('.options-panel').exists()).toBe(true)

      // Collapse
      await wrapper.find('.toggle-btn').trigger('click')
      expect(wrapper.find('.options-panel').exists()).toBe(false)
    })

    it('rotates chevron when toggled', async () => {
      const wrapper = mount(AdvancedOptions)
      const chevron = wrapper.find('.chevron')

      // Initially down (rotated 180deg)
      expect(chevron.classes()).not.toContain('chevron-up')

      // Expand - chevron up (no rotation)
      await wrapper.find('.toggle-btn').trigger('click')
      expect(chevron.classes()).toContain('chevron-up')
    })

    it('disables toggle button when component is disabled', () => {
      const wrapper = mount(AdvancedOptions, {
        props: { disabled: true }
      })

      expect(wrapper.find('.toggle-btn').attributes('disabled')).toBeDefined()
    })
  })

  describe('Launch Browser Button State', () => {
    it('is disabled when no URL is provided', async () => {
      const wrapper = mount(AdvancedOptions, {
        props: { url: '' }
      })
      await wrapper.find('.toggle-btn').trigger('click')

      const button = wrapper.find('.btn-secondary')
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('is enabled when URL is provided', async () => {
      const wrapper = mount(AdvancedOptions, {
        props: { url: 'https://example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')

      const button = wrapper.find('.btn-secondary')
      expect(button.attributes('disabled')).toBeUndefined()
    })

    it('is disabled when component is disabled', async () => {
      const wrapper = mount(AdvancedOptions, {
        props: {
          url: 'https://example.com',
          disabled: false  // Allow toggle to work
        }
      })
      await wrapper.find('.toggle-btn').trigger('click')

      // Now set disabled via props update
      await wrapper.setProps({ disabled: true })

      const button = wrapper.find('.btn-secondary')
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('shows "Browser open..." when launching', async () => {
      mockElectronAPI.openAuthBrowser.mockImplementation(() => new Promise(() => {}))

      const wrapper = mount(AdvancedOptions, {
        props: { url: 'https://example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')
      await wrapper.find('.btn-secondary').trigger('click')

      // Wait for the next tick
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.btn-secondary').text()).toBe('Browser open...')
    })

    it('is disabled when browser is launching', async () => {
      mockElectronAPI.openAuthBrowser.mockImplementation(() => new Promise(() => {}))

      const wrapper = mount(AdvancedOptions, {
        props: { url: 'https://example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')
      await wrapper.find('.btn-secondary').trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.btn-secondary').attributes('disabled')).toBeDefined()
    })
  })

  describe('Electron Detection', () => {
    it('enables button when Electron API is available', async () => {
      const wrapper = mount(AdvancedOptions, {
        props: { url: 'https://example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')

      expect(wrapper.find('.btn-secondary').attributes('disabled')).toBeUndefined()
      expect(wrapper.find('.web-mode-notice').exists()).toBe(false)
    })

    it('disables button when Electron API is unavailable', async () => {
      delete global.window.electronAPI

      const wrapper = mount(AdvancedOptions, {
        props: { url: 'https://example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')

      expect(wrapper.find('.btn-secondary').attributes('disabled')).toBeDefined()
      expect(wrapper.find('.web-mode-notice').exists()).toBe(true)
      expect(wrapper.text()).toContain('Cookie authentication requires the desktop app')

      // Restore for other tests
      global.window.electronAPI = mockElectronAPI
    })
  })

  describe('Cookie Authentication Flow', () => {
    it('calls openAuthBrowser with normalized URL', async () => {
      mockElectronAPI.openAuthBrowser.mockResolvedValue({
        count: 5,
        domain: 'example.com',
        cookies: [{ name: 'test', value: '123' }]
      })

      const wrapper = mount(AdvancedOptions, {
        props: { url: 'https://example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')
      await wrapper.find('.btn-secondary').trigger('click')

      expect(mockElectronAPI.openAuthBrowser).toHaveBeenCalledWith('https://example.com')
    })

    it('adds https:// prefix if missing', async () => {
      mockElectronAPI.openAuthBrowser.mockResolvedValue({
        count: 5,
        domain: 'example.com',
        cookies: []
      })

      const wrapper = mount(AdvancedOptions, {
        props: { url: 'example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')
      await wrapper.find('.btn-secondary').trigger('click')

      expect(mockElectronAPI.openAuthBrowser).toHaveBeenCalledWith('https://example.com')
    })

    it('upgrades http:// to https://', async () => {
      mockElectronAPI.openAuthBrowser.mockResolvedValue({
        count: 5,
        domain: 'example.com',
        cookies: []
      })

      const wrapper = mount(AdvancedOptions, {
        props: { url: 'http://example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')
      await wrapper.find('.btn-secondary').trigger('click')

      expect(mockElectronAPI.openAuthBrowser).toHaveBeenCalledWith('https://example.com')
    })

    it('displays cookie count badge after successful auth', async () => {
      mockElectronAPI.openAuthBrowser.mockResolvedValue({
        count: 12,
        domain: 'staging.example.com',
        cookies: [{ name: 'session', value: 'abc' }]
      })

      const wrapper = mount(AdvancedOptions, {
        props: { url: 'https://staging.example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')
      await wrapper.find('.btn-secondary').trigger('click')

      // Wait for async operation
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.cookie-status').exists()).toBe(true)
      expect(wrapper.find('.cookie-badge').text()).toContain('12 cookies stored for staging.example.com')
    })

    it('emits cookies-updated event with cookie data', async () => {
      const cookieData = {
        count: 5,
        domain: 'example.com',
        cookies: [
          { name: 'session', value: 'abc123' },
          { name: 'csrf', value: 'xyz789' }
        ]
      }

      mockElectronAPI.openAuthBrowser.mockResolvedValue(cookieData)

      const wrapper = mount(AdvancedOptions, {
        props: { url: 'https://example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')
      await wrapper.find('.btn-secondary').trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('cookies-updated')).toBeTruthy()
      expect(wrapper.emitted('cookies-updated')[0]).toEqual([cookieData])
    })

    it('handles singular cookie count correctly', async () => {
      mockElectronAPI.openAuthBrowser.mockResolvedValue({
        count: 1,
        domain: 'example.com',
        cookies: [{ name: 'session', value: 'abc' }]
      })

      const wrapper = mount(AdvancedOptions, {
        props: { url: 'https://example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')
      await wrapper.find('.btn-secondary').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.cookie-badge').text()).toContain('1 cookie stored')
    })

    it('handles plural cookie count correctly', async () => {
      mockElectronAPI.openAuthBrowser.mockResolvedValue({
        count: 5,
        domain: 'example.com',
        cookies: []
      })

      const wrapper = mount(AdvancedOptions, {
        props: { url: 'https://example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')
      await wrapper.find('.btn-secondary').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.cookie-badge').text()).toContain('5 cookies stored')
    })
  })

  describe('Clear Cookies', () => {
    it('displays clear button when cookies are stored', async () => {
      mockElectronAPI.openAuthBrowser.mockResolvedValue({
        count: 5,
        domain: 'example.com',
        cookies: [{ name: 'test', value: '123' }]
      })

      const wrapper = mount(AdvancedOptions, {
        props: { url: 'https://example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')
      await wrapper.find('.btn-secondary').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.btn-link').exists()).toBe(true)
      expect(wrapper.find('.btn-link').text()).toBe('Clear')
    })

    it('calls clearStoredCookies when clear button clicked', async () => {
      mockElectronAPI.openAuthBrowser.mockResolvedValue({
        count: 5,
        domain: 'example.com',
        cookies: [{ name: 'test', value: '123' }]
      })
      mockElectronAPI.clearStoredCookies.mockResolvedValue({ success: true })

      const wrapper = mount(AdvancedOptions, {
        props: { url: 'https://example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')
      await wrapper.find('.btn-secondary').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      await wrapper.find('.btn-link').trigger('click')

      expect(mockElectronAPI.clearStoredCookies).toHaveBeenCalled()
    })

    it('hides cookie badge after clearing', async () => {
      mockElectronAPI.openAuthBrowser.mockResolvedValue({
        count: 5,
        domain: 'example.com',
        cookies: [{ name: 'test', value: '123' }]
      })
      mockElectronAPI.clearStoredCookies.mockResolvedValue({ success: true })

      const wrapper = mount(AdvancedOptions, {
        props: { url: 'https://example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')
      await wrapper.find('.btn-secondary').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.cookie-status').exists()).toBe(true)

      await wrapper.find('.btn-link').trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.cookie-status').exists()).toBe(false)
    })

    it('emits cookies-cleared event', async () => {
      mockElectronAPI.openAuthBrowser.mockResolvedValue({
        count: 5,
        domain: 'example.com',
        cookies: [{ name: 'test', value: '123' }]
      })
      mockElectronAPI.clearStoredCookies.mockResolvedValue({ success: true })

      const wrapper = mount(AdvancedOptions, {
        props: { url: 'https://example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')
      await wrapper.find('.btn-secondary').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      await wrapper.find('.btn-link').trigger('click')

      expect(wrapper.emitted('cookies-cleared')).toBeTruthy()
    })
  })

  describe('Error Handling', () => {
    it('displays error message when auth browser fails', async () => {
      mockElectronAPI.openAuthBrowser.mockResolvedValue({
        count: 0,
        domain: '',
        cookies: [],
        error: 'Failed to open browser'
      })

      const wrapper = mount(AdvancedOptions, {
        props: { url: 'https://example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')
      await wrapper.find('.btn-secondary').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.error-message').exists()).toBe(true)
      expect(wrapper.find('.error-message').text()).toContain('Failed to open browser')
    })

    it('displays error for invalid URL', async () => {
      const wrapper = mount(AdvancedOptions, {
        props: { url: 'not a valid url' }
      })
      await wrapper.find('.toggle-btn').trigger('click')
      await wrapper.find('.btn-secondary').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.error-message').exists()).toBe(true)
      expect(wrapper.text()).toContain('Invalid URL')
    })

    it('clears error message when launching browser again', async () => {
      mockElectronAPI.openAuthBrowser
        .mockResolvedValueOnce({
          count: 0,
          domain: '',
          cookies: [],
          error: 'Failed to open browser'
        })
        .mockResolvedValueOnce({
          count: 5,
          domain: 'example.com',
          cookies: [{ name: 'test', value: '123' }]
        })

      const wrapper = mount(AdvancedOptions, {
        props: { url: 'https://example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')

      // First attempt - error
      await wrapper.find('.btn-secondary').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.error-message').exists()).toBe(true)

      // Second attempt - success
      await wrapper.find('.btn-secondary').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.error-message').exists()).toBe(false)
    })

    it('handles promise rejection gracefully', async () => {
      mockElectronAPI.openAuthBrowser.mockRejectedValue(new Error('Network error'))

      const wrapper = mount(AdvancedOptions, {
        props: { url: 'https://example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')
      await wrapper.find('.btn-secondary').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.error-message').exists()).toBe(true)
      expect(wrapper.find('.error-message').text()).toContain('Network error')
    })
  })

  describe('Cookie Badge Display', () => {
    it('does not show badge when no cookies stored', async () => {
      const wrapper = mount(AdvancedOptions, {
        props: { url: 'https://example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')

      expect(wrapper.find('.cookie-status').exists()).toBe(false)
    })

    it('shows green badge with correct styling', async () => {
      mockElectronAPI.openAuthBrowser.mockResolvedValue({
        count: 5,
        domain: 'example.com',
        cookies: [{ name: 'test', value: '123' }]
      })

      const wrapper = mount(AdvancedOptions, {
        props: { url: 'https://example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')
      await wrapper.find('.btn-secondary').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const badge = wrapper.find('.cookie-status')
      expect(badge.exists()).toBe(true)
      // Check that it has the success styling (you can verify computed styles if needed)
    })
  })

  describe('Accessibility', () => {
    it('toggle button is keyboard accessible', () => {
      const wrapper = mount(AdvancedOptions)
      const button = wrapper.find('.toggle-btn')

      expect(button.element.tagName).toBe('BUTTON')
    })

    it('launch button is a proper button element', async () => {
      const wrapper = mount(AdvancedOptions)
      await wrapper.find('.toggle-btn').trigger('click')

      const button = wrapper.find('.btn-secondary')
      expect(button.element.tagName).toBe('BUTTON')
    })

    it('clear button is keyboard accessible', async () => {
      mockElectronAPI.openAuthBrowser.mockResolvedValue({
        count: 5,
        domain: 'example.com',
        cookies: [{ name: 'test', value: '123' }]
      })

      const wrapper = mount(AdvancedOptions, {
        props: { url: 'https://example.com' }
      })
      await wrapper.find('.toggle-btn').trigger('click')
      await wrapper.find('.btn-secondary').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const clearButton = wrapper.find('.btn-link')
      expect(clearButton.element.tagName).toBe('BUTTON')
    })
  })
})
