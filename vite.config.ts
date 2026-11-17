import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' (non autoUpdate): mostra il banner "Nuova versione disponibile"
      // così su mobile l'aggiornamento è esplicito e immediato, non a discrezione dell'OS.
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Taskboard',
        short_name: 'Taskboard',
        description: 'Gestione attività e memoria professionale',
        theme_color: '#1a202c',
        background_color: '#1a202c',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Auth (token, profilo utente, recupero password): mai in cache
            urlPattern: /^https:\/\/dacekxilrahnbwwjovde\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            // Solo le letture dati REST. La cache viene svuotata al logout (AuthGate).
            urlPattern: /^https:\/\/dacekxilrahnbwwjovde\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
})
