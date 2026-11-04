/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['placeholder.png'],
      manifest: {
        name: 'ကြယ်စင်စကြာ',
        short_name: 'ကြယ်စင်စကြာ',
        lang: 'my',
        display: 'standalone',
        start_url: '/',
        background_color: '#ffffff',
        theme_color: '#2e7d32',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
