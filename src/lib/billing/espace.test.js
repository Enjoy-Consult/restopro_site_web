// Tests de l'espace abonnement (compte.restoclair.fr) : `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import { adresseSite } from "../../compte/liens.js";
import { passagesInterdits } from "../../../scripts/textes-magasins.mjs";
import { ApiError } from "./errors.js";
import { MESSAGE_INDISPONIBLE, MESSAGE_REFUS_GENERIQUE, MESSAGE_TROP_D_ESSAIS } from "./erreurs.js";
import {
  CHEMIN_SOUSCRIRE, DEBUT_CONTACT_FORMULE, LIBELLE_GARDER_ABONNEMENT, LIBELLE_SOUSCRIRE, LIBELLES_STATUT,
  TEXTE_CONTACT_FORMULE, TEXTE_DEMANDE_NON_APPLIQUEE, TEXTE_EXPORT_A_LA_FIN, TEXTE_MOT_DE_PASSE_INCORRECT,
  TEXTE_NON_TITULAIRE, TEXTE_PORTEE_INSUFFISANTE, TEXTE_REPONSE_PERDUE, TEXTE_RESILIATION_ACCES, TEXTE_RESILIATION_ANNULABLE,
  TEXTE_RESILIATION_ANNULEE, TEXTE_SANS_ABONNEMENT,
  TEXTE_TRANSFERT_RECU, DUREE_SESSION_MS, accesCompletJusquA, cheminDeRetourAdmis, dateEffetResiliation, echeanceLocale,
  estMotDePasseRefuse, estSessionFinie, issueConnexion, issueConnexionReussie, issueResiliation, lireConnexion,
  messageRefusEspace, nomFichierExport, resumeCompte, sessionValable, texteConfirmationResiliation,
  texteResiliationEnregistree, texteResiliationProgrammee, urlPortail,
} from "./espace.js";
import { formatDate } from "./format.js";
import { mockEspace } from "./mock-espace.js";

const MAINTENANT = Date.parse("2026-11-12T10:00:00Z");
const jours = (n) => new Date(MAINTENANT + n * 86400000).toISOString();

test("connexion : lecture tolérante, restaurants sans identifiant écartés, jeton obligatoire", () => {
  const c = lireConnexion({ data: { token: " t ", expireLe: "2026-11-12T12:00:00Z", compte: { email: "a@b.fr" }, restaurants: [
    { restaurantId: "r1", nom: "Chez Marie", estTitulaire: true, statut: "actif" }, { nom: "sans id" }, "x", { id: 7, estTitulaire: "true" },
  ] } });
  assert.equal(c.token, "t");
  assert.deepEqual(c.restaurants.map((r) => [r.restaurantId, r.estTitulaire]), [["r1", true], ["7", false]]);
  assert.equal(c.compte.email, "a@b.fr");
  assert.throws(() => lireConnexion({ restaurants: [] }), (e) => e.code === "CONNEXION_ILLISIBLE");
});

test("seul le titulaire entre ; destinataire d'un transfert et gestionnaire sont refusés", () => {
  const r = (estTitulaire, transfertRecu = false) => ({ restaurantId: "r", nom: "R", estTitulaire, transfertRecu });
  assert.equal(issueConnexionReussie({ restaurants: [r(false), r(true)] }).restaurants.length, 1);
  assert.deepEqual(issueConnexionReussie({ restaurants: [r(false, true)] }), { type: "refus", texte: TEXTE_TRANSFERT_RECU });
  assert.deepEqual(issueConnexionReussie({ restaurants: [r(false)] }), { type: "refus", texte: TEXTE_NON_TITULAIRE });
  assert.deepEqual(issueConnexionReussie({ restaurants: [] }), { type: "refus", texte: TEXTE_NON_TITULAIRE });
});

test("échec de connexion : 401 uniforme, motifs de CONNEXION_NON_ADMISE, 429 avec délai, panne", () => {
  assert.match(issueConnexion(new ApiError("IDENTIFIANTS_INVALIDES", 401)).texte, /incorrect/);
  const motif = (m) => issueConnexion(new ApiError("CONNEXION_NON_ADMISE", 403, m === undefined ? null : { motif: m }));
  assert.equal(motif("compte_temporaire").motDePasse, true);
  assert.match(motif("desactive").texte, /désactivé/);
  assert.match(motif("sursis").texte, /suspendu/);
  assert.match(motif("role").texte, /titulaire/);
  assert.match(motif("aucun_restaurant").texte, /Aucun établissement/);
  for (const inconnu of ["autre", "", undefined, "__proto__", "constructor"]) assert.match(motif(inconnu).texte, /ne permet pas de gérer l’abonnement ici/, String(inconnu));
  assert.match(issueConnexion(new ApiError("X", 429, null, 30000)).texte, /30 secondes/);
  assert.equal(issueConnexion(new ApiError("RESEAU")).telephone, true);
});

test("session : 401 finit la session ; PORTEE_INSUFFISANTE jamais ; mot de passe refusé n'est pas une fin de session", () => {
  assert.equal(estSessionFinie(new ApiError("TOKEN_EXPIRED", 401)), true);
  assert.equal(estSessionFinie(new ApiError("PORTEE_INSUFFISANTE", 403)), false);
  assert.equal(messageRefusEspace(new ApiError("PORTEE_INSUFFISANTE", 403)), TEXTE_PORTEE_INSUFFISANTE);
  assert.equal(estMotDePasseRefuse(new ApiError("MOT_DE_PASSE_INVALIDE", 403)), true);
  assert.equal(estMotDePasseRefuse(new ApiError("MOT_DE_PASSE_REQUIS", 403)), true);
  assert.equal(estMotDePasseRefuse(new ApiError("MOT_DE_PASSE_INCORRECT", 403)), false);
  assert.equal(estMotDePasseRefuse(new ApiError("IDENTIFIANTS_INVALIDES", 401)), false);
  assert.equal(sessionValable({ token: "t", echeance: MAINTENANT + 1000 }, MAINTENANT), true);
  assert.equal(sessionValable({ token: "t", echeance: MAINTENANT - 1 }, MAINTENANT), false);
  assert.equal(sessionValable({ token: "t", expireLe: jours(1) }, MAINTENANT), false, "ancienne forme sans échéance locale");
  assert.equal(sessionValable({ echeance: MAINTENANT + 1000 }, MAINTENANT), false);
});

