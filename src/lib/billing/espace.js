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
import { BUSINESS } from "../business-info.js";
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
// Avant le premier paiement (sans_abonnement, en_attente_paiement) : texte de l'app (siteAbonnement.ts,
// SANS_ABONNEMENT_TEXT), suivi de DEBUT_CONTACT_SOUSCRIRE. Qui se connecte ici a déjà un établissement : l'inscription
// de /tarifs refuserait son adresse (EMAIL_DEJA_UTILISE). D'ici le paiement depuis l'espace (autre branche), un
// établissement qui existe déjà souscrit auprès du support (CGV 1.0, article 1, point P001 de la liste de Louis).
export const TEXTE_SANS_ABONNEMENT = "Votre restaurant n’a pas encore d’abonnement.";
export const DEBUT_CONTACT_SOUSCRIRE = "Pour souscrire un abonnement, contactez-nous : ";
export const TEXTE_CONTACT_SOUSCRIRE = `${DEBUT_CONTACT_SOUSCRIRE}${BUSINESS.email} ou ${BUSINESS.phone.display}.`;
// Formule et comptes : pas dans l'espace (périmètre du 15/11), par contact. Texte de l'app (siteAbonnement.ts,
// CONTACT_FORMULE_TEXT) avec le contact du site ; la page fait des deux coordonnées des liens mailto et tel.
export const DEBUT_CONTACT_FORMULE = "Pour changer de formule ou ajouter des comptes, contactez-nous : ";
export const TEXTE_CONTACT_FORMULE = `${DEBUT_CONTACT_FORMULE}${BUSINESS.email} ou ${BUSINESS.phone.display}.`;
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
  // Autre 4xx (403 de garde, 404, 409…) : un refus, pas une panne ; « réessayez dans quelques minutes » ferait
  // réessayer en boucle. L'indisponibilité reste réservée au réseau et aux 5xx, comme messageRefusEspace.
  if (erreur?.status >= 400 && erreur?.status < 500) return { texte: MESSAGE_REFUS_GENERIQUE, telephone: true };
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

export const TEXTE_MOT_DE_PASSE_INCORRECT = "Mot de passe incorrect.";
export const TEXTE_REPONSE_PERDUE =
  "Nous n’avons pas reçu la réponse : voici l’état actuel de votre abonnement, vérifiez-le avant de recommencer.";
export const TEXTE_DEMANDE_NON_APPLIQUEE = "Cette demande n’a pas été appliquée : voici l’état actuel de votre abonnement.";
export const TEXTE_MISE_A_JOUR_ETAT = "Mise à jour de l’état de votre abonnement…";
// 409 qui sont des refus, pas un « déjà fait » : RESTAURANT_FERME (même refus sur toutes les routes de billing) et
// OPERATION_NON_DISPONIBLE (errors.ts de l'app). Ils restent dans le formulaire, avec le texte de messageRefusEspace.
const REFUS_409 = ["RESTAURANT_FERME", "OPERATION_NON_DISPONIBLE"];

// Refus de la résiliation ou de son annulation (même traitement). Aucune clé d'idempotence n'est envoyée :
// après une réponse perdue, l'action a peut-être abouti ; on relit le compte au lieu de laisser réessayer à l'aveugle.
// Renvoie l'une de :
//   { type: "session" }                       401 : session finie
//   { type: "mot_de_passe", texte }           mot de passe refusé : sous le champ, le formulaire reste ouvert
//   { type: "relire", texte }                 réseau, délai de 45 s dépassé, 5xx (proxy pendant que le limiteur fait
//                                             attendre Apirest), ou autre 409 (peut-être déjà fait, ici ou dans un
//                                             autre onglet) : formulaire fermé, compte relu, texte en tête de page une
//                                             fois le compte relu
//   { type: "erreur", texte, attenteMs }      autre refus (429, 403, 409 de REFUS_409, autre 4xx) : dans le formulaire,
//                                             qui reste ouvert ; attenteMs : délai demandé par un 429 (bouton désactivé
//                                             jusque-là), ou null
// Le code d'un 409 « déjà programmée » ou « aucune résiliation » n'est pas confirmé par Apirest (la maquette de l'app
// répond ACTION_NON_AUTORISEE dans les deux cas) : texte neutre, la relecture montre ce qui est enregistré.
export function issueResiliation(erreur) {
  if (estSessionFinie(erreur)) return { type: "session" };
  if (estMotDePasseRefuse(erreur)) return { type: "mot_de_passe", texte: TEXTE_MOT_DE_PASSE_INCORRECT };
  const status = Number(erreur?.status) || 0;
  if (status === 409 && !REFUS_409.includes(erreur?.code)) return { type: "relire", texte: TEXTE_DEMANDE_NON_APPLIQUEE };
  if (erreur?.code === "RESEAU" || status === 0 || status >= 500) return { type: "relire", texte: TEXTE_REPONSE_PERDUE };
  if (estTropDEssais(erreur)) {
    const attente = Number(erreur?.retryAfterMs);
    return { type: "erreur", texte: messageTropDEssais(erreur), attenteMs: Number.isFinite(attente) && attente > 0 ? attente : null };
  }
  return { type: "erreur", texte: messageRefusEspace(erreur), attenteMs: null };
}

