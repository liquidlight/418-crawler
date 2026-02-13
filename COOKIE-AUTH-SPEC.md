# Cookie Authentication Feature — Full Spec

## Overview

Allow users to authenticate against password-protected (e.g. staging/non-production) sites before crawling. The user clicks an "Advanced Options" button on the homepage, which reveals a panel including a "Launch Browser" button. This opens the target URL in a dedicated Electron `BrowserWindow`. The user logs in, navigates, enters passwords — whatever is needed. When they close that window, 418 captures all cookies from that session and injects them into every subsequent crawl request via the proxy.

---

## Architecture Summary

This feature touches three layers:

| Layer | Files | Role |
|---|---|---|
| **Renderer (Vue)** | `CrawlerInput.vue`, `App.vue`, new `AdvancedOptions.vue` | UI: advanced options panel, cookie status display |
| **Main process (Electron)** | `index.cjs` | IPC handlers: open auth browser, capture cookies, store/clear cookies |
| **Proxy (Express)** | `proxy.cjs` | Inject stored cookies into outgoing `Cookie` headers on every fetch |

---

## Detailed Design

### 1. UI — Advanced Options Panel

#### 1.1 Location

Below the `CrawlerInput` component on the homepage (the empty/hero state in `App.vue`), add a collapsible "Advanced Options" section. This section is only visible on the homepage before a crawl starts.

#### 1.2 Component: `AdvancedOptions.vue`

**Props:**
- `url` (String) — the current URL from the input field
- `disabled` (Boolean) — true when a crawl is active

**Emits:**
- `cookies-updated` — fired after the auth browser closes and cookies are captured. Payload: `{ count: Number, domain: String }`
- `cookies-cleared` — fired when user clears stored cookies

**Template structure:**
```
<div class="advanced-options">
  <button @click="expanded = !expanded" class="toggle-btn">
    Advanced Options <chevron-icon :direction="expanded ? 'up' : 'down'" />
  </button>

  <div v-if="expanded" class="options-panel">
    <!-- Cookie Authentication Section -->
    <div class="option-group">
      <h4>Cookie Authentication</h4>
      <p class="option-description">
        Open the target site in a browser to log in. Cookies from your
        session will be sent with every crawl request.
      </p>

      <button
        @click="launchAuthBrowser"
        :disabled="!url || disabled"
        class="btn btn-secondary"
      >
        Launch Browser to Authenticate
      </button>

      <!-- Cookie status indicator -->
      <div v-if="cookieCount > 0" class="cookie-status">
        <span class="cookie-badge">{{ cookieCount }} cookies stored for {{ cookieDomain }}</span>
        <button @click="clearCookies" class="btn-link">Clear</button>
      </div>
    </div>
  </div>
</div>
```

**Behaviour:**
- "Launch Browser" is disabled if the URL input is empty or a crawl is active.
- After a successful auth session, show a green badge: "12 cookies stored for staging.example.com".
- "Clear" removes all stored cookies and resets the badge.

#### 1.3 Integration in `App.vue`

Place `<AdvancedOptions>` in the hero/empty state section, directly below the `<CrawlerInput>` component. Pass `:url="inputUrl"` and `:disabled="crawlState.isActive"`.

Store cookie state in `App.vue` (or a new `useCookies` composable) so it can be passed to the crawl initiation flow:

```js
const cookieState = ref({ cookies: [], domain: '' })

function handleCookiesUpdated({ cookies, domain }) {
  cookieState.value = { cookies, domain }
}

function handleCookiesCleared() {
  cookieState.value = { cookies: [], domain: '' }
}
```

When `startCrawl()` is called, pass `cookieState.value.cookies` through to the crawler.

---

### 2. Main Process — Auth Browser Window & Cookie Capture

#### 2.1 New IPC Handlers in `index.cjs`

Add three IPC handlers:

**`open-auth-browser`**

