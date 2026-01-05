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
