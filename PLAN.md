# Site Crawler Implementation Plan

## Overview
Browser-based site crawler with Vue 3, Vite, and IndexedDB. Can be bundled as Electron app later. Works offline via local CORS proxy.

## Tech Stack
- **Frontend**: Vue 3 (Composition API)
- **Build**: Vite
- **Storage**: IndexedDB (via `idb` library)
- **CORS**: Local Express proxy server

## Project Structure

```
/Users/mike/Sites/crawler/
├── package.json
├── vite.config.js
├── index.html
├── .gitignore
├── src/
│   ├── main.js                      # Vue entry point
│   ├── App.vue                      # Root component
│   ├── assets/styles.css
│   ├── components/
│   │   ├── CrawlerInput.vue         # URL input & start button
│   │   ├── CrawlerControls.vue      # Pause/Resume/Stop
│   │   ├── CrawlerProgress.vue      # Progress stats
│   │   ├── ResultsStats.vue         # Summary statistics
│   │   ├── ResultsFilters.vue       # Filter by status/type
│   │   └── ResultsTable.vue         # Main data display
│   ├── composables/
│   │   ├── useCrawler.js            # Main crawler state
│   │   ├── useDatabase.js           # IndexedDB operations
│   │   └── useFilters.js            # Result filtering
│   ├── services/
│   │   ├── crawler.js               # Core BFS algorithm
│   │   ├── parser.js                # HTML parsing
│   │   ├── fetcher.js               # Fetch wrapper
│   │   └── proxy.js                 # Proxy config
│   ├── models/
│   │   ├── Page.js                  # Page data model
│   │   └── CrawlState.js            # Crawler state model
│   ├── utils/
│   │   ├── url.js                   # URL normalization (CRITICAL)
│   │   ├── filters.js               # Filter helpers
│   │   └── constants.js             # App constants
│   └── db/
│       └── schema.js                # IndexedDB schema
└── proxy-server/
    ├── package.json
    └── server.js                    # Simple CORS proxy
```

## Data Models

### Page Object (stored in IndexedDB)
```javascript
{
  url: String,                    // Primary key (normalized)
  statusCode: Number,             // HTTP status or -1 for errors
  title: String,                  // <title> content
  metaDescription: String,        // meta[name="description"]
  h1: String,                     // First <h1> text
  fileType: String,               // 'html', 'pdf', 'image', 'css', 'js', 'other'
  contentType: String,            // Content-Type header
  responseTime: Number,           // Fetch time in ms
  size: Number,                   // Content-Length
  outLinks: Array,                // URLs this page links to
  inLinks: Array,                 // URLs linking to this page
  externalLinks: Array,           // External URLs found
  assets: Array,                  // Images, CSS, JS references
  isCrawled: Boolean,             // Processed flag
  isExternal: Boolean,            // Outside base domain
  depth: Number,                  // Distance from root
  crawledAt: Date
}
```

### CrawlState Object
```javascript
{
  id: 'current',
  rootUrl: String,
  baseDomain: String,
  isActive: Boolean,
  isPaused: Boolean,
  queue: Array,                   // URLs to crawl [{url, depth}]
  visited: Set,                   // URLs already processed
  inProgress: Set,                // Currently fetching
  startTime: Number,
  stats: {
    pagesFound: 0,
    pagesCrawled: 0,
    queueSize: 0,
    errors: 0
  }
}
```

### IndexedDB Stores
- **pages**: Main crawl data (keyPath: 'url', indexes: statusCode, fileType, isCrawled)
- **crawlState**: Crawler state (keyPath: 'id')
- **settings**: User preferences (keyPath: 'id')

## Core Crawler Algorithm

### Strategy
- **BFS (Breadth-First Search)** with depth tracking
- **Concurrent fetching**: 5 URLs at once (configurable)
- **URL normalization**: Prevent duplicates (remove hash, trailing slash, sort params)
- **Queue management**: Priority by depth

### Flow
1. Start with root URL at depth 0
2. Fetch page via CORS proxy
3. Parse HTML (if applicable) to extract:
   - Metadata (title, h1, meta description)
   - Same-domain links → add to queue
   - External links → track but don't follow
   - Assets (images, CSS, JS)
4. Save page data to IndexedDB
5. Update in-links for all discovered URLs
6. Process next batch (up to 5 concurrent)
7. Auto-save state every 50 pages
8. Repeat until queue empty

### Pause/Resume
- State persisted to IndexedDB (queue, visited set, in-progress)
- Can close browser and resume later
- Visited set prevents re-crawling

## CORS Proxy Solution

### Local Server (proxy-server/server.js)
- Express server on `http://localhost:8080`
- POST endpoint `/fetch` accepts `{ url, options }`
- Fetches server-side (bypasses browser CORS)
- Returns `{ ok, status, statusText, headers, data }`

### Client Wrapper (src/services/fetcher.js)
- Wraps fetch calls to proxy
- Measures response time
- Handles errors and timeouts

**Note**: For future Electron bundling, can use Electron's main process to fetch directly.

## Critical Implementation Details

### 1. URL Normalization (src/utils/url.js)
**Most critical to get right!** Prevents infinite loops.

```javascript
function normalizeUrl(url) {
  // Remove hash
  // Remove trailing slash (except root)
  // Sort query parameters alphabetically
  // Lowercase protocol and hostname
  // Handle www. variations
}

function isSameDomain(url1, url2) {
  // Compare hostnames (normalize www.)
}
```

### 2. In-Links Management
- When Page A links to Page B (not yet crawled):
  - Immediately update Page B's in-links (even if B doesn't exist yet)
- When Page B is eventually crawled:
  - Its in-links are already populated
- **Critical for 404 debugging**: Shows where broken links originate

