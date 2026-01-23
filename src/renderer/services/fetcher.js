import { getProxyUrl, CRAWLER_DEFAULTS } from '../utils/constants.js'

/**
 * Fetches a URL via the CORS proxy
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @returns {object} Response object with ok, status, headers, data, responseTime
 */
export async function fetchUrl(url, options = {}) {
  const startTime = Date.now()
  const timeout = options.timeout || CRAWLER_DEFAULTS.REQUEST_TIMEOUT
  const proxyUrl = await getProxyUrl()

  try {
    // Add a delay if specified
    if (options.delay) {
      await new Promise(resolve => setTimeout(resolve, options.delay))
    }

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeout}ms`))
      }, timeout)
    })

    // Fetch from proxy
    const fetchPromise = fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, options })
    })

    // Race between fetch and timeout
    const proxyResponse = await Promise.race([fetchPromise, timeoutPromise])

    if (!proxyResponse.ok) {
      // Handle specific proxy errors gracefully
      const responseTime = Date.now() - startTime

      if (proxyResponse.status === 400) {
        // 400 Bad Request from proxy often means the site is blocking access
        const result = await proxyResponse.json().catch(() => ({}))
        return {
          ok: false,
          status: 403,  // Treat as Forbidden/Blocked
          statusText: 'Blocked',
          headers: {},
          data: '',
          error: result.error || 'Site blocks automated requests',
          responseTime,
          url
        }
      }

      if (proxyResponse.status === 408) {
        // 408 Request Timeout from proxy - try to get error details
        const result = await proxyResponse.json().catch(() => ({}))
        return {
          ok: false,
          status: 408,  // Proxy timeout
          statusText: 'Proxy Timeout',
          headers: {},
          data: '',
          error: result.error || 'Proxy server timeout',
          responseTime,
          url
        }
      }

      throw new Error(`Proxy server error: ${proxyResponse.status} ${proxyResponse.statusText}`)
    }

    const result = await proxyResponse.json()
    const responseTime = Date.now() - startTime

    return {
      ...result,
      responseTime: responseTime,
      url: result.url || url,
      headers: result.headers || {},
      status: result.status || -1
    }
  } catch (error) {
    const responseTime = Date.now() - startTime

    // Extract error details from various error types
    let errorDetails = 'Unknown error'
    if (error instanceof Error) {
      errorDetails = error.message
    } else if (typeof error === 'object' && error !== null) {
      errorDetails = error.toString()
    } else if (typeof error === 'string') {
      errorDetails = error
    }

    console.error(`Fetch error for ${url}:`, {
      message: errorDetails,
      name: error?.name,
      code: error?.code,
      type: error?.constructor?.name || typeof error
    })

    return {
      ok: false,
      status: -1,
      statusText: 'Error',
      headers: {},
      data: '',
      error: errorDetails,
      responseTime,
      url
    }
  }
}

/**
 * Fetches a URL with retry logic
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options including retries
 * @returns {object} Response object
 */
export async function fetchWithRetry(url, options = {}) {
  const maxRetries = options.retries || 1
  const retryDelay = options.retryDelay || 500

  let lastError = null
  let lastResponse = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchUrl(url, {
        ...options,
        delay: attempt > 0 ? retryDelay : 0
      })

      lastResponse = response

      // Don't retry on HTTP error responses (4xx, 5xx), only on network errors
      if (response.status === -1 && attempt < maxRetries) {
        lastError = response.error
        // Check if this is a retryable error
        if (isRetryableError(response.error)) {
          continue
        } else {
          // Not worth retrying (e.g., TLS, DNS, timeout issues)
          return response
        }
      }

      return response
    } catch (error) {
      // Extract error message from various error types
      if (error instanceof Error) {
        lastError = error.message
      } else if (typeof error === 'object' && error !== null) {
        lastError = error.toString()
      } else if (typeof error === 'string') {
        lastError = error
      } else {
        lastError = 'Unknown error'
      }

      if (attempt < maxRetries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  }

  // All retries exhausted, return last response if available
  if (lastResponse) {
    return lastResponse
  }

  return {
    ok: false,
    status: -1,
    statusText: 'Error',
    headers: {},
    data: '',
    error: lastError || 'Failed to fetch after retries',
    responseTime: 0,
    url
  }
}

/**
 * Determines if an error is worth retrying
 * @param {string} errorMessage - The error message from a failed fetch
 * @returns {boolean} True if the error might be temporary and worth retrying
 */
function isRetryableError(errorMessage) {
  // Don't retry on non-retryable network errors
  const nonRetryablePatterns = [
    /ENOTFOUND/i,  // DNS resolution failed
    /ETIMEDOUT/i,  // Connection timeout
    /ERR_HTTP_REQUEST_TIMEOUT/i,  // Request timeout
    /timeout/i,  // Generic timeout
    /ERR_TLS/i,  // TLS certificate errors
    /certificate/i,  // Certificate issues
    /self.signed/i  // Self-signed certificate
  ]

  return !nonRetryablePatterns.some(pattern => pattern.test(errorMessage))
}

/**
 * Checks if the proxy server is available
 */
export async function checkProxyHealth() {
  try {
    const proxyUrl = await getProxyUrl()
    const baseUrl = proxyUrl.replace('/fetch', '')
    const response = await fetch(`${baseUrl}/health`, {
      timeout: 5000
    })
    const data = await response.json()
    return data.status === 'ok'
  } catch (error) {
    console.error('Proxy health check failed:', error)
    return false
  }
}
