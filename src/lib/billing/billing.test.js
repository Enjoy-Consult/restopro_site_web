// Tests des calculs et contrôles : `npm test` (node --test, sans dépendance).
import test from "node:test";
import assert from "node:assert/strict";
import { formatHT, formatHTParPeriode, formatTTC, formatDate, calculerTTC, formatPourcentage } from "./format.js";
import { estSiretValide, estCodePostalValide, estEmailValide, memesEmails, validerInscription } from "./validation.js";
import {
  calculer,
  versionsDisponibles,
  remiseAnnuelle,
  modulesAffichage,
  selectionVersQuery,
  selectionDepuisQuery,
  selectionVersCheckout,
  pmsDeVersion,
} from "./pricing.js";
import { mockCatalogue } from "./mock.js";

const plat = (texte) => texte.replace(/[  ]/g, " ");
const catalogue = mockCatalogue(false);
const cataloguePms = mockCatalogue(true);
const offre = (cat, cle) => cat.offres.find((o) => o.cle === cle);

test("formats français", () => {
  assert.equal(plat(formatHT(1999)), "19,99 € HT");
  assert.equal(plat(formatTTC(2399)), "23,99 € TTC");
  assert.equal(plat(formatHTParPeriode(54900, "an")), "549,00 € HT/an");
  assert.equal(plat(formatHT(123456)), "1 234,56 € HT");
  assert.equal(formatDate("2026-12-15T00:00:00Z"), "15 décembre 2026");
  assert.equal(plat(formatPourcentage(8.5)), "8,5 %");
});

test("TTC = HT × 1,2 arrondi au centime", () => {
  assert.equal(calculerTTC(1999), 2399);
  assert.equal(calculerTTC(4999), 5999);
  assert.equal(calculerTTC(54900), 65880);
  assert.equal(calculerTTC(9900), 11880);
  assert.equal(calculerTTC(0), 0);
});

test("SIRET : 14 chiffres et clé de Luhn", () => {
  assert.equal(estSiretValide("73282932000074"), true);
  assert.equal(estSiretValide("732 829 320 00074"), true);
  assert.equal(estSiretValide("73282932000075"), false);
  assert.equal(estSiretValide("7328293200007"), false);
  assert.equal(estSiretValide("abcdefghijklmn"), false);
});

test("SIRET de La Poste (SIREN 356000000) : somme des chiffres multiple de 5, sauf le siège (Luhn)", async () => {
  const { luhnValide, cleSiretValide } = await import("./validation.js");
  const somme = (s) => [...s].reduce((t, c) => t + Number(c), 0);
  // 35600000000001 : somme 15 (multiple de 5) mais clé de Luhn fausse -> accepté
  assert.equal(somme("35600000000001"), 15);
  assert.equal(luhnValide("35600000000001"), false);
  assert.equal(estSiretValide("35600000000001"), true);
  assert.equal(estSiretValide("356 000 000 00001"), true);
  // Établissement dont la somme n'est pas un multiple de 5 : refusé, même si sa clé de Luhn est juste.
  assert.equal(somme("35600000000055"), 24);
  assert.equal(estSiretValide("35600000000055"), false);
  // Le siège (35600000000048, somme 26) est l'exception : il suit la clé de Luhn.
  assert.equal(somme("35600000000048"), 26);
  assert.equal(luhnValide("35600000000048"), true);
  assert.equal(estSiretValide("35600000000048"), true);
  assert.equal(cleSiretValide("35600000000048"), true);
  // Seul le SIREN exact 356000000 est concerné : un SIREN voisin suit la clé de Luhn.
  assert.equal(somme("35600000100000"), 15);
  assert.equal(luhnValide("35600000100000"), false);
  assert.equal(estSiretValide("35600000100000"), false);
  assert.equal(estSiretValide("3560000000000"), false); // 13 chiffres
  assert.equal(estSiretValide("3560000000000a"), false);
  // Un SIRET La Poste dont la somme vaut 20 est accepté ; une autre entreprise suit toujours Luhn.
  assert.equal(estSiretValide("35600000000060"), true);
  assert.equal(estSiretValide("73282932000074"), true);
  assert.equal(estSiretValide("73282932000075"), false);
  // Le formulaire applique la même règle.
  const base = {
    prenom: "Marie", nom: "Martin", email: "marie@exemple.fr", confirmationEmail: "marie@exemple.fr",
    nomCommercial: "Bureau de poste", raisonSociale: "La Poste", ligne1: "1 rue", codePostal: "75002", ville: "Paris", cgv: true,
  };
  assert.equal(validerInscription({ ...base, siret: "35600000000001" }).siret, undefined);
  assert.ok(validerInscription({ ...base, siret: "35600000000055" }).siret);
  assert.equal(validerInscription({ ...base, siret: "35600000000048" }).siret, undefined);
});