// --- Présentation du compte (GET /compte, lu par lireCompte d'api.js) ---
// Textes et règles de l'application (dépôt de l'app, worktree release-180), repris mot pour mot avec les apostrophes
// typographiques du site : libellés de statut (monCompte.ts, STATUT_INFO), versions (catalogue.ts, VERSION_LABELS),
// lignes du résumé (SubscriptionSummary.tsx), résiliation (monCompte.ts, resiliation*), bandeaux (accessScreens.ts) et
// renvoi au site (siteAbonnement.ts). Dates : formatDate, « 1er décembre 2026 » comme formatBillingDate de l'app.

const NOMS_OFFRES = { essentiel: "Essentiel", serenite: "Sérénité", expert: "Expert" };
// VERSION_LABELS de l'app, première lettre en minuscule après le nom de la formule (« Sérénité, mensuel sans
// engagement »). L'app met tout le libellé en minuscules (« avec pms ») : ici, le sigle reste « PMS ».
const NOMS_VERSIONS = {
  mensuel: "mensuel sans engagement",
  mensuel_engage: "mensuel, engagement 12 mois, avec PMS",
  annuel: "annuel, payé d’avance",
};
// STATUT_INFO de l'app, à l'identique.
export const LIBELLES_STATUT = {
  sans_abonnement: "Sans abonnement",
  en_attente_paiement: "Pas encore souscrit",
  activation_provisoire: "Prélèvement SEPA en cours",
  actif: "Actif",
  impaye: "Paiement à régulariser",
  resilie: "Résilié",
};
const EN_COURS = ["actif", "impaye", "activation_provisoire"];

const valeurDe = (table, cle) => (Object.hasOwn(table, cle) ? table[cle] : null);
const date = (v) => formatDate(texte(v)) || null;
// Instant d'une date du contrat, ou null si absente ou illisible (parseBillingInstant de l'app).
const instant = (v) => {
  const t = Date.parse(texte(v));
  return Number.isFinite(t) ? t : null;
};

// Date d'effet d'une résiliation, avant confirmation : la plus tardive entre la fin de la période payée et la fin
// d'engagement (mensuel engagé). Une date illisible est ignorée ; null si aucune n'est lisible.
// dates.resiliationEffectiveDate de l'app.
export function dateEffetResiliation(periodeFin, engagementFin) {
  const fin = instant(periodeFin);
  const engagement = instant(engagementFin);
  if (fin === null && engagement === null) return null;
  if (fin === null) return texte(engagementFin);
  if (engagement === null) return texte(periodeFin);
  return engagement > fin ? texte(engagementFin) : texte(periodeFin);
}

// L'accès est-il complet aujourd'hui, et le reste-t-il jusqu'à la date d'effet `effetLe` (celle affichée) ? Règle
// resiliationAccesComplet de l'app. Actif et activation provisoire : oui. Impayé : l'app regarde aussi ses droits
// (mode complet), que le site n'a pas ; il ne promet donc l'accès complet que si le délai de grâce (graceJusquau) est
// encore à venir ET court au moins jusqu'à la date d'effet. D'ordinaire il finit bien avant, et le restaurant passe en
// lecture seule entre les deux. Fin de grâce ou date d'effet inconnue ou illisible, autre statut : rien n'est promis.
export function accesCompletJusquA(compte, effetLe, maintenant = Date.now()) {
  const statut = compte?.statut;
  if (statut === "actif" || statut === "activation_provisoire") return true;
  if (statut !== "impaye") return false;
  const finGrace = instant(compte?.graceJusquau);
  const effet = instant(effetLe);
  return finGrace !== null && effet !== null && finGrace > maintenant && finGrace >= effet;
}

