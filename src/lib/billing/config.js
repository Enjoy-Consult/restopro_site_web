// Configuration de la vente d'abonnements, lue dans les variables de build (VITE_*).
// Aucune URL n'est écrite en dur dans les pages : voir .env.example.

// import.meta.env n'existe qu'avec Vite ; sous node (tests), on lit process.env.
const env = import.meta.env ?? globalThis.process?.env ?? {};

const vrai = (valeur) => String(valeur ?? "").trim().toLowerCase() === "true";
const url = (valeur) => String(valeur ?? "").trim().replace(/\/+$/, "");

export const BILLING_ACTIF = vrai(env.VITE_BILLING_ACTIF);
// Maquette (réponses simulées de l'API) : serveur de développement seulement. Vite remplace __MAQUETTE_POSSIBLE__ par
// true sous `vite` et par false dans tout build (production ou test) : BILLING_MOCK vaut alors false et mock.js n'entre
// pas dans le bundle (garde de la livraison A, commit 8a846c7, alerte CodeQL n° 1). VITE_BILLING_MOCK n'a donc aucun
// effet dans un build, qui appelle la vraie API. Sous node (tests), la constante n'existe pas : process.env décide.
/* global __MAQUETTE_POSSIBLE__ */
const DEVELOPPEMENT = typeof __MAQUETTE_POSSIBLE__ === "undefined" ? true : __MAQUETTE_POSSIBLE__;
export const BILLING_MOCK = DEVELOPPEMENT && vrai(env.VITE_BILLING_MOCK);
export const BILLING_MOCK_PMS = BILLING_MOCK && vrai(env.VITE_BILLING_MOCK_PMS);
// Scénarios de la maquette : serveur de développement seulement, jamais dans un build.
export const BILLING_MOCK_DEV = BILLING_MOCK && env.DEV === true;

export const API_URL = url(env.VITE_API_URL);
export const APP_WEB_URL = url(env.VITE_APP_WEB_URL);
export const APP_STORE_URL = url(env.VITE_APP_STORE_URL);
export const PLAY_STORE_URL = url(env.VITE_PLAY_STORE_URL);
// Les deux origines (README, « Deux builds ») : restoclair.fr (vitrine, inscription) et compte.restoclair.fr (connexion,
// espace abonnement, mot de passe). Un lien d'une origine à l'autre utilise toujours l'adresse complète.
export const SITE_URL = url(env.VITE_SITE_URL);
export const COMPTE_URL = url(env.VITE_COMPTE_URL);

// Espace abonnement du site (CGV 0.2, article 2) : la gestion payante n'est plus dans l'application web, qui reçoit
// 403 GESTION_SITE_SEULEMENT (contrat des routes d'Apirest, point 8). APP_WEB_URL ne sert plus qu'à se connecter à l'app.
export const CHEMIN_ESPACE = "/mon-abonnement";
// Depuis la vitrine, l'espace est sur une autre origine : adresse complète, ou null si VITE_COMPTE_URL manque
// (développement mal réglé ; le garde-fou l'exige pour une vitrine de production qui vend).
export const URL_ESPACE = COMPTE_URL ? `${COMPTE_URL}${CHEMIN_ESPACE}` : null;
export const URL_MOT_DE_PASSE_COMPTE = COMPTE_URL ? `${COMPTE_URL}/mot-de-passe` : null;