test("code postal, e-mail et sa seconde saisie", () => {
  assert.equal(memesEmails(" Marie@Exemple.fr ", "marie@exemple.fr"), true);
  assert.equal(memesEmails("marie@exemple.fr", "marie@exemple.com"), false);
  assert.equal(estCodePostalValide("80700"), true);
  assert.equal(estCodePostalValide("8070"), false);
  assert.equal(estEmailValide("marie@exemple.fr"), true);
  assert.equal(estEmailValide("marie@exemple"), false);
});

test("formulaire d'inscription : messages par champ", () => {
  const valide = {
    prenom: "Marie", nom: "Martin", email: "marie@exemple.fr", confirmationEmail: "marie@exemple.fr",
    nomCommercial: "Chez Marie", raisonSociale: "Marie SAS", siret: "73282932000074",
    ligne1: "1 rue de la Paix", codePostal: "75002", ville: "Paris", cgv: true,
  };
  assert.deepEqual(validerInscription(valide), {});
  const erreurs = validerInscription({ ...valide, email: "x", confirmationEmail: "", siret: "123", codePostal: "7", cgv: false });
  assert.deepEqual(Object.keys(erreurs).sort(), ["cgv", "codePostal", "confirmationEmail", "email", "siret"]);
  // Aucun champ de mot de passe : le titulaire reçoit ses identifiants par e-mail après le paiement.
  assert.deepEqual(validerInscription({ ...valide, motDePasse: "", confirmation: "" }), {});
});

test("totaux : Essentiel avec comptes supplémentaires", () => {
  const r = calculer(catalogue, {
    offre: "essentiel", version: "mensuel", comptesSupplementaires: { cuisinier: 2, services_techniques: 1 }, options: { ddpp: false },
  });
  assert.equal(r.ok, true);
  assert.equal(r.totalHTCentimes, 1999 + 2 * 490 + 490);
  assert.equal(r.totalTTCCentimes, calculerTTC(r.totalHTCentimes));
  assert.equal(r.tvaCentimes, r.totalTTCCentimes - r.totalHTCentimes);
});

test("totaux : Sérénité annuel (comptes au prix annuel du catalogue)", () => {
  const r = calculer(catalogue, { offre: "serenite", version: "annuel", comptesSupplementaires: { cuisinier: 1 }, options: {} });
  assert.equal(r.totalHTCentimes, 54900 + 5880);
  assert.equal(r.periode, "an");
});

test("totaux : Expert avec option DDPP", () => {
  const r = calculer(catalogue, { offre: "expert", version: "mensuel", comptesSupplementaires: { superviseur: 1 }, options: { ddpp: true } });
  assert.equal(r.totalHTCentimes, 9900 + 790 + 1000);
  assert.equal(r.lignes.length, 3);
});

test("refus : catégorie non autorisée, option indisponible, offre ou version inconnue", () => {
  assert.equal(calculer(catalogue, { offre: "essentiel", version: "mensuel", comptesSupplementaires: { superviseur: 1 } }).erreur, "CATEGORIE_NON_AUTORISEE");
  assert.equal(calculer(catalogue, { offre: "serenite", version: "mensuel", options: { ddpp: true } }).erreur, "OPTION_INDISPONIBLE");
  assert.equal(calculer(catalogue, { offre: "x", version: "mensuel" }).erreur, "OFFRE_INVALIDE");
  assert.equal(calculer(catalogue, { offre: "serenite", version: "mensuel_engage" }).erreur, "VERSION_INDISPONIBLE");
  assert.equal(calculer(catalogue, { offre: "serenite", version: "mensuel", comptesSupplementaires: { cuisinier: -1 } }).erreur, "QUANTITE_INVALIDE");
});

