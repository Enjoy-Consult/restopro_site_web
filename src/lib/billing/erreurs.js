// Erreurs de l'API à présenter à l'utilisateur.
import { BUSINESS } from "../business-info.js";
import { effacerSession } from "./session.js";

export const MESSAGE_INDISPONIBLE = "Le service est momentanément indisponible. Réessayez dans quelques minutes.";

// 429 : le service répond et limite les essais. Ce n'est pas une panne.
export const MESSAGE_TROP_D_ESSAIS = "Trop d’essais. Réessayez plus tard.";

// Catalogue vide ou illisible : l'API répond, mais les formules ne peuvent pas s'afficher.
export const MESSAGE_CATALOGUE_INVALIDE = "Les formules ne peuvent pas s’afficher pour le moment. Réessayez dans quelques minutes.";

// Inscription acceptée sans jeton : le compte existe sans doute, on ne propose pas d'en recréer un.
export const MESSAGE_INSCRIPTION_SANS_JETON =
  `Votre compte a peut-être été créé, mais le paiement n’a pas pu démarrer. Connectez-vous à votre espace pour choisir une formule, ou appelez-nous au ${BUSINESS.phone.display}.`;

// Refus (403) au code inconnu : message neutre, l'indisponibilité est réservée au réseau et aux 5xx.
export const MESSAGE_REFUS_GENERIQUE = "Cette action n’est pas possible pour le moment. Contactez-nous si le problème persiste.";

// Jeton restreint expiré (2 h) : le compte existe déjà, on ne propose jamais de le recréer
// (l'API répondrait EMAIL_DEJA_UTILISE) ; on renvoie vers l'espace client.
export const MESSAGE_SESSION_EXPIREE =
  "Votre session a expiré. Connectez-vous à votre espace pour finaliser votre abonnement.";

// Seul un 401 signifie que la session a expiré ; un 403 est un refus (voir messageRefus).
export function estSessionExpiree(erreur) {
  return erreur?.status === 401;
}

// Si l'erreur est une session expirée : supprime le jeton de sessionStorage et renvoie le message à afficher.
// Sinon renvoie null et ne touche à rien. Le choix de formule n'est jamais stocké : il vit dans l'URL.
export function traiterSessionExpiree(erreur) {
  if (!estSessionExpiree(erreur)) return null;
  effacerSession();
  return MESSAGE_SESSION_EXPIREE;
}

// Refus connus (codes du contrat d'API).
const REFUS = {
  NON_TITULAIRE: "Seul le titulaire de l’abonnement peut effectuer cette action.",
  ACTION_NON_AUTORISEE: "Cette action n’est pas autorisée pour votre compte.",
  ACCES_LECTURE_SEULE: "Votre compte est en lecture seule : cette action n’est pas possible.",
  GERE_PAR_ABONNEMENT: "Ce réglage dépend de votre abonnement et se gère depuis votre espace.",
  ABONNEMENT_DEJA_ACTIF: "Un abonnement est déjà actif pour ce compte. Gérez-le depuis votre espace.",
};

// Texte à afficher pour un refus (403) : celui du code reçu, ou le message neutre si le code est inconnu.
// Renvoie null si l'erreur n'est pas un 403.
export function messageRefus(erreur) {
  if (erreur?.status !== 403) return null;
  return REFUS[erreur.code] ?? MESSAGE_REFUS_GENERIQUE;
}

export function estTropDEssais(erreur) {
  return erreur?.status === 429;
}

// Texte à afficher quand le catalogue manque : trop d'essais ou catalogue inutilisable.
// Renvoie null pour une panne : chaque page garde son message.
export function messageCatalogue(erreur) {
  if (estTropDEssais(erreur)) return MESSAGE_TROP_D_ESSAIS;
  return erreur?.code === "CATALOGUE_INVALIDE" ? MESSAGE_CATALOGUE_INVALIDE : null;
}

// Texte à afficher quand aucun traitement plus précis ne s'applique.
export function messageErreur(erreur) {
  if (estTropDEssais(erreur)) return MESSAGE_TROP_D_ESSAIS;
  if (erreur?.code === "INSCRIPTION_SANS_JETON") return MESSAGE_INSCRIPTION_SANS_JETON;
  return messageRefus(erreur) ?? MESSAGE_INDISPONIBLE;
}
