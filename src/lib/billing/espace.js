// Espace abonnement de compte.restoclair.fr : session « site », lecture de la connexion et du compte, décisions et
// textes. Fonctions pures (sauf la session), testées sous node : espace.test.js.
//
// Routes de la session minimale d'Apirest (validées le 10/11, relayées par la coordination), sous /api/billing, en
// X-Client-Type: web et credentials « omit », depuis l'origine compte.restoclair.fr :
//   POST /connexion { email, motDePasse } → { token (billing_session, 2 h), expireLe, compte, restaurants: [{ restaurantId,
//        nom, estTitulaire, transfertRecu, statut }] } ; échec uniforme 401 IDENTIFIANTS_INVALIDES ; 403
//        CONNEXION_NON_ADMISE { motif } seulement après un mot de passe juste.
//   Avec la session (Bearer), restaurantId explicite : POST /deconnexion → 204 ; GET /compte ; POST /portail ;
//   POST et DELETE /resiliation, avec motDePasse dans le corps ; GET /export-sortie (ZIP).
//   Hors liste : 403 PORTEE_INSUFFISANTE, jamais 401 : ce code ne déconnecte pas.
// Pour une lecture (GET), restaurantId part en paramètre de l'adresse (à confirmer sur le texte complet d'Apirest).
import { ApiError } from "./errors.js";
import { estTropDEssais, MESSAGE_INDISPONIBLE, messageTropDEssais } from "./erreurs.js";
import { formatDate, formatHTParPeriode } from "./format.js";

// --- Session de l'espace : sessionStorage de compte.restoclair.fr seulement (jamais localStorage ni cookie). ---
// Distincte de la session de l'inscription (session.js), qui n'existe que sur restoclair.fr.

const CLE = "restoclair_espace_session";
const CLE_RETOUR = "restoclair_espace_retour";
let memoire = null;

const stockage = () => {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
};

// Session encore valable à l'instant `maintenant` (2 h fixes côté Apirest ; l'API reste juge par ses 401).
export function sessionValable(session, maintenant = Date.now()) {
  if (!session?.token) return false;
  const fin = Date.parse(session.expireLe ?? "");
  return Number.isNaN(fin) || fin > maintenant;
}

export function lireSessionEspace(maintenant = Date.now()) {
  let session = memoire;
  try {
    const brut = stockage()?.getItem(CLE);
    if (brut) session = JSON.parse(brut);
  } catch {
    // stockage indisponible ou illisible : la copie en mémoire, s'il y en a une
  }
  return sessionValable(session, maintenant) ? session : null;
}

export function ecrireSessionEspace(session) {
  try {
    stockage().setItem(CLE, JSON.stringify(session));
    memoire = null;
  } catch {
    memoire = session;
  }
}

export function effacerSessionEspace() {
  memoire = null;
  try {
    stockage()?.removeItem(CLE);
  } catch {
    // ignoré
  }
}

// Page de l'espace demandée avant la connexion (lien d'un e-mail) : seulement un chemin de l'espace, jamais une adresse.
export function cheminDeRetourAdmis(chemin) {
  const valeur = String(chemin ?? "");
  return /^\/mon-abonnement(\/[A-Za-z0-9/_-]*)?(\?[A-Za-z0-9=&_-]*)?$/.test(valeur) && !valeur.includes("//") ? valeur : null;
}

export function retenirRetour(chemin) {
  const admis = cheminDeRetourAdmis(chemin);
  try {
    if (admis) stockage()?.setItem(CLE_RETOUR, admis);
  } catch {
    // ignoré : on reviendra sur l'accueil de l'espace
  }
}

export function prendreRetour() {
  try {
    const chemin = stockage()?.getItem(CLE_RETOUR);
    stockage()?.removeItem(CLE_RETOUR);
    return cheminDeRetourAdmis(chemin) ?? "/mon-abonnement";
  } catch {
    return "/mon-abonnement";
  }
}

// --- Lecture tolérante ---

const estObjet = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const texte = (v) => (typeof v === "string" ? v.trim() : "");
const sansEnveloppe = (corps) => (estObjet(corps) && estObjet(corps.data) ? corps.data : corps);

export function lireConnexion(brut) {
  const corps = sansEnveloppe(brut);
  const token = texte(corps?.token);
  if (!token) throw new ApiError("CONNEXION_ILLISIBLE");
  const restaurants = (Array.isArray(corps.restaurants) ? corps.restaurants : [])
    .filter(estObjet)
    .map((r) => ({
      restaurantId: texte(String(r.restaurantId ?? r.id ?? "")),
      nom: texte(r.nom) || "Votre établissement",
      estTitulaire: r.estTitulaire === true,
      transfertRecu: r.transfertRecu === true,
      statut: texte(r.statut) || null,
    }))
    .filter((r) => r.restaurantId);
  const compte = estObjet(corps.compte) ? { email: texte(corps.compte.email) || null, nom: texte(corps.compte.nom) || null } : null;
  return { token, expireLe: texte(corps.expireLe) || null, compte, restaurants };
}