test("sans PMS : aucune version engagée, aucune mention PMS", () => {
  for (const o of catalogue.offres) assert.ok(!versionsDisponibles(catalogue, o).some((v) => v.cle === "mensuel_engage"));
  // Même si l'API renvoyait une version engagée par erreur, elle est écartée.
  const intrus = { ...catalogue, offres: [{ ...offre(cataloguePms, "expert") }] };
  assert.ok(!versionsDisponibles(intrus, intrus.offres[0]).some((v) => v.cle === "mensuel_engage"));
  assert.equal(pmsDeVersion(catalogue, offre(cataloguePms, "serenite").versions.find((v) => v.cle === "annuel")), null);
});

test("avec PMS : versions engagées et droit au PMS", () => {
  const serenite = offre(cataloguePms, "serenite");
  assert.deepEqual(versionsDisponibles(cataloguePms, serenite).map((v) => v.cle), ["mensuel", "mensuel_engage", "annuel"]);
  assert.equal(pmsDeVersion(cataloguePms, serenite.versions.find((v) => v.cle === "annuel")), "premier_paiement");
  assert.equal(pmsDeVersion(cataloguePms, serenite.versions.find((v) => v.cle === "mensuel_engage")), "troisieme_paiement");
});

test("remise annuelle : environ −8,5 %", () => {
  assert.equal(remiseAnnuelle(offre(catalogue, "serenite"), catalogue), 8.5);
  assert.equal(remiseAnnuelle(offre(catalogue, "expert"), catalogue), null);
});

test("modules : complet, identiques, plus", () => {
  const [ess, ser, exp] = catalogue.offres;
  assert.equal(modulesAffichage(catalogue, ess, null).modules.length, 15);
  assert.equal(modulesAffichage(catalogue, ser, ess).mode, "identiques");
  const plus = modulesAffichage(catalogue, exp, ser);
  assert.equal(plus.mode, "plus");
  assert.equal(plus.modules.length, 9);
});

test("modules : s'il en manque un de la formule précédente, liste complète plutôt que « les mêmes » ou « tous, plus »", () => {
  const [ess, ser, exp] = catalogue.offres;
  const moinsUn = { ...ser, modules: ser.modules.slice(1) };
  assert.deepEqual(modulesAffichage(catalogue, moinsUn, ess).mode, "complet");
  assert.equal(modulesAffichage(catalogue, moinsUn, ess).modules.length, 14);
  const expertSansFormation = { ...exp, modules: exp.modules.filter((m) => m !== "formation") };
  assert.equal(modulesAffichage(catalogue, expertSansFormation, ser).mode, "complet");
  assert.equal(modulesAffichage(catalogue, expertSansFormation, ser).modules.length, 23);
  // L'ordre des clés ne change rien.
  assert.equal(modulesAffichage(catalogue, { ...ser, modules: [...ser.modules].reverse() }, ess).mode, "identiques");
});

test("sélection <-> URL d'inscription", () => {
  const sel = { offre: "expert", version: "mensuel", comptesSupplementaires: { cuisinier: 2, responsable: 0 }, options: { ddpp: true } };
  const query = selectionVersQuery(sel);
  const relue = selectionDepuisQuery(query, catalogue);
  assert.deepEqual(relue.comptesSupplementaires, { cuisinier: 2 });
  assert.equal(relue.options.ddpp, true);
  const cgv = { version: "0.1", sha256: "a".repeat(64) };
  assert.deepEqual(selectionVersCheckout(relue, cgv), {
    offre: "expert", version: "mensuel", comptesSupplementaires: { cuisinier: 2 }, options: { ddpp: true }, cgv, origine: "site",
  });
});

test("paramètres d'URL absents ou invalides -> null", () => {
  assert.equal(selectionDepuisQuery("", catalogue), null);
  assert.equal(selectionDepuisQuery("offre=serenite", catalogue), null);
  assert.equal(selectionDepuisQuery("offre=nimporte&version=mensuel", catalogue), null);
  assert.equal(selectionDepuisQuery("offre=serenite&version=mensuel_engage", catalogue), null);
  assert.equal(selectionDepuisQuery("offre=essentiel&version=mensuel&comptes=superviseur:1", catalogue), null);
  assert.equal(selectionDepuisQuery("offre=essentiel&version=mensuel&comptes=cuisinier:abc", catalogue), null);
  assert.equal(selectionDepuisQuery("offre=essentiel&version=mensuel&comptes=cuisinier:999", catalogue), null);
});

