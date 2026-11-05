// Documents légaux de RestOclair : source unique pour le site, l'application et l'API.
// Chaque version est un fichier Markdown immuable : src/content/legal/<document>/<version>.md,
// décrit dans documents.json (version en vigueur, date d'entrée en vigueur, statut).
// Les documents « application » ne contiennent ni prix, ni mention d'abonnement payant, ni lien d'achat.
// Empreinte et index publiés : scripts/legal.mjs (voir README).
import documents from "./documents.json";

const SOURCES = import.meta.glob("./*/*.md", { query: "?raw", import: "default", eager: true });

export const DOCUMENTS_LEGAUX = Object.fromEntries(
  documents.map((doc) => [
    doc.document,
    {
      ...doc,
      sources: Object.fromEntries(doc.versions.map((v) => [v.version, SOURCES[`./${doc.document}/${v.version}.md`]])),
    },
  ])
);
