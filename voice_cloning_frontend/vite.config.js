import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy /voice endpoint to Django backend with extended timeout for long neural TTS inference
      '/voice': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        timeout: 600000, // 10 minutes
        proxyTimeout: 600000, // 10 minutes
      },
      // Proxy /media for Django uploaded & generated audio files
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        timeout: 600000,
        proxyTimeout: 600000,
      },
    },
  },
})
