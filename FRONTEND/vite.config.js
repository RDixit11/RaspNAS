import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { APP_NAME } from './src/config.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // %APP_NAME% w index.html → nazwa z src/config.js
    { name: 'app-name', transformIndexHtml: (html) => html.replaceAll('%APP_NAME%', APP_NAME) },
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    host: true,
    port: 5173,
    // Docker na niektórych systemach nie przekazuje zdarzeń inotify z bind mounta
    watch: { usePolling: !!process.env.VITE_USE_POLLING },
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://localhost:8000',
        changeOrigin: true,
        // X-Forwarded-For z adresem przeglądarki — backend rozpoznaje po nim sieć użytkownika
        xfwd: true,
      },
    },
  },
})
