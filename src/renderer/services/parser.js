import { normalizeUrl, isSameDomain, getFileType } from '../utils/url.js'
import { Page } from '../models/Page.js'

/**
 * Parses a crawled page and extracts metadata
 * @param {string} url - The page URL
 * @param {object} response - Response from fetcher
 * @param {string} baseDomain - Base domain for same-domain detection
 * @param {number} depth - Crawl depth
 * @returns {Page} Page object with extracted data
 */
export function parsePage(url, response, baseDomain, depth = 0) {
  // Validate inputs
  if (!url || !response) {
    throw new Error('Missing required parameters: url and response')
  }

  const { status, statusText, headers = {}, data, responseTime, error } = response

  // Determine file type
  const contentType = headers['content-type'] || ''
  const fileType = getFileType(url, contentType)

  // Determine if this page is external (not on the same domain as baseDomain)
  const isExternal = !isSameDomain(url, `https://${baseDomain}`, baseDomain)

  // Create base page object
  const page = new Page(url, {
    normalizedUrl: normalizeUrl(url),
    domain: baseDomain,
    statusCode: status,
    errorMessage: error || null,
    contentType,
    fileType,
    responseTime,
    size: data ? data.length : 0,
    depth,
    crawledAt: new Date().toISOString(),
    isCrawled: true,
    isExternal: isExternal,  // Determine based on domain comparison
    outLinks: [],
    externalLinks: [],
    inLinks: [],
    assets: []
  })

  // Only parse HTML content from same-domain pages
  // External pages: just record status code, don't extract their links
  // We parse even if status is not 200, to capture links from redirect/error pages
  if (!isExternal && fileType === 'html' && data) {
    try {
      parseHtmlContent(page, data, url, baseDomain)
    } catch (error) {
      console.error(`Error parsing HTML from ${url}:`, error)
      page.errorMessage = `Parse error: ${error.message}`
    }
  }

  // Return plain object to avoid circular references in Vue reactivity
  return page.toJSON()
}

function extractAssets(page, doc, baseUrl) {
  const assetSelectors = [
    { selector: 'img[src]', attr: 'src' },
    { selector: 'link[rel="stylesheet"][href]', attr: 'href' },
    { selector: 'script[src]', attr: 'src' }
  ]

  assetSelectors.forEach(({ selector, attr }) => {
    doc.querySelectorAll(selector).forEach(el => {
      try {
        const src = el.getAttribute(attr)
        const normalized = normalizeUrl(src, baseUrl)
        if (normalized && !page.assets.includes(normalized)) {
          page.assets.push(normalized)
        }
      } catch (e) {
        // Skip invalid assets
      }
    })
  })
}

/**
 * Parses HTML content to extract links, metadata, and assets
 */
function parseHtmlContent(page, htmlData, baseUrl, baseDomain) {
  try {
    // Validate inputs
    if (!baseUrl || !baseDomain) {
      console.warn('Missing baseUrl or baseDomain for HTML parsing')
      return
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlData, 'text/html')

    // Extract metadata
    page.title = doc.querySelector('title')?.textContent?.trim() || ''
    page.metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || ''
    page.h1 = doc.querySelector('h1')?.textContent?.trim() || ''

    // Extract links
    const links = doc.querySelectorAll('a[href]')
    links.forEach(link => {
      try {
        const href = link.getAttribute('href')
        if (!href || typeof href !== 'string' || href.trim() === '') return

        // Skip anchor-only links
        if (href.trim().startsWith('#')) return

        // Skip non-HTTP(S) protocols (tel:, mailto:, javascript:, data:, etc.)
        const hrefLower = href.toLowerCase().trim()
        if (!hrefLower.startsWith('http://') && !hrefLower.startsWith('https://') &&
            !hrefLower.startsWith('//')) {
          // Skip non-http protocols entirely
          if (hrefLower.includes(':') || hrefLower.startsWith('#')) {
            return
          }
          // Allow relative URLs (which will be resolved via baseUrl)
        }

        const normalizedLink = normalizeUrl(href, baseUrl)

        // Only add if normalization succeeded
        if (normalizedLink) {
          if (isSameDomain(normalizedLink, baseUrl, baseDomain)) {
            if (!page.outLinks.includes(normalizedLink)) {
              page.outLinks.push(normalizedLink)
            }
          } else {
            if (!page.externalLinks.includes(normalizedLink)) {
              page.externalLinks.push(normalizedLink)
            }
          }
        }
      } catch (e) {
        // Skip invalid links silently
      }
    })

    // Extract asset files (images, stylesheets, scripts)
    extractAssets(page, doc, baseUrl)
  } catch (error) {
    console.error('HTML parsing error:', error)
    throw error
  }
}

/**
 * Extracts all URLs (both same-domain and external) from a page
 * @param {Page} page - The page object
 * @returns {array} All unique URLs found on the page
 */
export function getAllUrlsFromPage(page) {
  const allUrls = new Set([
    ...page.outLinks,
    ...page.externalLinks,
    ...page.assets
  ])
  return Array.from(allUrls)
}

/**
 * Checks if a page is an error page (4xx or 5xx status)
 */
export function isErrorPage(page) {
  return page.statusCode >= 400
}

/**
 * Checks if a page is a success (2xx status)
 */
export function isSuccessPage(page) {
  return page.statusCode >= 200 && page.statusCode < 300
}

/**
 * Checks if a page is a redirect (3xx status)
 */
export function isRedirectPage(page) {
  return page.statusCode >= 300 && page.statusCode < 400
}
