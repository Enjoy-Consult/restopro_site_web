// Définition du mot de passe par un lien reçu par e-mail (/compte/mot-de-passe#jeton=…) : décisions pures, testées sous node.
//
// Liens d'Apirest : celui de l'e-mail du titulaire pour choisir son mot de passe, valable 72 h (retour.js, CGV 1.0 4.7), et
// celui de « Mot de passe oublié » ou d'une demande de reprise sur une inscription déjà payée, valable 60 minutes.
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

const HEURE_PARIS = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const JOUR_PARIS = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
const JOUR_ISO_PARIS = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Paris" });

// Heure d'échéance du lien (expireLe, date ISO), en heure de Paris, ou null si illisible. Page de la vitrine
// (DefinirMotDePasse) ; compte.restoclair.fr dit aussi le jour : echeanceLien.
export function heureEcheance(expireLe) {
  const date = new Date(String(expireLe ?? ""));
  if (Number.isNaN(date.getTime())) return null;
  return HEURE_PARIS.format(date);
}

// Échéance du lien pour « Ce lien est valable {…} et ne sert qu’une fois », en heure de Paris : « jusqu’à 21:06 » si
// elle tombe le jour même (à `maintenant`), sinon avec le jour, « jusqu’au lundi 16 novembre à 10:00 » (lien de 72 h).
// null si expireLe est illisible.
export function echeanceLien(expireLe, maintenant = Date.now()) {
  const date = new Date(String(expireLe ?? ""));
  if (Number.isNaN(date.getTime())) return null;
  const heure = HEURE_PARIS.format(date);
  if (JOUR_ISO_PARIS.format(date) === JOUR_ISO_PARIS.format(new Date(maintenant))) return `jusqu’à ${heure}`;
  return `jusqu’au ${JOUR_PARIS.format(date).replace(" 1 ", " 1er ")} à ${heure}`;
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

// Enregistrement sur compte.restoclair.fr (page MotDePasse) : l'issue d'issueDefinition, plus la réponse perdue.
// reponseDejaPerdue : un envoi précédent avec ce lien est resté sans réponse lisible. Renvoie l'issue avec :
//   type "peut_etre_defini"   2xx sans « defini: true » (204, autre enveloppe : DEFINITION_NON_CONFIRMEE, le serveur a
//                             accepté), ou lien refusé après une réponse perdue : se connecter avant de redemander un lien
//   reponsePerdue             à garder pour l'envoi suivant : réseau ou délai dépassé, ou 5xx (502 ou 504 du proxy
//                             pendant que le limiteur fait attendre Apirest), après lesquels le lien a pu être consommé
export function issueDefinitionCompte(erreur, reponseDejaPerdue = false) {
  if (erreur?.code === "DEFINITION_NON_CONFIRMEE") return { type: "peut_etre_defini", reponsePerdue: true };
  const reponsePerdue = reponseDejaPerdue === true || erreur?.code === "RESEAU" || erreur?.status >= 500;
  const issue = issueDefinition(erreur);
  if (issue.type === "lien_indisponible" && reponsePerdue) return { type: "peut_etre_defini", reponsePerdue };
  return { ...issue, reponsePerdue };
}