test("retour après connexion : seulement un chemin de l'espace", () => {
  assert.equal(cheminDeRetourAdmis("/mon-abonnement"), "/mon-abonnement");
  assert.equal(cheminDeRetourAdmis("/mon-abonnement?paiement=annule"), "/mon-abonnement?paiement=annule");
  for (const refuse of ["//evil.fr", "https://evil.fr/mon-abonnement", "/mon-abonnement//x", "/connexion", "/mon-abonnementx", null]) {
    assert.equal(cheminDeRetourAdmis(refuse), null, String(refuse));
  }
});

test("accueil : actions selon le statut, résiliation programmée, sans abonnement", () => {
  const actif = resumeCompte({ statut: "actif", offre: "serenite", version: "mensuel", montantPeriodiqueHTCentimes: 4900, periodeFin: jours(10) }, MAINTENANT);
  assert.deepEqual(actif.actions, { portail: true, resilier: true, annulerResiliation: false, export: false, exportALaFin: true, souscrire: false, contactFormule: true });
  assert.deepEqual(actif.lignes[1], ["Formule", "Sérénité, mensuel sans engagement"]);
  const programmee = resumeCompte({ statut: "actif", resiliation: { effetLe: jours(10) } }, MAINTENANT);
  assert.equal(programmee.actions.resilier, false);
  assert.equal(programmee.actions.annulerResiliation, true);
  assert.match(programmee.bandeaux[0].texte, /^L’abonnement prend fin le .+\. Jusqu’à cette date, l’accès reste complet/);
  // Date d'effet déjà passée, statut encore actif (webhook en retard, état transitoire) : toujours programmée, comme
  // resiliationGeste de l'app ; jamais « Résilier » (409 et relecture en boucle).
  const passee = resumeCompte({ statut: "actif", resiliation: { effetLe: jours(-1) } }, MAINTENANT);
  assert.deepEqual([passee.actions.resilier, passee.actions.annulerResiliation], [false, true]);
  const sans = resumeCompte({ statut: "sans_abonnement" }, MAINTENANT);
  assert.deepEqual(sans.actions, { portail: false, resilier: false, annulerResiliation: false, export: false, exportALaFin: false, souscrire: true, contactFormule: false });
  assert.equal(sans.bandeaux[0].texte, TEXTE_SANS_ABONNEMENT);
  const termine = resumeCompte({ statut: "resilie", suppressionPrevueLe: jours(40), exportSortieDisponible: true }, MAINTENANT);
  assert.equal(termine.actions.export, true);
  assert.equal(termine.actions.resilier, false);
  assert.match(resumeCompte({ statut: "impaye", graceJusquau: jours(3) }, MAINTENANT).bandeaux[0].texte, /lecture seule/);
});

// Essai de billing du 10/11 sur 4304 : le bouton s'affichait sur un abonnement actif, et billing répondait 403 (l'export
// de sortie n'est servi qu'après la fin de l'accès). Le bouton suit exportSortieDisponible, et lui seul.
test("export : bouton seulement si exportSortieDisponible vaut true ; sinon, abonnement actif, la phrase neutre", () => {
  const actions = (compte) => resumeCompte(compte, MAINTENANT).actions;
  const paire = (compte) => [actions(compte).export, actions(compte).exportALaFin];
  for (const drapeau of [false, undefined, null, "true", 1]) {
    assert.deepEqual(paire({ statut: "actif", exportSortieDisponible: drapeau }), [false, true], `actif ${drapeau}`);
    // Impayé ou accès provisoire : peut-être un premier prélèvement refusé (ni abonnement, ni export) : aucune promesse.
    for (const statut of ["impaye", "activation_provisoire"]) assert.deepEqual(paire({ statut, exportSortieDisponible: drapeau }), [false, false], `${statut} ${drapeau}`);
  }
  for (const statut of ["actif", "impaye", "activation_provisoire"]) assert.deepEqual(paire({ statut, exportSortieDisponible: true }), [true, false], statut);
  // Résiliation programmée : l'abonnement court encore, l'export viendra à la fin.
  assert.equal(actions({ statut: "actif", resiliation: { effetLe: jours(10) } }).exportALaFin, true);
  // Terminé : bouton si billing le sert ; sinon ni bouton, ni promesse, ni consigne de téléchargement.
  const termine = (exportSortieDisponible, suppressionPrevueLe = "2027-01-01T00:00:00Z") => resumeCompte({ statut: "resilie", suppressionPrevueLe, exportSortieDisponible }, MAINTENANT);
  const textes = (resume) => resume.bandeaux.map((b) => b.texte);
  // Conservation (export servi) : lecture seule jusqu'à la suppression, comme l'app ; puis la date de suppression.
  assert.deepEqual(textes(termine(true)), [
    "Accès en lecture seule : abonnement terminé, données consultables jusqu’au 1er janvier 2027.",
    "Les données de l’établissement seront supprimées le 1er janvier 2027 : téléchargez l’export complet avant cette date.",
  ]);
  assert.deepEqual([termine(false).actions.export, termine(false).actions.exportALaFin], [false, false]);
  // Sans export servi : ni lecture seule promise, ni consigne de téléchargement.
  assert.deepEqual(textes(termine(false)), ["Votre abonnement est terminé.", "Les données de l’établissement seront supprimées le 1er janvier 2027."]);
  assert.deepEqual(textes(termine(true, null)), ["Votre abonnement est terminé.", "Vous pouvez télécharger ci-dessous l’export complet des données de l’établissement."]);
  assert.deepEqual(textes(termine(false, null)), ["Votre abonnement est terminé."]);
  // Sans abonnement : rien sur l'export.
  for (const statut of ["sans_abonnement", "en_attente_paiement", undefined]) {
    assert.deepEqual([actions({ statut }).export, actions({ statut }).exportALaFin], [false, false], String(statut));
  }
  assert.equal(TEXTE_EXPORT_A_LA_FIN, "L’export complet sera disponible ici à la fin de votre abonnement. Pendant l’abonnement, vos données s’exportent depuis l’application.");
});

