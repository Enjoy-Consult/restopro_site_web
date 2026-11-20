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
// - la reprise d'une inscription et la définition du mot de passe : le lien reçu par e-mail porte un code à usage unique ;
// - l'espace abonnement, sa connexion comprise (/mon-abonnement…) ;
// - l'inscription et le retour de paiement, où le jeton d'inscription naît et sert (décision de Louis du 10/11).
const SANS_TRACEURS = [
  (chemin) => chemin === "/inscription" || chemin.startsWith("/inscription/"),
  (chemin) => chemin === "/abonnement/retour" || chemin.startsWith("/abonnement/retour/"),
  (chemin) => chemin.startsWith("/application/"),
  (chemin) => chemin === "/abonnement/reprendre" || chemin.startsWith("/abonnement/reprendre/"),
  (chemin) => chemin === "/compte/mot-de-passe" || chemin.startsWith("/compte/mot-de-passe/"),
  (chemin) => chemin === "/mon-abonnement" || chemin.startsWith("/mon-abonnement/"),
];

export function pageSansTraceurs(chemin) {
  return SANS_TRACEURS.some((regle) => regle(String(chemin ?? "")));
}

// Google (bandeau et Google Tag Manager) est-il permis sur cette page ? jetonInscription : un jeton d'inscription existe
// dans l'onglet (sessionStorage). Décision de Louis du 10/11 : tant qu'il existe, Google est bloqué, même après
// « Tout accepter » (la conversion de l'achat n'est donc pas mesurée par Google).
export function traceursPermis(chemin, production = SITE_DE_PRODUCTION, jetonInscription = false) {
  return production && !pageSansTraceurs(chemin) && !jetonInscription;
}

// Une fois qu'un document (l'onglet, jusqu'au prochain chargement de la page) est passé par une page sans Google, ou a
// porté un jeton d'inscription, il ne charge plus Google. Sinon, revenir sur une page exclue avec Google chargé
// imposerait un rechargement, qui effacerait la saisie de l'inscription gardée en mémoire (« Modifier mon choix »).
let documentSansGoogle = false;

export function googlePermisDansCeDocument(chemin, jetonInscription = false, production = SITE_DE_PRODUCTION) {
  const ici = traceursPermis(chemin, production, jetonInscription);
  if (!ici) documentSansGoogle = true;
  return ici && !documentSansGoogle;
}

// Pour les tests seulement.
export function oublierDocumentSansGoogle() {
  documentSansGoogle = false;
}

// Le formulaire de contact et la demande d'essai écrivent vers le PHP de production : seulement depuis le site de production.
export function ecrituresProductionPermises(production = SITE_DE_PRODUCTION) {
  return production;
}

export const TEXTE_ENVOI_COUPE =
  "Ce formulaire n’envoie rien depuis ce site de test. Sur le site restoclair.fr, il fonctionne normalement.";
