import { DB_NAME, DB_VERSION } from '../utils/constants.js'

/**
 * Database schema definition for IndexedDB
 */
export const SCHEMA = {
  name: DB_NAME,
  version: DB_VERSION,
  stores: {
    pages: {
      keyPath: 'url',
      indexes: {
        statusCode: { name: 'statusCode', keyPath: 'statusCode' },
        fileType: { name: 'fileType', keyPath: 'fileType' },
        isCrawled: { name: 'isCrawled', keyPath: 'isCrawled' },
        domain: { name: 'domain', keyPath: 'domain' }
      }
    },
    crawlState: {
      keyPath: 'id'
    },
    settings: {
      keyPath: 'id'
    }
  }
}

/**
 * Initializes the database schema
 * Called during database upgrade
 */
export function initializeSchema(db) {
  // Create or update 'pages' object store
  if (!db.objectStoreNames.contains('pages')) {
    const pagesStore = db.createObjectStore('pages', { keyPath: 'url' })
    Object.values(SCHEMA.stores.pages.indexes).forEach(index => {
      pagesStore.createIndex(index.name, index.keyPath)
    })
  }

  // Create or update 'crawlState' object store
  if (!db.objectStoreNames.contains('crawlState')) {
    db.createObjectStore('crawlState', { keyPath: 'id' })
  }

  // Create or update 'settings' object store
  if (!db.objectStoreNames.contains('settings')) {
    db.createObjectStore('settings', { keyPath: 'id' })
  }
}
