export const CRAWLER_DEFAULTS = {
  MAX_CONCURRENT: 5,
  REQUEST_TIMEOUT: 30000,
  REQUEST_DELAY: 100,
  FOLLOW_REDIRECTS: true,
  RESPECT_ROBOTS_TXT: false,
  AUTO_SAVE_INTERVAL: 50,
  CRAWL_RESOURCES: false
}

export const FILE_TYPES = {
  HTML: 'html',
  PDF: 'pdf',
  IMAGE: 'image',
  CSS: 'css',
  JS: 'js',
  OTHER: 'other'
}

// Proxy URL is injected by Vite from environment variable
// Falls back to localhost:8080 if not set (for Electron/local dev)
// For Netlify: Uses /.netlify/functions/proxy
// In Electron, gets the actual proxy port from main process via IPC
let cachedProxyUrl = null

async function getProxyUrl() {
  if (cachedProxyUrl) {
    return cachedProxyUrl
  }

  try {
    // Try to get the proxy port from Electron main process
    if (window.electronAPI && window.electronAPI.getProxyPort) {
      const port = await window.electronAPI.getProxyPort()
      cachedProxyUrl = `http://localhost:${port}/fetch`
      return cachedProxyUrl
    }
  } catch (e) {
    console.warn('Failed to get proxy port from Electron:', e.message)
  }

  // Fallback to environment variable or default
  cachedProxyUrl = import.meta.env.VITE_PROXY_URL || 'http://localhost:8080/fetch'
  return cachedProxyUrl
}

export { getProxyUrl }

// For backwards compatibility, export a constant that can be used synchronously
// This defaults to 8080, but should call getProxyUrl() for the actual value
export const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:8080/fetch'

export const CRAWLER_STATUS = {
  IDLE: 'idle',
  CRAWLING: 'crawling',
  PAUSED: 'paused',
  COMPLETE: 'complete',
  ERROR: 'error'
}

export const TABLE_CONFIG = {
  URL_DISPLAY_MAX_LENGTH: 60,
  URL_TRUNCATE_THRESHOLD: 57
}

export const LAYOUT = {
  SIDEBAR_MAX_HEIGHT_OFFSET: 150
}
