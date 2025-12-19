const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const isDev = require('./is-dev.cjs');

let mainWindow;
let proxyProcess;
let devServerUrl = 'http://localhost:5173';
let proxyPort = 8080;

// IPC handler to get proxy port
ipcMain.handle('get-proxy-port', () => {
  console.log(`[Electron IPC] Returning proxy port: ${proxyPort}`);
  return proxyPort;
});

// Find an available port
function findAvailablePort(startPort) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(startPort, () => {
      server.close(() => resolve(startPort));
    });
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

// Try to detect dev server port from multiple possible ports
async function detectDevServerPort() {
  const possiblePorts = [5173, 5174, 5175, 5176, 5177];

  for (const port of possiblePorts) {
    try {
      const response = await new Promise((resolve, reject) => {
        const request = http.get(`http://localhost:${port}`, (res) => {
          // Accept any response from the dev server
          resolve(true);
        });
        request.on('error', reject);
        request.setTimeout(2000);
      });

      console.log(`[Electron] Dev server detected on port ${port}`);
      return `http://localhost:${port}`;
    } catch (e) {
      // Port not available, try next
      console.log(`[Electron] Port ${port} not available, trying next...`);
    }
  }

  console.log(`[Electron] Using default dev server URL: ${devServerUrl}`);
  return devServerUrl; // Default
}

// Create the browser window
async function createWindow() {
  // Detect dev server URL if in development
  if (isDev) {
    devServerUrl = await detectDevServerPort();
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
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: path.join(__dirname, '../../assets/icons/icon.png')
  });

  // Load the app
  if (isDev) {
    // Development: load from dev server
    console.log(`[Electron] Loading dev server: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();

    // Handle loading errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error(`[Electron] Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
    });

    mainWindow.webContents.on('crashed', () => {
      console.error('[Electron] Renderer process crashed');
    });
  } else {
    // Production: serve dist folder through HTTP
    // This avoids file:// protocol issues with Vite-built assets
    const resourcesPath = process.resourcesPath || path.join(__dirname, '../../');
    const distPath = path.join(resourcesPath, 'dist');

    startAppServer(distPath).then((url) => {
      console.log(`[Electron] Loading production app from: ${url}`);
      mainWindow.loadURL(url);
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error(`[Electron] Failed to load app: ${errorDescription} (${errorCode})`);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create menu
  createMenu();
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
            app.quit();
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
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Start a simple HTTP server to serve the dist folder
// This avoids file:// protocol path resolution issues with Vite
async function startAppServer(distPath) {
  const httpModule = require('http');
  const fsModule = require('fs');

  return new Promise((resolve, reject) => {
    const server = httpModule.createServer((req, res) => {
      let filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url);

      fsModule.readFile(filePath, (err, data) => {
        if (err) {
          // Serve index.html for all non-file routes (SPA routing)
          filePath = path.join(distPath, 'index.html');
          fsModule.readFile(filePath, (err, data) => {
            if (err) {
              res.writeHead(404);
              res.end('Not Found');
              return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
          });
        } else {
          const ext = path.extname(filePath);
          const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
          };
          const contentType = mimeTypes[ext] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        }
      });
    });

    // Find an available port starting from 9000
    let port = 9000;
    const tryPort = () => {
      server.listen(port, 'localhost', () => {
        console.log(`[App Server] Running on http://localhost:${port}`);
        resolve(`http://localhost:${port}`);
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          port++;
          if (port < 9010) {
            tryPort();
          } else {
            reject(new Error('Could not find available port for app server'));
          }
        } else {
          reject(err);
        }
      });
    };

    tryPort();
  });
}

// Start the CORS proxy server
async function startProxyServer() {
  // extraResources are placed in process.resourcesPath (Resources folder)
  const resourcesPath = process.resourcesPath || path.join(__dirname, '../../');
  const proxyPath = path.join(resourcesPath, 'proxy-server/server.js');

  // Use fixed port 8080 for consistent proxy setup
  proxyPort = 8080;

  console.log(`Starting proxy server from: ${proxyPath}`);

  proxyProcess = spawn('node', [proxyPath], {
    cwd: resourcesPath,
    stdio: 'pipe',
    detached: false,
    env: { ...process.env, PORT: proxyPort }
  });

  proxyProcess.stdout?.on('data', (data) => {
    console.log(`[Proxy] ${data}`);
  });

  proxyProcess.stderr?.on('data', (data) => {
    console.error(`[Proxy Error] ${data}`);
  });

  proxyProcess.on('error', (error) => {
    console.error('Failed to start proxy server:', error);
  });

  proxyProcess.on('close', (code) => {
    console.log(`Proxy server exited with code ${code}`);
  });
}

// App event listeners
app.on('ready', async () => {
  await startProxyServer();
  // Small delay to ensure proxy is ready
  setTimeout(createWindow, 500);
});

app.on('window-all-closed', () => {
  // On macOS, apps stay active until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  // Re-create window when app is activated on macOS
  if (mainWindow === null) {
    await startProxyServer();
    setTimeout(createWindow, 500);
  }
});

app.on('before-quit', () => {
  // Kill proxy process on app exit
  if (proxyProcess) {
    proxyProcess.kill();
  }
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
