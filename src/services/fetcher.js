import { PROXY_URL, CRAWLER_DEFAULTS } from '../utils/constants.js'

/**
 * Fetches a URL via the CORS proxy
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @returns {object} Response object with ok, status, headers, data, responseTime
 */
export async function fetchUrl(url, options = {}) {
  const startTime = Date.now()
  const timeout = options.timeout || CRAWLER_DEFAULTS.REQUEST_TIMEOUT

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
    const fetchPromise = fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, options })
    })

    // Race between fetch and timeout
    const proxyResponse = await Promise.race([fetchPromise, timeoutPromise])

    if (!proxyResponse.ok) {
      // Handle specific proxy errors gracefully
      if (proxyResponse.status === 400) {
        // 400 Bad Request from proxy often means the site is blocking access
        const result = await proxyResponse.json().catch(() => ({}))
        const responseTime = Date.now() - startTime
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
    console.error(`Fetch error for ${url}:`, error)

    return {
      ok: false,
      status: -1,
      statusText: 'Error',
      headers: {},
      data: '',
      error: error.message || 'Unknown error',
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
  const maxRetries = options.retries || 2
  const retryDelay = options.retryDelay || 1000

  let lastError = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchUrl(url, {
        ...options,
        delay: attempt > 0 ? retryDelay : 0
      })

      // Don't retry on HTTP error responses (4xx, 5xx), only on network errors
      if (response.status === -1 && attempt < maxRetries) {
        lastError = response.error
        continue
      }

      return response
    } catch (error) {
      lastError = error.message
      if (attempt < maxRetries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  }

  // All retries exhausted
  console.warn(`All retries exhausted for ${url}:`, lastError)
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
 * Checks if the proxy server is available
 */
export async function checkProxyHealth() {
  try {
    const baseUrl = PROXY_URL.replace('/fetch', '')
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