### 3. Memory Management
- Don't store full HTML in memory (only metadata)
- Use virtual scrolling for large result sets (10k+ pages)
- Stream to IndexedDB continuously

### 4. Error Handling
- Network failures → save with statusCode: -1
- Invalid HTML → gracefully handle DOMParser errors
- Timeouts → configurable (default 30s)
- 401/403 → mark as inaccessible, don't retry

### 5. File Type Detection
```javascript
function getFileType(url, contentType) {
  // Check Content-Type header first
  // Fall back to file extension
  // Categories: html, pdf, image, css, js, other
}
```

## Implementation Order

### Phase 1: Foundation & Infrastructure
1. Initialize project: `package.json`, `vite.config.js`, `index.html`
2. Create utilities: `src/utils/constants.js`, `src/utils/url.js` (URL normalization)
3. Define models: `src/models/Page.js`, `src/models/CrawlState.js`
4. Setup database: `src/db/schema.js`, `src/composables/useDatabase.js`
5. Build CORS proxy: `proxy-server/package.json`, `proxy-server/server.js`

### Phase 2: Core Crawling Engine
6. Fetch wrapper: `src/services/fetcher.js`
7. HTML parser: `src/services/parser.js` (extract metadata, links, assets)
8. Main crawler: `src/services/crawler.js` (BFS algorithm, queue management)
9. Crawler composable: `src/composables/useCrawler.js` (state management)

### Phase 3: User Interface
10. Root component: `src/App.vue`
11. Input component: `src/components/CrawlerInput.vue`
12. Control buttons: `src/components/CrawlerControls.vue`
13. Progress display: `src/components/CrawlerProgress.vue`
14. Statistics panel: `src/components/ResultsStats.vue`
15. Filters: `src/components/ResultsFilters.vue`, `src/composables/useFilters.js`
16. Results table: `src/components/ResultsTable.vue` (sortable, expandable rows)

### Phase 4: Polish & Integration
17. Styling: `src/assets/styles.css`
18. Main entry: `src/main.js`
19. Git config: `.gitignore`

## Key Dependencies

**Main App** (`package.json`):
```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "idb": "^8.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

**Proxy Server** (`proxy-server/package.json`):
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "node-fetch": "^2.7.0"
  }
}
```

## UI Features

### CrawlerInput.vue
- URL input with validation
- Domain extraction and display
- "Start Crawl" button (disabled during crawl)

### CrawlerControls.vue
- Pause/Resume toggle
- Stop/Reset button
- Export results (CSV/JSON)

### CrawlerProgress.vue
- Status: Idle/Crawling/Paused/Complete
- Pages crawled count
- Queue size
- Current page being processed

### ResultsStats.vue
- Total pages discovered
- Status breakdown (200: X, 404: Y, 500: Z)
- File type breakdown (HTML, PDF, images, etc.)
- External links count

### ResultsFilters.vue
- Multi-select: Status codes
- Multi-select: File types
- Search: URL/Title
- Clear filters button

### ResultsTable.vue
- Columns: URL, Status, Title, H1, Response Time
- Sortable columns
- Expandable rows showing:
  - Meta description
  - In-links (clickable)
  - Out-links (clickable)
- Virtual scrolling for performance

## Testing Checklist

1. ✅ Start crawl with valid URL
2. ✅ Pause mid-crawl and verify state saved
3. ✅ Resume crawl and verify continuation
4. ✅ Stop and restart (test IndexedDB persistence)
5. ✅ Filter by 404 status codes
6. ✅ Expand row to view in-links for a 404
7. ✅ Test with small site (10-20 pages)
8. ✅ Test with site containing external links
9. ✅ Test with site containing PDFs/images
10. ✅ Close browser tab and reopen (verify persistence)
11. ✅ Test URL normalization (trailing slashes, www variants)

## Critical Files

### Top 5 Most Important
1. **`src/services/crawler.js`** - Core BFS algorithm, queue management, pause/resume
2. **`src/utils/url.js`** - URL normalization (prevents infinite loops)
3. **`src/services/parser.js`** - HTML parsing, metadata extraction, link categorization
4. **`src/composables/useDatabase.js`** - IndexedDB operations, state persistence
5. **`src/composables/useCrawler.js`** - Main state management, lifecycle coordination

### Bonus Critical
6. **`proxy-server/server.js`** - CORS proxy (app won't work without this)

## Common Pitfalls to Avoid

1. **Infinite loops**: Pages linking circularly → Solution: strict URL normalization
2. **Memory bloat**: Storing full HTML → Solution: only save metadata
3. **Rate limiting**: Too many concurrent requests → Solution: limit to 5 concurrent
4. **Orphaned in-links**: Page B not yet crawled → Solution: update in-links immediately
5. **State loss**: Browser refresh loses data → Solution: auto-save every 50 pages
6. **Redirect handling**: Follow redirects and track final URL
7. **Invalid URLs**: Relative links, malformed URLs → Solution: use URL constructor with base

## Future Enhancements (Post-MVP)

- Respect robots.txt
- Custom request headers (User-Agent, etc.)
- Configurable max depth
- Duplicate content detection (based on hash)
- Sitemap.xml export
- Link graph visualization
- Broken link report export
- Lighthouse scores integration (if Electron)

---

## Success Criteria

The implementation is complete when:
1. ✅ Can crawl a domain and discover all same-domain pages
2. ✅ Correctly extracts title, h1, meta description
3. ✅ Tracks in-links and out-links
4. ✅ Can filter by status code and file type
5. ✅ Can pause, resume, and persist state across browser sessions
6. ✅ External links are tracked but not followed
7. ✅ Assets (images, PDFs) are discovered and categorized
8. ✅ Clean, functional UI with progress indicators
9. ✅ Proxy server enables CORS-free fetching
10. ✅ No infinite loops on circular link structures
