// Formulaire d'inscription : décisions pures et mémoire de module, sans React, testées sous node.
// Rien n'est écrit dans le navigateur : cette mémoire disparaît au rechargement de la page.
import { urlDePaiement } from "./api.js";

// --- Saisie gardée sur « Modifier mon choix » ---

// Liste fermée : ni le mot de passe, ni sa confirmation, ni la case d'acceptation, à refaire à chaque retour.
const CHAMPS_GARDES = ["prenom", "nom", "email", "nomCommercial", "raisonSociale", "siret", "ligne1", "ligne2", "codePostal", "ville"];
let saisieGardee = null;

export function retenirSaisie(valeurs) {
  saisieGardee = Object.fromEntries(CHAMPS_GARDES.map((champ) => [champ, valeurs[champ] ?? ""]));
}

export function lireSaisie() {
  return saisieGardee;
}

export function effacerSaisie() {
  saisieGardee = null;
}

// Redirection vers la page de paiement hébergée : on ne suit qu'une URL https valide, et la saisie gardée ne part pas avec.
// Sinon l'appelant affiche l'indisponibilité.
export function suivrePaiement(url) {
  const cible = urlDePaiement(url);
  if (!cible) return false;
  effacerSaisie();
  window.location.assign(cible);
  return true;
}

// --- Renvoi vers /tarifs sans choix valable ---

export const TEXTE_CHOIX_ABSENT = "Choisissez d’abord votre formule : l’inscription vient ensuite.";
export const TEXTE_CHOIX_INVALIDE = "Le choix indiqué dans cette adresse n’est pas ou plus disponible. Choisissez votre formule ci-dessous.";

let explicationChoix = null;

export function retenirExplicationChoix(search) {
  const params = new URLSearchParams(search);
  explicationChoix = params.get("offre") && params.get("version") ? TEXTE_CHOIX_INVALIDE : TEXTE_CHOIX_ABSENT;
}

// Lue une seule fois : revenir plus tard sur /tarifs ne la montre plus.
export function prendreExplicationChoix() {
  const explication = explicationChoix;
  explicationChoix = null;
  return explication;
}

// --- Mentions et documents ---

// Texte tiré des CGV 0.1 (articles 1, 6, 7 et 10.1), en attente de validation par l'avocat comme les CGV elles-mêmes.
// La période court depuis le début de l'abonnement : ne jamais écrire « fin du mois ».
// L'engagement n'apparaît que pour une version engagée, proposée seulement quand le PMS est disponible.
const PROFESSIONNELS = "L’abonnement est réservé aux professionnels : en souscrivant, vous déclarez agir pour les besoins de votre activité professionnelle.";
const DEPUIS_ESPACE = "depuis votre espace « Mon compte », sur le web";

export function mentionsAbonnement(version) {
  if (version.cle === "mensuel_engage" || version.engagementMois > 0) {
    return [
      PROFESSIONNELS,
      "Vous vous engagez pour 12 mois et vous payez chaque mois. À la fin des 12 mois, l’engagement est reconduit automatiquement pour 12 mois, sauf résiliation demandée avant l’échéance.",
      `Vous pouvez demander la résiliation à tout moment ${DEPUIS_ESPACE}. Elle prend effet à la fin de l’engagement : l’abonnement et son paiement mensuel se poursuivent jusque-là. La période en cours n’est pas remboursée.`,
    ];
  }
  if (version.periode === "an") {
    return [
      PROFESSIONNELS,
      "L’abonnement se renouvelle automatiquement chaque année, jusqu’à sa résiliation.",
      `Vous le résiliez ${DEPUIS_ESPACE}. La résiliation prend effet à la fin de l’année payée, comptée à partir de la date de début de l’abonnement. L’année en cours n’est pas remboursée.`,
    ];
  }
  return [
    PROFESSIONNELS,
    "L’abonnement se renouvelle automatiquement chaque mois, jusqu’à sa résiliation.",
    `Vous le résiliez ${DEPUIS_ESPACE}. La résiliation prend effet à la fin de la période mensuelle en cours, comptée à partir de la date de début de l’abonnement. La période en cours n’est pas remboursée.`,
  ];
}

// Chemin de la version en vigueur d'un document (/cgv/0.1), ou null. L'index donne l'adresse de production :
// on n'en garde que le chemin, qui marche aussi en développement.
export function cheminVersionne(index, document) {
  const url = index.find((d) => d.document === document)?.url;
  return url ? new URL(url).pathname : null;
}