// La maquette suit billing : sinon, elle masque le défaut (elle donnait l'export disponible sur un abonnement actif).
test("maquette de l'espace : export seulement à la fin de l'accès, refusé en 403 avant", async () => {
  const connexion = (email) => mockEspace("POST", "/api/billing/connexion", { corps: { email, motDePasse: "Essai123" } });
  for (const email of ["marie@exemple.fr", "impaye@exemple.fr", "sepa@exemple.fr", "resiliation@exemple.fr"]) {
    const { token, restaurants } = await connexion(email);
    const id = restaurants[0].restaurantId;
    const compte = await mockEspace("GET", `/api/billing/compte?restaurantId=${id}`, { token });
    assert.equal(compte.exportSortieDisponible, false, email);
    await assert.rejects(mockEspace("GET", `/api/billing/export-sortie?restaurantId=${id}`, { token }), (e) => e.status === 403, email);
  }
  const { token, restaurants } = await connexion("resilie@exemple.fr");
  const id = restaurants[0].restaurantId;
  assert.equal((await mockEspace("GET", `/api/billing/compte?restaurantId=${id}`, { token })).exportSortieDisponible, true);
  const fichier = await mockEspace("GET", `/api/billing/export-sortie?restaurantId=${id}`, { token });
  assert.equal(fichier.type, "application/zip");
});

test("prochaine échéance : seulement pour un abonnement en cours", () => {
  const lignes = (statut) => resumeCompte({ statut, periodeFin: jours(18) }, MAINTENANT).lignes.map(([terme]) => terme);
  for (const statut of ["actif", "impaye", "activation_provisoire"]) assert.ok(lignes(statut).includes("Prochaine échéance"), statut);
  for (const statut of ["sans_abonnement", "en_attente_paiement", "resilie"]) assert.ok(!lignes(statut).includes("Prochaine échéance"), statut);
});

test("échéance locale : durée restante bornée à 2 h, 2 h si expireLe est illisible ou passé (horloge en avance)", () => {
  assert.equal(echeanceLocale(new Date(MAINTENANT + 3600000).toISOString(), MAINTENANT), MAINTENANT + 3600000);
  assert.equal(echeanceLocale(new Date(MAINTENANT + 5 * 3600000).toISOString(), MAINTENANT), MAINTENANT + DUREE_SESSION_MS);
  assert.equal(echeanceLocale(new Date(MAINTENANT - 300000).toISOString(), MAINTENANT), MAINTENANT + DUREE_SESSION_MS);
  for (const illisible of [null, undefined, "", "demain", 1234]) assert.equal(echeanceLocale(illisible, MAINTENANT), MAINTENANT + DUREE_SESSION_MS);
});

test("refus de l'espace : un 4xx n'est pas une panne", () => {
  assert.match(messageRefusEspace(new ApiError("NON_TITULAIRE", 403)), /n’est pas possible/);
  assert.match(messageRefusEspace(new ApiError("RESILIATION_DEJA_PROGRAMMEE", 409)), /n’est pas possible/);
  assert.match(messageRefusEspace(new ApiError("RESEAU")), /momentanément indisponible/);
  assert.match(messageRefusEspace(new ApiError("X", 503)), /momentanément indisponible/);
});

test("export : nom de fichier propre à l'établissement, en lettres simples", () => {
  assert.equal(nomFichierExport("Chez Marie"), "export-restoclair-chez-marie.zip");
  assert.equal(nomFichierExport("Le Bistrot d’Élise & Cie"), "export-restoclair-le-bistrot-d-elise-cie.zip");
  assert.equal(nomFichierExport("../../etc"), "export-restoclair-etc.zip");
  assert.equal(nomFichierExport(""), "export-restoclair.zip");
  assert.equal(nomFichierExport(null), "export-restoclair.zip");
});

test("portail : https://billing.stripe.com seulement, ou la même origine en maquette", () => {
  assert.equal(urlPortail("https://billing.stripe.com/p/session/x"), "https://billing.stripe.com/p/session/x");
  assert.equal(urlPortail("https://evil.example/p/session/x"), null);
  assert.equal(urlPortail("https://billing.stripe.com.evil.example/x"), null);
  assert.equal(urlPortail("https://user:pw@billing.stripe.com/x"), null);
  assert.equal(urlPortail("http://billing.stripe.com/x"), null);
  assert.equal(urlPortail("javascript:alert(1)"), null);
  assert.equal(urlPortail("/relatif"), null);
  assert.equal(urlPortail("http://localhost:5182/mon-abonnement?maquette=portail", "http://localhost:5182"), "http://localhost:5182/mon-abonnement?maquette=portail");
});

// --- Relecture du front du 10/11 (A1 à A6, A16, C1 à C3, C10) : règles et textes de l'app (release-180). ---

const ligne = (resume, terme) => resume.lignes.find(([t]) => t === terme)?.[1];
const texteComplet = (resume) => [...resume.lignes.flat(), ...resume.bandeaux.map((b) => b.texte), resume.resiliation.confirmation].join("\n");

