// Preload script for context isolation
// This runs before the renderer process and bridges main and renderer
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  appVersion: process.env.npm_package_version,
  getProxyPort: () => ipcRenderer.invoke('get-proxy-port'),
  // Cookie authentication APIs
  openAuthBrowser: (url) => ipcRenderer.invoke('open-auth-browser', url),
  getStoredCookies: () => ipcRenderer.invoke('get-stored-cookies'),
  clearStoredCookies: () => ipcRenderer.invoke('clear-stored-cookies')
})
