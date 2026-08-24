import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "prompt": el SW nuevo espera a que el usuario acepte (evita romper
      // sesiones a mitad como hacía el sw.js manual con skipWaiting)
      registerType: 'prompt',
      // Se conserva el manifest.json existente de public/
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        // Firestore/Auth/Storage siempre por red: el SDK ya gestiona su caché
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(firestore|identitytoolkit|securetoken|firebasestorage)\.googleapis\.com\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    // 5173/5174 los ocupan otras instancias; si 5180 también estuviera en uso,
    // Vite busca el siguiente libre (strictPort desactivado por defecto)
    port: 5180,
  },
  preview: {
    port: 4174,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase'
          }
        },
      },
    },
  },
})
