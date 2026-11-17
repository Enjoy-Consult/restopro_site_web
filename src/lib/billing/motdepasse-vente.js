// Mot de passe de la vente sur invitation (VITE_VENTE_MOT_DE_PASSE, config.js) : le site ne connaît que son empreinte,
// calculée par scripts/empreinte-mot-de-passe-vente.mjs sur le Mac de Louis. Le mot de passe lui-même n'est écrit nulle
// part : ni dans le code, ni dans le build, ni dans les messages.
//
// Empreinte : « pbkdf2-sha256:<itérations>:<sel base64url>:<empreinte base64url> » (PBKDF2-HMAC-SHA256, 600 000
// itérations, sel aléatoire de 16 octets, 32 octets). Elle est publique (dans le bundle) : la lenteur de PBKDF2 rend
// très coûteux d'en retrouver un mot de passe long. Ce n'est pas une protection de l'API, seulement de la page.
// Séparateur « : » et non « $ » : Vite développe « $NOM » dans les fichiers .env, ce qui couperait l'empreinte.
const PREFIXE = "pbkdf2-sha256";
const SEPARATEUR = ":";
export const ITERATIONS = 600000;
const ITERATIONS_MIN = 1000;
export const LONGUEUR_MIN = 10;

function versBase64Url(octets) {
  let binaire = "";
  for (const o of octets) binaire += String.fromCharCode(o);
  return btoa(binaire).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function depuisBase64Url(texte) {
  if (!/^[A-Za-z0-9_-]+$/.test(texte)) return null;
  try {
    const binaire = atob(texte.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (texte.length % 4)) % 4));
    return Uint8Array.from(binaire, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

// { iterations, sel, empreinte } ou null si le texte n'est pas une empreinte valable.
export function lireEmpreinte(texte) {
  const morceaux = String(texte ?? "").trim().split(SEPARATEUR);
  if (morceaux.length !== 4 || morceaux[0] !== PREFIXE || !/^\d+$/.test(morceaux[1])) return null;
  const iterations = Number(morceaux[1]);
  const sel = depuisBase64Url(morceaux[2]);
  const empreinte = depuisBase64Url(morceaux[3]);
  if (!Number.isSafeInteger(iterations) || iterations < ITERATIONS_MIN || !sel || sel.length < 16 || !empreinte || empreinte.length !== 32) return null;
  return { iterations, sel, empreinte };
}

async function deriver(motDePasse, sel, iterations, subtle) {
  const cle = await subtle.importKey("raw", new TextEncoder().encode(String(motDePasse).normalize("NFC")), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: sel, iterations }, cle, 256));
}

// Empreinte d'un mot de passe (script de Louis et tests). Le sel est tiré au hasard, sauf pour les tests.
export async function calculerEmpreinte(motDePasse, { iterations = ITERATIONS, sel, subtle = globalThis.crypto?.subtle } = {}) {
  if (!subtle) throw new Error("crypto.subtle indisponible");
  const graine = sel ?? globalThis.crypto.getRandomValues(new Uint8Array(16));
  const octets = await deriver(motDePasse, graine, iterations, subtle);
  return [PREFIXE, iterations, versBase64Url(graine), versBase64Url(octets)].join(SEPARATEUR);
}

// Le mot de passe saisi correspond-il à l'empreinte ? false si l'empreinte est illisible ou si le navigateur n'a pas
// crypto.subtle (page hors https).
export async function verifierMotDePasse(motDePasse, texteEmpreinte, subtle = globalThis.crypto?.subtle) {
  const lue = lireEmpreinte(texteEmpreinte);
  if (!lue || !subtle || typeof motDePasse !== "string" || motDePasse.length === 0) return false;
  const octets = await deriver(motDePasse, lue.sel, lue.iterations, subtle);
  let ecart = 0;
  for (let i = 0; i < octets.length; i++) ecart |= octets[i] ^ lue.empreinte[i];
  return ecart === 0;
}
