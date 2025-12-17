# Quick Start Guide

## Option 1: Single Command (Recommended)

### macOS / Linux
```bash
./start-dev.sh
```

### Windows
```cmd
start-dev.bat
```

This will:
1. Install dependencies (if needed)
2. Start the CORS proxy server on `http://localhost:8080`
3. **Wait and verify proxy is responding** (with 15 second timeout)
4. Once proxy is ready, start the Vue dev server on `http://localhost:5173`
5. All logs will appear in the terminal

**macOS/Linux**: Press `Ctrl+C` to stop all services.
**Windows**: Close the proxy and dev server windows, or press Ctrl+C in each window.

### What the startup script does
- **Finds available port**: Automatically detects if port 8080 is in use
- **Uses alternate port if needed**: If 8080 is busy, finds next available port (8081, 8082, etc.)
- **Waits for proxy**: Verifies proxy server started with health check before proceeding
- **Passes port to frontend**: Frontend automatically connects to correct proxy port
- **Shows status**: Displays which ports are being used
- **Cleans up properly**: Shuts down both services when you exit with Ctrl+C

---

## Option 2: Using npm with concurrently

First, make sure all dependencies are installed:

```bash
npm install
cd proxy-server && npm install && cd ..
```

Then start both services:

```bash
npm start
```

**Note**: This uses `concurrently` but **does NOT** automatically detect port availability. If port 8080 is busy, it will fail. Use Option 1 (shell/batch scripts) for automatic port detection.

---

## Option 3: Manual Setup (Two Terminals)

If you prefer more control or debugging, run each service separately:

### Terminal 1 - Start Proxy Server

Default (port 8080):
```bash
npm run proxy
```

Custom port:
```bash
PROXY_PORT=9000 npm run proxy
```

You should see:
```
CORS proxy server running on http://localhost:8080
```

### Terminal 2 - Start Dev Server

Make sure to set the same PROXY_PORT if you used a custom one:

Default (connects to port 8080):
```bash
npm run dev
```

Custom port (matches proxy server):
```bash
PROXY_PORT=9000 npm run dev
```

You should see:
```
Local:   http://localhost:5173/
```

The frontend will automatically connect to the proxy server on the port you specified.

---

## Troubleshooting

### "Module not found" errors
Make sure you've installed dependencies:
```bash
npm install
cd proxy-server && npm install && cd ..
```

### Port already in use
The startup scripts **automatically find and use the next available port** if 8080 is busy!

You'll see a message like:
```
⚠️  Port 8080 is in use
   Using port 8081 instead
```

The frontend automatically connects to the correct proxy port, so you don't need to change anything.

If you want to manually specify a port, you can:
- **Proxy**: Set `PROXY_PORT=9000 ./start-dev.sh`
- **Dev server**: Modify `vite.config.js` server port setting

### Proxy server not responding
1. Check that proxy server is running and shows "CORS proxy server running"
2. Check browser console (F12) for network errors
3. Check if `http://localhost:8080/health` responds

### Blank page or no crawl results
1. Make sure both services are running
2. Clear browser cache (F12 → Application → Clear site data)
3. Check browser console for JavaScript errors
4. Check Network tab to see if `/fetch` requests are going to proxy

---

## Development Workflow

1. **Start services** using one of the methods above
2. **Open browser** to `http://localhost:5173`
3. **Make code changes** - they'll hot-reload automatically
4. **Check console** (F12) for any errors
5. **Stop services** with `Ctrl+C`

---

## What Each Service Does

### Proxy Server (port 8080)
- Accepts POST requests to `/fetch` with a URL
- Fetches that URL server-side (no CORS restrictions)
- Returns response headers, status code, and HTML content
- Allows the browser app to crawl any website

### Dev Server (port 5173)
- Serves the Vue.js application
- Hot-reloads on code changes
- Serves IndexedDB database (stored locally)
- Communicates with proxy server to fetch pages

---

## Building for Production

```bash
npm run build
```

This creates a `dist/` folder with optimized production code.

To preview the build:
```bash
npm run preview
```

---

## Running Just the Proxy Server

If you want to use the crawler in production or with a different frontend:

```bash
npm run proxy
```

The proxy will run on `http://localhost:8080` and expects POST requests like:
```json
{
  "url": "https://example.com/page",
  "options": {
    "timeout": 30000
  }
}
```

Response:
```json
{
  "ok": true,
  "status": 200,
  "statusText": "OK",
  "headers": { "content-type": "text/html" },
  "data": "<html>...</html>",
  "url": "https://example.com/page"
}
```
