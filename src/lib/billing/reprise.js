// Liens reçus par e-mail (reprise d'une inscription non payée, définition du mot de passe) : décisions pures et mémoire
// de module, testées sous node. Contrat des routes d'Apirest validé le 10/11 (POST /api/billing/reprise…).
//
// Reprise (CGV 0.2, article 5). Le responsable qui a souscrit n'a pas de mot de passe avant le paiement. S'il a perdu le
// jeton de l'inscription (onglet fermé, plus de 2 heures), il demande sur /abonnement/reprendre un lien reçu par e-mail :
//   {SITE_URL}/abonnement/reprendre#jeton=<code>
// Le code, valable 60 minutes, sert une fois : au clic, il est échangé contre un nouveau jeton de paiement de 2 heures,
// ou il annule l'inscription. Si l'inscription est déjà payée, Apirest envoie à la place un lien de définition du mot
// de passe, vers /compte/mot-de-passe#jeton=<code> (motdepasse.js).
//
// Le code est dans le fragment (#) : le navigateur ne l'envoie pas au serveur web, ni dans l'en-tête Referer. La page le
// lit, l'efface aussitôt de la barre d'adresse et ne le consomme qu'au clic, pour qu'un logiciel qui ouvre les liens
// d'un e-mail ne le consomme pas. Le site ne l'écrit jamais dans un cookie ni dans le stockage du navigateur.
import { estTropDEssais, MESSAGE_INDISPONIBLE, MESSAGE_TROP_D_ESSAIS } from "./erreurs.js";
import { TEXTE_ACTIVATION_EN_COURS } from "./retour.js";

export const CHEMIN_REPRISE = "/abonnement/reprendre";
export const DUREE_LIEN_MINUTES = 60;

// Code d'un lien : base64url (32 octets aléatoires chez Apirest, soit 43 caractères), borné par prudence.
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

// --- Annonce sur /tarifs après une reprise réussie ---

let annonce = null;

// restaurant : le nom renvoyé par Apirest (restaurant.nom), ou rien.
export function annoncerReprise(restaurant) {
  annonce = { restaurant: String(restaurant ?? "").trim() || null };
}

export function prendreAnnonceReprise() {
  const valeur = annonce;
  annonce = null;
  return valeur;
}

// --- Textes (contrat d'Apirest, avec les apostrophes du site) ---

// Réponse identique quel que soit le compte : la page ne dit jamais si une adresse est connue.
export function texteDemandeEnvoyee(email) {
  return {
    avant: "Si une inscription en attente correspond à l’adresse ",
    email: String(email ?? "").trim(),
    apres: `, un lien valable ${DUREE_LIEN_MINUTES} minutes vient d’y être envoyé. Pensez à regarder dans vos courriers indésirables.`,
  };
}

// 410 LIEN_INDISPONIBLE, commun à la reprise et à la définition du mot de passe.
export const TEXTE_LIEN_INDISPONIBLE =
  "Ce lien n’est plus valable : il a expiré, a déjà servi ou a été remplacé. Demandez un nouveau lien sur restoclair.fr ou contactez le support.";
export const TEXTE_DEJA_ACTIF =
  "Votre abonnement est déjà actif. Connectez-vous à l’application avec votre adresse e-mail et le mot de passe choisi grâce au lien reçu par e-mail. Si vous ne l’avez pas encore choisi, utilisez « Mot de passe oublié » sur l’écran de connexion de l’application.";
export const TEXTE_EMAIL_INVALIDE = "Vérifiez votre adresse e-mail.";

export const TEXTE_ANNULATION_CONFIRMEE =
  "Votre inscription est annulée : votre compte et les informations de l’établissement sont effacés. Aucun paiement n’a été fait.";
export const TEXTE_INSCRIPTION_PAYEE =
  "Votre inscription est déjà payée : elle ne peut plus être annulée depuis cette page. Pour mettre fin à votre abonnement, utilisez votre espace abonnement.";

// --- Issues ---

export const estLienIndisponible = (erreur) => erreur?.code === "LIEN_INDISPONIBLE" || erreur?.status === 410;

// Demande d'un lien. Renvoie null si la demande est partie, sinon { champ?, texte, telephone? } à afficher.
export function issueDemande(erreur) {
  if (!erreur) return null;
  if (estTropDEssais(erreur)) return { texte: MESSAGE_TROP_D_ESSAIS };
  if (erreur.code === "VALIDATION_ERROR") return { champ: "email", texte: TEXTE_EMAIL_INVALIDE };
  return { texte: MESSAGE_INDISPONIBLE, telephone: true };
}

// Reprise (POST …/reprise/consommer). Renvoie l'une de :
//   { type: "lien_indisponible" }                      code expiré, déjà utilisé ou remplacé : nouveau lien à demander
//   { type: "deja_actif" }                             rien à payer : connexion à l'application
//   { type: "activation_en_cours", texte }             paiement en cours de confirmation
//   { type: "erreur", texte, garderBouton: true }      essai à refaire avec le même code (429, panne)
export function issueEchange(erreur) {
  if (estLienIndisponible(erreur)) return { type: "lien_indisponible" };
  if (erreur?.code === "ABONNEMENT_DEJA_ACTIF" || erreur?.code === "INSCRIPTION_PAYEE") {
    return erreur?.detail?.motif === "activation_en_cours" ? { type: "activation_en_cours", texte: TEXTE_ACTIVATION_EN_COURS } : { type: "deja_actif" };
  }
  if (estTropDEssais(erreur)) return { type: "erreur", texte: MESSAGE_TROP_D_ESSAIS, garderBouton: true };
  // Un autre refus (4xx) : le code ne servira plus, on propose d'en demander un autre.
  if (erreur?.status >= 400 && erreur?.status < 500) return { type: "lien_indisponible" };
  return { type: "erreur", texte: MESSAGE_INDISPONIBLE, garderBouton: true, telephone: true };
}

// Annulation (POST …/reprise/annuler). Renvoie l'une de :
//   { type: "annulee" }                                 l'inscription non payée est effacée
//   { type: "payee" }                                   409 INSCRIPTION_PAYEE : trop tard pour annuler ici
//   { type: "lien_indisponible" }                       code expiré, déjà utilisé ou remplacé
//   { type: "erreur", texte, garderBouton: true }       essai à refaire avec le même code (429, panne)
export function issueAnnulation(erreur) {
  if (!erreur) return { type: "annulee" };
  if (erreur.code === "INSCRIPTION_PAYEE") return { type: "payee" };
  if (estLienIndisponible(erreur)) return { type: "lien_indisponible" };
  if (estTropDEssais(erreur)) return { type: "erreur", texte: MESSAGE_TROP_D_ESSAIS, garderBouton: true };
  if (erreur.status >= 400 && erreur.status < 500) return { type: "lien_indisponible" };
  return { type: "erreur", texte: MESSAGE_INDISPONIBLE, garderBouton: true, telephone: true };
}