test("config importable sous node : sans variable, tout est désactivé et aucun appel ne part", async (t) => {
  for (const nom of ["VITE_BILLING_ACTIF", "VITE_BILLING_MOCK", "VITE_API_URL", "VITE_APP_WEB_URL"]) delete process.env[nom];
  const config = await import("./config.js");
  assert.equal(config.BILLING_ACTIF, false);
  assert.equal(config.BILLING_MOCK, false);
  assert.equal(config.API_URL, "");
  assert.equal(config.APP_WEB_URL, "");
  assert.equal(config.CHEMIN_ESPACE, "/mon-abonnement");

  const faux = t.mock.method(globalThis, "fetch", async () => new Response("{}"));
  const { requete } = await import("./api.js");
  await assert.rejects(requete("GET", "/api/billing/catalogue"), { code: "SERVICE_PAIEMENT_INDISPONIBLE" });
  assert.equal(faux.mock.callCount(), 0);
});

// --- Jeton expiré : message vers l'espace client, jeton supprimé de sessionStorage ---
function faussePageSession() {
  const stockage = new Map();
  globalThis.window = {
    sessionStorage: {
      getItem: (cle) => (stockage.has(cle) ? stockage.get(cle) : null),
      setItem: (cle, valeur) => stockage.set(cle, String(valeur)),
      removeItem: (cle) => stockage.delete(cle),
    },
  };
  return stockage;
}

test("jeton expiré (401) : message vers le lien de reprise et jeton supprimé de sessionStorage", async () => {
  const stockage = faussePageSession();
  const { ecrireSession, lireSession } = await import("./session.js");
  const { traiterSessionExpiree, MESSAGE_SESSION_EXPIREE } = await import("./erreurs.js");
  const { ApiError } = await import("./errors.js");

  ecrireSession({ token: "jeton-expire", email: "marie@exemple.fr" });
  assert.equal(stockage.size, 1);

  const message = traiterSessionExpiree(new ApiError("ACTION_NON_AUTORISEE", 401));
  assert.equal(message, "Votre session a expiré. Votre compte est conservé : recevez un lien pour reprendre votre inscription.");
  assert.equal(message, MESSAGE_SESSION_EXPIREE);
  assert.equal(stockage.size, 0);
  assert.equal(lireSession(), null);
  assert.ok(!/recr|créez/i.test(message));
});

test("403 : refus affiché, jeton conservé ; seul un 401 est une expiration", async () => {
  const stockage = faussePageSession();
  const { ecrireSession, lireSession } = await import("./session.js");
  const { traiterSessionExpiree, estSessionExpiree, messageRefus, MESSAGE_INDISPONIBLE, MESSAGE_REFUS_GENERIQUE } = await import("./erreurs.js");
  const { ApiError } = await import("./errors.js");

  ecrireSession({ token: "jeton-valide", email: "marie@exemple.fr" });
  for (const erreur of [
    new ApiError("NON_TITULAIRE", 403),
    new ApiError("SERVICE_PAIEMENT_INDISPONIBLE", 503),
    new ApiError("RESEAU"),
    new ApiError("COMPTES_INSUFFISANTS", 422),
  ]) {
    assert.equal(estSessionExpiree(erreur), false);
    assert.equal(traiterSessionExpiree(erreur), null);
  }
  assert.equal(lireSession().token, "jeton-valide");
  assert.equal(stockage.size, 1);

  assert.equal(messageRefus(new ApiError("NON_TITULAIRE", 403)), "Seul le titulaire de l’abonnement peut effectuer cette action.");
  assert.equal(messageRefus(new ApiError("ACTION_NON_AUTORISEE", 403)), "Cette action n’est pas autorisée pour votre compte.");
  // Code inconnu : message neutre, jamais celui d'indisponibilité (réservé au réseau et aux 5xx).
  assert.equal(MESSAGE_REFUS_GENERIQUE, "Cette action n’est pas possible pour le moment. Contactez-nous si le problème persiste.");
  assert.equal(messageRefus(new ApiError("CODE_INCONNU", 403)), MESSAGE_REFUS_GENERIQUE);
  assert.equal(messageRefus(new ApiError("ERREUR_INCONNUE", 403)), MESSAGE_REFUS_GENERIQUE);
  assert.notEqual(messageRefus(new ApiError("CODE_INCONNU", 403)), MESSAGE_INDISPONIBLE);
  assert.equal(messageRefus(new ApiError("NON_TITULAIRE", 401)), null);
  assert.equal(messageRefus(new ApiError("SERVICE_PAIEMENT_INDISPONIBLE", 503)), null);

  assert.ok(traiterSessionExpiree(new ApiError("ACTION_NON_AUTORISEE", 401)));
  assert.equal(lireSession(), null);
});

