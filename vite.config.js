import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/horizon/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/voice': 'http://localhost:8787'
    }
  }
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
