// Formulaire d'inscription : décisions pures et mémoire de module, sans React, testées sous node.
// Rien n'est écrit dans le navigateur : cette mémoire disparaît au rechargement de la page.
import { urlDePaiement } from "./api.js";
import { nettoyerSiret } from "./validation.js";

// --- Corps de l'inscription ---

// POST /api/billing/inscription. cgv : le bloc de blocCgv, le même qu'au checkout.
// Ni mot de passe ni confirmation de l'adresse : Apirest crée le compte sans mot de passe connu, et le titulaire
// reçoit par e-mail un lien pour choisir son mot de passe après le paiement, ou dès la signature du mandat SEPA (CGV 1.0, articles 4.7 et 5).
export function corpsInscription(valeurs, cgv) {
  const adresse = {
    ligne1: valeurs.ligne1.trim(),
    codePostal: valeurs.codePostal.trim(),
    ville: valeurs.ville.trim(),
  };
  if (valeurs.ligne2.trim()) adresse.ligne2 = valeurs.ligne2.trim();
  return {
    responsable: { prenom: valeurs.prenom.trim(), nom: valeurs.nom.trim(), email: valeurs.email.trim() },
    restaurant: {
      nomCommercial: valeurs.nomCommercial.trim(),
      raisonSociale: valeurs.raisonSociale.trim(),
      siret: nettoyerSiret(valeurs.siret),
      adresse,
    },
    cgvAcceptees: true,
    cgv,
  };
}

// --- Saisie gardée sur « Modifier mon choix » ---

// Liste fermée : jamais la case d'acceptation, à refaire à chaque retour.
const CHAMPS_GARDES = ["prenom", "nom", "email", "confirmationEmail", "nomCommercial", "raisonSociale", "siret", "ligne1", "ligne2", "codePostal", "ville"];
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
  effacerCgvGardee();
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

// Texte tiré des CGV 0.2 (articles 1, 2, 6, 7, 10.1 et 10.5), en attente de validation par l'avocat comme les CGV elles-mêmes.
// La période court depuis le début de l'abonnement : ne jamais écrire « fin du mois ».
// L'engagement n'apparaît que pour une version engagée, proposée seulement quand le PMS est disponible.
const PROFESSIONNELS = "L’abonnement est réservé aux professionnels : en souscrivant, vous déclarez agir pour les besoins de votre activité professionnelle.";
// Résiliation : sur le site, dans l'espace abonnement (CGV 0.2, article 2), ou depuis l'application web, jamais depuis les
// applications iOS et Android (décision de Louis du 10/11, CGV 0.2 article 10.1).
const DEPUIS_ESPACE = "depuis votre espace abonnement, sur compte.restoclair.fr/mon-abonnement, ou depuis l’application web";
const GARANTIE = "Garantie « satisfait ou remboursé » : pour le premier abonnement d’un établissement, vous pouvez demander le remboursement de la première période dans les 14 jours qui suivent la confirmation du paiement.";

export function mentionsAbonnement(version) {
  if (version.cle === "mensuel_engage" || version.engagementMois > 0) {
    return [
      PROFESSIONNELS,
      "Vous vous engagez pour 12 mois et vous payez chaque mois. À la fin des 12 mois, l’engagement est reconduit automatiquement pour 12 mois, sauf résiliation demandée avant l’échéance.",
      `Vous pouvez demander la résiliation à tout moment ${DEPUIS_ESPACE}. Elle prend effet à la fin de l’engagement : l’abonnement et son paiement mensuel se poursuivent jusque-là. La période en cours n’est pas remboursée, sauf garantie « satisfait ou remboursé ».`,
      GARANTIE,
    ];
  }
  if (version.periode === "an") {
    return [
      PROFESSIONNELS,
      "L’abonnement se renouvelle automatiquement chaque année, jusqu’à sa résiliation.",
      `Vous le résiliez ${DEPUIS_ESPACE}. La résiliation prend effet à la fin de l’année payée, comptée à partir de la date de début de l’abonnement. L’année en cours n’est pas remboursée, sauf garantie « satisfait ou remboursé ».`,
      GARANTIE,
    ];
  }
  return [
    PROFESSIONNELS,
    "L’abonnement se renouvelle automatiquement chaque mois, jusqu’à sa résiliation.",
    `Vous le résiliez ${DEPUIS_ESPACE}. La résiliation prend effet à la fin de la période mensuelle en cours, comptée à partir de la date de début de l’abonnement. La période en cours n’est pas remboursée, sauf garantie « satisfait ou remboursé ».`,
    GARANTIE,
  ];
}

