# Site Crawler - Electron Desktop Application

## The Short Version

**You can now send a single .exe, .dmg, or .AppImage file to anyone, and they can run Site Crawler without installing anything.**

```bash
./build-electron.sh      # macOS/Linux
build-electron.bat       # Windows
```

Done! Share the executable from the `dist/` folder.

---

## What You Now Have

### 3 Ways to Distribute Site Crawler

1. **Web App + Node.js** (original)
   - Users need Node.js installed
   - Run: `npm install && npm start`

2. **Packaged Web App** (via `npm run build:prod`)
   - NPM + dependencies included
   - Run: `npm install && npm start`

3. **Electron Desktop App** (NEW! - RECOMMENDED)
   - **Single executable file**
   - No prerequisites needed
   - Just double-click to run
   - **← This is what you want to send to users**

### What's Inside the Executable

```
Site Crawler Desktop App
├── Vue 3 App (the UI)
├── Node.js Proxy (for cross-origin requests)
├── Chromium (browser engine)
└── All dependencies bundled
```

---

## How to Build

### Step 1: First-time Setup
```bash
npm install
```

### Step 2: Build the Executable

**On macOS or Linux:**
```bash
./build-electron.sh
```

**On Windows:**
```bash
build-electron.bat
```

Or manually:
```bash
npm run electron-dist
```

### Step 3: Find Your Executable

Look in the `dist/` folder:

**Windows:**
- `Site Crawler Setup 0.1.0.exe` ← **Share this** (installer)
- `Site Crawler 0.1.0.exe` (portable, no installation)

**macOS:**
- `Site Crawler-0.1.0.dmg` ← **Share this**

**Linux:**
- `Site Crawler-0.1.0.AppImage` ← **Share this**
- `site-crawler-0.1.0.deb` (for package managers)

---

## How Users Install

### Windows User Gets `.exe`
```
1. Download Site Crawler Setup 0.1.0.exe
2. Double-click to run installer
3. App installs and appears in Start Menu
4. Done! Click Start Menu → Site Crawler to run
```

### macOS User Gets `.dmg`
```
1. Download Site Crawler-0.1.0.dmg
2. Double-click to mount disk image
3. Drag "Site Crawler" to Applications folder
4. Done! Double-click in Applications to run
```

### Linux User Gets `.AppImage`
```
1. Download Site Crawler-0.1.0.AppImage
2. Right-click → Properties → Permissions → Make Executable
3. Double-click to run (or: ./Site\ Crawler*.AppImage)
4. Done!
```

**That's it. No terminal, no npm, no Node.js needed.**

---

## Development

Want to develop with Electron?

```bash
npm run electron-dev
```

This:
- Starts Electron window
- Enables hot reloading
- Opens DevTools
- Starts proxy server

Make changes to Vue code → app updates automatically

---

## File Sizes

- **Windows installer:** 150-180 MB
- **macOS DMG:** 140-170 MB
- **Linux AppImage:** 130-160 MB

Includes Chromium, Node.js, and all dependencies.

---

## Customization

### Change App Icon

Create `assets/icons/` folder with:
- `icon.png` (512×512 for Linux)
- `icon.ico` (for Windows)
- `icon.icns` (for macOS)

Rebuild and new icons appear in the app.

### Change App Name

Edit `package.json`:
```json
"productName": "My Company's Crawler"
```

### Change Window Size

Edit `electron-main.js`:
```javascript
width: 1400,
height: 900,
minWidth: 800,
minHeight: 600
```

---

## Complete Workflow Example

### 1. Develop
```bash
npm run start              # Web dev server
# OR
npm run electron-dev      # Electron dev mode
```

### 2. Test
- Test the app locally
- Make sure it works

### 3. Update Version
Edit `package.json`:
```json
"version": "0.2.0"
```

### 4. Build
```bash
./build-electron.sh       # Or build-electron.bat
```

### 5. Test Built App
- Run the executable from `dist/`
- Make sure it works

### 6. Share
- Upload to your website
- Send via email
- Post on GitHub Releases
- Share however you want

