import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
// .env / .env.local çoğu zaman repo kökünde (tavaris-scanner bir üst klasör)
export default defineConfig({
  envDir: path.resolve(__dirname, '..'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: '/qr-scanner/',
  plugins: [
    react(),
    tailwindcss(),
  ],
})
