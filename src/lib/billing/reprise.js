// Reprise d'une inscription non payée (CGV 0.2, article 5) : décisions pures et mémoire de module, testées sous node.
//
// Le responsable qui a souscrit n'a pas de mot de passe avant le paiement. S'il a perdu le jeton de l'inscription
// (onglet fermé, plus de 2 heures), il demande sur /abonnement/reprendre un lien reçu par e-mail :
//   {SITE_URL}/abonnement/reprendre#jeton=<code>
// Le code, à usage unique et valable 60 minutes, est échangé contre un nouveau jeton de paiement de 2 heures.
// Il est dans le fragment (#) : le navigateur ne l'envoie pas au serveur web, ni dans l'en-tête Referer. La page le lit,
// l'efface aussitôt de la barre d'adresse et ne l'échange qu'au clic, pour qu'un logiciel qui ouvre les liens
// d'un e-mail ne le consomme pas. Il n'est jamais écrit dans le navigateur.
import { estTropDEssais, MESSAGE_INDISPONIBLE, MESSAGE_TROP_D_ESSAIS } from "./erreurs.js";
import { TEXTE_ACTIVATION_EN_COURS } from "./retour.js";

export const CHEMIN_REPRISE = "/abonnement/reprendre";
export const DUREE_LIEN_MINUTES = 60;

// Code de reprise : base64url (32 octets aléatoires chez Apirest, soit 43 caractères), borné par prudence.
const FORME_JETON = /^[A-Za-z0-9_-]{16,128}$/;

// Code lu dans le fragment (#jeton=…), ou null. Rien d'autre du fragment n'est gardé.
export function lireJetonDuFragment(hash) {
  const brut = String(hash ?? "").replace(/^#/, "");
  if (!brut) return null;
  const jeton = new URLSearchParams(brut).get("jeton");
  return jeton && FORME_JETON.test(jeton) ? jeton : null;
}

// --- Adresse e-mail passée d'une page à l'autre, en mémoire seulement (jamais dans l'URL ni dans le navigateur) ---

let emailRetenu = null;

export function retenirEmailReprise(email) {
  const valeur = String(email ?? "").trim();
  emailRetenu = valeur || null;
}

// Lue une seule fois : revenir plus tard sur la page ne la remet pas.
export function prendreEmailReprise() {
  const email = emailRetenu;
  emailRetenu = null;
  return email ?? "";
}

// --- Annonce sur /tarifs après un échange réussi ---

let annonce = null;

export function annoncerReprise(email) {
  annonce = { email: String(email ?? "").trim() || null };
}

export function prendreAnnonceReprise() {
  const valeur = annonce;
  annonce = null;
  return valeur;
}

// --- Textes ---

// Réponse identique quel que soit le compte : la page ne dit jamais si une adresse est connue.
// Apirest choisit l'e-mail : lien de reprise si l'abonnement attend son paiement, marche à suivre pour se connecter
// s'il est déjà actif, rien pour une adresse inconnue.
export function texteDemandeEnvoyee(email) {
  return {
    avant: "Si un compte RestOclair existe à l’adresse ",
    email: String(email ?? "").trim(),
    apres: `, nous venons d’y envoyer un e-mail. Il contient un lien pour reprendre votre inscription si votre abonnement n’est pas encore payé (valable ${DUREE_LIEN_MINUTES} minutes, à usage unique), ou la marche à suivre pour vous connecter si votre abonnement est déjà actif. Pensez à regarder dans vos courriers indésirables.`,
  };
}

export const TEXTE_LIEN_INDISPONIBLE =
  `Ce lien n’est plus valable : il a expiré (au bout de ${DUREE_LIEN_MINUTES} minutes), il a déjà servi, ou un lien plus récent l’a remplacé. Demandez-en un nouveau ci-dessous.`;
export const TEXTE_DEJA_ACTIF =
  "Votre abonnement est déjà actif. Connectez-vous à l’application avec les identifiants reçus par e-mail.";
export const TEXTE_EMAIL_INVALIDE = "Vérifiez votre adresse e-mail.";

// --- Issues ---

// Demande d'un lien. Renvoie null si la demande est partie, sinon { champ?, texte } à afficher.
export function issueDemande(erreur) {
  if (!erreur) return null;
  if (estTropDEssais(erreur)) return { texte: MESSAGE_TROP_D_ESSAIS };
  if (erreur.code === "VALIDATION_ERROR") return { champ: "email", texte: TEXTE_EMAIL_INVALIDE };
  return { texte: MESSAGE_INDISPONIBLE, telephone: true };
}

// Échange du code. Renvoie l'une de :
//   { type: "lien_indisponible" }                      code expiré, déjà utilisé ou remplacé : nouveau lien à demander
//   { type: "deja_actif" }                             rien à payer : connexion à l'application
//   { type: "activation_en_cours" }                    paiement en cours de confirmation
//   { type: "erreur", texte, garderBouton: true }      essai à refaire avec le même code (429, panne)
export function issueEchange(erreur) {
  if (erreur?.code === "LIEN_INDISPONIBLE" || erreur?.status === 410) return { type: "lien_indisponible" };
  if (erreur?.code === "ABONNEMENT_DEJA_ACTIF") {
    return erreur?.detail?.motif === "activation_en_cours" ? { type: "activation_en_cours", texte: TEXTE_ACTIVATION_EN_COURS } : { type: "deja_actif" };
  }
  if (estTropDEssais(erreur)) return { type: "erreur", texte: MESSAGE_TROP_D_ESSAIS, garderBouton: true };
  // Un autre refus (4xx) : le code ne servira plus, on propose d'en demander un autre.
  if (erreur?.status >= 400 && erreur?.status < 500) return { type: "lien_indisponible" };
  return { type: "erreur", texte: MESSAGE_INDISPONIBLE, garderBouton: true, telephone: true };
}