// --- Décisions ---

export const TEXTE_NON_TITULAIRE =
  "Seul le titulaire de l’abonnement peut le gérer ici. Pour toute autre demande, contactez le support.";
export const TEXTE_TRANSFERT_RECU =
  "Le rôle de titulaire vous a été proposé. Son acceptation depuis cet espace arrive prochainement : en attendant, contactez le support.";
export const TEXTE_SESSION_EXPIREE = "Votre session a expiré. Reconnectez-vous pour continuer.";
export const TEXTE_DECONNECTE = "Vous êtes déconnecté.";
export const TEXTE_SUPPORT = "Pour toute autre demande, contactez le support.";
export const TEXTE_SANS_ABONNEMENT = "Aucun abonnement payé pour cet établissement. Pour souscrire, contactez le support RestOclair.";
export const TEXTE_PORTEE_INSUFFISANTE = "Cette action n’est pas disponible depuis cet espace. Contactez le support.";

// Après une connexion réussie : l'espace (restaurants dont la personne est titulaire), ou un refus.
export function issueConnexionReussie(connexion) {
  const titulaires = connexion.restaurants.filter((r) => r.estTitulaire);
  if (titulaires.length > 0) return { type: "espace", restaurants: titulaires };
  if (connexion.restaurants.some((r) => r.transfertRecu)) return { type: "refus", texte: TEXTE_TRANSFERT_RECU };
  return { type: "refus", texte: TEXTE_NON_TITULAIRE };
}

// Échec de la connexion. 401 IDENTIFIANTS_INVALIDES pour tout échec ; 403 CONNEXION_NON_ADMISE { motif } seulement après
// un mot de passe juste. Les motifs exacts restent à lire dans le texte complet d'Apirest : on les reconnaît par mot-clé,
// et un motif inconnu reçoit le refus générique.
export function issueConnexion(erreur) {
  if (estTropDEssais(erreur)) return { texte: messageTropDEssais(erreur) };
  const code = erreur?.code;
  if (erreur?.status === 401 || code === "IDENTIFIANTS_INVALIDES") return { texte: "Adresse e-mail ou mot de passe incorrect." };
  if (code === "CONNEXION_NON_ADMISE") {
    const motif = String(erreur?.detail?.motif ?? "").toLowerCase();
    if (/definir|temporaire|finali/.test(motif))
      return { texte: "Choisissez d’abord votre mot de passe, avec le lien reçu par e-mail ou avec « Mot de passe oublié ».", motDePasse: true };
    if (/desactiv|sursis|suspend/.test(motif)) return { texte: "Ce compte est désactivé. Contactez le support.", telephone: true };
    return { texte: "Ce compte ne permet pas de gérer l’abonnement. Seul le titulaire peut le faire ici ; pour toute autre demande, contactez le support." };
  }
  if (code === "VALIDATION_ERROR") return { texte: "Vérifiez votre adresse e-mail et votre mot de passe." };
  return { texte: MESSAGE_INDISPONIBLE, telephone: true };
}

// Refus d'une action de l'espace (hors session finie et mot de passe refusé) : texte à afficher.
export function messageRefusEspace(erreur) {
  if (estTropDEssais(erreur)) return messageTropDEssais(erreur);
  if (erreur?.code === "PORTEE_INSUFFISANTE") return TEXTE_PORTEE_INSUFFISANTE;
  if (erreur?.code === "OPERATION_NON_DISPONIBLE")
    return "Cette action n’est plus disponible pour cet établissement. Pour toute autre demande, contactez le support.";
  return MESSAGE_INDISPONIBLE;
}

// 401 sur une route de l'espace : session finie (2 h, déconnexion depuis l'app, mot de passe changé).
// 403 PORTEE_INSUFFISANTE n'en est jamais une.
export const estSessionFinie = (erreur) => erreur?.status === 401;

// Mot de passe redemandé (résiliation, demande 5) : refus du mot de passe, jamais un 401 (qui finirait la session).
export const estMotDePasseRefuse = (erreur) =>
  ["MOT_DE_PASSE_INCORRECT", "MOT_DE_PASSE_INVALIDE", "INVALID_PASSWORD"].includes(erreur?.code);

// --- Présentation du compte (GET /compte, lu par lireCompte d'api.js) ---

