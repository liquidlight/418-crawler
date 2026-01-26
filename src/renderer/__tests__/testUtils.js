/**
 * Common test utilities to reduce duplication and improve test quality
 */

import { mount } from '@vue/test-utils'

/**
 * Create consistent mock page data with sensible defaults
 */
export function createMockPage(overrides = {}) {
  return {
    url: 'https://example.com/page',
    statusCode: 200,
    fileType: 'html',
    responseTime: 145,
    title: 'Test Page',
    h1: 'Main Heading',
    metaDescription: 'Test description',
    isCrawled: true,
    isExternal: false,
    processOrder: 1,
    inLinks: [],
    outLinks: [],
    externalLinks: [],
    assets: [],
    ...overrides
  }
}

/**
 * Create a set of varied mock pages for testing
 */
export function createMockPageSet() {
  return [
    createMockPage({
      url: 'https://example.com',
      statusCode: 200,
      processOrder: 1,
      title: 'Home',
      h1: 'Welcome'
    }),
    createMockPage({
      url: 'https://example.com/about',
      statusCode: 200,
      processOrder: 2,
      title: 'About',
      h1: 'About Us'
    }),
    createMockPage({
      url: 'https://example.com/contact',
      statusCode: 404,
      processOrder: 3,
      title: 'Contact',
      h1: 'Contact',
      isCrawled: true
    }),
    createMockPage({
      url: 'https://example.com/pending',
      statusCode: null,
      responseTime: null,
      title: null,
      h1: null,
      isCrawled: false,
      isExternal: false,
      processOrder: 4
    })
  ]
}

/**
 * Factory function to create component wrappers with consistent props
 * Reduces repetitive mount() calls throughout test files
 */
export function createComponentFactory(Component, defaultProps = {}) {
  return (overrides = {}) =>
    mount(Component, {
      props: {
        ...defaultProps,
        ...overrides
      }
    })
}

/**
 * Assert that an element contains specific text (case-insensitive)
 * More semantic than checking `.toContain()`
 */
export function expectElementText(wrapper, selector, expectedText) {
  const element = selector ? wrapper.find(selector) : wrapper
  expect(element.text().toLowerCase()).toContain(expectedText.toLowerCase())
}

/**
 * Assert element is visible and interactive
 * Tests behavior, not implementation
 */
export function expectElementVisible(wrapper, selector) {
  const element = wrapper.find(selector)
  expect(element.exists()).toBe(true)
  expect(element.element).toBeVisible?.() ?? expect(element.isVisible?.()).toBe(true)
}

/**
 * Assert element emits specific event with validation
 */
export async function expectEmit(wrapper, trigger, eventName, expectedPayload = null) {
  const element = wrapper.find(trigger)
  await element.trigger('click')

  const emitted = wrapper.emitted(eventName)
  expect(emitted).toBeTruthy()

  if (expectedPayload !== null) {
    expect(emitted[0][0]).toEqual(expectedPayload)
  }
}

/**
 * Wait for Vue updates after prop changes
 * Prevents flaky tests from async rendering
 */
export async function updateComponentProps(wrapper, newProps) {
  await wrapper.setProps(newProps)
  await wrapper.vm.$nextTick()
  return wrapper
}

/**
 * Assert element has accessibility attributes
 */
export function expectAccessible(wrapper, selector, role = null, ariaLabel = null) {
  const element = wrapper.find(selector)

  if (role) {
    expect(element.attributes('role')).toBe(role)
  }
  if (ariaLabel) {
    expect(element.attributes('aria-label')).toBe(ariaLabel)
  }
}

/**
 * Test data generators for edge cases
 */
export function generateEdgeCasePages() {
  return {
    veryLongUrl: createMockPage({
      url: 'https://very-long-domain.com/' + 'path/'.repeat(50),
      title: 'x'.repeat(500)
    }),
    internationalChars: createMockPage({
      url: 'https://例え.jp/página',
      title: 'Тест',
      h1: 'العربية'
    }),
    xssAttempt: createMockPage({
      title: '<script>alert("xss")</script>',
      h1: '"><img src=x onerror=alert(1)>'
    }),
    null: createMockPage({
      title: null,
      h1: null,
      statusCode: null,
      responseTime: null
    }),
    huge: createMockPage({
      inLinks: Array(10000).fill('https://example.com'),
      outLinks: Array(10000).fill('https://example.com/page'),
      assets: Array(10000).fill('https://cdn.example.com/file.js')
    })
  }
}

/**
 * Mock common composables consistently
 */
export function mockUseDatabase() {
  return {
    getPage: vi.fn().mockResolvedValue(null),
    savePage: vi.fn().mockResolvedValue('normalized-url'),
    getAllPages: vi.fn().mockResolvedValue([]),
    getPagesByStatus: vi.fn().mockResolvedValue([]),
    getPagesByFileType: vi.fn().mockResolvedValue([]),
    addInLink: vi.fn().mockResolvedValue(true),
    clearAll: vi.fn().mockResolvedValue(true),
    exportData: vi.fn().mockResolvedValue({ pages: [], crawlState: {} })
  }
}

/**
 * Verify component handles loading states correctly
 */
export async function testLoadingBehavior(wrapper, triggerFn, loadingSelector, contentSelector) {
  // Check initial state
  expect(wrapper.find(contentSelector).exists()).toBe(true)

  // Trigger loading
  await triggerFn()

  // Verify loading indicator appears if provided
  if (loadingSelector) {
    expect(wrapper.find(loadingSelector).exists()).toBe(true)
  }

  await wrapper.vm.$nextTick()
}

/**
 * Common test data for filters
 */
export const FILTER_TEST_DATA = {
  statusCodes: {
    '2XX': [200, 201, 204],
    '3XX': [301, 302],
    '4XX': [400, 404],
    '5XX': [500, 503]
  },
  fileTypes: ['html', 'css', 'js', 'json', 'png', 'svg'],
  searchTerms: [
    'example.com',
    '/products',
    'contact',
    'api',
    '非ASCII テキスト',
    'query?param=value#hash'
  ]
}
