import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  },
  server: {
    port: 3000,
    open: true,
    // Local `npm run dev` does not run Vercel functions; use `vercel dev` for full-stack testing,
    // or set VITE_VERCEL_DEV_ORIGIN (e.g. http://127.0.0.1:3001) when API is served elsewhere.
    proxy: process.env.VITE_VERCEL_DEV_ORIGIN
      ? {
          '/api/bad-leader': {
            target: process.env.VITE_VERCEL_DEV_ORIGIN,
            changeOrigin: true,
          },
        }
      : {},
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