test("libellés : statuts de l'app (STATUT_INFO) à l'identique, « Fin d’engagement », versions de l'app (VERSION_LABELS)", () => {
  assert.deepEqual(LIBELLES_STATUT, {
    sans_abonnement: "Sans abonnement",
    en_attente_paiement: "Pas encore souscrit",
    activation_provisoire: "Prélèvement SEPA en cours",
    actif: "Actif",
    impaye: "Paiement à régulariser",
    resilie: "Résilié",
  });
  for (const [statut, libelle] of Object.entries(LIBELLES_STATUT)) assert.equal(ligne(resumeCompte({ statut }, MAINTENANT), "Statut"), libelle, statut);
  const formule = (version) => ligne(resumeCompte({ statut: "actif", offre: "serenite", version }, MAINTENANT), "Formule");
  assert.equal(formule("mensuel"), "Sérénité, mensuel sans engagement");
  assert.equal(formule("annuel"), "Sérénité, annuel, payé d’avance");
  assert.equal(formule("mensuel_engage"), "Sérénité, mensuel, engagement 12 mois, avec PMS");
  for (const inconnue of [undefined, "trimestriel", "constructor", "__proto__"]) assert.equal(formule(inconnue), "Sérénité", String(inconnue));
  const engage = resumeCompte({ statut: "actif", engagementFin: "2027-06-01T00:00:00Z" }, MAINTENANT);
  assert.equal(ligne(engage, "Fin d’engagement"), "1er juin 2027");
  assert.equal(ligne(resumeCompte({ statut: "actif" }, MAINTENANT), "Fin d’engagement"), undefined);
});

test("dates : « 1er » le premier du mois, en heure de Paris, comme formatBillingDate de l'app", () => {
  assert.equal(formatDate("2026-12-01T00:00:00Z"), "1er décembre 2026");
  assert.equal(formatDate("2026-11-30T23:30:00Z"), "1er décembre 2026", "déjà le 1er à Paris");
  assert.equal(formatDate("2026-12-11T00:00:00Z"), "11 décembre 2026");
  assert.equal(formatDate("2026-12-21T00:00:00Z"), "21 décembre 2026");
  assert.equal(formatDate("2026-12-15T00:00:00Z"), "15 décembre 2026");
  assert.equal(formatDate("illisible"), "");
  assert.equal(ligne(resumeCompte({ statut: "actif", periodeFin: "2026-12-01T00:00:00Z" }, MAINTENANT), "Prochaine échéance"), "1er décembre 2026");
  assert.equal(texteResiliationEnregistree("2026-12-01T00:00:00Z"), "Résiliation enregistrée : l’abonnement prend fin le 1er décembre 2026.");
});

test("date d'effet de la résiliation : la plus tardive entre fin de période et fin d'engagement (resiliationEffectiveDate)", () => {
  assert.equal(dateEffetResiliation("2026-12-01T00:00:00Z", null), "2026-12-01T00:00:00Z");
  assert.equal(dateEffetResiliation(null, "2027-06-01T00:00:00Z"), "2027-06-01T00:00:00Z");
  assert.equal(dateEffetResiliation("2026-12-01T00:00:00Z", "2027-06-01T00:00:00Z"), "2027-06-01T00:00:00Z");
  assert.equal(dateEffetResiliation("2027-07-01T00:00:00Z", "2027-06-01T00:00:00Z"), "2027-07-01T00:00:00Z");
  assert.equal(dateEffetResiliation("2026-12-01T00:00:00Z", "2026-12-01T00:00:00Z"), "2026-12-01T00:00:00Z");
  assert.equal(dateEffetResiliation("illisible", "2027-06-01T00:00:00Z"), "2027-06-01T00:00:00Z");
  assert.equal(dateEffetResiliation("2026-12-01T00:00:00Z", "illisible"), "2026-12-01T00:00:00Z");
  for (const [a, b] of [[null, null], [undefined, undefined], ["", "x"], [42, {}]]) assert.equal(dateEffetResiliation(a, b), null);
  // Mensuel engagé : la confirmation annonce la fin d'engagement ; sans engagement, la fin de période, et pas un mot d'engagement.
  const engage = resumeCompte({ statut: "actif", periodeFin: "2026-12-01T00:00:00Z", engagementFin: "2027-06-01T00:00:00Z" }, MAINTENANT);
  assert.equal(engage.resiliation.effetLe, "2027-06-01T00:00:00Z");
  assert.match(engage.resiliation.confirmation, /^Votre abonnement prendra fin le 1er juin 2027\. /);
  const mensuel = resumeCompte({ statut: "actif", periodeFin: "2026-12-01T00:00:00Z" }, MAINTENANT);
  assert.match(mensuel.resiliation.confirmation, /^Votre abonnement prendra fin le 1er décembre 2026\. /);
  assert.doesNotMatch(mensuel.resiliation.confirmation, /engagement/);
  // Résiliation programmée : la date du serveur.
  const programmee = resumeCompte({ statut: "actif", periodeFin: "2026-12-01T00:00:00Z", resiliation: { effetLe: "2026-12-15T00:00:00Z" } }, MAINTENANT);
  assert.equal(programmee.resiliation.effetLe, "2026-12-15T00:00:00Z");
});

test("accès complet jusqu'à la date d'effet (resiliationAccesComplet) : impayé seulement si la grâce, à venir, la couvre", () => {
  const effet = "2026-12-01T00:00:00Z";
  assert.equal(accesCompletJusquA({ statut: "actif" }, effet, MAINTENANT), true);
  assert.equal(accesCompletJusquA({ statut: "activation_provisoire" }, null, MAINTENANT), true);
  const impaye = (graceJusquau, effetLe = effet) => accesCompletJusquA({ statut: "impaye", graceJusquau }, effetLe, MAINTENANT);
  assert.equal(impaye("2026-12-05T00:00:00Z"), true, "grâce à venir, au-delà de la date d'effet");
  assert.equal(impaye(effet), true, "grâce jusqu'à la date d'effet même");
  assert.equal(impaye("2026-11-20T00:00:00Z"), false, "grâce qui finit avant : lecture seule entre les deux");
  assert.equal(impaye(jours(-1), jours(-2)), false, "grâce déjà passée");
  for (const illisible of [null, undefined, "", "demain"]) {
    assert.equal(impaye(illisible), false, `grâce ${illisible}`);
    assert.equal(accesCompletJusquA({ statut: "impaye", graceJusquau: "2026-12-05T00:00:00Z" }, illisible, MAINTENANT), false, `effet ${illisible}`);
  }
  for (const statut of ["resilie", "sans_abonnement", "en_attente_paiement", undefined]) assert.equal(accesCompletJusquA({ statut }, effet, MAINTENANT), false, String(statut));
});

