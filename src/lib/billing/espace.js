// Espace abonnement de compte.restoclair.fr : session « site », lecture de la connexion et du compte, décisions et
// textes. Fonctions pures (sauf la session), testées sous node : espace.test.js.
//
// Routes de la session minimale d'Apirest (validées le 10/11, relayées par la coordination), sous /api/billing, en
// X-Client-Type: web et credentials « omit », depuis l'origine compte.restoclair.fr :
//   POST /connexion { email, motDePasse } → { token (billing_session, 2 h), expireLe, compte: { id, nom, email },
//        restaurants: [{ restaurantId, nom, estTitulaire, transfertRecu, statut }] } ; échec uniforme 401 IDENTIFIANTS_INVALIDES ; 403
//        CONNEXION_NON_ADMISE { motif } seulement après un mot de passe juste.
//   Avec la session (Bearer), restaurantId explicite : POST /deconnexion → 204 ; GET /compte ; POST /portail ;
//   POST et DELETE /resiliation, avec motDePasse dans le corps ; GET /export-sortie (ZIP).
//   Hors liste : 403 PORTEE_INSUFFISANTE, jamais 401 : ce code ne déconnecte pas.
// restaurantId : paramètre de l'adresse pour GET /compte et /export-sortie, corps pour les POST et DELETE (confirmé).
// Résiliation et annulation : 403 MOT_DE_PASSE_REQUIS ou MOT_DE_PASSE_INVALIDE (noms à confirmer par Apirest).
import { ApiError } from "./errors.js";
import { estTropDEssais, MESSAGE_INDISPONIBLE, MESSAGE_REFUS_GENERIQUE, messageTropDEssais } from "./erreurs.js";
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

// Durée de la session d'Apirest : 2 h fixes, sans renouvellement.
export const DUREE_SESSION_MS = 2 * 3600 * 1000;

// Échéance locale, calculée à la connexion avec l'horloge du poste : la durée restante annoncée par expireLe, bornée
// à 2 h, ou 2 h si expireLe est illisible ou déjà passé (horloge du poste en avance). L'API reste juge par ses 401.
export function echeanceLocale(expireLe, maintenant = Date.now()) {
  const restant = Date.parse(typeof expireLe === "string" ? expireLe : "") - maintenant;
  return maintenant + (Number.isFinite(restant) && restant > 0 ? Math.min(restant, DUREE_SESSION_MS) : DUREE_SESSION_MS);
}

