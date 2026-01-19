import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: 'src/main/index.cjs'
        }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: 'src/preload/index.cjs'
        }
      }
    }
  },
  renderer: {
    plugins: [vue()],
    root: 'src/renderer',
    server: {
      port: 5173,
      strictPort: false,
      open: false
    },
    build: {
      sourcemap: false
    },
    define: {
      'import.meta.env.VITE_PROXY_URL': JSON.stringify(process.env.VITE_PROXY_URL || `http://localhost:${process.env.PROXY_PORT || '8080'}/fetch`)
    }
  }
})