test("résiliation : textes de l'app mot pour mot (confirmation, programmée, enregistrée, annulée, « Garder l’abonnement »)", () => {
  const suite = "Ensuite, vos données restent consultables en lecture seule pendant 2 mois, avec l’export de sortie de toutes vos données, puis elles sont supprimées.";
  assert.equal(TEXTE_RESILIATION_ACCES, "Jusqu’à cette date, l’accès reste complet et vous pouvez annuler la résiliation.");
  assert.equal(TEXTE_RESILIATION_ANNULABLE, "Jusqu’à cette date, vous pouvez annuler la résiliation.");
  assert.equal(texteConfirmationResiliation("2026-12-01T00:00:00Z", true), `Votre abonnement prendra fin le 1er décembre 2026. ${TEXTE_RESILIATION_ACCES} ${suite}`);
  assert.equal(texteConfirmationResiliation("2026-12-01T00:00:00Z", false), `Votre abonnement prendra fin le 1er décembre 2026. ${TEXTE_RESILIATION_ANNULABLE} ${suite}`);
  assert.equal(texteConfirmationResiliation(null, true), `Votre abonnement prendra fin à la fin de la période en cours. ${TEXTE_RESILIATION_ACCES} ${suite}`);
  assert.equal(texteConfirmationResiliation(null, false), `Votre abonnement prendra fin à la fin de la période en cours. ${TEXTE_RESILIATION_ANNULABLE} ${suite}`);
  assert.equal(texteResiliationProgrammee("2026-12-15T00:00:00Z", true), `L’abonnement prend fin le 15 décembre 2026. ${TEXTE_RESILIATION_ACCES}`);
  assert.equal(texteResiliationProgrammee("2026-12-15T00:00:00Z", false), `L’abonnement prend fin le 15 décembre 2026. ${TEXTE_RESILIATION_ANNULABLE}`);
  assert.equal(texteResiliationProgrammee(null, true), "L’abonnement prend fin à la fin de la période en cours. Jusque-là, l’accès reste complet et vous pouvez annuler la résiliation.");
  assert.equal(texteResiliationProgrammee(null, false), "L’abonnement prend fin à la fin de la période en cours. Jusque-là, vous pouvez annuler la résiliation.");
  assert.equal(texteResiliationEnregistree("2026-12-15T00:00:00Z"), "Résiliation enregistrée : l’abonnement prend fin le 15 décembre 2026.");
  for (const vide of [null, undefined, "", "illisible"]) assert.equal(texteResiliationEnregistree(vide), "Résiliation enregistrée.");
  assert.equal(TEXTE_RESILIATION_ANNULEE, "Résiliation annulée : l’abonnement continue.");
  assert.equal(LIBELLE_GARDER_ABONNEMENT, "Garder l’abonnement");
});

// Cas de la relecture (A1) : grâce jusqu'au 20/11, échéance au 01/12. La page ne promet plus l'accès complet.
test("impayé : bouton « Résilier » gardé, mais aucune promesse d'accès complet si la grâce finit avant la date d'effet", () => {
  const compte = { statut: "impaye", periodeFin: "2026-12-01T00:00:00Z", graceJusquau: "2026-11-20T00:00:00Z" };
  const resume = resumeCompte(compte, MAINTENANT);
  assert.equal(resume.actions.resilier, true);
  assert.equal(resume.resiliation.accesComplet, false);
  assert.equal(resume.resiliation.confirmation, texteConfirmationResiliation("2026-12-01T00:00:00Z", false));
  assert.doesNotMatch(texteComplet(resume), /accès reste complet/);
  // Résiliation déjà programmée : le bandeau ne promet rien non plus.
  const programmee = resumeCompte({ ...compte, resiliation: { effetLe: "2026-12-01T00:00:00Z" } }, MAINTENANT);
  assert.equal(programmee.bandeaux.find((b) => b.cle === "resiliation").texte, `L’abonnement prend fin le 1er décembre 2026. ${TEXTE_RESILIATION_ANNULABLE}`);
  assert.doesNotMatch(texteComplet(programmee), /accès reste complet/);
  // Grâce qui couvre la date d'effet : la promesse revient. Sans grâce lue : rien.
  assert.equal(resumeCompte({ ...compte, graceJusquau: "2026-12-03T00:00:00Z" }, MAINTENANT).resiliation.accesComplet, true);
  assert.equal(resumeCompte({ ...compte, graceJusquau: null }, MAINTENANT).resiliation.accesComplet, false);
  // Actif : la promesse, dans l'explication comme dans le bandeau d'une résiliation programmée.
  assert.match(resumeCompte({ statut: "actif", periodeFin: "2026-12-01T00:00:00Z" }, MAINTENANT).resiliation.confirmation, /l’accès reste complet/);
});