```js
ipcMain.handle('open-auth-browser', async (event, url) => {
  // 1. Create a new BrowserWindow with its own session (partition)
  const authWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    parent: mainWindow,
    modal: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Use a dedicated partition so cookies don't leak into the main app
      partition: 'persist:auth-session'
    }
  })

  // 2. Load the target URL
  authWindow.loadURL(url)

  // 3. Return a promise that resolves when the window is closed
  return new Promise((resolve) => {
    authWindow.on('closed', async () => {
      // 4. Extract all cookies from the auth session
      const session = require('electron').session.fromPartition('persist:auth-session')
      const cookies = await session.cookies.get({})

      // 5. Filter to cookies relevant to the target domain
      const targetDomain = new URL(url).hostname
      const relevantCookies = cookies.filter(cookie => {
        // Match cookies whose domain applies to the target
        // cookie.domain may be ".example.com" or "example.com"
        const cookieDomain = cookie.domain.startsWith('.')
          ? cookie.domain.substring(1)
          : cookie.domain
        return targetDomain === cookieDomain || targetDomain.endsWith('.' + cookieDomain)
      })

      // 6. Store cookies in memory for the proxy to use
      storedAuthCookies = relevantCookies

      // 7. Clear the auth session to avoid stale data on next use
      await session.clearStorageData()

      resolve({
        count: relevantCookies.length,
        domain: targetDomain,
        // Return serialised cookies (name, value, domain, path, etc.)
        cookies: relevantCookies.map(c => ({
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path,
          secure: c.secure,
          httpOnly: c.httpOnly,
          sameSite: c.sameSite,
          expirationDate: c.expirationDate
        }))
      })
    })
  })
})
```

**`get-stored-cookies`**

```js
let storedAuthCookies = []

ipcMain.handle('get-stored-cookies', () => {
  return storedAuthCookies
})
```

**`clear-stored-cookies`**

```js
ipcMain.handle('clear-stored-cookies', () => {
  storedAuthCookies = []
  return { success: true }
})
```

#### 2.2 Module-level state

Add `let storedAuthCookies = []` at the top of `index.cjs` alongside `mainWindow` and `proxyServer`.

---

### 3. Preload Script — Expose New APIs

#### 3.1 Updates to `src/preload/index.cjs`

Expose the three new IPC channels:

```js
contextBridge.exposeInMainWorld('electronAPI', {
  appVersion: process.env.npm_package_version,
  getProxyPort: () => ipcRenderer.invoke('get-proxy-port'),
  // New cookie auth APIs
  openAuthBrowser: (url) => ipcRenderer.invoke('open-auth-browser', url),
  getStoredCookies: () => ipcRenderer.invoke('get-stored-cookies'),
  clearStoredCookies: () => ipcRenderer.invoke('clear-stored-cookies')
})
```

---

### 4. Proxy — Cookie Injection

#### 4.1 Changes to `proxy.cjs`

The proxy needs access to the stored cookies. Two approaches — use the simpler one:

**Approach: IPC relay via the renderer**

The renderer already sends `options` in the POST body to `/fetch`. Add a `cookies` field:

```js
// In proxy.cjs POST /fetch handler, after building fetchOptions.headers:
if (req.body.cookies && Array.isArray(req.body.cookies)) {
  const cookieHeader = req.body.cookies
    .map(c => `${c.name}=${c.value}`)
    .join('; ')
  fetchOptions.headers['Cookie'] = cookieHeader
}
```

This is the cleanest approach because:
- No need for shared state between Electron main process and the Express server
- Cookies flow through the existing request pipeline
- The renderer controls which cookies to send (can filter by domain/path per-request)

#### 4.2 How cookies flow end-to-end

