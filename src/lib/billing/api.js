// Appels à l'API publique d'Apirest ({API_URL}/api/billing/...).
// Le site ne connaît ni le service de paiement ni Stripe : il suit l'`url` renvoyée par l'API.
import { API_URL, BILLING_MOCK, BILLING_MOCK_DEV, BILLING_MOCK_PMS } from "./config.js";
import { ApiError } from "./errors.js";

export { ApiError };

const DELAI_MAX_MS = 15000;
// Jeton restreint de l'inscription (champ `token`), valable 2 h, envoyé seulement sur /checkout et /compte.
const EN_TETE_AUTH = "Authorization";
const SCHEMA_AUTH = "Bearer";

const estObjet = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const texte = (v) => (typeof v === "string" ? v.trim() : "");
const liste = (v) => (Array.isArray(v) ? v : []);
const sansEnveloppe = (corps) => (estObjet(corps) && estObjet(corps.data) ? corps.data : corps);

// Format d'erreur d'Apirest : { code, message, details }. Un 429 n'a pas de code : { message, retryAfter }.
// Les variantes (error, erreur, enveloppe data, detail au singulier) restent lues par tolérance.
export function lireErreur(data) {
  const niveaux = [data, data?.error, data?.erreur, data?.data].filter(estObjet);
  const candidats = [...niveaux.map((n) => n.code), data?.error, data?.erreur];
  const code = candidats.find((c) => typeof c === "string" && /^[A-Z][A-Z_]+$/.test(c)) ?? null;
  const detail = niveaux.map((n) => n.detail ?? n.details).find((d) => d !== undefined && d !== null) ?? null;
  return { code, detail };
}

function dureeAttenteMs(valeur, maintenant) {
  if (typeof valeur === "number") return Number.isFinite(valeur) && valeur >= 0 ? valeur * 1000 : null;
  const brut = texte(valeur);
  if (!brut) return null;
  if (/^\d+(\.\d+)?$/.test(brut)) return Number(brut) * 1000;
  const date = Date.parse(brut);
  return Number.isNaN(date) ? null : Math.max(0, date - maintenant);
}

// Attente demandée par un 429, en millisecondes, ou null : en-tête Retry-After (secondes ou date), sinon champ
// retryAfter du corps (secondes). Sur une autre origine, le navigateur ne montre l'en-tête que si l'API l'expose.
export function lireRetryAfter(enTete, retryAfter, maintenant = Date.now()) {
  return dureeAttenteMs(enTete, maintenant) ?? dureeAttenteMs(retryAfter, maintenant);
}

export async function requete(methode, chemin, { corps, token } = {}) {
  // BILLING_MOCK est faux dans tout build (config.js) : la maquette et mock.js n'en font jamais partie.
  if (BILLING_MOCK) {
    const { mockRequete } = await import("./mock.js");
    return mockRequete(methode, chemin, { corps, token, pms: BILLING_MOCK_PMS, scenarios: BILLING_MOCK_DEV });
  }
  if (!API_URL) throw new ApiError("SERVICE_PAIEMENT_INDISPONIBLE");

  const headers = { "Content-Type": "application/json", "X-Client-Type": "web" };
  if (token) headers[EN_TETE_AUTH] = `${SCHEMA_AUTH} ${token}`;

  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), DELAI_MAX_MS);
  let reponse;
  let data;
  try {
    reponse = await fetch(`${API_URL}${chemin}`, {
      method: methode,
      headers,
      // Jamais de cookie vers l'API : le site ne s'authentifie que par le jeton Bearer, et ne reçoit ni n'envoie
      // les cookies de session de l'application web, même si l'API partageait un jour l'origine du site.
      credentials: "omit",
      body: corps === undefined ? undefined : JSON.stringify(corps),
      signal: controleur.signal,
    });
    // Le délai couvre aussi la lecture du corps : un corps qui n'arrive jamais ne fige pas le bouton.
    data = await reponse.json().catch(() => null);
    if (controleur.signal.aborted) throw new ApiError("RESEAU");
  } catch {
    throw new ApiError("RESEAU");
  } finally {
    clearTimeout(minuteur);
  }

  if (!reponse.ok) {
    const { code, detail } = lireErreur(data);
    const attente = reponse.status === 429 ? lireRetryAfter(reponse.headers?.get?.("Retry-After"), sansEnveloppe(data)?.retryAfter) : null;
    throw new ApiError(code ?? (reponse.status === 429 ? "TROP_D_ESSAIS" : "ERREUR_INCONNUE"), reponse.status, detail, attente);
  }
  return data;
}

