// Tests des calculs et contrôles : `npm test` (node --test, sans dépendance).
import test from "node:test";
import assert from "node:assert/strict";
import { formatHT, formatHTParPeriode, formatTTC, formatDate, calculerTTC, formatPourcentage } from "./format.js";
import { estSiretValide, estMotDePasseValide, estCodePostalValide, estEmailValide, validerInscription } from "./validation.js";
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
    prenom: "Marie", nom: "Martin", email: "marie@exemple.fr", motDePasse: "motdepasse1", confirmation: "motdepasse1",
    nomCommercial: "Bureau de poste", raisonSociale: "La Poste", ligne1: "1 rue", codePostal: "75002", ville: "Paris", cgv: true,
  };
  assert.equal(validerInscription({ ...base, siret: "35600000000001" }).siret, undefined);
  assert.ok(validerInscription({ ...base, siret: "35600000000055" }).siret);
  assert.equal(validerInscription({ ...base, siret: "35600000000048" }).siret, undefined);
});

test("mot de passe, code postal, e-mail", () => {
  assert.equal(estMotDePasseValide("abcdefg1"), true);
  assert.equal(estMotDePasseValide("abcdefgh"), false);
  assert.equal(estMotDePasseValide("12345678"), false);
  assert.equal(estMotDePasseValide("ab1"), false);
  assert.equal(estCodePostalValide("80700"), true);
  assert.equal(estCodePostalValide("8070"), false);
  assert.equal(estEmailValide("marie@exemple.fr"), true);
  assert.equal(estEmailValide("marie@exemple"), false);
});

test("formulaire d'inscription : messages par champ", () => {
  const valide = {
    prenom: "Marie", nom: "Martin", email: "marie@exemple.fr", motDePasse: "motdepasse1", confirmation: "motdepasse1",
    nomCommercial: "Chez Marie", raisonSociale: "Marie SAS", siret: "73282932000074",
    ligne1: "1 rue de la Paix", codePostal: "75002", ville: "Paris", cgv: true,
  };
  assert.deepEqual(validerInscription(valide), {});
  const erreurs = validerInscription({ ...valide, email: "x", confirmation: "autre1234", siret: "123", codePostal: "7", cgv: false });
  assert.deepEqual(Object.keys(erreurs).sort(), ["cgv", "codePostal", "confirmation", "email", "siret"]);
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

test("sélection <-> URL d'inscription", () => {
  const sel = { offre: "expert", version: "mensuel", comptesSupplementaires: { cuisinier: 2, responsable: 0 }, options: { ddpp: true } };
  const query = selectionVersQuery(sel);
  const relue = selectionDepuisQuery(query, catalogue);
  assert.deepEqual(relue.comptesSupplementaires, { cuisinier: 2 });
  assert.equal(relue.options.ddpp, true);
  assert.deepEqual(selectionVersCheckout(relue), {
    offre: "expert", version: "mensuel", comptesSupplementaires: { cuisinier: 2 }, options: { ddpp: true }, origine: "site",
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

test("jeton expiré (401) : message vers l'espace client et jeton supprimé de sessionStorage", async () => {
  const stockage = faussePageSession();
  const { ecrireSession, lireSession } = await import("./session.js");
  const { traiterSessionExpiree, MESSAGE_SESSION_EXPIREE } = await import("./erreurs.js");
  const { ApiError } = await import("./errors.js");

  ecrireSession({ token: "jeton-expire", email: "marie@exemple.fr" });
  assert.equal(stockage.size, 1);

  const message = traiterSessionExpiree(new ApiError("ACTION_NON_AUTORISEE", 401));
  assert.equal(message, "Votre session a expiré. Connectez-vous à votre espace pour finaliser votre abonnement.");
  assert.equal(message, MESSAGE_SESSION_EXPIREE);
  assert.equal(stockage.size, 0);
  assert.equal(lireSession(), null);
  assert.ok(!/recr|créez/i.test(message));
});

test("403 : refus affiché, jeton conservé ; seul un 401 est une expiration", async () => {
  const stockage = faussePageSession();
  const { ecrireSession, lireSession } = await import("./session.js");
  const { traiterSessionExpiree, estSessionExpiree, messageRefus, MESSAGE_INDISPONIBLE } = await import("./erreurs.js");
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
  assert.equal(messageRefus(new ApiError("CODE_INCONNU", 403)), MESSAGE_INDISPONIBLE);
  assert.equal(messageRefus(new ApiError("ERREUR_INCONNUE", 403)), MESSAGE_INDISPONIBLE);
  assert.equal(messageRefus(new ApiError("NON_TITULAIRE", 401)), null);
  assert.equal(messageRefus(new ApiError("SERVICE_PAIEMENT_INDISPONIBLE", 503)), null);

  assert.ok(traiterSessionExpiree(new ApiError("ACTION_NON_AUTORISEE", 401)));
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
