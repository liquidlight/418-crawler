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
    isExternal: false, // Will be determined by link comparison
    outLinks: [],
    externalLinks: [],
    inLinks: [],
    assets: []
  })

  // Only parse HTML content
  if (fileType === 'html' && status === 200 && data) {
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

    // Extract image assets
    const images = doc.querySelectorAll('img[src]')
    images.forEach(img => {
      try {
        const src = img.getAttribute('src')
        const normalizedSrc = normalizeUrl(src, baseUrl)
        if (normalizedSrc && !page.assets.includes(normalizedSrc)) {
          page.assets.push(normalizedSrc)
        }
      } catch (e) {
        // Skip invalid assets
      }
    })

    // Extract stylesheet links
    const stylesheets = doc.querySelectorAll('link[rel="stylesheet"][href]')
    stylesheets.forEach(link => {
      try {
        const href = link.getAttribute('href')
        const normalizedHref = normalizeUrl(href, baseUrl)
        if (normalizedHref && !page.assets.includes(normalizedHref)) {
          page.assets.push(normalizedHref)
        }
      } catch (e) {
        // Skip invalid assets
      }
    })

    // Extract script sources
    const scripts = doc.querySelectorAll('script[src]')
    scripts.forEach(script => {
      try {
        const src = script.getAttribute('src')
        const normalizedSrc = normalizeUrl(src, baseUrl)
        if (normalizedSrc && !page.assets.includes(normalizedSrc)) {
          page.assets.push(normalizedSrc)
        }
      } catch (e) {
        // Skip invalid assets
      }
    })
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
