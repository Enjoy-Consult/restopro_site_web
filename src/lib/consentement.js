// Consentement aux cookies (recommandations de la CNIL) : rien de Google n'est chargé avant un « oui » explicite.
// Le conteneur GTM ne contient que Google Ads (conversions) : une seule finalité soumise au consentement.
// Le mode de consentement de Google (v2) est déclaré « refusé » dans index.html, avant tout chargement.

export const GTM_ID = "GTM-MJ9BMVVK";
export const CLE_CONSENTEMENT = "restoclair_consentement";
export const VERSION_CONSENTEMENT = 1;
// Choix conservé 6 mois au plus, puis nouvelle demande.
export const DUREE_CONSENTEMENT_MS = 180 * 24 * 60 * 60 * 1000;
export const EVENEMENT_GESTION = "restoclair:gerer-cookies";

let memoire = null; // secours si le stockage local est indisponible (le choix vaut alors pour la page en cours)

// Choix valable, ou null (absent, illisible, d'une autre version ou plus vieux que 6 mois).
export function lireConsentement(maintenant = Date.now()) {
  let brut = null;
  try {
    brut = window.localStorage.getItem(CLE_CONSENTEMENT);
  } catch {
    // stockage indisponible
  }
  let choix = memoire;
  if (brut) {
    try {
      choix = JSON.parse(brut);
    } catch {
      return null;
    }
  }
  if (!choix || choix.version !== VERSION_CONSENTEMENT || typeof choix.publicite !== "boolean") return null;
  const date = Date.parse(choix.date);
  if (!Number.isFinite(date) || maintenant - date > DUREE_CONSENTEMENT_MS || date - maintenant > 60_000) return null;
  return { publicite: choix.publicite, date: choix.date };
}

// gtag doit pousser l'objet `arguments` (et non un tableau) dans dataLayer.
function gtag() {
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

// Signaux du mode de consentement : il n'y a pas de mesure d'audience, analytics_storage reste refusé.
export function signauxConsentement(publicite) {
  const etat = publicite ? "granted" : "denied";
  return { ad_storage: etat, ad_user_data: etat, ad_personalization: etat, analytics_storage: "denied" };
}

export function gtmCharge() {
  return Boolean(document.getElementById("gtm-script"));
}

export function chargerGtm() {
  if (gtmCharge()) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  const script = document.createElement("script");
  script.id = "gtm-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(script);
}

// Retrait du consentement : efface les cookies de Google Ads déposés sur ce domaine (_gcl_*) et leur copie locale.
export function effacerTraceursPublicite() {
  const noms = document.cookie
    .split(";")
    .map((c) => c.split("=")[0].trim())
    .filter((nom) => nom.startsWith("_gcl_"));
  const hote = window.location.hostname;
  const domaines = [hote, `.${hote.replace(/^www\./, "")}`];
  for (const nom of noms) {
    document.cookie = `${nom}=; Max-Age=0; path=/`;
    for (const domaine of domaines) document.cookie = `${nom}=; Max-Age=0; path=/; domain=${domaine}`;
  }
  try {
    for (const cle of Object.keys(window.localStorage)) if (cle.startsWith("_gcl_")) window.localStorage.removeItem(cle);
  } catch {
    // stockage indisponible
  }
}

// Au démarrage : applique un choix déjà enregistré (sans choix, rien n'est chargé).
export function appliquerConsentement(choix) {
  if (!choix) return;
  gtag("consent", "update", signauxConsentement(choix.publicite));
  if (choix.publicite) chargerGtm();
}

// Enregistre un choix. Renvoie { rechargement: true } quand Google Tag Manager, déjà chargé, doit être retiré
// de la page : le seul moyen fiable est de la recharger.
export function enregistrerConsentement(publicite, maintenant = new Date()) {
  const choix = { version: VERSION_CONSENTEMENT, publicite, date: maintenant.toISOString() };
  memoire = choix;
  try {
    window.localStorage.setItem(CLE_CONSENTEMENT, JSON.stringify(choix));
  } catch {
    // le choix reste en mémoire pour la page en cours
  }
  gtag("consent", "update", signauxConsentement(publicite));
  if (publicite) {
    chargerGtm();
    return { rechargement: false };
  }
  effacerTraceursPublicite();
  return { rechargement: gtmCharge() };
}

// Rouvre le choix (lien « Gérer mes cookies »).
export function ouvrirGestionCookies() {
  window.dispatchEvent(new Event(EVENEMENT_GESTION));
}
