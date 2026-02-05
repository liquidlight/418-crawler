import { shallowRef, triggerRef, readonly } from 'vue'

const logs = shallowRef([])
const MAX_LOGS = 1000

export function useLogger() {
  function addLog(level, args) {
    const timestamp = new Date().toLocaleTimeString()
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2)
        } catch (e) {
          return String(arg)
        }
      }
      return String(arg)
    }).join(' ')

    logs.value.unshift({
      id: Date.now() + Math.random(),
      timestamp,
      level,
      message
    })

    if (logs.value.length > MAX_LOGS) {
      logs.value.pop()
    }

    triggerRef(logs)
  }

  function clearLogs() {
    logs.value = []
    triggerRef(logs)
  }

  return {
    logs: readonly(logs),
    addLog,
    clearLogs
  }
}