```
1. User clicks "Launch Browser" → renderer calls window.electronAPI.openAuthBrowser(url)
2. Electron main process opens auth BrowserWindow, user logs in, closes window
3. Main process extracts cookies, returns them to renderer via IPC
4. Renderer stores cookies in reactive state (cookieState ref)
5. When crawl starts, cookies are passed to Crawler constructor options
6. Crawler passes cookies to fetcher on each request
7. Fetcher includes cookies in POST body to proxy: { url, options, cookies }
8. Proxy builds Cookie header from the array and attaches to outgoing fetch
9. Target server receives cookies, returns authenticated response
```

---

### 5. Crawler & Fetcher — Passing Cookies Through

#### 5.1 `useCrawler.js` — Pass cookies to Crawler

In `startCrawl()`, add cookies to the Crawler options:

```js
crawlerInstance = new Crawler(url, {
  maxConcurrent: 5,
  requestDelay: 100,
  requestTimeout: 30000,
  cookies: cookieState.value.cookies || [],  // NEW
  onProgress: handleProgress,
  onPageProcessed: handlePageProcessed,
  onError: handleError,
  onComplete: handleComplete
})
```

The `startCrawl` function must accept cookies as a parameter (or read from a shared ref). The recommended approach is to have `App.vue` pass cookies when calling `startCrawl`:

```js
// App.vue
async function handleStartCrawl(url) {
  await crawler.startCrawl(url, { cookies: cookieState.value.cookies })
}
```

Update `startCrawl` signature in `useCrawler.js`:

```js
async function startCrawl(url, options = {}) {
  // ...existing validation...

  crawlerInstance = new Crawler(url, {
    maxConcurrent: 5,
    requestDelay: 100,
    requestTimeout: 30000,
    cookies: options.cookies || [],
    // ...callbacks...
  })
}
```

#### 5.2 `crawler.js` — Store and forward cookies

The `Crawler` class stores `this.options.cookies` and passes them to every `fetchUrl` / `fetchWithRetry` call:

```js
// In the crawl loop, when fetching a URL:
const response = await fetchWithRetry(url, {
  timeout: this.options.requestTimeout,
  cookies: this.options.cookies  // NEW
})
```

#### 5.3 `fetcher.js` — Include cookies in proxy request body

In `fetchUrl()`, add cookies to the proxy POST body:

```js
const proxyResponse = await fetch(proxyUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url,
    options,
    cookies: options.cookies || []  // NEW
  }),
  signal: controller.signal
})
```

---

### 6. Edge Cases & Considerations

#### 6.1 Domain matching

Cookies should only be sent to matching domains. The proxy should validate this:

```js
// In proxy.cjs, only apply cookies if the request URL matches cookie domains
if (req.body.cookies && Array.isArray(req.body.cookies)) {
  const requestHost = new URL(url).hostname
  const matchingCookies = req.body.cookies.filter(c => {
    const cookieDomain = c.domain.startsWith('.') ? c.domain.substring(1) : c.domain
    return requestHost === cookieDomain || requestHost.endsWith('.' + cookieDomain)
  })

  if (matchingCookies.length > 0) {
    const cookieHeader = matchingCookies
      .map(c => `${c.name}=${c.value}`)
      .join('; ')
    fetchOptions.headers['Cookie'] = cookieHeader
  }
}
```

This prevents leaking authentication cookies to external domains during crawling.

#### 6.2 Cookie path matching

For full correctness, also filter by `cookie.path` against the request URL path. Most auth cookies use `/` so this is a minor concern, but implement it for robustness:

```js
const requestPath = new URL(url).pathname
const matchingCookies = req.body.cookies.filter(c => {
  // Domain match (as above)
  const domainMatch = /* ... */
  // Path match
  const pathMatch = requestPath.startsWith(c.path || '/')
  return domainMatch && pathMatch
})
```

#### 6.3 Secure cookies over HTTP

The proxy fetches via `node-fetch` which can send cookies regardless of the `secure` flag. Since the proxy-to-target connection uses HTTPS (the crawler normalises to https), secure cookies will work correctly.

