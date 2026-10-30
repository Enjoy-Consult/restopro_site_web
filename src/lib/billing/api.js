// Appels à l'API publique d'Apirest ({API_URL}/api/billing/...).
// Le site ne connaît ni le service de paiement ni Stripe : il suit l'`url` renvoyée par l'API.
import { API_URL, BILLING_MOCK, BILLING_MOCK_PMS } from "./config.js";
import { ApiError } from "./errors.js";

export { ApiError };

const DELAI_MAX_MS = 15000;
// En-tête d'authentification : à confirmer avec le chantier Apirest (jeton existant).
const EN_TETE_AUTH = "Authorization";
const SCHEMA_AUTH = "Bearer";

// Le format d'erreur d'Apirest n'est pas détaillé dans le contrat : on lit les variantes courantes.
function lireErreur(data) {
  const brut = data?.code ?? data?.error?.code ?? data?.erreur?.code ?? data?.error ?? data?.erreur;
  const code = typeof brut === "string" && /^[A-Z][A-Z_]+$/.test(brut) ? brut : null;
  const detail = data?.detail ?? data?.details ?? data?.error?.detail ?? data?.erreur?.detail ?? null;
  return { code, detail };
}

async function requete(methode, chemin, { corps, token } = {}) {
  if (BILLING_MOCK) {
    const { mockRequete } = await import("./mock.js");
    return mockRequete(methode, chemin, { corps, token, pms: BILLING_MOCK_PMS });
  }
  if (!API_URL) throw new ApiError("SERVICE_PAIEMENT_INDISPONIBLE");

  const headers = { "Content-Type": "application/json", "X-Client-Type": "web" };
  if (token) headers[EN_TETE_AUTH] = `${SCHEMA_AUTH} ${token}`;

  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), DELAI_MAX_MS);
  let reponse;
  try {
    reponse = await fetch(`${API_URL}${chemin}`, {
      method: methode,
      headers,
      body: corps === undefined ? undefined : JSON.stringify(corps),
      signal: controleur.signal,
    });
  } catch {
    throw new ApiError("RESEAU");
  } finally {
    clearTimeout(minuteur);
  }

  const data = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    const { code, detail } = lireErreur(data);
    throw new ApiError(code ?? "ERREUR_INCONNUE", reponse.status, detail);
  }
  return data;
}

export const getCatalogue = () => requete("GET", "/api/billing/catalogue");
export const inscrire = (corps) => requete("POST", "/api/billing/inscription", { corps });
export const lancerCheckout = (token, corps) => requete("POST", "/api/billing/checkout", { corps, token });
export const getCompte = (token) => requete("GET", "/api/billing/compte", { token });