// Session encore valable à l'instant `maintenant`, d'après son échéance locale.
export function sessionValable(session, maintenant = Date.now()) {
  return Boolean(session?.token) && Number.isFinite(session.echeance) && session.echeance > maintenant;
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
// Abonnement en cours : billing ne sert l'export de sortie qu'après la fin de l'accès (exportSortieDisponible).
export const TEXTE_EXPORT_A_LA_FIN =
  "L’export complet sera disponible ici à la fin de votre abonnement. Pendant l’abonnement, vos données s’exportent depuis l’application.";

// Après une connexion réussie : l'espace (restaurants dont la personne est titulaire), ou un refus.
export function issueConnexionReussie(connexion) {
  const titulaires = connexion.restaurants.filter((r) => r.estTitulaire);
  if (titulaires.length > 0) return { type: "espace", restaurants: titulaires };
  if (connexion.restaurants.some((r) => r.transfertRecu)) return { type: "refus", texte: TEXTE_TRANSFERT_RECU };
  return { type: "refus", texte: TEXTE_NON_TITULAIRE };
}

// Échec de la connexion (codes figés par Apirest). 401 IDENTIFIANTS_INVALIDES pour tout échec, mot de passe jamais
// choisi compris ; 403 CONNEXION_NON_ADMISE, seulement après un mot de passe juste, avec details.motif parmi role,
// compte_temporaire, desactive, sursis, aucun_restaurant ; un motif inconnu reçoit le refus générique. Le refus du
// non-titulaire n'est pas un motif : le site l'applique après la connexion (issueConnexionReussie).
const REFUS_CONNEXION = {
  role: { texte: "Ce compte ne permet pas de gérer l’abonnement : seul le titulaire peut le faire ici. Pour toute autre demande, contactez le support." },
  compte_temporaire: {
    texte: "Ce compte utilise encore un mot de passe temporaire. Choisissez votre mot de passe avec le lien reçu par e-mail, ou avec « Mot de passe oublié ».",
    motDePasse: true,
  },
  desactive: { texte: "Ce compte est désactivé. Contactez le support.", telephone: true },
  sursis: { texte: "Ce compte est suspendu pour le moment. Contactez le support.", telephone: true },
  aucun_restaurant: { texte: "Aucun établissement n’est rattaché à ce compte. Contactez le support.", telephone: true },
};
const REFUS_CONNEXION_INCONNU = { texte: "Ce compte ne permet pas de gérer l’abonnement ici. Contactez le support.", telephone: true };

export function issueConnexion(erreur) {
  if (estTropDEssais(erreur)) return { texte: messageTropDEssais(erreur) };
  const code = erreur?.code;
  if (erreur?.status === 401 || code === "IDENTIFIANTS_INVALIDES") return { texte: "Adresse e-mail ou mot de passe incorrect." };
  if (code === "CONNEXION_NON_ADMISE") {
    const motif = String(erreur?.detail?.motif ?? "");
    return Object.hasOwn(REFUS_CONNEXION, motif) ? REFUS_CONNEXION[motif] : REFUS_CONNEXION_INCONNU;
  }
  if (code === "VALIDATION_ERROR") return { texte: "Vérifiez votre adresse e-mail et votre mot de passe." };
  return { texte: MESSAGE_INDISPONIBLE, telephone: true };
}

// Refus d'une action de l'espace (hors session finie et mot de passe refusé) : texte à afficher. L'indisponibilité est
// réservée au réseau et aux 5xx ; un autre refus 4xx reçoit le message générique.
export function messageRefusEspace(erreur) {
  if (estTropDEssais(erreur)) return messageTropDEssais(erreur);
  if (erreur?.code === "PORTEE_INSUFFISANTE") return TEXTE_PORTEE_INSUFFISANTE;
  if (erreur?.code === "OPERATION_NON_DISPONIBLE")
    return "Cette action n’est plus disponible pour cet établissement. Pour toute autre demande, contactez le support.";
  if (erreur?.status >= 400 && erreur?.status < 500) return MESSAGE_REFUS_GENERIQUE;
  return MESSAGE_INDISPONIBLE;
}

// 401 sur une route de l'espace : session finie (2 h, déconnexion depuis l'app, mot de passe changé).
// 403 PORTEE_INSUFFISANTE n'en est jamais une.
export const estSessionFinie = (erreur) => erreur?.status === 401;

// Mot de passe redemandé (résiliation et annulation, demande 5) : 403 MOT_DE_PASSE_REQUIS (absent) ou
// MOT_DE_PASSE_INVALIDE (faux), d'après la note d'Apirest ; jamais un 401, qui finirait la session.
export const estMotDePasseRefuse = (erreur) => ["MOT_DE_PASSE_REQUIS", "MOT_DE_PASSE_INVALIDE"].includes(erreur?.code);

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
  // Seul billing décide : l'export de sortie n'est servi qu'après la fin de l'accès, pendant la conservation.
  const exportDisponible = compte?.exportSortieDisponible === true;

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
      cle: "impaye",
      type: "error",
      texte: `Un paiement n’a pas abouti.${limite ? ` Sans régularisation, l’application passera en lecture seule le ${limite}.` : ""} Mettez à jour votre moyen de paiement ou réglez la facture depuis « Factures et moyen de paiement ».`,
    });
  }
  if (statut === "activation_provisoire")
    bandeaux.push({ cle: "provisoire", type: "info", texte: "Votre premier prélèvement est en cours. L’accès à l’application est ouvert en attendant sa confirmation." });
  if (resiliationProgrammee)
    bandeaux.push({ cle: "resiliation", type: "info", texte: `Votre abonnement prendra fin le ${date(compte.resiliation.effetLe)}. D’ici là, l’accès reste complet et vous pouvez annuler la résiliation.` });
  if (statut === "resilie") {
    const suppression = date(compte?.suppressionPrevueLe);
    let texteFin = "Votre abonnement est terminé.";
    if (suppression && exportDisponible) texteFin += ` Les données de l’établissement seront supprimées le ${suppression} : téléchargez l’export complet avant cette date.`;
    else if (suppression) texteFin += ` Les données de l’établissement seront supprimées le ${suppression}.`;
    else if (exportDisponible) texteFin += " Vous pouvez télécharger ci-dessous l’export complet des données de l’établissement.";
    bandeaux.push({ cle: "termine", type: "info", texte: texteFin });
  }
  if (statut === "sans_abonnement" || statut === "en_attente_paiement") bandeaux.push({ cle: "sans", type: "info", texte: TEXTE_SANS_ABONNEMENT });

  const enCours = ["actif", "impaye", "activation_provisoire"].includes(statut);
  return {
    lignes,
    bandeaux,
    actions: {
      portail: enCours || statut === "resilie",
      resilier: enCours && !resiliationProgrammee,
      annulerResiliation: resiliationProgrammee,
      export: exportDisponible,
      // À la place du bouton, TEXTE_EXPORT_A_LA_FIN, pour un abonnement actif seulement (résiliation programmée
      // comprise). En impayé ou en accès provisoire, le site ne sait pas si un premier prélèvement a été refusé : dans
      // ce cas, aucun abonnement n'est conclu et il n'y aura ni export ni consultation (CGV 11.3). Rien n'est promis.
      exportALaFin: !exportDisponible && statut === "actif",
    },
  };
}

export function texteResiliationEnregistree(effetLe) {
  const fin = date(effetLe);
  return fin
    ? `Résiliation enregistrée : votre abonnement prendra fin le ${fin}. D’ici là, l’accès reste complet et vous pouvez l’annuler ici.`
    : "Résiliation enregistrée. D’ici sa date d’effet, l’accès reste complet et vous pouvez l’annuler ici.";
}

// Page du portail Stripe : https://billing.stripe.com seulement, sans identifiants dans l'adresse (en maquette, la même
// origine en http). Défense en profondeur : l'adresse vient de l'API, mais on ne suit jamais une autre destination.
export function urlPortail(brute, origineMaquette = null) {
  if (typeof brute !== "string") return null;
  try {
    const cible = new URL(brute);
    if (cible.username || cible.password) return null;
    if (origineMaquette && cible.origin === origineMaquette) return cible.href;
    return cible.protocol === "https:" && cible.hostname === "billing.stripe.com" ? cible.href : null;
  } catch {
    return null;
  }
}

// Nom du fichier de l'export : export-restoclair-<établissement>.zip, en lettres simples (deux établissements, deux noms).
export function nomFichierExport(nomEtablissement) {
  const morceau = String(nomEtablissement ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return morceau ? `export-restoclair-${morceau}.zip` : "export-restoclair.zip";
}