const NOMS_OFFRES = { essentiel: "Essentiel", serenite: "Sérénité", expert: "Expert" };
const NOMS_VERSIONS = { mensuel: "mensuelle sans engagement", mensuel_engage: "mensuelle avec engagement", annuel: "annuelle" };
export const LIBELLES_STATUT = {
  sans_abonnement: "Aucun abonnement",
  en_attente_paiement: "Paiement à finaliser",
  activation_provisoire: "Accès provisoire, prélèvement en cours",
  actif: "Actif",
  impaye: "Paiement en retard",
  resilie: "Terminé",
};

const date = (v) => formatDate(texte(v)) || null;

// Lignes et actions de l'accueil de l'espace. maintenant : pour dire si une résiliation est encore à venir.
export function resumeCompte(compte, maintenant = Date.now()) {
  const statut = compte?.statut;
  const offre = NOMS_OFFRES[texte(compte?.offre)] ?? (texte(compte?.offre) || null);
  const version = NOMS_VERSIONS[texte(compte?.version)] ?? null;
  const montant = Number.isFinite(compte?.montantPeriodiqueHTCentimes) && compte.montantPeriodiqueHTCentimes > 0
    ? formatHTParPeriode(compte.montantPeriodiqueHTCentimes, compte.version === "annuel" ? "an" : "mois")
    : null;
  const effet = Date.parse(compte?.resiliation?.effetLe ?? "");
  const resiliationProgrammee = !Number.isNaN(effet) && effet > maintenant && statut !== "resilie";

  const lignes = [
    ["Statut", LIBELLES_STATUT[statut] ?? "Inconnu"],
    offre && ["Formule", version ? `${offre}, version ${version}` : offre],
    montant && ["Montant", montant],
    !resiliationProgrammee && statut !== "resilie" && date(compte?.periodeFin) && ["Prochaine échéance", date(compte.periodeFin)],
    date(compte?.engagementFin) && ["Fin de l’engagement", date(compte.engagementFin)],
    resiliationProgrammee && ["Fin de l’abonnement", date(compte.resiliation.effetLe)],
    compte?.titulaire?.nom && ["Titulaire", compte.titulaire.email ? `${compte.titulaire.nom} (${compte.titulaire.email})` : compte.titulaire.nom],
  ].filter(Boolean);

  const bandeaux = [];
  if (statut === "impaye") {
    const limite = date(compte?.graceJusquau);
    bandeaux.push({
      type: "error",
      texte: `Un paiement n’a pas abouti.${limite ? ` Sans régularisation, l’application passera en lecture seule le ${limite}.` : ""} Mettez à jour votre moyen de paiement ou réglez la facture depuis « Factures et moyen de paiement ».`,
    });
  }
  if (statut === "activation_provisoire")
    bandeaux.push({ type: "info", texte: "Votre premier prélèvement est en cours. L’accès à l’application est ouvert en attendant sa confirmation." });
  if (resiliationProgrammee)
    bandeaux.push({ type: "info", texte: `Votre abonnement prendra fin le ${date(compte.resiliation.effetLe)}. D’ici là, l’accès reste complet et vous pouvez annuler la résiliation.` });
  if (statut === "resilie") {
    const suppression = date(compte?.suppressionPrevueLe);
    bandeaux.push({
      type: "info",
      texte: `Votre abonnement est terminé.${suppression ? ` Les données de l’établissement seront supprimées le ${suppression} :` : ""} téléchargez l’export complet avant cette date.`,
    });
  }
  if (statut === "sans_abonnement" || statut === "en_attente_paiement") bandeaux.push({ type: "info", texte: TEXTE_SANS_ABONNEMENT });

  const enCours = ["actif", "impaye", "activation_provisoire"].includes(statut);
  return {
    lignes,
    bandeaux,
    actions: {
      portail: enCours || statut === "resilie",
      resilier: enCours && !resiliationProgrammee,
      annulerResiliation: resiliationProgrammee,
      export: compte?.exportSortieDisponible === true || statut === "resilie" || enCours,
    },
  };
}

export function texteResiliationEnregistree(effetLe) {
  const fin = date(effetLe);
  return fin
    ? `Résiliation enregistrée : votre abonnement prendra fin le ${fin}. D’ici là, l’accès reste complet et vous pouvez l’annuler ici.`
    : "Résiliation enregistrée. D’ici sa date d’effet, l’accès reste complet et vous pouvez l’annuler ici.";
}

// Page du portail Stripe : https seulement (en maquette, la même origine en http).
export function urlPortail(brute, origineMaquette = null) {
  if (typeof brute !== "string") return null;
  try {
    const cible = new URL(brute);
    return cible.protocol === "https:" || (origineMaquette && cible.origin === origineMaquette) ? cible.href : null;
  } catch {
    return null;
  }
}

export const NOM_FICHIER_EXPORT = "export-restoclair.zip";