### 7. Users Download and Run
- They download the `.exe`, `.dmg`, or `.AppImage`
- They run it
- It just works!

---

## Key Files

| File | Purpose |
|------|---------|
| `electron-main.js` | Main Electron process - creates window, manages app |
| `electron-is-dev.js` | Detects dev vs production mode |
| `build-electron.sh` | Build script for macOS/Linux |
| `build-electron.bat` | Build script for Windows |
| `ELECTRON.md` | Full Electron documentation |
| `ELECTRON_SETUP.md` | Electron setup details |

---

## Commands Reference

```bash
# Development
npm run dev              # Web dev server (localhost:5173)
npm run start            # Web + proxy (development)
npm run electron-dev     # Electron with hot reload

# Building
npm run build            # Build Vue app for web
npm run build:prod       # Build web + create package
npm run electron-build   # Build Electron for current platform
npm run electron-dist    # Full Electron build (recommended)

# Shell Scripts
./build-electron.sh      # Automated build (macOS/Linux)
build-electron.bat       # Automated build (Windows)
```

---

## Distributing

### Option A: Direct Download
Host files on your website:
```
Downloads:
- Windows: https://example.com/Site-Crawler-Setup.exe
- macOS: https://example.com/Site-Crawler.dmg
- Linux: https://example.com/Site-Crawler.AppImage
```

### Option B: GitHub Releases
```bash
git tag v0.1.0
git push origin v0.1.0
# Upload dist/* files to GitHub Release page
```

Users download from releases page.

### Option C: Package Managers
- Windows: Publish to Windows Package Manager
- macOS: Publish to Homebrew
- Linux: Publish to apt/yum repositories

---

## Troubleshooting

### Build Fails
```bash
rm -rf node_modules dist
npm install
npm run electron-dist
```

### Port 5173 or 8080 Already in Use
```bash
# macOS/Linux
lsof -ti:5173 | xargs kill -9
lsof -ti:8080 | xargs kill -9

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### App Won't Start
1. Try development mode: `npm run electron-dev`
2. Check for errors in the terminal
3. Verify proxy server installed: `cd proxy-server && npm install`

### Icon Not Showing
1. Create `assets/icons/` folder
2. Add `icon.png`, `icon.ico`, `icon.icns`
3. Rebuild: `npm run electron-dist`

---

## Architecture Overview

```
User's Computer
├── Site Crawler.exe (Windows)
├── Site Crawler.app (macOS)
└── Site Crawler.AppImage (Linux)
    └── Contains:
        ├── Chromium Browser
        ├── Vue 3 Application
        ├── IndexedDB Storage
        ├── Node.js Runtime
        └── CORS Proxy Server
```

When user launches the app:
1. Electron starts
2. Proxy server starts
3. Vue app loads
4. User sees the crawler interface

---

## Advanced Features (Optional)

### Auto-Updates
```bash
npm install -S electron-updater
```

Then users get automatic updates.

### Code Signing (for app stores)
Add signing certificates to `package.json`

### Native Menus
Already included! Edit `electron-main.js`

### System Tray
Add taskbar/menu bar icon (optional)

---

## Next Steps

1. **Test your first build:**
   ```bash
   npm install
   npm run electron-dist
   ```

2. **Run the executable** from `dist/` folder

3. **Share it!** Email, upload, post - whatever works

4. **Users download and run** - no installation needed!

---

## Documentation

- **ELECTRON.md** - Complete technical guide
- **ELECTRON_SETUP.md** - Setup details
- **BUILDING.md** - Build system info
- **PACKAGING.md** - Packaging guide

---

## That's It! 🎉

You now have three ways to distribute Site Crawler:

1. ✅ Web app (original)
2. ✅ Packaged web app
3. ✅ **Electron desktop app** ← Best for users!

**To build and share with users:**
```bash
./build-electron.sh
# Share the .exe, .dmg, or .AppImage from dist/
```

Users double-click → App runs. Simple! 🚀

---

For technical details, see **ELECTRON.md**
