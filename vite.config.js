import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',   // percorsi relativi: necessario per GitHub Pages in sottocartella
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fonts/fraunces.woff2', 'icons/icon-180.png'],
      manifest: {
        name: 'Casa Nuova',
        short_name: 'Casa Nuova',
        description: 'Il percorso della casa nuova, dal cantiere alla consegna',
        lang: 'it',
        display: 'standalone',
        background_color: '#EBE1CE',
        theme_color: '#EBE1CE',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          // versione a parte: nel maskable il sistema ritaglia in tondo,
          // quindi il segno sta più piccolo e ben centrato
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallbackDenylist: [/^\/rest/, /^\/storage/, /^\/auth/],
        // la nuova versione sostituisce subito la vecchia, senza restare in cache
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true
      }
    })
  ]
})
