# 418: I'm a Teapot

A web crawler desktop application built with Electron, Vue 3, and Vite.

## Quick Start

### Development

**Electron (Desktop App)**
```bash
npm run dev
```
Launches the Electron app with hot reload and DevTools enabled.

**Web (Browser)**
```bash
npm run dev:web
```
Runs at http://localhost:5173 in your browser.

### Build

**Electron DMG (Distribution)**
```bash
npm run build
```
Creates: `dist-electron/418-0.1.1-arm64.dmg` (~90MB)

**Web (Static Files)**
```bash
npm run build:web
```
Creates: `dist/` folder with static files.

---

## What's Included

- ✅ Vue 3 frontend with Composition API
- ✅ Built-in CORS proxy server (port 8080)
- ✅ Native macOS menu
- ✅ localStorage for persistent data
- ✅ Responsive UI (1400x900 minimum)
- ✅ DevTools in development mode
- ✅ Self-contained, portable DMG for distribution

---

## File Structure

```
src/
├── electron/
│   ├── main.cjs              # Electron main process (CommonJS)
│   ├── is-dev.cjs            # Development environment detector
│   ├── preload.cjs           # Security preload script
│   └── entitlements.mac.plist # macOS code signing entitlements
├── components/               # Vue components
├── utils/                    # Utilities
└── App.vue                   # Root component
```

---

## Technology Stack

- **Electron 27** - Desktop app framework
- **electron-builder 24.6** - Packaging and distribution
- **Vue 3** - Frontend framework
- **Vite** - Build tool and dev server
- **Node.js proxy server** - Built-in CORS proxy

---

## Port Management

- **Dev Server:** Port 5173 (with fallback to 5174-5177)
- **Proxy Server:** Port 8080

The app automatically uses alternative ports if the primary ones are occupied.

---

## Building & Distribution

### Local Build
```bash
npm run build
```

### Testing the Build Locally
```bash
# Mount and test the DMG
open dist-electron/418-0.1.1-arm64.dmg

# Or launch the app directly
open "dist-electron/mac-arm64/418.app"
```

### Distributing to Users

1. Build the DMG: `npm run build`
2. Share the DMG file: `dist-electron/418-0.1.1-arm64.dmg`
3. Users: Double-click DMG → drag app to Applications → launch

The app is fully portable and self-contained. Users only need to download the DMG and run it—no Node.js, npm, or system dependencies required.

---

## Development Notes

### CommonJS in ES Modules

Electron files use `.cjs` extension to enforce CommonJS treatment. This is necessary because:
- Electron's main process requires CommonJS
- The rest of the project uses ES modules
- The `.cjs` extension prevents module loading errors

Don't rename these files to `.js`.

### Port Conflicts

If ports are occupied, clear them:
```bash
lsof -ti:5173 | xargs kill -9  # Vite
lsof -ti:8080 | xargs kill -9  # Proxy
```

### Blank Window / App Won't Start

1. **Check the console output** - Look for error messages when running `npm run dev`
2. **Verify ports are free** - Run the commands above to clear occupied ports
3. **Clean rebuild** - See "Recovery Steps" section below

### Recovery Steps

If everything is broken:

```bash
# Kill all processes
pkill -f "electron"
pkill -f "npm"
sleep 2

# Clean everything
rm -rf dist dist-electron node_modules

# Reinstall and test
npm install
npm run dev
```

---

## Common Issues

### `Error: listen EADDRINUSE: address already in use :::8080`
Port 8080 is occupied. Kill the process:
```bash
lsof -ti:8080 | xargs kill -9
```

### `Cannot GET /` or blank page
Vite dev server not responding. Restart:
```bash
npm run dev
```

### App stays blank after opening
The app needs both servers running:
1. Vite dev server (port 5173) - for the UI
2. Proxy server (port 8080) - for CORS requests

Check that both are started in the console output.

### macOS "damaged and can't be opened" error
This occurs when distributing unsigned builds. Two options:
1. **For internal testing:** Right-click app → Open → Open
2. **For proper distribution:** Requires Apple Developer Certificate ($99/year) for code signing and notarization

For now, users should build locally: `npm run build` and open the DMG.

---

## Commands Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Electron app with hot reload |
| `npm run dev:web` | Web app in browser (http://localhost:5173) |
| `npm run build` | Build Electron DMG for distribution |
| `npm run build:web` | Build static web files |

---

## Performance

- **DMG Size:** ~90MB (includes Electron + Chromium)
- **Startup Time:** ~1-2 seconds to start proxy
- **App Type:** Fully portable, self-contained

---

## Web Deployment to Netlify

You can also deploy the app as a web application on Netlify. This allows users to run the crawler in their browser without needing to build locally or use Electron.

### Prerequisites

- GitHub account (or any other Git provider)
- Netlify account (free tier is fine)

### Deploy in 3 Steps

**1. Push your code to GitHub**
```bash
git push origin main
```

**2. Connect to Netlify**
- Go to [netlify.com](https://netlify.com)
- Click "Add new site" → "Import an existing project"
- Select your GitHub repository
- Netlify will auto-detect the `netlify.toml` configuration
- Click "Deploy site"

**3. Access your app**
```
https://<your-site-name>.netlify.app
```

### How It Works

- **Frontend:** Deployed to Netlify's CDN
- **Proxy:** Uses Netlify serverless functions at `/.netlify/functions/proxy`
- **Storage:** Uses browser's localStorage (data persists per browser)
- **No backend required:** Everything runs in the browser or as serverless functions

### Netlify Features Used

- **Build command:** `npm run build:web`
- **Publish directory:** `dist/`
- **Serverless functions:** `netlify/functions/proxy.js` handles CORS proxy requests

### Environment Variables

The deployment automatically configures:
- `VITE_PROXY_URL = /.netlify/functions/proxy`

This tells the app to use the Netlify function instead of localhost:8080.

### Deployment Updates

Every time you push to your main branch, Netlify will automatically rebuild and redeploy the app.

---

## Future Enhancements (Optional)

- Auto-updates: `npm install -S electron-updater`
- System tray support: Add to `src/electron/main.cjs`
- Native dialogs: Use Electron's dialog API
- Code signing & notarization: For Mac App Store distribution
