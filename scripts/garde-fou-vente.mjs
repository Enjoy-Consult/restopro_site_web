// Garde-fou du build : la vente d'abonnements ne part pas en production avec un document contractuel
// encore en projet, ni sans les adresses dont elle a besoin (voir README, « Avant d'activer la vente »).
// Fonction pure : elle reçoit tout ce qu'elle lit. scripts/vite-plugins.mjs ne fait que l'appeler, pour les deux builds :
// - vitrine (restoclair.fr) : contrôlée seulement si VITE_BILLING_ACTIF ouvre la vente ;
// - compte (compte.restoclair.fr) : il ne sert qu'à la vente (connexion, espace abonnement, mot de passe), donc
//   toujours contrôlé, quel que soit VITE_BILLING_ACTIF.
import { STATUTS_ADMIS } from "./legal.mjs";

// Les documents que le client accepte à l'inscription.
export const DOCUMENTS_REQUIS = ["cgv", "accord-sous-traitance", "cgu-app"];
export const ADRESSES_REQUISES = {
  // La vitrine renvoie vers l'espace abonnement de compte.restoclair.fr (inscription, retour de paiement, tarifs).
  vitrine: ["VITE_API_URL", "VITE_APP_WEB_URL", "VITE_COMPTE_URL"],
  // Le compte appelle l'API et renvoie vers le site (documents juridiques, accueil) par des adresses complètes.
  compte: ["VITE_API_URL", "VITE_SITE_URL", "VITE_COMPTE_URL"],
};

// Même lecture que src/lib/billing/config.js (comparée par les tests) : le site et le garde-fou voient la même chose.
const vrai = (valeur) => String(valeur ?? "").trim().toLowerCase() === "true";
const url = (valeur) => String(valeur ?? "").trim().replace(/\/+$/, "");

// La vente est-elle en jeu dans ce build ? Toujours pour le compte ; pour la vitrine, selon l'interrupteur.
const venteEnJeu = (env, build) => build === "compte" || vrai(env.VITE_BILLING_ACTIF);

function problemeDocument(documents, cle) {
  const doc = documents.find((d) => d.document === cle);
  if (!doc) return `le document « ${cle} » est absent de documents.json`;
  const enVigueur = doc.versions.find((v) => v.version === doc.versionEnVigueur);
  if (!enVigueur) return `le document « ${cle} » n'a pas de version en vigueur connue (« ${doc.versionEnVigueur} »)`;
  if (enVigueur.statut === "projet") return `le document « ${cle} » (version ${enVigueur.version}) a encore le statut « projet »`;
  // Un statut mal écrit ne doit pas ouvrir la vente, même si npm test n'a pas tourné (build lancé à la main).
  if (!STATUTS_ADMIS.includes(enVigueur.statut)) return `le document « ${cle} » (version ${enVigueur.version}) a un statut inconnu (« ${enVigueur.statut} »)`;
  return null;
}

// Renvoie la liste des problèmes, vide si le build peut continuer.
// Seul un build de production qui ouvre la vente est contrôlé : ni le développement, ni le site de test (--mode test),
// ni une vitrine sans VITE_BILLING_ACTIF. La maquette n'exempte plus de rien : elle n'existe pas dans un build
// (src/lib/billing/config.js), qui appelle donc toujours la vraie API.
export function problemesVente({ commande, mode, env, documents, build = "vitrine" }) {
  if (!ADRESSES_REQUISES[build]) return [`build inconnu : « ${build} »`];
  if (commande !== "build" || mode !== "production") return [];
  if (!venteEnJeu(env, build)) return [];
  return [
    ...DOCUMENTS_REQUIS.map((cle) => problemeDocument(documents, cle)).filter(Boolean),
    ...ADRESSES_REQUISES[build].filter((nom) => !url(env[nom])).map((nom) => `${nom} est vide`),
    // Le compte de production ne parle qu'à des adresses chiffrées : une adresse de test (http, localhost) ne passe pas.
    ...(build === "compte"
      ? ADRESSES_REQUISES.compte.filter((nom) => url(env[nom]) && !/^https:\/\/[^/]+/i.test(url(env[nom]))).map((nom) => `${nom} doit commencer par https:// (« ${url(env[nom])} »)`)
      : []),
  ];
}

// VITE_BILLING_MOCK dans un build : sans effet, mais celui qui l'a mis croit peut-être compiler une maquette.
export function avertissementMaquette({ commande, env }) {
  if (commande !== "build" || !vrai(env.VITE_BILLING_MOCK)) return null;
  return "Attention : VITE_BILLING_MOCK=true n'a aucun effet dans un build. La maquette ne fonctionne qu'avec le serveur de développement (npm run dev, npm run dev:compte) ; ce build appelle la vraie API (VITE_API_URL).";
}

export function messageGardeFou(problemes, build = "vitrine") {
  if (build === "compte") {
    return [
      "Build de production du compte refusé : il sert à la vente, mais :",
      ...problemes.map((p) => `  - ${p} ;`),
      "Corrigez ces points (README.md, « Avant d'activer la vente » et « Deux builds ») : il n'existe pas de build compte sans la vente.",
    ].join("\n");
  }
  return [
    "Build de production refusé : VITE_BILLING_ACTIF=true ouvre la vente, mais :",
    ...problemes.map((p) => `  - ${p} ;`),
    "Corrigez ces points (README.md, « Avant d'activer la vente »), ou retirez VITE_BILLING_ACTIF pour compiler le site sans la vente.",
  ].join("\n");
}
