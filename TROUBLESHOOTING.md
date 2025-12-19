# Troubleshooting Guide

## Issue: App doesn't open or shows blank screen

### Development Mode (`npm run dev`)

**Symptoms:** Window doesn't appear or shows blank/white screen

**Solutions:**

1. **Check the startup logs**
   ```bash
   npm run dev
   # Wait 10+ seconds
   # Look for error messages in the console
   ```

2. **If window is blank:**
   - DevTools is open - press `Ctrl+Shift+I` to close it
   - Press `F12` to reopen DevTools and check Console tab for errors
   - Look for any red error messages

3. **If port is already in use:**
   ```bash
   # Kill any existing processes
   killall node 2>/dev/null || true
   killall "418" 2>/dev/null || true

   # Then try again
   npm run electron-dev
   ```

4. **If app still doesn't appear:**
   - The window might be loading. Give it 15-20 seconds
   - Check Activity Monitor for "418" process
   - If the process exists, the app is running but the window may be hidden

### Production Build (DMG or Built App)

**Symptoms:** DMG doesn't open or app won't launch

**Solutions:**

1. **Verify the app was built**
   ```bash
   # Check if DMG exists
   ls -lh dist-electron/*.dmg

   # Check if built app exists
   ls -la "dist-electron/mac-arm64/418.app"
   ```

2. **Try launching directly**
   ```bash
   # Test the built app
   open "dist-electron/mac-arm64/418.app"
   ```

3. **Check macOS Security**
   - System Preferences → Security & Privacy → General
   - Look for message about "418"
   - Click "Open Anyway"

4. **Check for app crash**
   ```bash
   # Look for crash reports
   ~/Library/Logs/DiagnosticMessages/

   # Or check system logs
   log stream --process "418"
   ```

## Issue: Blank window after app opens

**Possible causes:**

1. **Proxy server didn't start**
   - App needs the CORS proxy on port 8080
   - Check that port 8080 isn't already in use:
   ```bash
   lsof -i :8080
   # If something is using it, kill it
   lsof -ti:8080 | xargs kill -9
   ```

2. **Dev server failed to load**
   - Check if http://localhost:5173 works:
   ```bash
   curl -i http://localhost:5173
   ```

3. **App loading takes too long**
   - The app might still be loading. Wait 20+ seconds
   - Check DevTools Console for errors

## Common Error Messages

### `Error: listen EADDRINUSE: address already in use :::8080`
**Fix:** Port 8080 is occupied
```bash
lsof -ti:8080 | xargs kill -9
```

### `Cannot GET /` or blank page
**Fix:** Vite dev server not responding
```bash
# Kill everything and restart
pkill -f "electron-dev"
pkill -f "npm run dev"
npm run electron-dev
```

### `Failed to load app: net::ERR_CONNECTION_REFUSED`
**Fix:** Electron couldn't connect to dev server
- Make sure Vite server started (look for "ready in XXms" message)
- Try again with `npm run electron-dev`

## Testing Checklist

```
[ ] npm run electron-dev opens a window
[ ] DevTools console shows no red errors
[ ] App appears after 10-15 seconds
[ ] npm run electron-dmg completes without errors
[ ] DMG file is 80-100MB
[ ] Built app in dist-electron/mac-arm64/ runs
[ ] Port 8080 is available (not in use)
[ ] Port 5173 is available (not in use)
```

## Recovery Steps

If everything is broken, do a clean rebuild:

```bash
# Kill all processes
pkill -f "electron"
pkill -f "npm"
sleep 2

# Clean everything
rm -rf dist dist-electron node_modules

# Reinstall
npm install

# Test dev mode
npm run electron-dev

# Test build
npm run electron-dmg
```

## Getting Debug Info

To see detailed logs from the app:

```bash
# Run with more verbose output
npm run electron-dev 2>&1 | tee /tmp/electron-debug.log

# Check the log file
cat /tmp/electron-debug.log | grep -i "error\|failed\|exception"
```

## Still Having Issues?

1. Check that all required ports are free (5173, 8080)
2. Verify Vite and proxy are actually running (they should print startup messages)
3. Wait at least 15 seconds for the app to fully load
4. Look at the console logs in DevTools (F12)
5. Check Activity Monitor to see if processes are running

If the app launches but stays blank:
- It's probably loading the page
- DevTools (F12) will show if there are JavaScript errors
- The proxy server logs will show if it's receiving requests

---

**Remember:** The app needs TWO separate servers running:
1. Vite dev server (port 5173)
2. CORS proxy server (port 8080)

Both need to be available for the app to work properly.
