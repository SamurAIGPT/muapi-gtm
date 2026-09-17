import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3960',
        changeOrigin: true
      },
      '/outputs': {
        target: 'http://127.0.0.1:3960',
        changeOrigin: true
      }
    }
  }
})
