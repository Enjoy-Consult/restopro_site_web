// Textes de la page Tarifs et des cartes qui dépendent du catalogue : sans React, testés sous node.
// Sans catalogue (chargement, API en panne), on n'affirme rien sur l'engagement.
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
  const resiliation = "La résiliation se demande depuis votre espace client.";
  if (engagee && sansEngagement) {
    return ["Avec ou sans engagement", `Selon la formule et la version : mensuel sans engagement ou engagement de ${mois} mois. ${resiliation}`];
  }
  if (engagee) return [`Engagement de ${mois} mois`, `Les versions mensuelles vous engagent pour ${mois} mois. ${resiliation}`];
  if (sansEngagement) return ["Sans engagement", "Les formules mensuelles se résilient depuis votre espace client."];
  return null;
}

export function atoutsTarifs(catalogue) {
  return [
    ["Équipiers illimités", "Gratuits dans toutes les formules, pour signer les actions."],
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
  return `Depuis votre espace client.${effet} Après la résiliation, vos données restent consultables pendant deux mois en lecture seule, avec un export complet, puis elles sont supprimées.`;
}

export function questionsTarifs(catalogue) {
  return [
    {
      question: "Y a-t-il un engagement ?",
      reponse: reponseEngagement(catalogue),
    },
    {
      question: "Puis-je ajouter des comptes supplémentaires ?",
      reponse:
        "Oui : vous les choisissez lors de l’inscription, puis vous pouvez en ajouter à tout moment depuis votre espace client. Leur prix figure dans le détail de chaque formule.",
    },
    {
      question: "Que sont les équipiers ?",
      reponse:
        "Les équipiers sont illimités et gratuits dans toutes les formules. Ils servent à signer les actions, avec les droits du compte auquel ils sont rattachés.",
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
