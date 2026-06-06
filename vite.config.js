import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In production builds for GitHub Pages the app is served from /horizon/.
// In dev and in the Docker build (served via nginx at /), use /.
export default defineConfig({
  base: process.env.NODE_ENV === 'production' && process.env.PAGES_DEPLOY === '1' ? '/horizon/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Everything under /api goes to the FastAPI backend.
      // This includes /api/discoveries, /api/flora, /api/voice, /api/health.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
