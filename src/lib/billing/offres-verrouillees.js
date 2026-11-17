// Formules montrées sur /tarifs (prix, « Détail de la formule ») mais pas encore vendues : clé de l'offre du catalogue
// -> phrase affichée sous le bouton inactif « Bientôt disponible », et dans le message de renvoi depuis /inscription.
//
// Décision de Louis du 17/11 : « On garde le code pour expert, mais […] dans un premier temps, il faudra que ce soit
// verrouillé […] les sondes ne sont pas encore prêtes. »
//
// Deux sources, dans cet ordre (pricing.js, offreVerrouillee) :
// 1. le champ « disponible » de chaque offre du catalogue de billing (commit 0a05904) : true ouvre, false ferme ;
// 2. s'il manque (billing pas encore à jour), CE GARDE-FOU : une formule listée ici reste verrouillée.
// Rouvrir Expert : billing passe « disponible » à true (aucun build du site). Retirer aussi sa ligne ci-dessous dès que
// possible, avec le test « état actuel » de offres-verrouillees.test.js, puis refaire le build. Billing refuse de plus,
// côté serveur, tout paiement d'une formule indisponible (409 FORMULE_INDISPONIBLE) : le site n'est pas la seule
// barrière. Fichier sans variable de build, pour être lu partout (et sous node) sans effet de bord.
export const OFFRES_VERROUILLEES = Object.freeze({
  expert: "Les sondes de température sont en préparation.",
});