#### 6.4 Cookie expiration

Cookies captured from the auth session may have expiration times. For a single crawl session these are unlikely to expire, but if the user starts a crawl hours later, some may be stale. This is acceptable — the site will return 401/403 and the user can re-authenticate. No special handling needed.

#### 6.5 Auth browser URL validation

Before opening the auth browser, validate the URL:
- Must be a valid URL (use the same validation as `startCrawl`)
- Add `https://` if no protocol specified
- Show an error message in the UI if invalid

#### 6.6 Multiple auth sessions

If the user opens the auth browser again, the new cookies replace the old ones entirely. This is the simplest and most predictable behaviour.

#### 6.7 External links

During crawling, external links (different domain) are fetched for status codes only. Cookies must NOT be sent to external domains. The domain-matching filter in section 6.1 handles this automatically.

#### 6.8 Web mode (`dev:web` / `build:web`)

The auth browser feature requires Electron APIs (`BrowserWindow`, `session`). When running in pure web mode (`vite dev`), these APIs are unavailable. The `AdvancedOptions` component should check for `window.electronAPI?.openAuthBrowser` and hide the "Launch Browser" button if it's not available, showing a note like "Cookie authentication requires the desktop app".

---

### 7. File Changes Summary

| File | Change Type | Description |
|---|---|---|
| `src/renderer/components/AdvancedOptions.vue` | **NEW** | Advanced options panel with auth browser trigger and cookie status |
| `src/renderer/App.vue` | **MODIFY** | Import and place `AdvancedOptions`, add `cookieState` ref, pass cookies to `startCrawl` |
| `src/renderer/composables/useCrawler.js` | **MODIFY** | Accept cookies in `startCrawl(url, options)`, pass to `Crawler` constructor |
| `src/renderer/services/crawler.js` | **MODIFY** | Store `options.cookies`, pass to `fetchWithRetry` calls |
| `src/renderer/services/fetcher.js` | **MODIFY** | Include `cookies` array in proxy POST body |
| `src/main/index.cjs` | **MODIFY** | Add `storedAuthCookies` state, add 3 IPC handlers (`open-auth-browser`, `get-stored-cookies`, `clear-stored-cookies`) |
| `src/main/proxy.cjs` | **MODIFY** | Read `cookies` from request body, build `Cookie` header with domain/path matching |
| `src/preload/index.cjs` | **MODIFY** | Expose `openAuthBrowser`, `getStoredCookies`, `clearStoredCookies` |

---

### 8. Implementation Order

**Phase 1 — Electron IPC & cookie capture**
1. Add `storedAuthCookies` variable to `index.cjs`
2. Add `open-auth-browser` IPC handler (open window, capture cookies on close)
3. Add `get-stored-cookies` and `clear-stored-cookies` IPC handlers
4. Update `preload/index.cjs` to expose the three new APIs
5. **Test:** Call `window.electronAPI.openAuthBrowser('https://httpbin.org')` from dev tools, close the window, verify cookies are returned

**Phase 2 — Proxy cookie injection**
1. Modify `proxy.cjs` POST `/fetch` handler to read `cookies` from request body
2. Implement domain and path matching filter
3. Build and attach `Cookie` header to outgoing requests
4. **Test:** Use curl/Postman to POST to `localhost:8080/fetch` with a cookies array, verify the `Cookie` header is sent to the target

**Phase 3 — Fetcher & Crawler plumbing**
1. Modify `fetcher.js` `fetchUrl()` to include `cookies` in the proxy POST body
2. Modify `crawler.js` to accept `cookies` in options and pass to every fetch call
3. Modify `useCrawler.js` `startCrawl()` to accept and forward cookies
4. **Test:** Start a crawl with hardcoded test cookies, verify they appear in proxy logs

