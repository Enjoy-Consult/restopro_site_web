// Garde-fou du build : la vente d'abonnements ne part pas en production avec un document contractuel
// encore en projet, ni sans les adresses de l'API et de l'application (voir README, « Avant d'activer la vente »).
// Fonction pure : elle reçoit tout ce qu'elle lit. vite.config.js ne fait que l'appeler.
import { STATUTS_ADMIS } from "./legal.mjs";

// Les documents que le client accepte à l'inscription.
export const DOCUMENTS_REQUIS = ["cgv", "accord-sous-traitance", "cgu-app"];
const ADRESSES_REQUISES = ["VITE_API_URL", "VITE_APP_WEB_URL"];

// Même lecture que src/lib/billing/config.js (comparée par les tests) : le site et le garde-fou voient la même chose.
const vrai = (valeur) => String(valeur ?? "").trim().toLowerCase() === "true";
const url = (valeur) => String(valeur ?? "").trim().replace(/\/+$/, "");

function problemeDocument(documents, cle) {
  const doc = documents.find((d) => d.document === cle);
  if (!doc) return `le document « ${cle} » est absent de documents.json`;
  const enVigueur = doc.versions.find((v) => v.version === doc.versionEnVigueur);
  if (!enVigueur) return `le document « ${cle} » n'a pas de version en vigueur connue (« ${doc.versionEnVigueur} »)`;
  if (enVigueur.statut === "projet") return `le document « ${cle} » (version ${enVigueur.version}) a encore le statut « projet »`;
  // Un statut mal écrit ne doit pas ouvrir la vente : le workflow de production ne lance pas npm test.
  if (!STATUTS_ADMIS.includes(enVigueur.statut)) return `le document « ${cle} » (version ${enVigueur.version}) a un statut inconnu (« ${enVigueur.statut} »)`;
  return null;
}

// Renvoie la liste des problèmes, vide si le build peut continuer.
// Seul un build de production qui ouvre la vente réelle est contrôlé : ni le développement, ni la maquette,
// ni un build sans VITE_BILLING_ACTIF.
export function problemesVente({ commande, mode, env, documents }) {
  if (commande !== "build" || mode !== "production") return [];
  if (!vrai(env.VITE_BILLING_ACTIF) || vrai(env.VITE_BILLING_MOCK)) return [];
  return [
    ...DOCUMENTS_REQUIS.map((cle) => problemeDocument(documents, cle)).filter(Boolean),
    ...ADRESSES_REQUISES.filter((nom) => !url(env[nom])).map((nom) => `${nom} est vide`),
  ];
}

export function messageGardeFou(problemes) {
  return [
    "Build de production refusé : VITE_BILLING_ACTIF=true ouvre la vente, mais :",
    ...problemes.map((p) => `  - ${p} ;`),
    "Corrigez ces points (README.md, « Avant d'activer la vente »), ou retirez VITE_BILLING_ACTIF pour compiler le site sans la vente.",
  ].join("\n");
}
