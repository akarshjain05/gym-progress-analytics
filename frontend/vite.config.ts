import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'IRONLOG',
        short_name: 'IRONLOG',
        description: 'Gym Progress Analytics',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
      }
    })
  ],
})
