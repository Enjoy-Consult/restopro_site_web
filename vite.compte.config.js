import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { documentsLegaux, gardeFouVente } from './scripts/vite-plugins.mjs'

// Build compte (compte.restoclair.fr) : connexion, espace abonnement, choix et réinitialisation du mot de passe.
// Même commit que la vitrine (vite.config.js), autre point d'entrée : compte/index.html, sans script ni style intégré,
// et compte/main.jsx. Sortie dans dist-compte/, publiée dans web/compte.restoclair.fr. Voir README, « Deux builds ».
// - variables (.env*) lues à la racine du dépôt, comme pour la vitrine ;
// - pas de dossier public : rien de public/ n'est copié (robots.txt, sitemap, fichiers de vérification de la vitrine) ;
// - index juridique (versions et empreintes) disponible par « virtual:documents-legaux », textes jamais publiés ;
// - après le build, scripts/controle-builds.mjs vérifie le résultat (npm run build:compte).
export default defineConfig({
  root: path.resolve(__dirname, 'compte'),
  envDir: __dirname,
  publicDir: false,
  // Cache de dépendances propre au compte : partagé avec la vitrine, chaque serveur de développement effacerait celui
  // de l'autre (racines différentes), et la vitrine répondrait 504 « Outdated Optimize Dep ».
  cacheDir: path.resolve(__dirname, 'node_modules/.vite-compte'),
  logLevel: 'error',
  plugins: [
    gardeFouVente('compte'),
    react(),
    documentsLegaux({ publier: false }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    postcss: __dirname,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist-compte'),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
  },
})
