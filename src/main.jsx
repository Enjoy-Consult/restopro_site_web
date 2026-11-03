import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
// Polices hébergées par le site (aucun appel à Google Fonts) : graisses 400, 500 et 600 seulement.
import '@fontsource/instrument-sans/400.css'
import '@fontsource/instrument-sans/500.css'
import '@fontsource/instrument-sans/600.css'
import '@fontsource/newsreader/400.css'
import '@fontsource/newsreader/500.css'
import '@fontsource/newsreader/600.css'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
