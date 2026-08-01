import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Il sito vive in una sottocartella: https://…github.io/casa-nuova/
  // Deve essere un percorso assoluto, non './': serve anche al router come
  // basename, altrimenti l'app "esce" dalla propria cartella e ogni immagine
  // relativa (il logo) va a cercarsi nella radice del dominio.
  base: '/casa-nuova/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // logo e favicon restavano fuori dal precache: erano le uniche immagini
      // della schermata iniziale e senza rete si vedeva il riquadro rotto.
      includeAssets: ['fonts/fraunces.woff2', 'icons/icon-180.png', 'logo.png', 'favicon.png'],
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