test("accès offert : ligne de l'app, fin annoncée par la phrase permise, « Souscrire sur restoclair.fr » vers /tarifs", () => {
  const offert = (accesOffert, statut = "sans_abonnement") => resumeCompte({ statut, accesOffert }, MAINTENANT);
  const beta = offert({ offre: "serenite", jusquau: "2027-03-01T00:00:00Z", motif: "beta" });
  assert.equal(ligne(beta, "Accès offert"), "Sérénité, jusqu’au 1er mars 2027");
  assert.equal(ligne(beta, "Statut"), "Sans abonnement");
  const fin = beta.bandeaux.find((b) => b.cle === "fin_acces_offert");
  assert.equal(fin.texte, "L’accès offert se termine le 1er mars 2027.");
  assert.deepEqual(passagesInterdits(fin.texte), [], "phrase permise par les magasins");
  assert.equal(beta.bandeaux.find((b) => b.cle === "sans").texte, TEXTE_SANS_ABONNEMENT);
  assert.equal(beta.actions.souscrire, true);
  assert.doesNotMatch(texteComplet(beta), /support/);
  // Sans date : « sans fin », et aucune fin annoncée.
  const aVie = offert({ offre: "expert", jusquau: null });
  assert.equal(ligne(aVie, "Accès offert"), "Expert, sans fin");
  assert.equal(aVie.bandeaux.some((b) => b.cle === "fin_acces_offert"), false);
  // Fin passée : la ligne reste, l'annonce non. Abonnement en cours : pas d'annonce de fin.
  assert.equal(ligne(offert({ offre: "essentiel", jusquau: jours(-3) }), "Accès offert"), `Essentiel, jusqu’au ${formatDate(jours(-3))}`);
  assert.equal(offert({ offre: "essentiel", jusquau: jours(-3) }).bandeaux.some((b) => b.cle === "fin_acces_offert"), false);
  assert.equal(offert({ offre: "serenite", jusquau: jours(30) }, "actif").bandeaux.some((b) => b.cle === "fin_acces_offert"), false);
  // Lecture tolérante : formule inconnue, rien ; date illisible, la formule seule, rien d'annoncé.
  for (const brut of [null, "serenite", { offre: "inconnue" }, { offre: "__proto__" }, { jusquau: jours(3) }]) {
    assert.equal(ligne(offert(brut), "Accès offert"), undefined, JSON.stringify(brut));
  }
  const illisible = offert({ offre: "serenite", jusquau: "bientôt" });
  assert.equal(ligne(illisible, "Accès offert"), "Sérénité");
  assert.equal(illisible.bandeaux.some((b) => b.cle === "fin_acces_offert"), false);
  // Textes et lien.
  assert.equal(TEXTE_SANS_ABONNEMENT, "Votre restaurant n’a pas encore d’abonnement.");
  assert.equal(LIBELLE_SOUSCRIRE, "Souscrire sur restoclair.fr");
  assert.equal(adresseSite("http://localhost:4303", CHEMIN_SOUSCRIRE), "http://localhost:4303/tarifs");
  assert.equal(adresseSite("https://restoclair.fr/", CHEMIN_SOUSCRIRE), "https://restoclair.fr/tarifs");
  for (const statut of ["sans_abonnement", "en_attente_paiement"]) assert.equal(resumeCompte({ statut }, MAINTENANT).actions.souscrire, true, statut);
  for (const statut of ["actif", "impaye", "activation_provisoire", "resilie"]) assert.equal(resumeCompte({ statut }, MAINTENANT).actions.souscrire, false, statut);
});

test("suppression des données : ligne et date dites quel que soit le statut (fin d'un accès offert comprise)", () => {
  // Accès offert terminé (A5) : export servi, suppression le 1er janvier.
  const finOffert = resumeCompte({ statut: "sans_abonnement", accesOffert: { offre: "serenite", jusquau: jours(-5) }, exportSortieDisponible: true, suppressionPrevueLe: "2027-01-01T00:00:00Z" }, MAINTENANT);
  assert.equal(ligne(finOffert, "Suppression des données"), "1er janvier 2027");
  assert.equal(finOffert.actions.export, true);
  assert.equal(finOffert.bandeaux.find((b) => b.cle === "suppression").texte, "Les données de l’établissement seront supprimées le 1er janvier 2027 : téléchargez l’export complet avant cette date.");
  const sansExport = resumeCompte({ statut: "sans_abonnement", suppressionPrevueLe: "2027-01-01T00:00:00Z" }, MAINTENANT);
  assert.equal(sansExport.bandeaux.find((b) => b.cle === "suppression").texte, "Les données de l’établissement seront supprimées le 1er janvier 2027.");
  assert.equal(ligne(resumeCompte({ statut: "resilie", suppressionPrevueLe: "2027-01-01T00:00:00Z" }, MAINTENANT), "Suppression des données"), "1er janvier 2027");
  assert.equal(ligne(resumeCompte({ statut: "actif" }, MAINTENANT), "Suppression des données"), undefined);
  assert.equal(resumeCompte({ statut: "actif", suppressionPrevueLe: "illisible" }, MAINTENANT).bandeaux.some((b) => b.cle === "suppression"), false);
});

test("formule et comptes : texte de l'app (CONTACT_FORMULE_TEXT) avec le contact du site, après le premier paiement", () => {
  assert.equal(TEXTE_CONTACT_FORMULE, "Pour changer de formule ou ajouter des comptes, contactez-nous : contact@restoclair.fr ou 07 77 75 26 05.");
  assert.ok(TEXTE_CONTACT_FORMULE.startsWith(DEBUT_CONTACT_FORMULE));
  for (const statut of ["actif", "impaye", "activation_provisoire", "resilie"]) assert.equal(resumeCompte({ statut }, MAINTENANT).actions.contactFormule, true, statut);
  for (const statut of ["sans_abonnement", "en_attente_paiement"]) assert.equal(resumeCompte({ statut }, MAINTENANT).actions.contactFormule, false, statut);
});

