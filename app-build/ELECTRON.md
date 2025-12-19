# Site Crawler - Electron Desktop Application

This guide explains how to build and distribute the Site Crawler as a standalone desktop application using Electron.

## What is Electron?

Electron is a framework for building desktop applications with web technologies. It allows us to package the Vue app and Node.js proxy into a single executable that users can download and run without needing Node.js or npm installed.

**Advantages:**
- ✅ Single executable file (no installation needed)
- ✅ Works on Windows, macOS, and Linux
- ✅ Familiar to desktop users (just double-click)
- ✅ Same app code as web version
- ✅ Can add native features (system tray, notifications, etc.)

## Quick Start

### Build Desktop App

**macOS/Linux:**
```bash
./build-electron.sh
```

**Windows:**
```bash
build-electron.bat
```

This will create:
- **Windows:** `dist/Site Crawler Setup 0.1.0.exe` (installer) + `Site Crawler 0.1.0.exe` (portable)
- **macOS:** `dist/Site Crawler-0.1.0.dmg` (installer)
- **Linux:** `dist/Site Crawler-0.1.0.AppImage` (portable)

### Development

For development testing:

```bash
npm run electron-dev
```

This starts:
- Vite dev server with HMR
- Electron app window
- Proxy server

The app will hot-reload as you make changes.

## Build Commands

### `npm run electron-dev`
Starts Electron in development mode with hot reloading.

### `npm run electron-build`
Builds the production bundle and creates Electron installers.

### `npm run electron-dist`
Full build pipeline (recommended).

## Architecture

### How Electron Works

```
┌─────────────────────────────────────┐
│     Site Crawler Desktop App        │
├─────────────────────────────────────┤
│  Electron Main Process              │
│  (electron-main.js)                 │
│  - Creates window                   │
│  - Manages app lifecycle            │
│  - Starts proxy server              │
├─────────────────────────────────────┤
│  Electron Renderer (Window)         │
│  - Vue 3 Application (dist/)        │
│  - IndexedDB storage                │
│  - CORS Proxy (localhost:8080)      │
├─────────────────────────────────────┤
│  Node.js Proxy Server               │
│  (proxy-server/server.js)           │
│  - Handles cross-origin requests    │
│  - Runs on port 8080                │
└─────────────────────────────────────┘
```

### Files

**Electron Files:**
- `electron-main.js` - Main Electron process
- `electron-is-dev.js` - Dev environment detector
- `package.json` - Electron build configuration

**Build Scripts:**
- `build-electron.sh` - Build script (macOS/Linux)
- `build-electron.bat` - Build script (Windows)

## Output Files

After building, you'll find executables in the `dist/` directory:

### Windows
```
dist/
├── Site Crawler Setup 0.1.0.exe    # Installer (creates Start Menu, uninstaller)
├── Site Crawler 0.1.0.exe          # Portable executable
└── builder-effective-config.yaml   # Build configuration
```

**Distribution:** Share `Site Crawler Setup 0.1.0.exe` for easy installation

### macOS
```
dist/
├── Site Crawler-0.1.0.dmg         # Disk image installer
├── Site Crawler-0.1.0-mac.zip     # ZIP archive
└── Site Crawler-0.1.0.app/        # App bundle (in DMG)
```

**Distribution:** Share `Site Crawler-0.1.0.dmg` for standard macOS installation

### Linux
```
dist/
├── Site Crawler-0.1.0.AppImage    # Portable executable
├── site-crawler-0.1.0.deb         # Debian package
└── Site Crawler-0.1.0.tar.gz      # TAR archive
```

**Distribution:** Share `Site Crawler-0.1.0.AppImage` or `.deb` package

## Distribution

### Windows Users
1. Download `Site Crawler Setup 0.1.0.exe`
2. Run the installer
3. App appears in Start Menu
4. Double-click to launch

### macOS Users
1. Download `Site Crawler-0.1.0.dmg`
2. Double-click to mount
3. Drag "Site Crawler" to Applications folder
4. Launch from Applications

### Linux Users
1. Download `Site Crawler-0.1.0.AppImage`
2. Make executable: `chmod +x Site Crawler-0.1.0.AppImage`
3. Double-click to run
4. Or install DEL: `dpkg -i site-crawler-0.1.0.deb`

## Customization

### Application Icon

To customize the icon:

1. Create icon files:
   ```
   assets/icons/
   ├── icon.png         # 512x512 for Linux
   ├── icon.ico         # For Windows
   └── icon.icns        # For macOS
   ```

2. The build scripts will use these automatically

### Application Name

Edit `package.json`:
```json
{
  "name": "site-crawler",
  "productName": "Site Crawler",  // This appears in app menus
  "version": "0.1.0"
}
```

### Window Configuration

Edit `electron-main.js`:
```javascript
mainWindow = new BrowserWindow({
  width: 1400,      // Default width
  height: 900,      // Default height
  minWidth: 800,    // Minimum width
  minHeight: 600,   // Minimum height
  icon: path.join(__dirname, 'assets/icons/icon.png')
})
```

