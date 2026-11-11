// Tests du garde-fou de build : `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DOCUMENTS_REQUIS, messageGardeFou, problemesVente } from "./garde-fou-vente.mjs";

const doc = (document, statut, autres = {}) => ({
  document,
  versionEnVigueur: "1.0",
  versions: [{ version: "1.0", statut }],
  ...autres,
});
const documentsValides = () => DOCUMENTS_REQUIS.map((cle) => doc(cle, "publie"));
const remplacer = (documents, remplacant) => documents.map((d) => (d.document === remplacant.document ? remplacant : d));

const ENV_VENTE = { VITE_BILLING_ACTIF: "true", VITE_API_URL: "https://api.exemple.fr/v1", VITE_APP_WEB_URL: "https://app.exemple.fr", VITE_COMPTE_URL: "https://compte.exemple.fr" };
const controle = (surcharge = {}) => problemesVente({ commande: "build", mode: "production", env: ENV_VENTE, documents: documentsValides(), ...surcharge });

test("vente prête : documents validés et adresses renseignées, le build continue", () => {
  assert.deepEqual(controle(), []);
});

test("sans VITE_BILLING_ACTIF, le build continue, même avec des documents en projet et sans adresses", () => {
  const documents = DOCUMENTS_REQUIS.map((cle) => doc(cle, "projet"));
  for (const VITE_BILLING_ACTIF of [undefined, "", "   ", "false", "FALSE", "0", "1", "oui"]) {
    assert.deepEqual(controle({ documents, env: { VITE_BILLING_ACTIF } }), [], String(VITE_BILLING_ACTIF));
  }
  assert.deepEqual(controle({ documents, env: {} }), []);
});

test("développement non bloqué ; la maquette n'exempte plus un build (elle n'existe pas dans un build)", () => {
  const documents = DOCUMENTS_REQUIS.map((cle) => doc(cle, "projet"));
  const env = { VITE_BILLING_ACTIF: "true" };
  assert.deepEqual(controle({ documents, env, commande: "serve", mode: "development" }), []);
  // vite preview : commande « serve » en mode production.
  assert.deepEqual(controle({ documents, env, commande: "serve" }), []);
  assert.deepEqual(controle({ documents, env, mode: "development" }), []);
  for (const VITE_BILLING_MOCK of ["true", " TRUE ", "false", undefined]) {
    assert.equal(controle({ documents, env: { ...env, VITE_BILLING_MOCK } }).length, 6, String(VITE_BILLING_MOCK));
  }
});

test("chaque document contractuel en projet bloque, et le problème le nomme", () => {
  for (const cle of DOCUMENTS_REQUIS) {
    const problemes = controle({ documents: remplacer(documentsValides(), doc(cle, "projet")) });
    assert.equal(problemes.length, 1, cle);
    assert.match(problemes[0], new RegExp(`« ${cle} » \\(version 1\\.0\\) a encore le statut « projet »`));
  }
  assert.deepEqual(DOCUMENTS_REQUIS, ["cgv", "accord-sous-traitance", "cgu-app"]);
});

test("un autre document en projet ne bloque pas", () => {
  assert.deepEqual(controle({ documents: [...documentsValides(), doc("mentions-legales", "projet"), doc("cookies", "projet")] }), []);
});

test("seule compte la version en vigueur", () => {
  const versions = [{ version: "0.1", statut: "projet" }, { version: "1.0", statut: "publie" }];
  assert.deepEqual(controle({ documents: remplacer(documentsValides(), doc("cgv", "", { versionEnVigueur: "1.0", versions })) }), []);
  const problemes = controle({ documents: remplacer(documentsValides(), doc("cgv", "", { versionEnVigueur: "0.1", versions })) });
  assert.equal(problemes.length, 1);
  assert.match(problemes[0], /version 0\.1/);
});

test("le doute bloque : document absent, version en vigueur inconnue, statut inconnu ou absent", () => {
  const sansCgv = documentsValides().filter((d) => d.document !== "cgv");
  assert.match(controle({ documents: sansCgv })[0], /« cgv » est absent/);
  const orpheline = doc("cgv", "publie", { versionEnVigueur: "9.9" });
  assert.match(controle({ documents: remplacer(documentsValides(), orpheline) })[0], /version en vigueur connue/);
  for (const statut of ["brouillon", "Projet", "PROJET", "", undefined]) {
    assert.match(controle({ documents: remplacer(documentsValides(), doc("cgu-app", statut)) })[0], /statut inconnu/, String(statut));
  }
});

test("adresses vides : même lecture que le site, espaces et / seuls comptent pour vide", () => {
  for (const nom of ["VITE_API_URL", "VITE_APP_WEB_URL", "VITE_COMPTE_URL"]) {
    for (const valeur of [undefined, "", "   ", "/", " // "]) {
      const problemes = controle({ env: { ...ENV_VENTE, [nom]: valeur } });
      assert.deepEqual(problemes, [`${nom} est vide`], `${nom}=${String(valeur)}`);
    }
  }
  const sansRien = controle({ env: { VITE_BILLING_ACTIF: "true" } });
  assert.deepEqual(sansRien, ["VITE_API_URL est vide", "VITE_APP_WEB_URL est vide", "VITE_COMPTE_URL est vide"]);
  // Écriture de l'interrupteur tolérée par le site : le garde-fou la voit aussi.
  assert.equal(controle({ env: { VITE_BILLING_ACTIF: " True " } }).length, 3);
});