test("refus de la résiliation (issueResiliation) : réponse perdue et 409 relisent le compte, le reste reste dans le formulaire", () => {
  assert.deepEqual(issueResiliation(new ApiError("TOKEN_EXPIRED", 401)), { type: "session" });
  assert.deepEqual(issueResiliation(new ApiError("MOT_DE_PASSE_INVALIDE", 403)), { type: "mot_de_passe", texte: TEXTE_MOT_DE_PASSE_INCORRECT });
  assert.deepEqual(issueResiliation(new ApiError("MOT_DE_PASSE_REQUIS", 403)), { type: "mot_de_passe", texte: "Mot de passe incorrect." });
  // Réponse perdue : délai de 45 s dépassé (RESEAU), proxy en 502, 503 ou 504 : l'action a peut-être abouti.
  for (const erreur of [new ApiError("RESEAU"), new ApiError("ERREUR_INCONNUE", 502), new ApiError("X", 503), new ApiError("ERREUR_INCONNUE", 504)]) {
    assert.deepEqual(issueResiliation(erreur), { type: "relire", texte: TEXTE_REPONSE_PERDUE }, `${erreur.code} ${erreur.status}`);
  }
  assert.equal(TEXTE_REPONSE_PERDUE, "Nous n’avons pas reçu la réponse : voici l’état actuel de votre abonnement, vérifiez-le avant de recommencer.");
  // 409 : peut-être déjà fait (autre onglet, réponse perdue puis nouvel essai), mais aucun code n'est confirmé par
  // Apirest (la maquette de l'app répond ACTION_NON_AUTORISEE) : relecture, texte neutre, jamais « déjà ».
  for (const code of ["RESILIATION_DEJA_PROGRAMMEE", "ACTION_NON_AUTORISEE", "ERREUR_INCONNUE"]) {
    const issue = issueResiliation(new ApiError(code, 409));
    assert.deepEqual(issue, { type: "relire", texte: TEXTE_DEMANDE_NON_APPLIQUEE }, code);
    assert.doesNotMatch(issue.texte, /déjà/, code);
  }
  assert.equal(TEXTE_DEMANDE_NON_APPLIQUEE, "Cette demande n’a pas été appliquée : voici l’état actuel de votre abonnement.");
  // 409 qui sont des refus (errors.ts de l'app) : rien n'est fait, le formulaire reste ouvert avec le texte de l'espace.
  assert.deepEqual(issueResiliation(new ApiError("RESTAURANT_FERME", 409)), { type: "erreur", texte: MESSAGE_REFUS_GENERIQUE, attenteMs: null });
  assert.deepEqual(issueResiliation(new ApiError("OPERATION_NON_DISPONIBLE", 409)), { type: "erreur", texte: messageRefusEspace(new ApiError("OPERATION_NON_DISPONIBLE", 409)), attenteMs: null });
  assert.match(issueResiliation(new ApiError("OPERATION_NON_DISPONIBLE", 409)).texte, /plus disponible pour cet établissement/);
  // 429 : le délai, et le bouton désactivé jusque-là.
  assert.deepEqual(issueResiliation(new ApiError("TROP_D_ESSAIS", 429, null, 120000)), { type: "erreur", texte: "Trop d’essais. Réessayez dans 2 minutes.", attenteMs: 120000 });
  assert.deepEqual(issueResiliation(new ApiError("TROP_D_ESSAIS", 429)), { type: "erreur", texte: MESSAGE_TROP_D_ESSAIS, attenteMs: null });
  // Autres refus : le texte de l'espace, formulaire ouvert.
  assert.deepEqual(issueResiliation(new ApiError("PORTEE_INSUFFISANTE", 403)), { type: "erreur", texte: TEXTE_PORTEE_INSUFFISANTE, attenteMs: null });
  assert.deepEqual(issueResiliation(new ApiError("NON_TITULAIRE", 403)), { type: "erreur", texte: MESSAGE_REFUS_GENERIQUE, attenteMs: null });
  assert.deepEqual(issueResiliation(new ApiError("VALIDATION_ERROR", 400)), { type: "erreur", texte: MESSAGE_REFUS_GENERIQUE, attenteMs: null });
});

test("échec de connexion : un autre 4xx est un refus, pas une panne ; réseau et 5xx restent « indisponible »", () => {
  for (const erreur of [new ApiError("FORBIDDEN", 403), new ApiError("ERREUR_INCONNUE", 404), new ApiError("CONFLIT", 409), new ApiError("ERREUR_INCONNUE", 400)]) {
    assert.deepEqual(issueConnexion(erreur), { texte: MESSAGE_REFUS_GENERIQUE, telephone: true }, `${erreur.code} ${erreur.status}`);
  }
  assert.deepEqual(issueConnexion(new ApiError("VALIDATION_ERROR", 400)), { texte: "Vérifiez votre adresse e-mail et votre mot de passe." });
  assert.deepEqual(issueConnexion(new ApiError("IDENTIFIANTS_INVALIDES", 401)), { texte: "Adresse e-mail ou mot de passe incorrect." });
  assert.match(issueConnexion(new ApiError("CONNEXION_NON_ADMISE", 403, { motif: "desactive" })).texte, /désactivé/);
  for (const erreur of [new ApiError("RESEAU"), new ApiError("X", 500), new ApiError("X", 503)]) {
    assert.deepEqual(issueConnexion(erreur), { texte: MESSAGE_INDISPONIBLE, telephone: true }, `${erreur.code} ${erreur.status}`);
  }
});

// --- Relecture des corrections du 10/11 : résiliation sans date lisible, promesse en impayé, grâce passée. ---

