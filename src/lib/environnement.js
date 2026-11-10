// Où tourne ce build : le site de production, ou un autre (serveur de développement, site de test).
// Vite fixe MODE : « production » pour `vite build`, « test » pour `vite build --mode test`, « development » pour
// `npm run dev`. On ne lit pas PROD : un build `--mode test` garde NODE_ENV=production, donc PROD vrai.
//
// Hors du site de production :
// - Google n'est jamais chargé et le bandeau des cookies ne s'affiche pas ;
// - le formulaire de contact et la demande d'essai n'écrivent rien vers le PHP de production (Airtable, FormSubmit).
// Les lectures (blog, avis clients) restent actives partout.

// import.meta.env n'existe qu'avec Vite ; sous node (tests), on lit process.env.
const env = import.meta.env ?? globalThis.process?.env ?? {};

export const SITE_DE_PRODUCTION = env.MODE === "production";

// Pages où Google n'est jamais chargé, même sur le site de production, et où le bandeau ne s'affiche pas :
// - les documents de l'application (/application/…), lus par les magasins et par l'application ;
// - la reprise d'une inscription : le lien reçu par e-mail porte un code à usage unique ;
// - l'espace abonnement, sa connexion comprise (/mon-abonnement…).
const SANS_TRACEURS = [
  (chemin) => chemin.startsWith("/application/"),
  (chemin) => chemin === "/abonnement/reprendre" || chemin.startsWith("/abonnement/reprendre/"),
  (chemin) => chemin === "/mon-abonnement" || chemin.startsWith("/mon-abonnement/"),
];

export function pageSansTraceurs(chemin) {
  return SANS_TRACEURS.some((regle) => regle(String(chemin ?? "")));
}

// Google (bandeau et Google Tag Manager) est-il permis sur cette page ?
export function traceursPermis(chemin, production = SITE_DE_PRODUCTION) {
  return production && !pageSansTraceurs(chemin);
}

// Le formulaire de contact et la demande d'essai écrivent vers le PHP de production : seulement depuis le site de production.
export function ecrituresProductionPermises(production = SITE_DE_PRODUCTION) {
  return production;
}

export const TEXTE_ENVOI_COUPE =
  "Ce formulaire n’envoie rien depuis ce site de test. Sur le site restoclair.fr, il fonctionne normalement.";
