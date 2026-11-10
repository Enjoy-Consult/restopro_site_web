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

// 400 VALIDATION_ERROR sans champ à désigner.
export const MESSAGE_VALIDATION = "Certaines informations n’ont pas été acceptées. Vérifiez-les et réessayez.";

// E-mail déjà connu après un essai interrompu : le compte reste créé et se finalise depuis l'espace (CGV, article 5).
export const PHRASE_ESSAI_INTERROMPU =
  "Si votre inscription s’est interrompue avant le paiement, votre compte est conservé : finalisez votre abonnement depuis votre espace.";

// CGV changées alors que le compte existe déjà : le checkout envoie la version de cette page, refusée,
// et la page n'a plus de case à cocher. On renvoie vers l'espace ou le téléphone.
export const MESSAGE_CGV_OBSOLETE_PAIEMENT =
  `Les conditions générales de vente ont été mises à jour. Connectez-vous à votre espace pour finaliser votre abonnement, ou appelez-nous au ${BUSINESS.phone.display}.`;

// 409 CGV_VERSION_OBSOLETE lisible : la page affiche la nouvelle version et la fait accepter (même texte que le front).
export const MESSAGE_CGV_A_REACCEPTER =
  "Les conditions générales de vente ont changé : acceptez la nouvelle version pour continuer.";

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
  // Texte du front, suivi du chemin à prendre depuis le site.
  FACTURE_IMPAYEE: "Une facture impayée doit être réglée avant de choisir une formule. Réglez-la depuis votre espace.",
};

// Texte à afficher pour un refus (403) : celui du code reçu, ou le message neutre si le code est inconnu.
// Renvoie null si l'erreur n'est pas un 403.
export function messageRefus(erreur) {
  if (erreur?.status !== 403) return null;
  return REFUS[erreur.code] ?? MESSAGE_REFUS_GENERIQUE;
}

// Le jeton n'a plus d'usage : session expirée, ou abonnement déjà actif, qu'il ne reste donc plus à payer.
// Supprime le jeton et renvoie { type, texte }, à afficher à la place du paiement. Sinon renvoie null et ne touche à rien.
export function traiterFinDeSession(erreur) {
  const expiree = traiterSessionExpiree(erreur);
  if (expiree) return { type: "error", texte: expiree };
  if (erreur?.code !== "ABONNEMENT_DEJA_ACTIF") return null;
  effacerSession();
  return { type: "info", texte: REFUS.ABONNEMENT_DEJA_ACTIF };
}

// 409 du serveur : un abonnement vit déjà chez Stripe et attend sa confirmation. Le jeton reste : il sert à relire le compte.
export function estActivationEnCoursRefus(erreur) {
  return erreur?.code === "ABONNEMENT_DEJA_ACTIF" && erreur?.detail?.motif === "activation_en_cours";
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

// Ces refus se règlent depuis l'espace client, quel que soit le statut HTTP (le contrat ne le fixe pas).
const VERS_ESPACE = ["ABONNEMENT_DEJA_ACTIF", "GERE_PAR_ABONNEMENT", "FACTURE_IMPAYEE"];

// Texte à afficher quand aucun traitement plus précis ne s'applique.
export function messageErreur(erreur) {
  if (estTropDEssais(erreur)) return MESSAGE_TROP_D_ESSAIS;
  if (erreur?.code === "INSCRIPTION_SANS_JETON") return MESSAGE_INSCRIPTION_SANS_JETON;
  if (erreur?.code === "VALIDATION_ERROR") return MESSAGE_VALIDATION;
  if (erreur?.code === "CGV_VERSION_OBSOLETE") return MESSAGE_CGV_OBSOLETE_PAIEMENT;
  if (VERS_ESPACE.includes(erreur?.code)) return REFUS[erreur.code];
  const refus = messageRefus(erreur);
  if (refus) return refus;
  // Un autre 4xx n'est pas une panne : l'indisponibilité est réservée au réseau et aux 5xx.
  if (erreur?.status >= 400 && erreur?.status < 500) return MESSAGE_REFUS_GENERIQUE;
  return MESSAGE_INDISPONIBLE;
}

// Texte découpé autour de « votre espace », pour que la page y mette le lien. Sans ces mots : tout est dans `avant`.
const MOTS_ESPACE = "votre espace";

export function decouperEspace(texte) {
  const debut = texte.indexOf(MOTS_ESPACE);
  if (debut < 0) return { avant: texte, espace: null, apres: "" };
  return { avant: texte.slice(0, debut), espace: MOTS_ESPACE, apres: texte.slice(debut + MOTS_ESPACE.length) };
}

// details[].path de l'API -> champ du formulaire, dans l'ordre de la page (le premier reçoit le focus).
// Le texte est le nôtre : details[].message n'est pas écrit pour le visiteur.
const CHAMPS_API = [
  ["responsable.prenom", "prenom", "Vérifiez votre prénom."],
  ["responsable.nom", "nom", "Vérifiez votre nom."],
  ["responsable.email", "email", "Vérifiez votre adresse e-mail."],
  ["restaurant.nomCommercial", "nomCommercial", "Vérifiez le nom commercial."],
  ["restaurant.raisonSociale", "raisonSociale", "Vérifiez la raison sociale."],
  ["restaurant.siret", "siret", "Ce numéro SIRET n’est pas reconnu. Vérifiez-le."],
  ["restaurant.adresse.ligne1", "ligne1", "Vérifiez l’adresse."],
  ["restaurant.adresse.ligne2", "ligne2", "Vérifiez le complément d’adresse."],
  ["restaurant.adresse.codePostal", "codePostal", "Le code postal comporte 5 chiffres."],
  ["restaurant.adresse.ville", "ville", "Vérifiez la ville."],
  ["cgvAcceptees", "cgv", "Vous devez accepter les conditions pour continuer."],
];

// 400 VALIDATION_ERROR : { champs: { champ: message }, general: message ou null }.
// Le message général couvre ce qu'aucun champ ne peut porter : chemin inconnu, details absents ou illisibles.
export function erreursDeValidation(detail) {
  const chemins = [detail].flat().filter(Boolean).map((d) => (Array.isArray(d.path) ? d.path.join(".") : d.path));
  const champs = {};
  for (const [chemin, champ, message] of CHAMPS_API) {
    if (chemins.includes(chemin)) champs[champ] = message;
  }
  const inconnu = chemins.some((chemin) => !CHAMPS_API.some(([connu]) => connu === chemin));
  return { champs, general: chemins.length === 0 || inconnu ? MESSAGE_VALIDATION : null };
}
