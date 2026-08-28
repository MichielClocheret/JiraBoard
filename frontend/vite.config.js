import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Same-origin proxy to the PHP backend during local dev, so the
      // browser never makes a cross-origin request (see backend/README.md).
      // Run: php -S localhost:8000 -t backend
      '/backend-api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend-api/, ''),
      },
    },
  },
})
