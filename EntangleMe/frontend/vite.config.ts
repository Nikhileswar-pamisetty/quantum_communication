import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/uploads': 'http://localhost:8000'
    },
    headers: {
      "Content-Security-Policy":
        "img-src 'self' data: blob: http://localhost:8000 /api/;"
    }
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
