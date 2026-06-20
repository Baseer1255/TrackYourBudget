import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-transparent.png'], // Matches your logo file
      manifest: {
        name: 'TrakYourBudget',
        short_name: 'TYB',
        description: 'AI-Powered Wealth Management',
        theme_color: '#0f172a', // Matches your dark slate background
        background_color: '#0f172a',
        display: 'standalone', // Makes it look like a native app (no browser bar)
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