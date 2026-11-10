// Définition du mot de passe par un lien reçu par e-mail (/compte/mot-de-passe#jeton=…) : décisions pures, testées sous node.
//
// Apirest envoie ce lien, valable 60 minutes, quand une demande de reprise porte sur une inscription déjà payée.
// À l'ouverture, la page vérifie le lien (POST …/mot-de-passe/verifier), ce qui ne le consomme pas, pour afficher
// l'adresse masquée et l'échéance. Le lien n'est consommé qu'au clic sur « Enregistrer », par POST …/mot-de-passe/definir.
// Un 400 VALIDATION_ERROR ne le consomme pas : on peut corriger et réessayer.
import { estTropDEssais, MESSAGE_INDISPONIBLE, messageTropDEssais } from "./erreurs.js";
import { estLienIndisponible } from "./reprise.js";

export const CHEMIN_MOT_DE_PASSE = "/compte/mot-de-passe";

// Sur compte.restoclair.fr (/mot-de-passe), le lien indisponible renvoie vers « Mot de passe oublié » de la même origine.
export const TEXTE_LIEN_INDISPONIBLE_COMPTE =
  "Ce lien n’est plus valable : il a expiré, a déjà servi ou a été remplacé. Demandez un nouveau lien ci-dessous.";

// « Mot de passe oublié » : réponse identique quel que soit le compte (la page ne dit jamais si une adresse est connue).
export function texteLienEnvoye(email) {
  return {
    avant: "Si un compte de gestion de l’abonnement correspond à l’adresse ",
    email: String(email ?? "").trim(),
    apres: ", un lien valable 60 minutes vient d’y être envoyé pour choisir un nouveau mot de passe. Pensez à regarder dans vos courriers indésirables.",
  };
}

// Demande du lien. Renvoie null si la demande est partie, sinon { champ?, texte, telephone? } à afficher.
export function issueOubli(erreur) {
  if (!erreur) return null;
  if (estTropDEssais(erreur)) return { texte: messageTropDEssais(erreur) };
  if (erreur.code === "VALIDATION_ERROR") return { champ: "email", texte: "Vérifiez votre adresse e-mail." };
  return { texte: MESSAGE_INDISPONIBLE, telephone: true };
}

// Règle de l'application (FinalizeAccountPage et ChangePasswordSchema du front) : 8 à 128 caractères, avec une
// minuscule [a-z], une majuscule [A-Z] et un chiffre [0-9], sans accent pour ces trois-là. Le serveur reste juge
// (400 VALIDATION_ERROR, qui ne consomme pas le lien).
export const LONGUEUR_MIN = 8;
export const LONGUEUR_MAX = 128;
export const TEXTE_REGLE = `Au moins ${LONGUEUR_MIN} caractères, dont une minuscule, une majuscule et un chiffre (lettres sans accent).`;

// Renvoie { motDePasse?, confirmation? } : messages à afficher sous les champs ; objet vide si tout est valide.
export function validerMotDePasse(motDePasse, confirmation) {
  const erreurs = {};
  const mdp = String(motDePasse ?? "");
  if (!mdp) erreurs.motDePasse = "Choisissez un mot de passe.";
  else if (mdp.length > LONGUEUR_MAX) erreurs.motDePasse = `Le mot de passe ne doit pas dépasser ${LONGUEUR_MAX} caractères.`;
  else if (mdp.length < LONGUEUR_MIN || !/[a-z]/.test(mdp) || !/[A-Z]/.test(mdp) || !/[0-9]/.test(mdp))
    erreurs.motDePasse = `Le mot de passe ne suit pas la règle : ${TEXTE_REGLE.charAt(0).toLowerCase()}${TEXTE_REGLE.slice(1)}`;
  if (!confirmation) erreurs.confirmation = "Saisissez de nouveau le mot de passe.";
  else if (!erreurs.motDePasse && confirmation !== mdp) erreurs.confirmation = "Les deux mots de passe ne sont pas identiques.";
  return erreurs;
}

// Heure d'échéance du lien (expireLe, date ISO), en heure de Paris, ou null si illisible.
export function heureEcheance(expireLe) {
  const date = new Date(String(expireLe ?? ""));
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(date);
}

// Vérification à l'ouverture. Renvoie l'une de :
//   { type: "lien_indisponible" }                       expiré, déjà utilisé ou remplacé : nouveau lien à demander
//   { type: "erreur", texte, telephone?, reessayer }    429 ou panne : on peut réessayer la vérification
export function issueVerification(erreur) {
  if (estLienIndisponible(erreur)) return { type: "lien_indisponible" };
  if (estTropDEssais(erreur)) return { type: "erreur", texte: messageTropDEssais(erreur), reessayer: true };
  if (erreur?.status >= 400 && erreur?.status < 500) return { type: "lien_indisponible" };
  return { type: "erreur", texte: MESSAGE_INDISPONIBLE, telephone: true, reessayer: true };
}

// Enregistrement. Renvoie l'une de :
//   { type: "lien_indisponible" }                       le lien ne sert plus
//   { type: "refuse", texte }                           400 VALIDATION_ERROR : le lien reste valable, on corrige
//   { type: "erreur", texte, telephone? }               429 ou panne : le lien reste valable, on réessaie
export function issueDefinition(erreur) {
  if (estLienIndisponible(erreur)) return { type: "lien_indisponible" };
  if (erreur?.code === "VALIDATION_ERROR") {
    return { type: "refuse", texte: `Ce mot de passe n’est pas accepté. ${TEXTE_REGLE}` };
  }
  if (estTropDEssais(erreur)) return { type: "erreur", texte: messageTropDEssais(erreur) };
  if (erreur?.status >= 400 && erreur?.status < 500) return { type: "lien_indisponible" };
  return { type: "erreur", texte: MESSAGE_INDISPONIBLE, telephone: true };
}
