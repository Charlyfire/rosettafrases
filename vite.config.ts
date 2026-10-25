import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/**/*.{png,mp3,wav,ogg}'],
      manifest: {
        name: 'Rosetta Digital',
        short_name: 'Rosetta',
        description: 'Aplicación educativa para Educación Infantil',
        theme_color: '#f4f0e8',
        background_color: '#f4f0e8',
        display: 'fullscreen',
        orientation: 'landscape',
        lang: 'es'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,mp3,wav,ogg}'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        cleanupOutdatedCaches: true
      }
    })
  ]
})