## Advanced Features

### Auto-Updates

To add automatic updates (requires a server):

```javascript
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();
```

### Native Menus

The app includes native menus for File, Edit, View, and Help. Customize in `electron-main.js`:

```javascript
{
  label: 'File',
  submenu: [
    { label: 'New Window', accelerator: 'CmdOrCtrl+N', ... },
    { label: 'Exit', accelerator: 'CmdOrCtrl+Q', ... }
  ]
}
```

### System Tray

Add system tray icon (optional):

```javascript
import { Menu, Tray } from 'electron';

let tray = new Tray(iconPath);
const contextMenu = Menu.buildFromTemplate([...]);
tray.setContextMenu(contextMenu);
```

## Troubleshooting

### Build Fails

1. Clear build cache:
   ```bash
   rm -rf dist node_modules .vite
   npm install
   npm run electron-dist
   ```

2. Check Node.js version:
   ```bash
   node --version  # Should be 18+
   npm --version   # Should be 9+
   ```

### Port Already in Use

If ports 5173 or 8080 are busy:
```bash
# macOS/Linux - Kill process on port
lsof -ti:5173 | xargs kill -9
lsof -ti:8080 | xargs kill -9

# Windows - Find and kill process
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### App Won't Start

1. Check proxy server logs
2. Ensure proxy dependencies installed: `cd proxy-server && npm install`
3. Try in development mode: `npm run electron-dev`

### Code Signing (macOS)

For distribution on macOS App Store or to avoid Gatekeeper warnings:

```javascript
// In package.json "build" section
"mac": {
  "certificateFile": "/path/to/cert.p12",
  "certificatePassword": "password",
  "signingIdentity": "Developer ID Application: Your Name"
}
```

### Code Signing (Windows)

For Authenticode signing:

```javascript
// In package.json "build" section
"win": {
  "certificateFile": "/path/to/cert.pfx",
  "certificatePassword": "password"
}
```

## Version Updates

When releasing a new version:

1. Update version in `package.json`:
   ```json
   "version": "0.2.0"
   ```

2. Build executables:
   ```bash
   ./build-electron.sh  # or build-electron.bat
   ```

3. Files are versioned automatically:
   - `Site Crawler Setup 0.2.0.exe`
   - `Site Crawler-0.2.0.dmg`
   - etc.

## Publishing

### GitHub Releases

```bash
# Tag the release
git tag v0.1.0

# Push tag
git push origin v0.1.0

# Upload dist/* files to GitHub Releases
```

### Website Distribution

1. Host executables on your website
2. Provide download links
3. Users download and run directly

### App Stores

For official app store distribution:
- **Windows Microsoft Store** - Submit with electron-builder
- **macOS App Store** - Requires signing and notarization
- **Linux** - Submit DEL to Ubuntu/Fedora repositories

## Performance

### App Size

- **Windows installer:** ~150-180 MB
- **macOS DMG:** ~140-170 MB
- **Linux AppImage:** ~130-160 MB

These sizes include Node.js, Chromium, and all dependencies.

### Memory Usage

- Base: ~80-100 MB
- Crawl data: Depends on pages discovered
- Typical usage: 150-300 MB

### Startup Time

- First launch: 2-3 seconds
- Subsequent launches: <1 second (with caching)

## Security

### Preload Scripts

For enhanced security with IPC:

```javascript
// electron-preload.js
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  send: (channel, data) => ipcRenderer.send(channel, data),
  receive: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
});
```

Configure in main process:
```javascript
webPreferences: {
  preload: path.join(__dirname, 'electron-preload.js'),
  nodeIntegration: false,
  contextIsolation: true
}
```

## Debugging

### Development Mode

```bash
npm run electron-dev
```

DevTools will open automatically. Use Chrome DevTools to debug.

### Production Issues

Add logging to `electron-main.js`:

```javascript
import log from 'electron-log';

log.info('App started');
log.error('Something went wrong', error);
```

View logs in:
- **Windows:** `%APPDATA%/Site Crawler/logs/`
- **macOS:** `~/Library/Logs/Site Crawler/`
- **Linux:** `~/.config/Site Crawler/logs/`

## Next Steps

1. **Build your first Electron app:**
   ```bash
   ./build-electron.sh  # or build-electron.bat
   ```

2. **Test the executable:** Download and run the app

3. **Distribute:** Share the executable files

4. **Customize:** Add icons, menus, features as needed

5. **Version:** Update version and rebuild for new releases

## Related Documentation

- **BUILDING.md** - General build documentation
- **PACKAGING.md** - Packaging guide
- **SCRIPTS.md** - Available scripts reference
- [Electron Official Docs](https://www.electronjs.org/docs)
- [Electron Builder Docs](https://www.electron.build/)

---

**Ready to build? Run:** `./build-electron.sh` or `build-electron.bat`