test("fin de session : abonnement déjà actif, jeton supprimé et message seul, quel que soit le statut", async () => {
  const stockage = faussePageSession();
  const { ecrireSession, lireSession } = await import("./session.js");
  const { traiterFinDeSession } = await import("./erreurs.js");
  const { ApiError } = await import("./errors.js");

  for (const status of [403, 409, 422]) {
    ecrireSession({ token: "jeton-paye", email: "marie@exemple.fr" });
    assert.deepEqual(traiterFinDeSession(new ApiError("ABONNEMENT_DEJA_ACTIF", status)), {
      type: "info",
      texte: "Un abonnement est déjà actif pour ce compte. Gérez-le depuis votre espace abonnement.",
    });
    assert.equal(stockage.size, 0);
    assert.equal(lireSession(), null);
  }
});

test("fin de session : 403 MUST_FINALIZE au paiement, abonnement en place, jeton supprimé, pas de second paiement", async () => {
  const stockage = faussePageSession();
  const { ecrireSession, lireSession } = await import("./session.js");
  const { traiterFinDeSession, MESSAGE_ABONNEMENT_EN_PLACE } = await import("./erreurs.js");
  const { ApiError } = await import("./errors.js");

  ecrireSession({ token: "jeton-paye", email: "marie@exemple.fr" });
  assert.deepEqual(traiterFinDeSession(new ApiError("MUST_FINALIZE", 403)), { type: "info", texte: MESSAGE_ABONNEMENT_EN_PLACE });
  assert.equal(stockage.size, 0);
  assert.equal(lireSession(), null);
  assert.match(MESSAGE_ABONNEMENT_EN_PLACE, /un lien pour choisir votre mot de passe vous a été envoyé par e-mail/);
  // Le titulaire ne reçoit jamais d'identifiants (réponse de billing du 11/11).
  assert.doesNotMatch(MESSAGE_ABONNEMENT_EN_PLACE, /identifiants/);
});

test("403 OPERATION_NON_DISPONIBLE : établissement résilié ou fermé, message dédié ; autre motif, message neutre", async () => {
  const { messageErreur, messageRefus, MESSAGE_ETABLISSEMENT_RESILIE, MESSAGE_REFUS_GENERIQUE } = await import("./erreurs.js");
  const { ApiError } = await import("./errors.js");
  const resilie = new ApiError("OPERATION_NON_DISPONIBLE", 403, { motif: "etablissement_resilie" });
  assert.equal(messageRefus(resilie), MESSAGE_ETABLISSEMENT_RESILIE);
  assert.equal(messageErreur(resilie), MESSAGE_ETABLISSEMENT_RESILIE);
  assert.equal(messageRefus(new ApiError("OPERATION_NON_DISPONIBLE", 403, { motif: "autre" })), MESSAGE_REFUS_GENERIQUE);
  assert.match(MESSAGE_ETABLISSEMENT_RESILIE, /export/);
  assert.match(MESSAGE_ETABLISSEMENT_RESILIE, /30 jours/);
});

test("fin de session : 401 en erreur ; les autres refus gardent le jeton", async () => {
  const stockage = faussePageSession();
  const { ecrireSession, lireSession } = await import("./session.js");
  const { traiterFinDeSession, MESSAGE_SESSION_EXPIREE } = await import("./erreurs.js");
  const { ApiError } = await import("./errors.js");

  ecrireSession({ token: "jeton", email: "marie@exemple.fr" });
  for (const erreur of [
    new ApiError("CGV_VERSION_OBSOLETE", 409),
    new ApiError("GERE_PAR_ABONNEMENT", 403),
    new ApiError("NON_TITULAIRE", 403),
    new ApiError("COMPTES_INSUFFISANTS", 422),
    new ApiError("SERVICE_PAIEMENT_INDISPONIBLE", 503),
    new ApiError("RESEAU"),
  ]) {
    assert.equal(traiterFinDeSession(erreur), null);
  }
  assert.equal(lireSession().token, "jeton");

  assert.deepEqual(traiterFinDeSession(new ApiError("INVALID_TOKEN", 401)), { type: "error", texte: MESSAGE_SESSION_EXPIREE });
  assert.equal(stockage.size, 0);
});

