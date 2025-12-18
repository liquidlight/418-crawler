# Manual Testing Guide

## Testing the Crawl Button and Input

### Prerequisites
- Start the dev server: `npm run dev`
- Start the proxy server: `npm run proxy` (in another terminal)
- Or run both: `npm start`
- Navigate to http://localhost:5173

### Test Case 1: Paste URL and Click Crawl

**Steps:**
1. Go to the application
2. Locate the "Website URL" input field at the top
3. Paste the URL: `https://www.mikestreety.co.uk/`
4. Verify:
   - ✓ URL appears in the input field
   - ✓ Base domain shows: "www.mikestreety.co.uk"
   - ✓ Crawl button is enabled (blue, not grayed out)
5. Click the "Crawl" button
6. Verify:
   - ✓ Button changes to "Pause" (crawl is running)
   - ✓ Progress bar appears
   - ✓ Stats update (Found, Crawled, Pending, Errors)
   - ✓ Results table populates with pages

### Test Case 2: Status Code Filtering

**Steps:**
1. After a crawl completes
2. Look at the left sidebar below the progress bar
3. You should see a "Status Codes" section with buttons like:
   - `200 (573)`
   - `404 (6)`
   - `500 (0)`
   - etc.
4. Click on a status code (e.g., `404`)
5. Verify:
   - ✓ Button highlights in blue (active state)
   - ✓ Results table shows only pages with that status code
6. Click again to deselect
7. Verify:
   - ✓ Button returns to normal state
   - ✓ All results display again

### Test Case 3: In-Links Display

**Steps:**
1. After crawling (e.g., mikestreety.co.uk)
2. In the Results table, click "Details" on any row
3. The Page Details modal opens
4. Verify:
   - ✓ Even 404 pages show in-links if they were discovered
   - ✓ "In-Links" section shows the pages that link to this URL
   - ✓ "Out-Links" section shows links from this page
   - ✓ "External Links" section shows external URLs

### Test Case 4: Pending Pages Completion

**Steps:**
1. During or after a crawl of mikestreety.co.uk
2. Check the Pending tab (third tab in main content)
3. Verify:
   - ✓ Shows all pending/not-yet-crawled URLs
   - ✓ When crawl completes, there should be 0 pending URLs
   - ✓ No URLs remain with `isCrawled: false`
4. Check the status counts:
   - ✓ `crawlState.stats.pagesFound` = number found
   - ✓ `crawlState.stats.pagesCrawled` = number crawled
   - ✓ `pendingCount` = pages found - pages crawled
   - ✓ When crawl complete: `pendingCount` = 0

## Known Working Features

✓ **URL Input & Base Domain Extraction**
- Paste/type URL → base domain automatically extracts
- Works with http://, https://, or just domain name

✓ **Crawl Control**
- Start button initiates crawl
- Pause button pauses crawling
- Resume button continues crawl
- Stop button stops crawling
- Reset button clears all data

✓ **Progress Tracking**
- Progress bar shows percentage complete
- Real-time stats update (Found, Crawled, Pending, Errors)
- Shows current crawl speed

✓ **Results Display**
- Results table with sortable columns
- Status badges with color coding (200=green, 404=orange, 500=red)
- Filtering by status code from sidebar
- Details modal for each page

✓ **Data Persistence**
- Results saved to IndexedDB
- Can pause/resume crawl
- Data survives page refresh

## Troubleshooting

### Issue: Crawl button is disabled
**Solution:** Ensure you have a URL entered in the input field. Button only enables when:
1. Input has a value (not empty)
2. Input has non-whitespace characters
3. Crawl is not already running (`crawlState.isActive` is false)

### Issue: Status codes not showing in sidebar
**Solution:** Status codes only display after a crawl has found pages. Complete at least one crawl first.

### Issue: In-links missing on 404 pages
**Solution:** This was a known bug that has been fixed. In-links are now preserved when pages transition from pending to crawled state.

### Issue: Pending pages not crawling to completion
**Solution:** This has been fixed in recent updates. All discovered pages should now be crawled unless manually stopped.

## Test URLs

Good test URLs:
- `https://www.mikestreety.co.uk/` - Medium sized site
- `https://example.com/` - Small site
- `https://www.w3.org/` - Large site (may take a while)

## Browser DevTools Tips

### Check Component State
Open DevTools (F12) → Console:
```javascript
// Check if app has data
const app = document.querySelector('#app').__vue__;
console.log(app.crawlState.value);
console.log(app.pages.value.length);
```

### Check IndexedDB
DevTools → Application → IndexedDB → SiteCrawler → pages
Can inspect all crawled page data directly

### Network Issues
If crawl fails, check:
1. Proxy server is running (`npm run proxy`)
2. Proxy returns valid responses (check Network tab)
3. CORS settings allow the proxied requests
