// Textes de la page Tarifs et des cartes qui dépendent du catalogue : sans React, testés sous node.
// Sans catalogue (chargement, API en panne), on n'affirme rien sur l'engagement.
import { BUSINESS } from "../business-info.js";
import { versionsDisponibles } from "./pricing.js";

// Ce que le catalogue propose réellement, toutes formules confondues.
function engagements(catalogue) {
  const versions = catalogue.offres.flatMap((offre) => versionsDisponibles(catalogue, offre));
  const mensuelles = versions.filter((v) => v.periode === "mois");
  const engagees = mensuelles.filter((v) => v.cle === "mensuel_engage" || v.engagementMois > 0);
  return {
    sansEngagement: mensuelles.length > engagees.length,
    engagee: engagees.length > 0,
    // Durée de l'article 7 des CGV si le catalogue ne la donne pas.
    mois: engagees.find((v) => v.engagementMois > 0)?.engagementMois ?? 12,
    annuel: versions.some((v) => v.periode === "an"),
  };
}

function atoutEngagement(catalogue) {
  if (!catalogue) return null;
  const { sansEngagement, engagee, mois } = engagements(catalogue);
  const resiliation = "La résiliation se demande depuis votre espace abonnement ou depuis l’application web.";
  if (engagee && sansEngagement) {
    return ["Avec ou sans engagement", `Selon la formule et la version : mensuel sans engagement ou engagement de ${mois} mois. ${resiliation}`];
  }
  if (engagee) return [`Engagement de ${mois} mois`, `Les versions mensuelles vous engagent pour ${mois} mois. ${resiliation}`];
  if (sansEngagement) return ["Sans engagement", "Les formules mensuelles se résilient depuis votre espace abonnement ou depuis l’application web."];
  return null;
}

// Équipiers : « point impératif » de Louis (19/11), ce qui lève les freins à la souscription. Sur la carte de chaque
// formule, sans ouvrir le détail : la mention en gras, avec un astérisque qui renvoie à RENVOI_EQUIPIERS, sous les cartes.
// La même formule dans le détail des cartes, les atouts et la FAQ.
export const MENTION_EQUIPIERS = "Équipiers illimités et gratuits";
export const RENVOI_EQUIPIERS =
  "Les équipiers n’ont pas de connexion propre : ils signent leurs actions avec un code PIN, sur l’appareil de l’établissement.";

// Ce que la formule apporte, en tête de la carte, avant les comptes (décision de Louis du 19/11 ; Expert reprend tout
// Sérénité). Trois points, chacun lu sur le catalogue ou sur les CGV :
// 1. suivi du score hygiène : fonctions.suivi du catalogue (billing d6c33f0) ; sans le champ, pas de ligne ;
// 2. PMS offert : CGV 1.0, article 14.2 (le catalogue ne le dit qu'une fois le PMS disponible) ; renvoi « ** » ;
// 3. courrier à la DDPP : complète l'assistance DDPP (fonctions.ddpp), incluse en Sérénité, en option en Expert.
// Jamais « représente » ni « conseil juridique » : l'article 20 exclut la représentation, et la rédaction juridique
// pour autrui est réglementée (loi du 31/12/1971). Formulation du courrier à faire valider par Louis.
export const TEXTE_SUIVI = "Suivi de votre score hygiène par notre équipe : nous vous contactons si votre score baisse.";
export const TEXTE_COURRIER_DDPP =
  "Aide à la rédaction de votre réponse à la DDPP en cas de mise en demeure : un courrier qui présente vos mesures correctives, signé et envoyé par vous.";
// Expert : le courrier fait partie de l'assistance DDPP, en option payante (article 20).
export const TEXTE_COURRIER_DDPP_OPTION =
  "Aide à la rédaction de votre réponse à la DDPP en cas de mise en demeure, avec l’assistance DDPP en option : un courrier qui présente vos mesures correctives, signé et envoyé par vous.";
export const MENTION_PMS = "PMS offert";
// Article 14.2 des CGV 1.0 : Sérénité annuel dès le 1er paiement ; Sérénité ou Expert en mensuel engagé dès le 3e ;
// rien en mensuel sans engagement, ni en Essentiel. La précision courte de la carte ; le renvoi dit tout.
export const PMS_OFFERT = Object.freeze({
  serenite: "en annuel, dès le 1er paiement",
  expert: "en mensuel avec engagement, dès le 3e paiement",
});

const aPms = (offre) => Object.prototype.hasOwnProperty.call(PMS_OFFERT, offre?.cle ?? "");

// [{ cle, texte, precision? }] dans l'ordre de la carte : suivi, PMS, courrier à la DDPP.
export function pointsFormule(offre) {
  const points = [];
  if (offre?.fonctions?.suivi === true) points.push({ cle: "suivi", texte: TEXTE_SUIVI });
  if (aPms(offre)) points.push({ cle: "pms", texte: MENTION_PMS, precision: PMS_OFFERT[offre.cle] });
  const ddpp = offre?.fonctions?.ddpp;
  if (ddpp === "incluse") points.push({ cle: "ddpp", texte: TEXTE_COURRIER_DDPP });
  if (ddpp === "option") points.push({ cle: "ddpp", texte: TEXTE_COURRIER_DDPP_OPTION });
  return points;
}

