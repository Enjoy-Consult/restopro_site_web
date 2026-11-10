import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { documentsLegaux, gardeFouVente } from './scripts/vite-plugins.mjs'

// Build vitrine (restoclair.fr). Le build compte (compte.restoclair.fr) a sa propre configuration :
// vite.compte.config.js. Greffons communs : scripts/vite-plugins.mjs. Voir README, « Deux builds ».

export default defineConfig({
  logLevel: 'error',
  plugins: [
    gardeFouVente('vitrine'),
    react(),
    documentsLegaux(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    historyApiFallback: true,
  },
  preview: {
    historyApiFallback: true,
  },
})
