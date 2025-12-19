const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const path = require('path')
const http = require('http')
const isDev = require('./is-dev.cjs')
const { startProxyServer } = require('./proxy.cjs')

let mainWindow
let proxyServer
let devServerUrl = 'http://localhost:5173'
let proxyPort = 8080

// IPC handler to get proxy port
ipcMain.handle('get-proxy-port', () => {
  console.log(`[Electron IPC] Returning proxy port: ${proxyPort}`)
  return proxyPort
})

// Find an available port
function findAvailablePort(startPort) {
  return new Promise((resolve) => {
    const server = http.createServer()
    server.listen(startPort, () => {
      server.close(() => resolve(startPort))
    })
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1))
    })
  })
}

// Try to detect dev server port from multiple possible ports
async function detectDevServerPort() {
  const possiblePorts = [5173, 5174, 5175, 5176, 5177]

  for (const port of possiblePorts) {
    try {
      const response = await new Promise((resolve, reject) => {
        const request = http.get(`http://localhost:${port}`, (res) => {
          // Accept any response from the dev server
          resolve(true)
        })
        request.on('error', reject)
        request.setTimeout(2000)
      })

      console.log(`[Electron] Dev server detected on port ${port}`)
      return `http://localhost:${port}`
    } catch (e) {
      // Port not available, try next
      console.log(`[Electron] Port ${port} not available, trying next...`)
    }
  }

  console.log(`[Electron] Using default dev server URL: ${devServerUrl}`)
  return devServerUrl // Default
}

// Create the browser window
async function createWindow() {
  // Detect dev server URL if in development
  if (isDev) {
    devServerUrl = await detectDevServerPort()
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, '../preload/index.cjs')
    },
    icon: path.join(__dirname, '../../assets/icons/icon.png')
  })

  // Load the app
  if (isDev) {
    // Development: load from dev server (electron-vite dev server runs on 5173)
    console.log(`[Electron] Loading dev server: ${devServerUrl}`)
    mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools()

    // Handle loading errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error(`[Electron] Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`)
    })

    mainWindow.webContents.on('crashed', () => {
      console.error('[Electron] Renderer process crashed')
    })
  } else {
    // Production: load from electron-vite built renderer
    // electron-vite builds renderer to out/renderer/
    const indexPath = path.join(__dirname, '../renderer/index.html')
    console.log(`[Electron] Loading production app: ${indexPath}`)
    mainWindow.loadFile(indexPath)

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error(`[Electron] Failed to load app: ${errorDescription} (${errorCode})`)
    })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Create menu
  createMenu()
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            // Could open an about dialog
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// Start the integrated proxy server
async function startProxy() {
  try {
    proxyServer = await startProxyServer(8080)
    proxyPort = proxyServer.address().port
    console.log(`[Main] Proxy server started on port ${proxyPort}`)
  } catch (error) {
    console.error('[Main] Failed to start proxy server:', error)
    throw error
  }
}

// App event listeners
app.on('ready', async () => {
  await startProxy()
  // Small delay to ensure proxy is ready
  setTimeout(createWindow, 500)
})

app.on('window-all-closed', () => {
  // On macOS, apps stay active until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', async () => {
  // Re-create window when app is activated on macOS
  if (mainWindow === null) {
    await startProxy()
    setTimeout(createWindow, 500)
  }
})

app.on('before-quit', () => {
  // Close proxy server gracefully
  if (proxyServer) {
    proxyServer.close(() => {
      console.log('[Main] Proxy server closed')
    })
  }
})

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})
