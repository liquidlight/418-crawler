import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    open: true
  },
  define: {
    __PROXY_PORT__: JSON.stringify(process.env.PROXY_PORT || '8080'),
    __PROXY_URL__: JSON.stringify(`http://localhost:${process.env.PROXY_PORT || '8080'}/fetch`)
  }
})