// --- Lecture tolérante des réponses : une réponse illisible ou incomplète devient une ApiError connue. ---

const TVA_PAR_DEFAUT = 20; // taux du contrat, si le catalogue ne le donne pas
const DDPP = ["non", "incluse", "option"];
const PERIODES = ["mois", "an"];
const PMS = ["premier_paiement", "troisieme_paiement"];
const STATUTS_COMPTE = ["sans_abonnement", "en_attente_paiement", "activation_provisoire", "actif", "impaye", "resilie"];

// Nombre positif ou nul (nombre ou chaîne numérique), sinon null.
function nombre(v) {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function entier(v) {
  const n = nombre(v);
  return n === null ? null : Math.round(n);
}

// { cle: montant ou quantité } : seules les valeurs lisibles sont gardées.
function lireMontants(brut) {
  if (!estObjet(brut)) return {};
  return Object.fromEntries(
    Object.entries(brut)
      .map(([cle, v]) => [cle, entier(v)])
      .filter(([, n]) => n !== null)
  );
}

// [{ cle, libelle }] : une entrée sans clé ou sans libellé est écartée.
function lireLibelles(brut) {
  return liste(brut)
    .map((e) => ({ cle: texte(e?.cle), libelle: texte(e?.libelle) }))
    .filter((e) => e.cle && e.libelle);
}

function lireOption(brut) {
  const cle = texte(brut?.cle);
  const libelle = texte(brut?.libelle);
  const prixCentimes = entier(brut?.prixCentimes);
  return cle && libelle && prixCentimes !== null ? { cle, libelle, prixCentimes } : null;
}

// Version sans prix, sans libellé ou sans période : écartée. Sans PMS, aucune version engagée n'est proposée.
function lireVersion(brut, pmsDisponible) {
  const cle = texte(brut?.cle);
  const libelle = texte(brut?.libelle);
  const prixBaseCentimes = entier(brut?.prixBaseCentimes);
  if (!cle || !libelle || !prixBaseCentimes || !PERIODES.includes(brut.periode)) return null;
  if (cle === "mensuel_engage" && !pmsDisponible) return null;
  return {
    cle,
    libelle,
    periode: brut.periode,
    engagementMois: entier(brut.engagementMois) ?? 0,
    pms: PMS.includes(brut.pms) ? brut.pms : "non",
    prixBaseCentimes,
    prixCompteSupplementaireCentimes: lireMontants(brut.prixCompteSupplementaireCentimes),
    options: liste(brut.options).map(lireOption).filter(Boolean),
  };
}

// Offre incomplète : écartée plutôt qu'affichée avec des mentions fausses (« DDPP : non », « Inclus : »).
function lireOffre(brut, pmsDisponible, modules) {
  const cle = texte(brut?.cle);
  const nom = texte(brut?.nom);
  const versions = liste(brut?.versions).map((v) => lireVersion(v, pmsDisponible)).filter(Boolean);
  if (!cle || !nom || versions.length === 0) return null;
  const comptesInclus = lireMontants(brut.comptesInclus);
  const { categoriesAutorisees, fonctions } = brut;
  if (!Object.values(comptesInclus).some((n) => n > 0) || !Array.isArray(categoriesAutorisees) || !Array.isArray(brut.modules)) return null;
  if (!DDPP.includes(fonctions?.ddpp)) return null;
  // Accès sur ordinateur : lu tel quel (null s'il est absent ou illisible). Depuis les CGV 0.2 (article 3.1),
  // il est inclus dans toutes les formules : la carte l'affiche « Inclus » sans lire ce champ.
  const accesOrdinateur = typeof fonctions.accesOrdinateur === "boolean" ? fonctions.accesOrdinateur : null;
  return {
    cle,
    nom,
    comptesInclus,
    categoriesAutorisees: categoriesAutorisees.filter((c) => typeof c === "string"),
    modules: brut.modules.filter((m) => modules.some((connu) => connu.cle === m)),
    fonctions: { accesOrdinateur, ddpp: fonctions.ddpp, superviseur: fonctions.superviseur === true },
    versions,
  };
}

export function lireCatalogue(brut) {
  const corps = sansEnveloppe(brut);
  const pmsDisponible = corps?.pmsDisponible === true;
  const categories = lireLibelles(corps?.categories);
  const modules = lireLibelles(corps?.modules);
  const offres = liste(corps?.offres).map((o) => lireOffre(o, pmsDisponible, modules)).filter(Boolean);
  if (categories.length === 0 || modules.length === 0 || offres.length === 0) throw new ApiError("CATALOGUE_INVALIDE");
  const tva = nombre(corps.tvaPourcentage);
  return { pmsDisponible, tvaPourcentage: tva !== null && tva <= 100 ? tva : TVA_PAR_DEFAUT, categories, modules, offres };
}

export function lireInscription(brut) {
  const corps = sansEnveloppe(brut);
  const token = texte(corps?.token);
  if (!token) throw new ApiError("INSCRIPTION_SANS_JETON");
  return { ...corps, token };
}

// Reprise consommée : un nouveau jeton de paiement restreint (2 h) et le nom de l'établissement, à rappeler à l'écran.
// Réponse d'Apirest : { token, restaurantId, userId, expireLe, restaurant: { nom }, creeLe }.
export function lireReprise(brut) {
  const corps = sansEnveloppe(brut);
  const token = texte(corps?.token);
  if (!token) throw new ApiError("REPRISE_SANS_JETON");
  return { token, restaurant: texte(corps?.restaurant?.nom), email: texte(corps?.email) };
}

// Lien de définition du mot de passe vérifié, sans être consommé : { emailMasque, expireLe }.
export function lireVerificationMotDePasse(brut) {
  const corps = sansEnveloppe(brut);
  return { emailMasque: texte(corps?.emailMasque), expireLe: texte(corps?.expireLe) || null };
}

// Mot de passe défini : { defini: true, email }. Une réponse sans defini: true n'est pas une réussite.
export function lireDefinitionMotDePasse(brut) {
  const corps = sansEnveloppe(brut);
  if (corps?.defini !== true) throw new ApiError("DEFINITION_NON_CONFIRMEE");
  return { email: texte(corps?.email) };
}

export function lireCheckout(brut) {
  const url = texte(sansEnveloppe(brut)?.url);
  if (!url) throw new ApiError("CHECKOUT_SANS_URL");
  return { url };
}

export function lireCompte(brut) {
  const corps = sansEnveloppe(brut);
  if (!STATUTS_COMPTE.includes(corps?.statut)) throw new ApiError("COMPTE_SANS_STATUT");
  return {
    ...corps,
    offre: texte(corps.offre) || null,
    titulaire: estObjet(corps.titulaire) ? { nom: texte(corps.titulaire.nom), email: texte(corps.titulaire.email) } : null,
  };
}

// Page de paiement : https uniquement et jamais d'adresse relative (pas de /undefined). Renvoie l'adresse ou null.
// En maquette, la fausse page de paiement est sur l'origine du site (http en local).
export function urlDePaiement(brute, origineMaquette = BILLING_MOCK ? globalThis.location?.origin : null) {
  if (typeof brute !== "string") return null;
  try {
    const cible = new URL(brute);
    const maquette = cible.protocol === "http:" && cible.origin === origineMaquette;
    return cible.protocol === "https:" || maquette ? cible.href : null;
  } catch {
    return null;
  }
}

export const getCatalogue = () => requete("GET", "/api/billing/catalogue").then(lireCatalogue);
export const inscrire = (corps) => requete("POST", "/api/billing/inscription", { corps }).then(lireInscription);
export const lancerCheckout = (token, corps) => requete("POST", "/api/billing/checkout", { corps, token }).then(lireCheckout);
export const getCompte = (token) => requete("GET", "/api/billing/compte", { token }).then(lireCompte);

// Liens reçus par e-mail (reprise.js, motdepasse.js), contrat des routes d'Apirest du 10/11. Aucun jeton Bearer :
// le code du lien voyage dans le corps, jamais dans l'URL.
// La demande répond toujours de la même façon, que l'adresse soit connue ou non : son corps n'est pas lu.
export const demanderLienReprise = (email) => requete("POST", "/api/billing/reprise", { corps: { email } }).then(() => undefined);
export const consommerLienReprise = (jeton) => requete("POST", "/api/billing/reprise/consommer", { corps: { jeton } }).then(lireReprise);
export const annulerInscription = (jeton) => requete("POST", "/api/billing/reprise/annuler", { corps: { jeton } }).then(() => undefined);
export const verifierLienMotDePasse = (jeton) =>
  requete("POST", "/api/billing/mot-de-passe/verifier", { corps: { jeton } }).then(lireVerificationMotDePasse);
export const definirMotDePasse = (jeton, motDePasse) =>
  requete("POST", "/api/billing/mot-de-passe/definir", { corps: { jeton, motDePasse } }).then(lireDefinitionMotDePasse);
// « Mot de passe oublié » (spécification de la connexion, demande 9) : même réponse quel que soit le compte.
export const demanderLienMotDePasse = (email) =>
  requete("POST", "/api/billing/mot-de-passe/oublie", { corps: { email } }).then(() => undefined);