test("résiliation programmée dès que GET /compte en donne une, sans date lisible ou passée (resiliationGeste de l'app)", () => {
  const base = { statut: "actif", periodeFin: "2026-12-01T00:00:00Z" };
  for (const effetLe of [null, undefined, "", "pas une date", jours(-10)]) {
    const resume = resumeCompte({ ...base, resiliation: { effetLe } }, MAINTENANT);
    assert.deepEqual([resume.actions.resilier, resume.actions.annulerResiliation], [false, true], String(effetLe));
    assert.equal(ligne(resume, "Prochaine échéance"), undefined, String(effetLe));
    assert.ok(resume.bandeaux.some((b) => b.cle === "resiliation"), String(effetLe));
  }
  // Sans date lisible : la ligne dit « en fin de période » (ligne de l'app), le bandeau prend la date qu'elle aurait
  // (effetAffiche de l'app : fin de période, ou fin d'engagement si elle est plus tardive).
  const sansDate = resumeCompte({ ...base, resiliation: { effetLe: null } }, MAINTENANT);
  assert.equal(ligne(sansDate, "Fin de l’abonnement"), "en fin de période");
  assert.equal(sansDate.resiliation.effetLe, "2026-12-01T00:00:00Z");
  assert.equal(sansDate.bandeaux.find((b) => b.cle === "resiliation").texte, `L’abonnement prend fin le 1er décembre 2026. ${TEXTE_RESILIATION_ACCES}`);
  const engage = resumeCompte({ ...base, engagementFin: "2027-06-01T00:00:00Z", resiliation: { effetLe: "illisible" } }, MAINTENANT);
  assert.equal(engage.bandeaux.find((b) => b.cle === "resiliation").texte, `L’abonnement prend fin le 1er juin 2027. ${TEXTE_RESILIATION_ACCES}`);
  // Aucune date du tout : la phrase sans date de l'app.
  const rien = resumeCompte({ statut: "actif", resiliation: { effetLe: null } }, MAINTENANT);
  assert.equal(rien.bandeaux.find((b) => b.cle === "resiliation").texte, texteResiliationProgrammee(null, true));
  assert.equal(ligne(rien, "Fin de l’abonnement"), "en fin de période");
  // Date lisible : la sienne, dans la ligne comme dans le bandeau.
  const datee = resumeCompte({ ...base, resiliation: { effetLe: "2026-12-15T00:00:00Z" } }, MAINTENANT);
  assert.equal(ligne(datee, "Fin de l’abonnement"), "15 décembre 2026");
  // Impayé : programmée aussi, sans promesse d'accès faute de grâce lue.
  const impaye = resumeCompte({ statut: "impaye", periodeFin: "2026-12-01T00:00:00Z", resiliation: { effetLe: null } }, MAINTENANT);
  assert.deepEqual([impaye.actions.resilier, impaye.actions.annulerResiliation], [false, true]);
  assert.doesNotMatch(texteComplet(impaye), /accès reste complet/);
  // Pas d'abonnement en cours (résilié, jamais souscrit), ou résiliation qui n'est pas un objet : rien de programmé.
  for (const compte of [{ statut: "resilie", resiliation: { effetLe: jours(10) } }, { statut: "sans_abonnement", resiliation: { effetLe: null } }, { ...base, resiliation: "oui" }, { ...base, resiliation: [] }]) {
    const resume = resumeCompte(compte, MAINTENANT);
    assert.equal(resume.actions.annulerResiliation, false, JSON.stringify(compte));
    assert.equal(ligne(resume, "Fin de l’abonnement"), undefined, JSON.stringify(compte));
  }
  assert.equal(resumeCompte({ ...base, resiliation: null }, MAINTENANT).actions.resilier, true);
});

// Premier prélèvement refusé : impayé sans fin de grâce (maquette de l'app, sepa_echoue), aucun contrat (CGV 11.3).
test("impayé sans fin de grâce lisible : « Résilier » gardé, mais ni lecture seule ni export promis après la fin", () => {
  const suite = /lecture seule|export|supprimées/;
  for (const graceJusquau of [null, undefined, "", "illisible"]) {
    const resume = resumeCompte({ statut: "impaye", periodeFin: "2026-12-01T00:00:00Z", graceJusquau }, MAINTENANT);
    assert.equal(resume.actions.resilier, true, String(graceJusquau));
    assert.equal(resume.resiliation.confirmation, `Votre abonnement prendra fin le 1er décembre 2026. ${TEXTE_RESILIATION_ANNULABLE}`, String(graceJusquau));
    assert.doesNotMatch(texteComplet(resume), suite, String(graceJusquau));
  }
  // Impayé ordinaire (fin de grâce lue, à venir ou passée) : contrat formé, la phrase de l'app.
  for (const graceJusquau of ["2026-11-20T00:00:00Z", jours(-3)]) {
    const resume = resumeCompte({ statut: "impaye", periodeFin: "2026-12-01T00:00:00Z", graceJusquau }, MAINTENANT);
    assert.equal(resume.resiliation.confirmation, texteConfirmationResiliation("2026-12-01T00:00:00Z", false), graceJusquau);
    assert.match(resume.resiliation.confirmation, /lecture seule pendant 2 mois/);
  }
  // Actif et accès provisoire : la phrase de l'app, comme avant.
  for (const statut of ["actif", "activation_provisoire"]) {
    assert.equal(resumeCompte({ statut, periodeFin: "2026-12-01T00:00:00Z" }, MAINTENANT).resiliation.confirmation, texteConfirmationResiliation("2026-12-01T00:00:00Z", true), statut);
  }
  assert.equal(texteConfirmationResiliation("2026-12-01T00:00:00Z", false, false), `Votre abonnement prendra fin le 1er décembre 2026. ${TEXTE_RESILIATION_ANNULABLE}`);
  assert.equal(texteConfirmationResiliation(null, true, false), `Votre abonnement prendra fin à la fin de la période en cours. ${TEXTE_RESILIATION_ACCES}`);
});

test("impayé : la fin de grâce n'est citée que si elle est encore à venir", () => {
  const bandeau = (graceJusquau) => resumeCompte({ statut: "impaye", graceJusquau }, MAINTENANT).bandeaux.find((b) => b.cle === "impaye").texte;
  assert.equal(bandeau(jours(3)), `Un paiement n’a pas abouti. Sans régularisation, l’application passera en lecture seule le ${formatDate(jours(3))}. Mettez à jour votre moyen de paiement ou réglez la facture depuis « Factures et moyen de paiement ».`);
  const sansDate = "Un paiement n’a pas abouti. Mettez à jour votre moyen de paiement ou réglez la facture depuis « Factures et moyen de paiement ».";
  for (const graceJusquau of [jours(-2), new Date(MAINTENANT).toISOString(), null, "illisible"]) assert.equal(bandeau(graceJusquau), sansDate, String(graceJusquau));
});
