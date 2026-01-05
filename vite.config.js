import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  root: 'src/renderer',
  build: {
    outDir: '../../dist',
    sourcemap: false
  },
  server: {
    port: 5173,
    strictPort: false
  },
  define: {
    'import.meta.env.VITE_PROXY_URL': JSON.stringify(process.env.VITE_PROXY_URL || 'http://localhost:8080/fetch')
  }
})
