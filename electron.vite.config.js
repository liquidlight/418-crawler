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
      __PROXY_PORT__: JSON.stringify(process.env.PROXY_PORT || '8080'),
      __PROXY_URL__: JSON.stringify(`http://localhost:${process.env.PROXY_PORT || '8080'}/fetch`)
    }
  }
})