test("le garde-fou lit les variables comme src/lib/billing/config.js", async () => {
  const noms = ["VITE_BILLING_ACTIF", "VITE_BILLING_MOCK", "VITE_API_URL", "VITE_APP_WEB_URL", "VITE_COMPTE_URL"];
  const sauvegarde = Object.fromEntries(noms.map((nom) => [nom, process.env[nom]]));
  const valeursInterrupteur = ["true", "TRUE", " true ", "false", "", "1", "oui"];
  const valeursAdresse = ["https://api.exemple.fr/v1", "https://api.exemple.fr/v1/", "", "   ", "/", " // "];
  let cas = 0;
  try {
    for (const valeur of valeursInterrupteur) {
      process.env.VITE_BILLING_MOCK = "false";
      process.env.VITE_API_URL = "";
      process.env.VITE_APP_WEB_URL = "";
      process.env.VITE_BILLING_ACTIF = valeur;
      const config = await import(`../src/lib/billing/config.js?interrupteur=${cas++}`);
      const controlee = problemesVente({ commande: "build", mode: "production", env: { ...process.env }, documents: documentsValides() }).length > 0;
      assert.equal(controlee, config.BILLING_ACTIF, `interrupteur « ${valeur} »`);

      // Maquette : sans effet sur le garde-fou, quelle que soit son écriture (elle n'existe pas dans un build).
      process.env.VITE_BILLING_ACTIF = "true";
      process.env.VITE_BILLING_MOCK = valeur;
      const controleeMalgreMaquette = problemesVente({ commande: "build", mode: "production", env: { ...process.env }, documents: documentsValides() }).length > 0;
      assert.equal(controleeMalgreMaquette, true, `maquette « ${valeur} »`);
    }
    process.env.VITE_BILLING_ACTIF = "true";
    process.env.VITE_BILLING_MOCK = "false";
    process.env.VITE_APP_WEB_URL = "https://app.exemple.fr";
    process.env.VITE_COMPTE_URL = "https://compte.exemple.fr";
    for (const valeur of valeursAdresse) {
      process.env.VITE_API_URL = valeur;
      const config = await import(`../src/lib/billing/config.js?adresse=${cas++}`);
      const vide = problemesVente({ commande: "build", mode: "production", env: { ...process.env }, documents: documentsValides() }).length > 0;
      assert.equal(vide, config.API_URL === "", `adresse « ${valeur} »`);
    }
  } finally {
    for (const nom of noms) {
      if (sauvegarde[nom] === undefined) delete process.env[nom];
      else process.env[nom] = sauvegarde[nom];
    }
  }
});