test("session : un jeton effacé par une autre page de l'onglet ne ressort pas de la mémoire d'une page restaurée", async () => {
  const stockage = faussePageSession();
  const { ecrireSession, lireSession } = await import("./session.js");

  ecrireSession({ token: "jeton", email: "marie@exemple.fr" });
  assert.equal(lireSession().token, "jeton");
  stockage.clear(); // la page de retour a conclu « actif » ; /inscription, restaurée par le navigateur, a gardé son état
  assert.equal(lireSession(), null);
});

test("session : si sessionStorage refuse l'écriture, la copie en mémoire sert pour la page en cours", async () => {
  const stockage = faussePageSession();
  window.sessionStorage.setItem = () => {
    throw new Error("stockage plein");
  };
  const { ecrireSession, effacerSession, lireSession } = await import("./session.js");

  ecrireSession({ token: "jeton", email: "marie@exemple.fr" });
  assert.equal(stockage.size, 0);
  assert.equal(lireSession().token, "jeton");
  effacerSession();
  assert.equal(lireSession(), null);
});

test("comptes supplémentaires proposés : catégories autorisées et tarifées de la version", async () => {
  const { categoriesSupplementaires } = await import("./pricing.js");
  const [ess, ser, exp] = catalogue.offres;
  assert.deepEqual(categoriesSupplementaires(catalogue, ess, ess.versions[0]).map((c) => c.cle), ["responsable", "cuisinier", "services_techniques"]);
  assert.deepEqual(categoriesSupplementaires(catalogue, ser, ser.versions.find((v) => v.cle === "annuel")).map((c) => c.cle), ["responsable", "superviseur", "cuisinier", "services_techniques"]);
  assert.equal(categoriesSupplementaires(catalogue, exp, exp.versions[0]).length, 4);
});

test("nombre d'ajouts et sélection sans ajouts", async () => {
  const { nombreAjouts, sansAjouts } = await import("./pricing.js");
  const sel = { offre: "expert", version: "mensuel", comptesSupplementaires: { cuisinier: 2, superviseur: 1 }, options: { ddpp: true } };
  assert.equal(nombreAjouts(sel), 4);
  assert.equal(nombreAjouts({ offre: "essentiel", version: "mensuel", comptesSupplementaires: {}, options: { ddpp: false } }), 0);
  const nu = sansAjouts(sel);
  assert.deepEqual(nu, { offre: "expert", version: "mensuel", comptesSupplementaires: {}, options: { ddpp: false } });
  assert.equal(calculer(catalogue, nu).totalHTCentimes, 9900);
  assert.deepEqual(sel.comptesSupplementaires, { cuisinier: 2, superviseur: 1 });
});

test("restreindreAjouts : garde ce que la version propose, retire le reste", async () => {
  const { restreindreAjouts } = await import("./pricing.js");
  // Expert mensuel -> engagé (PMS disponible) : l'option DDPP et les comptes restent valables.
  const expert = { offre: "expert", version: "mensuel_engage", comptesSupplementaires: { cuisinier: 2 }, options: { ddpp: true } };
  assert.deepEqual(restreindreAjouts(cataloguePms, expert), expert);
  // Sans PMS, la version engagée n'existe pas : tout est retiré.
  assert.deepEqual(restreindreAjouts(catalogue, expert).comptesSupplementaires, {});
  // Catégorie non proposée par l'Essentiel et option absente : retirées, le reste est gardé.
  const essentiel = { offre: "essentiel", version: "mensuel", comptesSupplementaires: { superviseur: 1, cuisinier: 1, responsable: 0 }, options: { ddpp: true } };
  assert.deepEqual(restreindreAjouts(catalogue, essentiel), {
    offre: "essentiel", version: "mensuel", comptesSupplementaires: { cuisinier: 1 }, options: { ddpp: false },
  });
  assert.equal(calculer(catalogue, restreindreAjouts(catalogue, essentiel)).ok, true);
  // Quantités hors bornes retirées.
  const exces = { offre: "serenite", version: "annuel", comptesSupplementaires: { cuisinier: 999, superviseur: 1.5 }, options: {} };
  assert.deepEqual(restreindreAjouts(catalogue, exces).comptesSupplementaires, {});
});
