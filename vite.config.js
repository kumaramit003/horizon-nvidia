import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// For GitHub Pages at https://khiz-dev.github.io/horizon/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/horizon/' : '/',
  plugins: [react()],
  server: { port: 5173 }
})
