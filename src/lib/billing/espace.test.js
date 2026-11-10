// Tests de l'espace abonnement (compte.restoclair.fr) : `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "./errors.js";
import {
  TEXTE_EXPORT_A_LA_FIN, TEXTE_NON_TITULAIRE, TEXTE_PORTEE_INSUFFISANTE, TEXTE_SANS_ABONNEMENT, TEXTE_TRANSFERT_RECU,
  DUREE_SESSION_MS, cheminDeRetourAdmis, echeanceLocale, estMotDePasseRefuse, estSessionFinie, issueConnexion,
  issueConnexionReussie, lireConnexion, messageRefusEspace, nomFichierExport, resumeCompte, sessionValable, urlPortail,
} from "./espace.js";
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
  assert.deepEqual(actif.actions, { portail: true, resilier: true, annulerResiliation: false, export: false, exportALaFin: true });
  assert.deepEqual(actif.lignes[1], ["Formule", "Sérénité, version mensuelle sans engagement"]);
  const programmee = resumeCompte({ statut: "actif", resiliation: { effetLe: jours(10) } }, MAINTENANT);
  assert.equal(programmee.actions.resilier, false);
  assert.equal(programmee.actions.annulerResiliation, true);
  assert.match(programmee.bandeaux[0].texte, /prendra fin/);
  const passee = resumeCompte({ statut: "actif", resiliation: { effetLe: jours(-1) } }, MAINTENANT);
  assert.equal(passee.actions.annulerResiliation, false);
  const sans = resumeCompte({ statut: "sans_abonnement" }, MAINTENANT);
  assert.deepEqual(sans.actions, { portail: false, resilier: false, annulerResiliation: false, export: false, exportALaFin: false });
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
  const termine = (exportSortieDisponible, suppressionPrevueLe = jours(40)) => resumeCompte({ statut: "resilie", suppressionPrevueLe, exportSortieDisponible }, MAINTENANT);
  assert.match(termine(true).bandeaux[0].texte, /^Votre abonnement est terminé\. Les données de l’établissement seront supprimées le .+ : téléchargez l’export complet avant cette date\.$/);
  assert.deepEqual([termine(false).actions.export, termine(false).actions.exportALaFin], [false, false]);
  assert.match(termine(false).bandeaux[0].texte, /^Votre abonnement est terminé\. Les données de l’établissement seront supprimées le [^:]+\.$/);
  assert.equal(termine(true, null).bandeaux[0].texte, "Votre abonnement est terminé. Vous pouvez télécharger ci-dessous l’export complet des données de l’établissement.");
  assert.equal(termine(false, null).bandeaux[0].texte, "Votre abonnement est terminé.");
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
