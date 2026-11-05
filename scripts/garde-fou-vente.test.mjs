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

const ENV_VENTE = { VITE_BILLING_ACTIF: "true", VITE_API_URL: "https://api.exemple.fr/v1", VITE_APP_WEB_URL: "https://app.exemple.fr" };
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

test("développement et maquette ne sont pas bloqués", () => {
  const documents = DOCUMENTS_REQUIS.map((cle) => doc(cle, "projet"));
  const env = { VITE_BILLING_ACTIF: "true" };
  assert.deepEqual(controle({ documents, env, commande: "serve", mode: "development" }), []);
  // vite preview : commande « serve » en mode production.
  assert.deepEqual(controle({ documents, env, commande: "serve" }), []);
  assert.deepEqual(controle({ documents, env, mode: "development" }), []);
  for (const VITE_BILLING_MOCK of ["true", " TRUE "]) {
    assert.deepEqual(controle({ documents, env: { ...env, VITE_BILLING_MOCK } }), [], VITE_BILLING_MOCK);
  }
  // Une maquette éteinte ne protège de rien.
  assert.equal(controle({ documents, env: { ...env, VITE_BILLING_MOCK: "false" } }).length, 5);
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
  for (const nom of ["VITE_API_URL", "VITE_APP_WEB_URL"]) {
    for (const valeur of [undefined, "", "   ", "/", " // "]) {
      const problemes = controle({ env: { ...ENV_VENTE, [nom]: valeur } });
      assert.deepEqual(problemes, [`${nom} est vide`], `${nom}=${String(valeur)}`);
    }
  }
  const sansRien = controle({ env: { VITE_BILLING_ACTIF: "true" } });
  assert.deepEqual(sansRien, ["VITE_API_URL est vide", "VITE_APP_WEB_URL est vide"]);
  // Écriture de l'interrupteur tolérée par le site : le garde-fou la voit aussi.
  assert.equal(controle({ env: { VITE_BILLING_ACTIF: " True " } }).length, 2);
});

test("le garde-fou lit les variables comme src/lib/billing/config.js", async () => {
  const noms = ["VITE_BILLING_ACTIF", "VITE_BILLING_MOCK", "VITE_API_URL", "VITE_APP_WEB_URL"];
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

      process.env.VITE_BILLING_ACTIF = "true";
      process.env.VITE_BILLING_MOCK = valeur;
      const maquette = await import(`../src/lib/billing/config.js?maquette=${cas++}`);
      const passe = problemesVente({ commande: "build", mode: "production", env: { ...process.env }, documents: documentsValides() }).length === 0;
      assert.equal(passe, maquette.BILLING_MOCK, `maquette « ${valeur} »`);
    }
    process.env.VITE_BILLING_ACTIF = "true";
    process.env.VITE_BILLING_MOCK = "false";
    process.env.VITE_APP_WEB_URL = "https://app.exemple.fr";
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
    await resolveConfig({ logLevel: "silent" }, "build", "production");
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
  for (const nom of ["VITE_BILLING_ACTIF", "VITE_API_URL", "VITE_APP_WEB_URL"]) {
    assert.ok(workflow.includes(`${nom}: \${{ vars.${nom} }}`), nom);
  }
  assert.ok(!workflow.includes("VITE_BILLING_MOCK"));
});

test("maquette en production : le build passe, mais avec un avertissement", async () => {
  const { avertissementMaquette } = await import("./garde-fou-vente.mjs");
  const actif = { VITE_BILLING_ACTIF: "true", VITE_BILLING_MOCK: "true" };
  assert.match(avertissementMaquette({ commande: "build", mode: "production", env: actif }), /simule le paiement/);
  assert.equal(avertissementMaquette({ commande: "serve", mode: "development", env: actif }), null);
  assert.equal(avertissementMaquette({ commande: "build", mode: "production", env: { VITE_BILLING_ACTIF: "true" } }), null);
  assert.equal(avertissementMaquette({ commande: "build", mode: "production", env: {} }), null);
});