**Phase 4 — UI**
1. Create `AdvancedOptions.vue` component
2. Integrate into `App.vue` homepage section
3. Wire up `launchAuthBrowser` to `window.electronAPI.openAuthBrowser`
4. Display cookie count badge after auth session
5. Wire up "Clear" button to `window.electronAPI.clearStoredCookies`
6. Pass `cookieState` into `handleStartCrawl`
7. Handle web mode gracefully (hide button when Electron API unavailable)
8. **Test:** Full end-to-end flow with a password-protected staging site

---

### 9. Testing Strategy

#### Unit Tests

- **Domain matching logic** (extract into a pure utility function `matchCookieToDomain(cookie, requestUrl)`):
  - Cookie `.example.com` matches `staging.example.com` ✓
  - Cookie `.example.com` matches `example.com` ✓
  - Cookie `example.com` does NOT match `other.com` ✗
  - Cookie `.example.com` does NOT match `notexample.com` ✗
  - Path matching: cookie path `/app` matches `/app/page` ✓, does not match `/other` ✗

- **Cookie header serialisation:**
  - Multiple cookies joined with `; `
  - Empty array produces no Cookie header
  - Special characters in cookie values are preserved

- **Fetcher cookies passthrough:**
  - Verify `cookies` appears in the proxy POST body when provided
  - Verify no `cookies` field when none provided

#### Integration Tests

- **Proxy with cookies:** POST to `/fetch` with cookies array targeting a known endpoint, verify the Cookie header arrives
- **Crawl with cookies:** Mock a site that returns 401 without cookies and 200 with cookies, verify the crawler gets 200s

#### Manual Testing

- Use a site behind HTTP Basic Auth or a login form
- Launch auth browser, log in, close
- Verify cookie badge shows correct count
- Start crawl, verify pages return 200 instead of 401/403
- Verify external links do NOT receive the cookies
- Clear cookies, re-crawl, verify 401s return

---

### 10. Security Considerations

1. **Cookie scope:** Cookies are only sent to matching domains (never leaked to external sites during crawl)
2. **Cookie storage:** Cookies are held in-memory only (in the Electron main process variable and Vue reactive state). They are NOT persisted to disk, IndexedDB, or localStorage. They are lost when the app closes. This is intentional — auth tokens should not be stored persistently.
3. **Auth session isolation:** The auth browser uses a dedicated Electron session partition (`persist:auth-session`). After cookies are captured, the session storage is cleared to prevent stale data.
4. **No credential logging:** Cookie values must never be logged to the console or the LogViewer component. The proxy should not log the Cookie header contents.
5. **Transport:** Cookies travel from renderer → proxy over localhost HTTP (acceptable since it's local-only). The proxy → target connection uses HTTPS.

---

### 11. UX Copy & States

| State | Display |
|---|---|
| No URL entered | "Launch Browser" button is disabled, tooltip: "Enter a URL first" |
| URL entered, no cookies | "Launch Browser" button is enabled |
| Auth browser is open | "Launch Browser" button shows "Browser open..." (disabled) |
| Cookies captured | Green badge: "12 cookies stored for staging.example.com" + "Clear" link |
| Cookies cleared | Badge disappears, back to "no cookies" state |
| Web mode (no Electron) | "Launch Browser" button hidden, note: "Cookie auth requires the desktop app" |
| Crawl active | Entire Advanced Options section is disabled |

---

### 12. Future Enhancements (Out of Scope)

These are NOT part of this feature but are natural extensions:

- **Cookie persistence:** Optionally save cookies to disk (encrypted) so users don't need to re-authenticate between app launches
- **Cookie editor:** Manual cookie entry (name/value pairs) for users who know the exact cookies needed
- **Multi-domain auth:** Support authenticating against multiple domains before crawling (e.g. a site that uses a separate auth domain)
- **Cookie refresh:** Detect 401 responses during crawl and prompt user to re-authenticate
- **Custom headers:** Extend advanced options to allow arbitrary custom headers (e.g. `Authorization: Bearer ...`)