// Renvoi « ** » sous les cartes, dès qu'une formule affichée annonce le PMS. Tant que le catalogue ne le dit pas
// disponible : la date prévue, sans garantie (article 14.1), et le mensuel engagé « quand il sera proposé » (article 3.2).
export function renvoiPms(catalogue) {
  if (!catalogue?.offres?.some(aPms)) return null;
  const disponible = catalogue.pmsDisponible === true;
  return [
    disponible ? null : "Lancement prévu à la mi-décembre 2026, sans date garantie.",
    `Le PMS (plan de maîtrise sanitaire) est offert en Sérénité annuel dès le 1er paiement, et en Sérénité ou Expert en mensuel avec engagement dès le 3e paiement${disponible ? "" : ", quand cette version sera proposée"}.`,
    "Pas de PMS offert en mensuel sans engagement.",
    "Mises à jour illimitées tant que le droit est ouvert.",
  ].filter(Boolean).join(" ");
}

// Lignes du détail de la carte (null : pas de ligne).
export function ligneSuivi(offre) {
  const suivi = offre?.fonctions?.suivi;
  if (suivi === true) return "Inclus : nous vous contactons si votre score baisse";
  return suivi === false ? "Non" : null;
}
export const PRECISION_COURRIER_DDPP = "avec l’aide à la rédaction de votre réponse en cas de mise en demeure";

export function atoutsTarifs(catalogue) {
  return [
    [MENTION_EQUIPIERS, `Dans toutes les formules. ${RENVOI_EQUIPIERS}`],
    atoutEngagement(catalogue),
    ["Paiement sécurisé", "Par carte bancaire ou prélèvement SEPA. Le montant exact figure sur la page de paiement."],
  ].filter(Boolean);
}

function reponseEngagement(catalogue) {
  if (!catalogue) return "";
  const { sansEngagement, engagee, mois, annuel } = engagements(catalogue);
  const phrases = [];
  if (engagee && sansEngagement) {
    phrases.push("Cela dépend de la version choisie. Le mensuel sans engagement se résilie à tout moment, avec effet à la fin de la période en cours.");
  }
  if (engagee) {
    phrases.push(
      `Le mensuel avec engagement vous engage pour ${mois} mois : vous payez chaque mois et la résiliation prend effet à la fin de l’engagement. Il est reconduit automatiquement pour ${mois} mois, sauf résiliation demandée avant l’échéance.`
    );
  } else if (sansEngagement) {
    phrases.push("Les formules mensuelles sont sans engagement.");
  }
  if (annuel) phrases.push("La formule annuelle est payée d’avance pour douze mois.");
  return phrases.join(" ");
}

function reponseResiliation(catalogue) {
  const effet = catalogue && engagements(catalogue).engagee ? " Avec un engagement, la résiliation prend effet à la fin de celui-ci." : "";
  return `Depuis votre espace abonnement, sur le site, ou depuis l’application web.${effet} Après la résiliation, vos données restent consultables pendant deux mois en lecture seule, avec un export complet, puis elles sont supprimées.`;
}

export function questionsTarifs(catalogue) {
  return [
    {
      question: "Y a-t-il un engagement ?",
      reponse: reponseEngagement(catalogue),
    },
    {
      question: "Puis-je ajouter des comptes supplémentaires ?",
      // CGV 1.0, article 4.2 : le titulaire les demande au support ; l'ajout depuis l'espace abonnement viendra plus tard.
      reponse: `Oui : vous les choisissez lors de l’inscription. Ensuite, le titulaire de l’abonnement peut en ajouter à tout moment en écrivant à ${BUSINESS.email}, depuis l’adresse e-mail de son compte. Leur prix figure dans le détail de chaque formule.`,
    },
    {
      question: "Que sont les équipiers ?",
      reponse:
        "Les équipiers sont illimités et gratuits dans toutes les formules. Rattachés à l’établissement, ils n’ont pas de connexion propre : ils signent leurs actions avec un code PIN, sur un appareil où un compte est connecté.",
    },
    {
      question: "Quels moyens de paiement acceptez-vous ?",
      reponse:
        "Le paiement se fait par carte bancaire ou par prélèvement SEPA, sur la page de paiement sécurisée de notre prestataire.",
    },
    {
      question: "Comment résilier ?",
      reponse: reponseResiliation(catalogue),
    },
  ].filter((q) => q.reponse);
}

// « l’Essentiel », « de l’Essentiel » ; « le Sérénité », « du Sérénité ».
const commenceParVoyelle = (nom) => /^[aeiouy]/i.test(nom.normalize("NFD"));

// Intitulé de la liste des modules, selon le résultat de modulesAffichage.
export function intituleModules(mode, precedente) {
  if (mode === "identiques") return `Les mêmes que ${commenceParVoyelle(precedente.nom) ? "l’" : "le "}${precedente.nom} :`;
  if (mode === "plus") return `Tous les modules ${commenceParVoyelle(precedente.nom) ? "de l’" : "du "}${precedente.nom}, plus :`;
  return "Liste complète :";
}
