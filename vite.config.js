import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
import path from 'path'
import { construireHistorique, construireIndex, lireDocuments, RACINE_LEGALE } from './scripts/legal.mjs'

// Documents légaux : index et textes publiés sous /legal/ (index.json, historique.json, <document>/<version>.md),
// et module virtuel « virtual:documents-legaux » (versions en vigueur et empreintes) pour le site.
function documentsLegaux() {
  const ID = 'virtual:documents-legaux'
  const RESOLU = `\0${ID}`
  const fichiers = () => [
    ['legal/index.json', `${JSON.stringify(construireIndex(), null, 2)}\n`],
    ['legal/historique.json', `${JSON.stringify(construireHistorique(), null, 2)}\n`],
    ...lireDocuments().flatMap((doc) =>
      doc.versions.map((v) => [
        `legal/${doc.document}/${v.version}.md`,
        readFileSync(path.join(RACINE_LEGALE, doc.document, `${v.version}.md`), 'utf8'),
      ]),
    ),
  ]
  return {
    name: 'documents-legaux',
    resolveId: (id) => (id === ID ? RESOLU : null),
    load(id) {
      if (id !== RESOLU) return null
      this.addWatchFile(path.join(RACINE_LEGALE, 'documents.json'))
      for (const doc of lireDocuments()) {
        for (const v of doc.versions) this.addWatchFile(path.join(RACINE_LEGALE, doc.document, `${v.version}.md`))
      }
      return `export const INDEX_LEGAL = ${JSON.stringify(construireIndex())};`
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const trouve = fichiers().find(([nom]) => `/${nom}` === req.url?.split('?')[0])
        if (!trouve) return next()
        res.setHeader('Content-Type', trouve[0].endsWith('.json') ? 'application/json; charset=utf-8' : 'text/markdown; charset=utf-8')
        res.end(trouve[1])
      })
    },
    generateBundle() {
      for (const [fileName, source] of fichiers()) this.emitFile({ type: 'asset', fileName, source })
    },
  }
}

export default defineConfig({
  logLevel: 'error',
  plugins: [
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
