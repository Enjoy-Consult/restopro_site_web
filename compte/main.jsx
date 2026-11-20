// Point d'entrée du build compte (compte.restoclair.fr). Voir README, « Deux builds ».
// Ni bandeau des cookies, ni Google, ni Airtable, ni texte juridique : ils ne sont pas importés ici, donc absents du bundle
// (contrôlé après le build par scripts/controle-builds.mjs).
import React from 'react'
import ReactDOM from 'react-dom/client'
import AppCompte from '@/compte/AppCompte.jsx'
import { ICONE } from '@/compte/icone.js'
// Polices hébergées par le site : graisses 400, 500 et 600 seulement.
import '@fontsource/instrument-sans/400.css'
import '@fontsource/instrument-sans/500.css'
import '@fontsource/instrument-sans/600.css'
import '@fontsource/newsreader/400.css'
import '@fontsource/newsreader/500.css'
import '@fontsource/newsreader/600.css'
import '@/index.css'

// L'icône vient du build (/assets/…, avec empreinte) : pas de fichier public à copier sur cette origine.
const icone = document.createElement('link')
icone.rel = 'icon'
icone.type = 'image/jpeg'
icone.href = ICONE
document.head.append(icone)

ReactDOM.createRoot(document.getElementById('root')).render(
  <AppCompte />
)
