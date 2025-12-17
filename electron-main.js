import { app, BrowserWindow, Menu } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import isDev from './electron-is-dev.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
let proxyProcess;

// Create the browser window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    icon: path.join(__dirname, 'assets/icons/icon.png')
  });

  // Load the app
  if (isDev) {
    // Development: load from dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from built files
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
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

// Start the CORS proxy server
function startProxyServer() {
  const proxyPath = path.join(__dirname, 'proxy-server/server.js');

  proxyProcess = spawn('node', [proxyPath], {
    cwd: __dirname,
    stdio: 'pipe',
    detached: false
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
app.on('ready', () => {
  startProxyServer();
  // Small delay to ensure proxy is ready
  setTimeout(createWindow, 500);
});

app.on('window-all-closed', () => {
  // On macOS, apps stay active until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // Re-create window when app is activated on macOS
  if (mainWindow === null) {
    startProxyServer();
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
