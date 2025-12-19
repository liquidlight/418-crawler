// Preload script for context isolation
// This runs before the renderer process and bridges main and renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  appVersion: process.env.npm_package_version,
  getProxyPort: () => ipcRenderer.invoke('get-proxy-port')
});
