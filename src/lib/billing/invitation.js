// Vente sur invitation (VITE_VENTE_SUR_INVITATION, config.js) : pour une démonstration sur le site de production, la
// vente reste invisible du public et des moteurs de recherche. Ses pages ne sont pas enregistrées et ses liens
// n'apparaissent pas, exactement comme sans BILLING_ACTIF. Elle n'apparaît que dans un navigateur qui a ouvert une fois
// une adresse du site portant ?invitation-vente=demo ; ?invitation-vente=fin l'y retire.
// Ce n'est pas une protection : le paramètre figure dans le code public. C'est seulement de la discrétion.
//
// Le choix est gardé dans localStorage (à défaut, sessionStorage) : il survit au passage par Stripe et aux autres onglets
// du même navigateur. Sans aucun stockage, il ne vaut que pour la page ouverte.
//
// Une arrivée par un lien qui n'existe qu'après une inscription vaut aussi invitation, et elle est gardée de même : lien
// reçu par e-mail (reprise, mot de passe : #jeton=…) ou retour de Stripe après paiement (?session_id=…). Ainsi, l'e-mail
// ouvert sur un autre appareil (le téléphone) ou un navigateur sans stockage n'aboutit pas à « page introuvable ».
import { BILLING_ACTIF, VENTE_SUR_INVITATION } from "./config.js";
import { CHEMIN_REPRISE, lireJetonDuFragment } from "./reprise.js";
import { estRetourStripe } from "./retour.js";

const CHEMIN_MOT_DE_PASSE = "/compte/mot-de-passe";
const CHEMIN_RETOUR = "/abonnement/retour";

export const PARAMETRE_INVITATION = "invitation-vente";
export const CLE_INVITATION = "restoclair_invitation_vente";
const OUVRIR = "demo";
const FERMER = "fin";

// « ouvrir », « fermer » ou null, d'après la partie « ?… » de l'adresse.
export function decisionInvitation(search) {
  let valeur = null;
  try {
    valeur = new URLSearchParams(String(search ?? "")).get(PARAMETRE_INVITATION);
  } catch {
    return null;
  }
  const choix = String(valeur ?? "").trim().toLowerCase();
  if (choix === OUVRIR) return "ouvrir";
  if (choix === FERMER) return "fermer";
  return null;
}

// L'adresse est-elle celle d'un lien de la vente reçu après une inscription ? (voir l'en-tête)
export function arriveeParLienDeVente(chemin, search, hash) {
  const page = String(chemin ?? "").replace(/\/+$/, "") || "/";
  try {
    if (page === CHEMIN_REPRISE || page === CHEMIN_MOT_DE_PASSE) return lireJetonDuFragment(hash) !== null;
    if (page === CHEMIN_RETOUR) return estRetourStripe(String(search ?? ""));
  } catch {
    return false;
  }
  return false;
}

// Stockages utilisables, dans l'ordre de préférence. Un navigateur peut refuser l'accès (lecture qui lève une exception).
function stockages(fenetre) {
  const liste = [];
  for (const nom of ["localStorage", "sessionStorage"]) {
    try {
      if (fenetre[nom]) liste.push(fenetre[nom]);
    } catch {
      // stockage refusé : on passe au suivant
    }
  }
  return liste;
}

function memorise(fenetre) {
  return stockages(fenetre).some((stockage) => {
    try {
      return stockage.getItem(CLE_INVITATION) === "1";
    } catch {
      return false;
    }
  });
}

function memoriser(fenetre) {
  for (const stockage of stockages(fenetre)) {
    try {
      stockage.setItem(CLE_INVITATION, "1");
      return;
    } catch {
      // stockage plein ou refusé : on essaie le suivant
    }
  }
}

function oublier(fenetre) {
  for (const stockage of stockages(fenetre)) {
    try {
      stockage.removeItem(CLE_INVITATION);
    } catch {
      // rien à faire
    }
  }
}

// Retire le paramètre de la barre d'adresse : le lien partagé ou mis en favori ne le porte plus, la mesure d'audience
// non plus. Le reste de l'adresse (chemin, autres paramètres, ancre) est gardé.
function retirerParametre(fenetre) {
  try {
    const adresse = new URL(fenetre.location.href);
    adresse.searchParams.delete(PARAMETRE_INVITATION);
    fenetre.history.replaceState(fenetre.history.state, "", `${adresse.pathname}${adresse.search}${adresse.hash}`);
  } catch {
    // adresse laissée telle quelle
  }
}

// La vente est-elle visible dans ce navigateur ? Sans invitation (cas normal), c'est BILLING_ACTIF.
export function venteVisible({ billingActif = BILLING_ACTIF, surInvitation = VENTE_SUR_INVITATION, fenetre = globalThis.window } = {}) {
  if (!billingActif) return false;
  if (!surInvitation) return true;
  if (!fenetre) return false;
  let adresse = { pathname: "", search: "", hash: "" };
  try {
    const { pathname = "", search = "", hash = "" } = fenetre.location ?? {};
    adresse = { pathname, search, hash };
  } catch {
    // adresse illisible : ni invitation ni lien
  }
  const decision = decisionInvitation(adresse.search);
  if (decision === "fermer") {
    oublier(fenetre);
    retirerParametre(fenetre);
    return false;
  }
  if (decision === "ouvrir") {
    memoriser(fenetre);
    retirerParametre(fenetre);
    return true;
  }
  if (arriveeParLienDeVente(adresse.pathname, adresse.search, adresse.hash)) {
    memoriser(fenetre);
    return true;
  }
  return memorise(fenetre);
}

// Décidé une fois, au chargement de la page, avant le routeur : les routes de la vente et les liens qui y mènent lisent
// cette valeur à la place de BILLING_ACTIF.
export const VENTE_VISIBLE = venteVisible();
