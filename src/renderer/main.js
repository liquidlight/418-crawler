import { createApp } from 'vue'
import App from './App.vue'
import './assets/styles.css'
import { useLogger } from './composables/useLogger.js'

// Initialize logger interception
const { addLog } = useLogger()
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug
}

function interceptConsole(level) {
  return (...args) => {
    // Call original method
    originalConsole[level].apply(console, args)
    // Add to our reactive log store
    addLog(level, args)
  }
}

console.log = interceptConsole('log')
console.warn = interceptConsole('warn')
console.error = interceptConsole('error')
console.debug = interceptConsole('debug')

const app = createApp(App)

app.mount('#app')
