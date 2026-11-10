// Maquette de l'espace abonnement (compte.restoclair.fr), serveur de développement seulement (voir config.js).
// Routes de la session minimale d'Apirest (espace.js). Le début de l'adresse e-mail choisit le scénario :
//   (toute adresse)  -> titulaire de « Chez Marie », abonnement actif
//   multi@           -> titulaire de deux établissements (Chez Marie actif, Le Bistrot en retard de paiement)
//   impaye@          -> paiement en retard          sepa@     -> accès provisoire, prélèvement en cours
//   resilie@         -> abonnement terminé, export   resiliation@ -> résiliation déjà programmée
//   sans@            -> aucun abonnement payé        gestionnaire@ -> non titulaire (refus)
//   transfert@       -> transfert du rôle reçu       adefinir@ / desactive@ / cuisinier@ -> 403 CONNEXION_NON_ADMISE
//   lent@            -> réponse lente (6 s, limiteur à délai croissant)   trop@ -> 429, Retry-After 30 s
//   expire@          -> la session répond 401 dès la lecture du compte    indispo@ -> 503 à la connexion
// Mot de passe « Refuse123 » : 401 IDENTIFIANTS_INVALIDES à la connexion, mot de passe refusé à la résiliation.
import { ApiError } from "./errors.js";

const MOT_DE_PASSE_REFUSE = "Refuse123";
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const sessions = new Map();

const jour = 86400 * 1000;
const iso = (decalageJours) => new Date(Date.now() + decalageJours * jour).toISOString();

function compteDe(scenario, restaurantId) {
  const base = {
    restaurantId,
    statut: "actif",
    offre: "serenite",
    version: "mensuel",
    options: { ddpp: true },
    estTitulaire: true,
    titulaire: { nom: "Marie Martin", email: "marie@exemple.fr" },
    periodeFin: iso(18),
    montantPeriodiqueHTCentimes: 4900,
    engagementFin: null,
    resiliation: null,
    exportSortieDisponible: true,
    comptes: [],
  };
  if (restaurantId === "r-bistrot" || scenario === "impaye") return { ...base, statut: "impaye", graceJusquau: iso(6) };
  if (scenario === "sepa") return { ...base, statut: "activation_provisoire" };
  if (scenario === "resilie") return { ...base, statut: "resilie", periodeFin: iso(-10), suppressionPrevueLe: iso(50) };
  if (scenario === "resiliation") return { ...base, resiliation: { effetLe: iso(18) } };
  if (scenario === "sans") return { ...base, statut: "sans_abonnement", offre: null, version: null, montantPeriodiqueHTCentimes: 0 };
  return base;
}

const RESTAURANTS = { "r-marie": "Chez Marie", "r-bistrot": "Le Bistrot" };

// La maquette vit en mémoire : après un rechargement de la page (retour du portail), la session est recréée d'après le
// jeton, qui porte le scénario (« espace-<scénario>-… »), comme la vraie API qui garde la sienne 2 h.
function session(token) {
  if (!sessions.has(token) && /^espace-[a-z]+-/.test(String(token))) {
    const scenario = token.split("-")[1];
    const ids = scenario === "multi" ? ["r-marie", "r-bistrot"] : ["r-marie"];
    sessions.set(token, { scenario, comptes: new Map(ids.filter((id) => RESTAURANTS[id]).map((id) => [id, compteDe(scenario, id)])) });
  }
  const s = sessions.get(token);
  if (!s) throw new ApiError("INVALID_TOKEN", 401);
  if (s.scenario === "expire") throw new ApiError("TOKEN_EXPIRED", 401);
  return s;
}

function restaurant(s, restaurantId) {
  if (!s.comptes.has(restaurantId)) throw new ApiError("ACTION_NON_AUTORISEE", 403);
  return s.comptes.get(restaurantId);
}

// Renvoie la réponse simulée, ou undefined si la route n'est pas celle de l'espace.
export async function mockEspace(methode, cheminComplet, { corps, token } = {}) {
  const [chemin, requeteUrl = ""] = cheminComplet.split("?");
  const parametres = new URLSearchParams(requeteUrl);
  const route = `${methode} ${chemin}`;

  if (route === "POST /api/billing/connexion") {
    const email = String(corps?.email ?? "").trim().toLowerCase();
    const scenario = email.split("@")[0];
    if (scenario === "lent") await attendre(6000);
    if (scenario === "trop") throw new ApiError("TROP_D_ESSAIS", 429, null, 30000);
    if (scenario === "indispo") throw new ApiError("SERVICE_PAIEMENT_INDISPONIBLE", 503);
    if (!email.includes("@") || !corps?.motDePasse || corps.motDePasse === MOT_DE_PASSE_REFUSE) throw new ApiError("IDENTIFIANTS_INVALIDES", 401);
    if (scenario === "adefinir") throw new ApiError("CONNEXION_NON_ADMISE", 403, { motif: "mot_de_passe_a_definir" });
    if (scenario === "desactive") throw new ApiError("CONNEXION_NON_ADMISE", 403, { motif: "compte_desactive" });
    if (scenario === "cuisinier") throw new ApiError("CONNEXION_NON_ADMISE", 403, { motif: "role_non_admis" });
    const restaurants = [{ restaurantId: "r-marie", nom: "Chez Marie", estTitulaire: true, transfertRecu: false, statut: "actif" }];
    if (scenario === "multi") restaurants.push({ restaurantId: "r-bistrot", nom: "Le Bistrot", estTitulaire: true, transfertRecu: false, statut: "impaye" });
    if (scenario === "gestionnaire") restaurants[0].estTitulaire = false;
    if (scenario === "transfert") Object.assign(restaurants[0], { estTitulaire: false, transfertRecu: true });
    const token = `espace-${scenario.replace(/[^a-z]/g, "") || "titulaire"}-${Math.random().toString(36).slice(2)}`;
    sessions.set(token, { scenario, comptes: new Map(restaurants.map((r) => [r.restaurantId, compteDe(scenario, r.restaurantId)])) });
    return { token, expireLe: iso(2 / 24), compte: { email, nom: "Marie Martin" }, restaurants };
  }

  if (route === "POST /api/billing/deconnexion") {
    sessions.delete(token);
    return null;
  }

  if (route === "GET /api/billing/compte" && parametres.has("restaurantId")) {
    return structuredClone(restaurant(session(token), parametres.get("restaurantId")));
  }

  if (route === "POST /api/billing/portail") {
    restaurant(session(token), corps?.restaurantId);
    return { url: `${window.location.origin}/mon-abonnement?maquette=portail` };
  }

  if (route === "POST /api/billing/resiliation" || route === "DELETE /api/billing/resiliation") {
    const s = session(token);
    const compte = restaurant(s, corps?.restaurantId);
    if (corps?.motDePasse === MOT_DE_PASSE_REFUSE || !corps?.motDePasse) throw new ApiError("MOT_DE_PASSE_INCORRECT", 403);
    if (s.scenario === "lent") await attendre(6000);
    if (methode === "DELETE") {
      compte.resiliation = null;
      return null;
    }
    compte.resiliation = { effetLe: compte.engagementFin ?? compte.periodeFin };
    return { effetLe: compte.resiliation.effetLe };
  }

  if (route === "GET /api/billing/export-sortie" && parametres.has("restaurantId")) {
    restaurant(session(token), parametres.get("restaurantId"));
    await attendre(800);
    return new Blob(["Export de la maquette RestOclair (fichier factice)."], { type: "application/zip" });
  }

  return undefined;
}
