// Greffons Vite communs aux deux builds : la vitrine (vite.config.js, restoclair.fr) et le compte
// (vite.compte.config.js, compte.restoclair.fr). Voir README, « Deux builds ».
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { avertissementMaquette, messageGardeFou, problemesVente } from './garde-fou-vente.mjs'
import { construireHistorique, construireIndex, lireDocuments, RACINE_LEGALE } from './legal.mjs'

// Garde-fou de la vente (règles dans scripts/garde-fou-vente.mjs).
// config.env contient les variables que verra le site : .env*, puis celles du processus, qui passent devant.
export function gardeFouVente(build = 'vitrine') {
  return {
    name: 'garde-fou-vente',
    configResolved({ command, mode, env }) {
      const problemes = problemesVente({ commande: command, mode, env, documents: lireDocuments(), build })
      if (problemes.length > 0) throw new Error(messageGardeFou(problemes, build))
      const avertissement = avertissementMaquette({ commande: command, mode, env, build })
      if (avertissement) console.warn(`\n${avertissement}\n`)
    },
  }
}

// Documents légaux : module virtuel « virtual:documents-legaux » (versions en vigueur et empreintes), dans les deux builds.
// publier : la vitrine publie aussi l'index et les textes sous /legal/ (index.json, historique.json,
// <document>/<version>.md). Le build compte ne les publie pas : aucun texte juridique n'y est servi.
export function documentsLegaux({ publier = true } = {}) {
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
  const greffon = {
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
  }
  if (!publier) return greffon
  return {
    ...greffon,
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
