const express = require('express')
const cors = require('cors')
const fetch = require('node-fetch')

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'CORS proxy is running' })
})

/**
 * POST /fetch
 * Fetches a URL server-side to bypass browser CORS restrictions
 *
 * Request body:
 * {
 *   url: string - URL to fetch
 *   options?: object - fetch options (method, headers, etc.)
 * }
 *
 * Response:
 * {
 *   ok: boolean
 *   status: number
 *   statusText: string
 *   headers: object
 *   data: string - response body as text
 * }
 */
app.post('/fetch', async (req, res) => {
  try {
    const { url, options = {} } = req.body

    if (!url) {
      return res.status(400).json({
        error: 'Missing required field: url'
      })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch (e) {
      return res.status(400).json({
        error: 'Invalid URL format',
        details: e.message
      })
    }

    // Prepare fetch options
    const timeout = options.timeout || 15000  // Reduced from 30s to 15s
    const fetchOptions = {
      method: options.method || 'GET',
      redirect: 'manual',  // Don't follow redirects - let the crawler handle them
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        ...options.headers
      }
    }

    // Create timeout promise for manual timeout handling
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeout}ms`))
      }, timeout)
    })

    // Perform the fetch with timeout
    const fetchPromise = fetch(url, fetchOptions)
    const response = await Promise.race([fetchPromise, timeoutPromise])

    // Get response body as text
    const data = await response.text()

    // Prepare response headers (exclude problematic ones)
    const headers = {}
    response.headers.forEach((value, name) => {
      // Skip headers that might cause issues
      if (![
        'content-encoding',
        'transfer-encoding',
        'connection',
        'keep-alive'
      ].includes(name.toLowerCase())) {
        // Lowercase header names for consistency
        headers[name.toLowerCase()] = value
      }
    })

    // Return successful response
    res.json({
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers,
      data,
      url: response.url // Include final URL in case of redirects
    })
  } catch (error) {
    // Extract error details from various error types
    let errorMessage = error.message || 'Unknown error'
    if (!errorMessage && error.toString) {
      errorMessage = error.toString()
    }

    console.error('Fetch error:', {
      message: errorMessage,
      name: error?.name,
      code: error?.code,
      type: error?.constructor?.name || typeof error
    })

    // Handle specific error types
    let statusCode = 500

    if (error.code === 'ENOTFOUND') {
      statusCode = 400
      errorMessage = 'Domain not found'
    } else if (error.code === 'ECONNREFUSED') {
      statusCode = 503
      errorMessage = 'Connection refused'
    } else if (error.code === 'ETIMEDOUT') {
      statusCode = 408
      errorMessage = 'Request timeout'
    } else if (error.code === 'ERR_HTTP_REQUEST_TIMEOUT') {
      statusCode = 408
      errorMessage = 'Request timeout'
    }

    res.status(statusCode).json({
      ok: false,
      status: statusCode,
      statusText: 'Error',
      error: errorMessage,
      data: ''
    })
  }
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'Use POST /fetch to fetch URLs'
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  })
})

/**
 * Start the proxy server
 * @param {number} port - Port to start on (defaults to 8080)
 * @returns {Promise<object>} Server instance
 */
function startProxyServer(port = 8080) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, 'localhost', () => {
      console.log(`[Proxy] Running on http://localhost:${port}`)
      console.log(`[Proxy] POST requests to http://localhost:${port}/fetch`)
      console.log(`[Proxy] Health check: http://localhost:${port}/health`)
      resolve(server)
    })

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[Proxy] Port ${port} in use, trying ${port + 1}`)
        startProxyServer(port + 1).then(resolve).catch(reject)
      } else {
        reject(err)
      }
    })
  })
}

module.exports = { startProxyServer }
