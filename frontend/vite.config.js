import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        cleanupOutdatedCaches: true, // Instantly deletes the old 404 files
        clientsClaim: true,          // Takes control of the browser immediately
        skipWaiting: true            // Forces the new version to install in the background
      },
      manifest: {
        name: 'TrakYourBudget',
        short_name: 'TrakYourBudget',
        description: 'Personal finance and budget tracking app',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/logo-transparent.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo-transparent.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})