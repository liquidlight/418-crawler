export const CRAWLER_DEFAULTS = {
  MAX_CONCURRENT: 5,
  REQUEST_TIMEOUT: 30000,
  REQUEST_DELAY: 100,
  FOLLOW_REDIRECTS: true,
  RESPECT_ROBOTS_TXT: false,
  AUTO_SAVE_INTERVAL: 50
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
// Falls back to localhost:8080 if not set
export const PROXY_URL = typeof __PROXY_URL__ !== 'undefined' ? __PROXY_URL__ : 'http://localhost:8080/fetch'

export const DB_NAME = 'SiteCrawler'
export const DB_VERSION = 1

export const CRAWLER_STATUS = {
  IDLE: 'idle',
  CRAWLING: 'crawling',
  PAUSED: 'paused',
  COMPLETE: 'complete',
  ERROR: 'error'
}