test("message clair : il dit ce qui bloque, où lire la suite et comment compiler sans la vente", () => {
  const message = messageGardeFou(controle({ documents: remplacer(documentsValides(), doc("cgv", "projet")), env: { VITE_BILLING_ACTIF: "true" } }));
  assert.match(message, /^Build de production refusé/);
  assert.match(message, /« cgv »/);
  assert.match(message, /VITE_API_URL est vide/);
  assert.match(message, /VITE_APP_WEB_URL est vide/);
  assert.match(message, /Avant d'activer la vente/);
  assert.match(message, /retirez VITE_BILLING_ACTIF/);
});

test("vite.config.js branche le garde-fou : il arrête le build de production, pas le développement", async () => {
  const { resolveConfig } = await import("vite");
  const noms = ["VITE_BILLING_ACTIF", "VITE_BILLING_MOCK", "VITE_API_URL", "VITE_APP_WEB_URL", "NODE_ENV"];
  const sauvegarde = Object.fromEntries(noms.map((nom) => [nom, process.env[nom]]));
  // Les variables du processus passent devant .env.local : le résultat ne dépend pas du poste.
  Object.assign(process.env, { VITE_BILLING_ACTIF: "true", VITE_BILLING_MOCK: "false", VITE_API_URL: "", VITE_APP_WEB_URL: "" });
  try {
    await assert.rejects(resolveConfig({ logLevel: "silent" }, "build", "production"), /Build de production refusé[\s\S]*VITE_API_URL est vide/);
    await resolveConfig({ logLevel: "silent" }, "serve", "development");
    process.env.VITE_BILLING_MOCK = "true";
    await assert.rejects(resolveConfig({ logLevel: "silent" }, "build", "production"), /Build de production refusé/);
    process.env.VITE_BILLING_MOCK = "false";
    process.env.VITE_BILLING_ACTIF = "";
    await resolveConfig({ logLevel: "silent" }, "build", "production");
  } finally {
    for (const nom of noms) {
      if (sauvegarde[nom] === undefined) delete process.env[nom];
      else process.env[nom] = sauvegarde[nom];
    }
  }
});

test("workflow de production : il transmet l'interrupteur et les adresses, jamais la maquette", () => {
  const workflow = readFileSync(".github/workflows/deploy-production.yml", "utf8");
  assert.match(workflow, /run: npm run build/);
  for (const nom of ["VITE_BILLING_ACTIF", "VITE_API_URL", "VITE_APP_WEB_URL", "VITE_COMPTE_URL", "VITE_SITE_URL"]) {
    assert.ok(workflow.includes(`${nom}: \${{ vars.${nom} }}`), nom);
  }
  assert.ok(!workflow.includes("VITE_BILLING_MOCK"));
});

test("VITE_BILLING_MOCK dans un build : avertissement (sans effet, le build appelle la vraie API)", async () => {
  const { avertissementMaquette } = await import("./garde-fou-vente.mjs");
  const actif = { VITE_BILLING_ACTIF: "true", VITE_BILLING_MOCK: "true" };
  assert.match(avertissementMaquette({ commande: "build", env: actif }), /aucun effet dans un build[\s\S]*vraie API/);
  assert.match(avertissementMaquette({ commande: "build", env: { VITE_BILLING_MOCK: "true" } }), /aucun effet/);
  assert.equal(avertissementMaquette({ commande: "serve", env: actif }), null);
  assert.equal(avertissementMaquette({ commande: "build", env: { VITE_BILLING_ACTIF: "true" } }), null);
  assert.equal(avertissementMaquette({ commande: "build", env: {} }), null);
});

test("la maquette n'existe que sous le serveur de développement (config.js)", async () => {
  const source = readFileSync("src/lib/billing/config.js", "utf8");
  assert.match(source, /const DEVELOPPEMENT = typeof __MAQUETTE_POSSIBLE__ === "undefined" \? true : __MAQUETTE_POSSIBLE__;/);
  assert.match(source, /export const BILLING_MOCK = DEVELOPPEMENT && vrai\(env\.VITE_BILLING_MOCK\);/);
});

// Build compte (compte.restoclair.fr) : il ne sert qu'à la vente, il est donc contrôlé même sans VITE_BILLING_ACTIF.
const ENV_COMPTE = { VITE_API_URL: "https://api.exemple.fr/v1", VITE_SITE_URL: "https://site.exemple.fr", VITE_COMPTE_URL: "https://compte.exemple.fr" };
const controleCompte = (surcharge = {}) => controle({ build: "compte", env: ENV_COMPTE, ...surcharge });

test("compte prêt : documents validés et adresses du compte renseignées, sans VITE_BILLING_ACTIF ni VITE_APP_WEB_URL", () => {
  assert.deepEqual(controleCompte(), []);
  assert.deepEqual(controleCompte({ env: { ...ENV_COMPTE, VITE_BILLING_ACTIF: "false" } }), []);
});

test("compte : contrôlé même sans VITE_BILLING_ACTIF ; documents en projet et adresses vides bloquent", () => {
  const documents = DOCUMENTS_REQUIS.map((cle) => doc(cle, "projet"));
  assert.equal(controleCompte({ documents, env: {} }).length, 6);
  for (const nom of ["VITE_API_URL", "VITE_SITE_URL", "VITE_COMPTE_URL"]) {
    assert.deepEqual(controleCompte({ env: { ...ENV_COMPTE, [nom]: " / " } }), [`${nom} est vide`], nom);
  }
});

test("compte : développement et site de test non bloqués ; la maquette n'exempte pas la production", () => {
  const documents = DOCUMENTS_REQUIS.map((cle) => doc(cle, "projet"));
  assert.deepEqual(controleCompte({ documents, env: {}, mode: "test" }), []);
  assert.deepEqual(controleCompte({ documents, env: {}, commande: "serve", mode: "development" }), []);
  assert.equal(controleCompte({ documents, env: { VITE_BILLING_MOCK: "true" } }).length, 6);
});

test("compte : message propre au compte ; build inconnu refusé", () => {
  const message = messageGardeFou(controleCompte({ env: {} }), "compte");
  assert.match(message, /^Build de production du compte refusé/);
  assert.match(message, /VITE_SITE_URL est vide/);
  assert.doesNotMatch(message, /retirez VITE_BILLING_ACTIF/);
  assert.deepEqual(controle({ build: "autre" }), ["build inconnu : « autre »"]);
});

test("compte de production : adresses en https seulement (une adresse de test ne passe pas)", () => {
  assert.deepEqual(controleCompte({ env: { ...ENV_COMPTE, VITE_SITE_URL: "http://localhost:4303" } }), ["VITE_SITE_URL doit commencer par https:// (« http://localhost:4303 »)"]);
  assert.equal(controleCompte({ env: { VITE_API_URL: "http://api", VITE_SITE_URL: "https://", VITE_COMPTE_URL: "ftp://compte" } }).length, 3);
  // En mode test, les adresses locales sont normales.
  assert.deepEqual(controleCompte({ mode: "test", env: { ...ENV_COMPTE, VITE_SITE_URL: "http://localhost:4303" } }), []);
  // La vitrine garde sa règle : adresse non vide.
  assert.deepEqual(controle({ env: { ...ENV_VENTE, VITE_API_URL: "http://localhost:3000" } }), []);
});