// Phrase commune avant la date d'effet (confirmation et résiliation programmée) : RESILIATION_ACCES_TEXT si l'accès
// reste complet jusqu'à cette date, sinon RESILIATION_ANNULABLE_TEXT (rien de promis sur l'accès).
export const TEXTE_RESILIATION_ACCES = "Jusqu’à cette date, l’accès reste complet et vous pouvez annuler la résiliation.";
export const TEXTE_RESILIATION_ANNULABLE = "Jusqu’à cette date, vous pouvez annuler la résiliation.";
export const TEXTE_RESILIATION_ANNULEE = "Résiliation annulée : l’abonnement continue.";
export const LIBELLE_GARDER_ABONNEMENT = "Garder l’abonnement";

// Résiliation, avant confirmation (resiliationConfirmText de l'app) : date d'effet, accès complet seulement s'il
// l'est, puis les 2 mois de lecture seule avec l'export de sortie, et la suppression (CGV 10.1 et 12).
// conservation : false retire cette dernière phrase, quand rien ne garantit qu'un contrat a été formé (voir
// conservationPromise dans resumeCompte) ; l'app n'a pas ce cas, elle retire alors le bouton.
export function texteConfirmationResiliation(effetLe, accesComplet, conservation = true) {
  const jour = date(effetLe);
  const fin = jour ? `Votre abonnement prendra fin le ${jour}.` : "Votre abonnement prendra fin à la fin de la période en cours.";
  const acces = accesComplet ? TEXTE_RESILIATION_ACCES : TEXTE_RESILIATION_ANNULABLE;
  if (!conservation) return `${fin} ${acces}`;
  return `${fin} ${acces} Ensuite, vos données restent consultables en lecture seule pendant 2 mois, avec l’export de sortie de toutes vos données, puis elles sont supprimées.`;
}

// Résiliation programmée, rappelée en tête de page (resiliationProgrammeeText de l'app).
export function texteResiliationProgrammee(effetLe, accesComplet) {
  const jour = date(effetLe);
  if (jour) return `L’abonnement prend fin le ${jour}. ${accesComplet ? TEXTE_RESILIATION_ACCES : TEXTE_RESILIATION_ANNULABLE}`;
  return accesComplet
    ? "L’abonnement prend fin à la fin de la période en cours. Jusque-là, l’accès reste complet et vous pouvez annuler la résiliation."
    : "L’abonnement prend fin à la fin de la période en cours. Jusque-là, vous pouvez annuler la résiliation.";
}

// Message après la résiliation (resiliationDoneText de l'app) : la date rendue par le serveur, sinon celle annoncée.
export function texteResiliationEnregistree(effetLe) {
  const jour = date(effetLe);
  return jour ? `Résiliation enregistrée : l’abonnement prend fin le ${jour}.` : "Résiliation enregistrée.";
}

// Accès offert (accesOffert de GET /compte : { offre, version?, jusquau, motif }), ligne de l'app
// (SubscriptionSummary.tsx) : « Sérénité, jusqu’au 1er mars 2027 », ou « Sérénité, sans fin » (jusquau null). Formule
// inconnue : rien, comme la lecture de l'app. Date présente mais illisible : la formule seule, sans rien promettre.
function lireAccesOffert(brut) {
  const nom = estObjet(brut) ? valeurDe(NOMS_OFFRES, texte(brut.offre)) : null;
  if (!nom) return null;
  if (brut.jusquau === null || brut.jusquau === undefined) return { texte: `${nom}, sans fin`, fin: null };
  const jour = date(brut.jusquau);
  return jour ? { texte: `${nom}, jusqu’au ${jour}`, fin: instant(brut.jusquau) } : { texte: nom, fin: null };
}

