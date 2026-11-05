// Configuration de la vente d'abonnements, lue dans les variables de build (VITE_*).
// Aucune URL n'est écrite en dur dans les pages : voir .env.example.

// import.meta.env n'existe qu'avec Vite ; sous node (tests), on lit process.env.
const env = import.meta.env ?? globalThis.process?.env ?? {};

const vrai = (valeur) => String(valeur ?? "").trim().toLowerCase() === "true";
const url = (valeur) => String(valeur ?? "").trim().replace(/\/+$/, "");

export const BILLING_ACTIF = vrai(env.VITE_BILLING_ACTIF);
export const BILLING_MOCK = vrai(env.VITE_BILLING_MOCK);
export const BILLING_MOCK_PMS = vrai(env.VITE_BILLING_MOCK_PMS);
// Scénarios de la maquette : serveur de développement seulement, jamais dans un build.
export const BILLING_MOCK_DEV = BILLING_MOCK && env.DEV === true;

export const API_URL = url(env.VITE_API_URL);
export const APP_WEB_URL = url(env.VITE_APP_WEB_URL);
export const APP_STORE_URL = url(env.VITE_APP_STORE_URL);
export const PLAY_STORE_URL = url(env.VITE_PLAY_STORE_URL);

export const URL_MON_COMPTE = APP_WEB_URL ? `${APP_WEB_URL}/mon-compte` : "";