// Chemin de la version en vigueur d'un document (/cgv/0.1), ou null. L'index donne l'adresse de production :
// on n'en garde que le chemin, qui marche aussi en développement.
export function cheminVersionne(index, document) {
  const url = index.find((d) => d.document === document)?.url;
  return url ? new URL(url).pathname : null;
}

// Bloc cgv exigé à l'inscription et au checkout (contrat final d'Apirest, § D) : version en vigueur et empreinte, rien d'autre.
export function blocCgv(index) {
  const cgv = index.find((d) => d.document === "cgv");
  return { version: cgv?.version, sha256: cgv?.sha256 };
}

// --- 409 CGV_VERSION_OBSOLETE : nouvelle acceptation, sans route dédiée ---

const FORME_VERSION_CGV = /^[0-9A-Za-z][0-9A-Za-z._-]{0,31}$/;
const FORME_EMPREINTE_CGV = /^[0-9a-f]{64}$/i;

// Version à faire accepter, lue dans details.cgv { version, sha256, url } ; null si absente ou illisible.
// L'adresse reçue n'est jamais suivie : le lien est construit à partir de la version (cheminCgv).
export function cgvAReaccepter(erreur) {
  if (erreur?.code !== "CGV_VERSION_OBSOLETE") return null;
  const cgv = erreur?.detail?.cgv;
  const version = typeof cgv?.version === "string" ? cgv.version.trim() : "";
  const sha256 = typeof cgv?.sha256 === "string" ? cgv.sha256.trim() : "";
  if (!FORME_VERSION_CGV.test(version) || !FORME_EMPREINTE_CGV.test(sha256)) return null;
  return { version, sha256 };
}

// Texte de cette version sur le site (route /cgv/:version).
export function cheminCgv(version) {
  return `/cgv/${encodeURIComponent(version)}`;
}

// --- Acceptation des CGV au fil de la page (useReducer d'Inscription.jsx) ---

// cgv : bloc envoyé à l'inscription et au checkout, celui de la page puis celui qu'un 409 lisible demande d'accepter.
// versionRecue : un 409 a remplacé la version de la page ; les liens nomment alors cette version.
// aAccepterAuPaiement : le 409 est venu du Checkout, sur un compte déjà créé. Le panneau « compte créé » montre le message
// et sa case, et « Passer au paiement » attend qu'elle soit cochée. Un 409 à l'inscription se règle dans le formulaire :
// le compte n'est créé qu'avec la case recochée pour cette version, il n'y a rien à refaire au paiement.
// caseCochee : la case de ce panneau.
export function etatCgvInitial(cgv) {
  return { cgv, versionRecue: false, aAccepterAuPaiement: false, caseCochee: false };
}

// Version reçue d'un 409, gardée en mémoire de module comme la saisie : « Modifier mon choix » quitte la page,
// qui doit revenir avec cette version et non celle du build, déjà refusée. Rien n'est écrit dans le navigateur.
// La case n'est jamais gardée : le visiteur la recoche à son retour.
let cgvGardee = null;

export function garderCgv(etat) {
  cgvGardee = etat.versionRecue ? { cgv: etat.cgv, aAccepterAuPaiement: etat.aAccepterAuPaiement } : null;
}

export function effacerCgvGardee() {
  cgvGardee = null;
}

// État de départ de la page : la version gardée si un 409 l'a apportée, sinon celle du build.
export function etatCgvDepart(cgvDuBuild) {
  if (!cgvGardee) return etatCgvInitial(cgvDuBuild);
  return { cgv: cgvGardee.cgv, versionRecue: true, aAccepterAuPaiement: cgvGardee.aAccepterAuPaiement, caseCochee: false };
}

export function suivreCgv(etat, action) {
  switch (action.type) {
    case "refus-inscription":
      return { cgv: action.cgv, versionRecue: true, aAccepterAuPaiement: false, caseCochee: false };
    case "refus-paiement":
      return { cgv: action.cgv, versionRecue: true, aAccepterAuPaiement: true, caseCochee: false };
    case "case":
      return { ...etat, caseCochee: action.cochee };
    // Compte créé avec la case du formulaire cochée pour etat.cgv, ou autre compte à créer par le formulaire.
    case "compte-cree":
    case "autre-compte":
      return { ...etat, aAccepterAuPaiement: false, caseCochee: false };
    default:
      return etat;
  }
}

export function paiementBloqueParCgv(etat) {
  return etat.aAccepterAuPaiement && !etat.caseCochee;
}