// Lignes, bandeaux et actions de l'accueil de l'espace. maintenant : pour dire si une date est encore à venir.
export function resumeCompte(compte, maintenant = Date.now()) {
  const statut = compte?.statut;
  const enCours = EN_COURS.includes(statut);
  const avantPremierPaiement = statut === "sans_abonnement" || statut === "en_attente_paiement";
  const offre = valeurDe(NOMS_OFFRES, texte(compte?.offre)) ?? (texte(compte?.offre) || null);
  const version = valeurDe(NOMS_VERSIONS, texte(compte?.version));
  const montant = Number.isFinite(compte?.montantPeriodiqueHTCentimes) && compte.montantPeriodiqueHTCentimes > 0
    ? formatHTParPeriode(compte.montantPeriodiqueHTCentimes, compte.version === "annuel" ? "an" : "mois")
    : null;
  // Résiliation programmée dès que GET /compte en donne une (resiliation: { effetLe } ; effetLe peut être null),
  // abonnement en cours : comme resiliationGeste de l'app, avec ou sans date lisible, même passée (webhook en retard,
  // état transitoire). Sinon le site proposerait « Résilier » (409, relecture, même écran) et jamais l'annulation.
  const resiliation = estObjet(compte?.resiliation) ? compte.resiliation : null;
  const resiliationProgrammee = resiliation !== null && enCours;
  // Date de la résiliation rendue par billing, si elle est lisible.
  const effetServeur = resiliation && instant(resiliation.effetLe) !== null ? texte(resiliation.effetLe) : null;
  // Date d'effet affichée : celle de la résiliation programmée, sinon celle qu'elle aurait (effetAffiche de l'app).
  const effetResiliation =
    (resiliationProgrammee && effetServeur) || dateEffetResiliation(compte?.periodeFin, compte?.engagementFin);
  const accesComplet = accesCompletJusquA(compte, effetResiliation, maintenant);
  // Après la fin : 2 mois de lecture seule et l'export de sortie (CGV 10.1 et 12), seulement si un contrat a été formé.
  // Premier prélèvement refusé : statut impaye, aucun contrat (CGV 11.3), ni consultation ni export ; l'app retire alors
  // « Résilier » (motif paiement_initial_echoue de ses droits), que GET /compte ne donne pas encore (motifLectureSeule,
  // après le 15/11). D'ici là, en impayé sans fin de grâce lisible (graceJusquau null : cas du premier prélèvement
  // refusé dans la maquette de l'app, scenarios.ts sepa_echoue ; à faire confirmer par billing), la confirmation ne
  // promet rien après la fin. Si billing donnait une fin de grâce dans ce cas, la phrase resterait fausse jusqu'au champ.
  const conservationPromise = !(statut === "impaye" && instant(compte?.graceJusquau) === null);
  // Seul billing décide : l'export de sortie n'est servi qu'après la fin de l'accès, pendant la conservation.
  const exportDisponible = compte?.exportSortieDisponible === true;
  const offert = lireAccesOffert(compte?.accesOffert);
  // Fin d'un abonnement comme d'un accès offert (CGV 12) : dite quel que soit le statut, comme l'app.
  const suppression = date(compte?.suppressionPrevueLe);

  const lignes = [
    ["Statut", LIBELLES_STATUT[statut] ?? "Inconnu"],
    offre && ["Formule", version ? `${offre}, ${version}` : offre],
    montant && ["Montant", montant],
    // Pas d'échéance dès qu'une résiliation existe (SubscriptionSummary.tsx).
    // Échéance : seulement pour un abonnement en cours (billing ne renseigne periodeFin que dans ce cas).
    enCours && !resiliation && date(compte?.periodeFin) && ["Prochaine échéance", date(compte.periodeFin)],
    date(compte?.engagementFin) && ["Fin d’engagement", date(compte.engagementFin)],
    offert && ["Accès offert", offert.texte],
    // La date rendue par billing, sinon « en fin de période », comme la ligne « Résiliation programmée » de l'app.
    resiliationProgrammee && ["Fin de l’abonnement", date(effetServeur) ?? "en fin de période"],
    suppression && ["Suppression des données", suppression],
    compte?.titulaire?.nom && ["Titulaire", compte.titulaire.email ? `${compte.titulaire.nom} (${compte.titulaire.email})` : compte.titulaire.nom],
  ].filter(Boolean);

  const bandeaux = [];
  if (statut === "impaye") {
    // Fin de grâce citée seulement si elle est encore à venir : passée, le futur serait faux, et le site ne sait pas si
    // l'application est en lecture seule ou suspendue (premier prélèvement refusé). Comme l'app (accessScreens.ts),
    // aucune date hors du délai de grâce.
    const finGrace = instant(compte?.graceJusquau);
    const limite = finGrace !== null && finGrace > maintenant ? date(compte.graceJusquau) : null;
    bandeaux.push({
      cle: "impaye",
      type: "error",
      texte: `Un paiement n’a pas abouti.${limite ? ` Sans régularisation, l’application passera en lecture seule le ${limite}.` : ""} Mettez à jour votre moyen de paiement ou réglez la facture depuis « Factures et moyen de paiement ».`,
    });
  }
  if (statut === "activation_provisoire")
    bandeaux.push({ cle: "provisoire", type: "info", texte: "Votre premier prélèvement est en cours. L’accès à l’application est ouvert en attendant sa confirmation." });
  if (resiliationProgrammee)
    bandeaux.push({ cle: "resiliation", type: "info", texte: texteResiliationProgrammee(effetResiliation, accesComplet) });
  if (statut === "resilie") {
    // Lecture seule de fin de contrat (accessScreens.ts, readOnlyMotifText) : dite seulement pendant la conservation,
    // que billing signale par l'export de sortie disponible. Sans lui (premier prélèvement refusé, CGV 11.3, par
    // exemple), rien n'est promis.
    bandeaux.push({
      cle: "termine",
      type: "info",
      texte: suppression && exportDisponible
        ? `Accès en lecture seule : abonnement terminé, données consultables jusqu’au ${suppression}.`
        : "Votre abonnement est terminé.",
    });
  }
  // Fin prochaine d'un accès offert, sans abonnement en cours (phrase permise par les magasins, mot pour mot).
  if ((offert?.fin ?? 0) > maintenant && !enCours)
    bandeaux.push({ cle: "fin_acces_offert", type: "info", texte: `L’accès offert se termine le ${date(compte.accesOffert.jusquau)}.` });
  if (avantPremierPaiement) bandeaux.push({ cle: "sans", type: "info", texte: TEXTE_SANS_ABONNEMENT });
  if (suppression) {
    bandeaux.push({
      cle: "suppression",
      type: "info",
      texte: exportDisponible
        ? `Les données de l’établissement seront supprimées le ${suppression} : téléchargez l’export complet avant cette date.`
        : `Les données de l’établissement seront supprimées le ${suppression}.`,
    });
  } else if (exportDisponible) {
    bandeaux.push({ cle: "export", type: "info", texte: "Vous pouvez télécharger ci-dessous l’export complet des données de l’établissement." });
  }

  return {
    lignes,
    bandeaux,
    actions: {
      portail: enCours || statut === "resilie",
      // Impayé : « Résilier » reste proposé, sans promesse d'accès au-delà du délai de grâce (accesCompletJusquA), ni,
      // sans fin de grâce lisible, de lecture seule et d'export après la fin (conservationPromise).
      // L'app le retire après l'échec du premier prélèvement (motif paiement_initial_echoue de ses droits : contrat
      // non formé, CGV 11.3), mais GET /compte ne donne pas encore ce motif : il arrive après le 15/11 (champ
      // motifLectureSeule). À reprendre alors : ni « Résilier » ni texte de résiliation dans ce cas.
      resilier: enCours && !resiliationProgrammee,
      annulerResiliation: resiliationProgrammee,
      export: exportDisponible,
      // À la place du bouton, TEXTE_EXPORT_A_LA_FIN, pour un abonnement actif seulement (résiliation programmée
      // comprise). En impayé ou en accès provisoire, le site ne sait pas si un premier prélèvement a été refusé : dans
      // ce cas, aucun abonnement n'est conclu et il n'y aura ni export ni consultation (CGV 11.3). Rien n'est promis.
      exportALaFin: !exportDisponible && statut === "actif",
      // TEXTE_CONTACT_SOUSCRIRE avant le premier paiement : la souscription d'un établissement existant passe par le support.
      souscrire: avantPremierPaiement,
      // TEXTE_CONTACT_FORMULE : formule et comptes, après le premier paiement (siteAbonnementView de l'app).
      contactFormule: Boolean(statut) && !avantPremierPaiement,
    },
    // Date d'effet affichée, accès complet ou non jusque-là, et texte d'avant confirmation.
    resiliation: {
      effetLe: effetResiliation,
      accesComplet,
      confirmation: texteConfirmationResiliation(effetResiliation, accesComplet, conservationPromise),
    },
  };
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
