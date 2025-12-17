/**
 * Normalizes a URL for consistent deduplication
 * Removes hash, trailing slash, sorts params, and lowercases protocol/hostname
 */
export function normalizeUrl(url, baseUrl = null) {
  try {
    // Handle null/undefined/empty URLs
    if (!url || typeof url !== 'string') {
      return null
    }

    let urlStr = url.trim()

    // Skip hash-only URLs (anchors like "#content", "#top")
    if (urlStr.startsWith('#')) {
      return null
    }

    // Skip empty strings
    if (urlStr === '') {
      return null
    }

    // If URL starts with //, make it http
    if (urlStr.startsWith('//')) {
      urlStr = 'https:' + urlStr
    }
    // If URL doesn't have protocol and is relative, skip without baseUrl
    else if (!urlStr.match(/^https?:\/\//i)) {
      if (!baseUrl) {
        return null
      }
      // Will be handled by URL constructor with baseUrl
    } else if (!urlStr.match(/^https?:\/\//i)) {
      // Add https if no protocol
      urlStr = 'https://' + urlStr
    }

    // Create URL object
    const parsed = new URL(urlStr, baseUrl || undefined)

    // Remove hash
    parsed.hash = ''

    // Remove trailing slash (except for root)
    if (parsed.pathname !== '/') {
      parsed.pathname = parsed.pathname.replace(/\/$/, '')
    }

    // Sort query parameters alphabetically for consistency
    const params = new URLSearchParams(parsed.search)
    const sortedParams = new URLSearchParams(
      [...params.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    )
    parsed.search = sortedParams.toString()

    // Lowercase protocol and hostname
    parsed.protocol = parsed.protocol.toLowerCase()
    parsed.hostname = parsed.hostname.toLowerCase()

    return parsed.toString()
  } catch (error) {
    // Silently ignore normalization errors
    return null
  }
}

/**
 * Checks if two URLs belong to the same domain
 * Handles www. variations
 */
export function isSameDomain(url1, url2, baseDomain = null) {
  try {
    // Handle invalid inputs
    if (!url1 || !url2 || typeof url1 !== 'string' || typeof url2 !== 'string') {
      return false
    }

    // If baseDomain is provided, use it for faster comparison
    if (baseDomain && typeof baseDomain === 'string') {
      const normalize = (domain) => domain.replace(/^www\./, '').toLowerCase()
      const normalizedBase = normalize(baseDomain)

      // Check both URLs against the base domain
      try {
        let url1Domain = ''
        let url2Domain = ''

        try {
          url1Domain = new URL(url1).hostname
        } catch {
          return false
        }

        try {
          url2Domain = new URL(url2).hostname
        } catch {
          return false
        }

        return normalize(url1Domain) === normalizedBase && normalize(url2Domain) === normalizedBase
      } catch {
        return false
      }
    }

    // Fall back to comparing the two URLs directly
    try {
      const urlObj1 = new URL(url1)
      const urlObj2 = new URL(url2)

      // Normalize www. variations
      const normalize = (domain) => domain.replace(/^www\./, '').toLowerCase()

      return normalize(urlObj1.hostname) === normalize(urlObj2.hostname)
    } catch {
      return false
    }
  } catch (error) {
    return false
  }
}

/**
 * Extracts the base domain from a URL
 */
export function extractDomain(url) {
  try {
    if (!url || typeof url !== 'string') {
      return null
    }

    // Ensure URL has protocol
    let urlStr = url.trim()
    if (!urlStr.match(/^https?:\/\//i)) {
      urlStr = 'https://' + urlStr
    }

    const parsed = new URL(urlStr)
    const hostname = parsed.hostname.toLowerCase()

    if (!hostname) {
      return null
    }

    return hostname
  } catch (error) {
    console.error(`Failed to extract domain from "${url}":`, error.message)
    return null
  }
}

/**
 * Determines file type from URL and Content-Type header
 */
export function getFileType(url, contentType = '') {
  try {
    // Handle invalid URLs
    if (!url || typeof url !== 'string') {
      return 'other'
    }

    const ct = (contentType || '').toLowerCase()

    // Try to parse the URL to get the path
    let path = ''
    try {
      const urlObj = new URL(url)
      path = urlObj.pathname.toLowerCase()
    } catch {
      // If URL parsing fails, try to extract path from string
      const match = url.match(/\/([^?#]*)/)
      if (match) {
        path = '/' + match[1]
      }
    }

    // Check Content-Type first (most reliable)
    if (ct.includes('text/html') || ct.includes('application/xhtml')) return 'html'
    if (ct.includes('application/pdf')) return 'pdf'
    if (ct.includes('image/')) return 'image'
    if (ct.includes('text/css')) return 'css'
    if (ct.includes('javascript')) return 'js'

    // Fall back to checking file extension
    if (path) {
      if (/\.pdf$/i.test(path)) return 'pdf'
      if (/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(path)) return 'image'
      if (/\.css$/i.test(path)) return 'css'
      if (/\.js$/i.test(path)) return 'js'
      if (/\.(doc|docx|xls|xlsx|zip|tar|gz)$/i.test(path)) return 'other'
    }

    return 'other'
  } catch (error) {
    console.warn(`Error determining file type for URL "${url}":`, error.message)
    return 'other'
  }
}
