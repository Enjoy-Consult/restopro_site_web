// Consentement aux cookies (recommandations de la CNIL) : rien de Google n'est chargé avant un « oui » explicite.
// Le conteneur GTM charge la balise Google, qui envoie vers Google Ads et vers Google Analytics
// (G-Z0ZKBK12KB, réglé chez Google et non dans le conteneur). Les deux relèvent d'un seul choix du bandeau.
// Le mode de consentement de Google (v2) est déclaré « refusé » dans index.html, avant tout chargement.

export const GTM_ID = "GTM-MJ9BMVVK";
export const CLE_CONSENTEMENT = "restoclair_consentement";
export const VERSION_CONSENTEMENT = 1;
// Choix conservé 6 mois au plus, puis nouvelle demande.
export const DUREE_CONSENTEMENT_MS = 180 * 24 * 60 * 60 * 1000;
export const EVENEMENT_GESTION = "restoclair:gerer-cookies";

// Choix qui n'a pas pu être écrit : il vaut pour la page en cours et passe avant tout ce qui est encore stocké.
let memoire = null;

function lireStockage() {
  try {
    return window.localStorage.getItem(CLE_CONSENTEMENT);
  } catch {
    return null; // stockage indisponible
  }
}

// Choix valable, ou null (absent, illisible, d'une autre version ou plus vieux que 6 mois).
export function lireConsentement(maintenant = Date.now()) {
  let choix = memoire;
  if (!choix) {
    const brut = lireStockage();
    if (brut) {
      try {
        choix = JSON.parse(brut);
      } catch {
        return null;
      }
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

// Signaux du mode de consentement : analytics_storage reste refusé, même après accord.
// Google Analytics reçoit alors ses mesures sans cookie (ni _ga ni _ga_*).
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
function effacerCookies(estVise) {
  const noms = document.cookie
    .split(";")
    .map((c) => c.split("=")[0].trim())
    .filter(estVise);
  const hote = window.location.hostname;
  const domaines = [hote, `.${hote.replace(/^www\./, "")}`];
  for (const nom of noms) {
    document.cookie = `${nom}=; Max-Age=0; path=/`;
    for (const domaine of domaines) document.cookie = `${nom}=; Max-Age=0; path=/; domain=${domaine}`;
  }
}

export function effacerTraceursPublicite() {
  effacerCookies((nom) => nom.startsWith("_gcl_"));
  try {
    for (const cle of Object.keys(window.localStorage)) if (cle.startsWith("_gcl_")) window.localStorage.removeItem(cle);
  } catch {
    // stockage indisponible
  }
}

// Au démarrage : applique un choix déjà enregistré (sans choix, rien n'est chargé).
export function appliquerConsentement(choix) {
  // analytics_storage reste refusé : les _ga déposés avant la mise en place du bandeau ne servent plus.
  effacerCookies((nom) => nom === "_ga" || nom.startsWith("_ga_"));
  if (!choix) return;
  gtag("consent", "update", signauxConsentement(choix.publicite));
  if (choix.publicite) chargerGtm();
}

// L'ancien accord est-il encore stocké ? Il reviendrait alors au prochain chargement de la page.
function accordEncoreStocke() {
  const brut = lireStockage();
  if (!brut) return false;
  try {
    return JSON.parse(brut)?.publicite === true;
  } catch {
    return false;
  }
}

// Enregistre un choix. Renvoie { rechargement: true } quand Google Tag Manager, déjà chargé, doit être retiré
// de la page : le seul moyen fiable est de la recharger.
export function enregistrerConsentement(publicite, maintenant = new Date()) {
  const choix = { version: VERSION_CONSENTEMENT, publicite, date: maintenant.toISOString() };
  try {
    window.localStorage.setItem(CLE_CONSENTEMENT, JSON.stringify(choix));
    memoire = null;
  } catch {
    // Le choix reste en mémoire pour la page en cours, et l'ancien ne doit pas lui survivre :
    // après un retrait, il rétablirait l'accord au rechargement. Sans choix stocké, la question revient.
    memoire = choix;
    try {
      window.localStorage.removeItem(CLE_CONSENTEMENT);
    } catch {
      // stockage indisponible
    }
  }
  gtag("consent", "update", signauxConsentement(publicite));
  if (publicite) {
    chargerGtm();
    return { rechargement: false };
  }
  effacerTraceursPublicite();
  // Si l'ancien accord n'a pas pu être retiré, recharger le rétablirait : on reste sur la page, où tout est refusé.
  return { rechargement: gtmCharge() && !accordEncoreStocke() };
}

// Rouvre le choix (lien « Gérer mes cookies »).
export function ouvrirGestionCookies() {
  window.dispatchEvent(new Event(EVENEMENT_GESTION));
}
