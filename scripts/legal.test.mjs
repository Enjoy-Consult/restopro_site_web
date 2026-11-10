// Tests des documents légaux : empreinte normalisée, index, immuabilité, règles des documents de l'application.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import {
  RACINE_LEGALE,
  STATUTS_ADMIS,
  construireHistorique,
  construireIndex,
  empreinteTexteLegal,
  lireDocuments,
  lireTexte,
  normaliserTexteLegal,
} from "./legal.mjs";

const sha = (t) => createHash("sha256").update(t, "utf8").digest("hex");

test("normalisation : UTF-8 sans BOM, fins de ligne \\n, sans le bandeau « projet », un seul \\n final", () => {
  const source = "﻿# Titre\r\n\r\nVersion 0.1\r\n\r\n> **Projet à faire relire par un avocat.** Texte\r\n> suite du bandeau\r\n\r\n## 1. Objet\r\n\r\nTexte.\r\n\r\n\r\n";
  assert.equal(normaliserTexteLegal(source), "# Titre\n\nVersion 0.1\n\n## 1. Objet\n\nTexte.\n");
  // Une autre citation est gardée.
  assert.equal(normaliserTexteLegal("# T\n\n> Citation\n\nFin"), "# T\n\n> Citation\n\nFin\n");
  // Même texte, fins de ligne différentes : même empreinte ; le bandeau n'entre pas dans l'empreinte.
  const avecBandeau = "# T\n\n> **Projet à faire relire par un avocat.**\n\nCorps\n";
  assert.equal(empreinteTexteLegal(avecBandeau), empreinteTexteLegal("# T\r\n\r\nCorps"));
  assert.equal(empreinteTexteLegal("# T\n\nCorps\n"), sha("# T\n\nCorps\n"));
});

test("index : une entrée par document, au format convenu, URL versionnées", () => {
  const index = construireIndex();
  const docs = lireDocuments();
  assert.equal(index.length, docs.length);
  for (const e of index) {
    assert.deepEqual(Object.keys(e).slice(0, 5), ["document", "version", "enVigueurLe", "sha256", "url"]);
    assert.match(e.enVigueurLe, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(e.sha256, /^[0-9a-f]{64}$/);
    const doc = docs.find((d) => d.document === e.document);
    assert.equal(e.url, `https://restoclair.fr${doc.chemin}/${e.version}`);
    assert.equal(e.sha256, empreinteTexteLegal(lireTexte(e.document, e.version)));
  }
  for (const id of ["cgv", "cgu-app", "confidentialite-app", "accord-sous-traitance", "mentions-legales", "confidentialite-site", "cookies"]) {
    assert.ok(index.some((e) => e.document === id), id);
  }
});

test("immuabilité : une version publiée (statut autre que « projet ») garde son empreinte enregistrée", () => {
  for (const doc of lireDocuments()) {
    assert.ok(doc.versions.some((v) => v.version === doc.versionEnVigueur), `${doc.document} : version en vigueur inconnue`);
    for (const v of doc.versions) {
      if (v.statut === "projet") continue;
      assert.match(v.sha256 ?? "", /^[0-9a-f]{64}$/, `${doc.document} ${v.version} : sha256 à enregistrer dans documents.json`);
      assert.equal(empreinteTexteLegal(lireTexte(doc.document, v.version)), v.sha256, `${doc.document} ${v.version} a été modifiée`);
    }
  }
  // Chaque fichier présent est déclaré (pas de version orpheline).
  for (const doc of lireDocuments()) {
    const fichiers = readdirSync(join(RACINE_LEGALE, doc.document)).filter((f) => f.endsWith(".md"));
    assert.deepEqual(fichiers.map((f) => f.slice(0, -3)).sort(), doc.versions.map((v) => v.version).sort());
  }
  assert.equal(construireHistorique().filter((e) => e.enVigueur).length, lireDocuments().length);
});

test("format : titre, version, bandeau « projet » tant que le statut est « projet »", () => {
  for (const doc of lireDocuments()) {
    for (const v of doc.versions) {
      const texte = lireTexte(doc.document, v.version);
      assert.match(texte, /^# .+\n/, `${doc.document} : titre`);
      assert.ok(texte.includes(`Version ${v.version}`), `${doc.document} : numéro de version`);
      if (v.statut === "projet") assert.ok(texte.includes("Projet à faire relire par un avocat"), `${doc.document} : bandeau`);
      assert.ok(!texte.includes("RestoClair"), `${doc.document} : écrire « RestOclair »`);
      assert.ok(!/^\|.*\|\s*$/m.test(texte), `${doc.document} : pas de tableau Markdown`);
    }
  }
});

test("statuts : chaque version a un statut de la liste admise", () => {
  assert.deepEqual(STATUTS_ADMIS, ["projet", "publie"]);
  for (const doc of lireDocuments()) {
    for (const v of doc.versions) assert.ok(STATUTS_ADMIS.includes(v.statut), `${doc.document} ${v.version} : statut « ${v.statut} »`);
  }
});

// Ce qui ne doit plus rester dans un texte publié. Même moteur que DocumentLegal.jsx, où chaque <code> du rendu
// devient une marque jaune : un code en ligne, un bloc entre ``` ou un bloc indenté.
function defautsPublication(texte) {
  const defauts = [];
  if (/projet (à faire relire|de travail)/i.test(texte)) defauts.push("bandeau");
  if (/<code[\s>]/.test(renderToStaticMarkup(createElement(ReactMarkdown, null, texte)))) defauts.push("marque jaune");
  if (/\[À [^\]]*\]/.test(texte)) defauts.push("renvoi à compléter");
  return defauts;
}

test("contrôle inverse : il repère le bandeau, les marques jaunes et les renvois, et laisse passer un texte propre", () => {
  assert.deepEqual(defautsPublication("# T\n\nVersion 1.0\n\n> Une citation\n\n## 1. Objet\n\nTexte et [lien](/cgv), avec [crochets].\n\n  - liste imbriquée\n"), []);
  assert.deepEqual(defautsPublication("# T\n\n> **Projet à faire relire par un avocat.** Texte.\n\nCorps\n"), ["bandeau"]);
  assert.deepEqual(defautsPublication("# T\n\nCe document est un projet de travail.\n"), ["bandeau"]);
  assert.deepEqual(defautsPublication("# T\n\nTexte `[À VALIDER PAR L’AVOCAT : motif]`\n"), ["marque jaune", "renvoi à compléter"]);
  assert.deepEqual(defautsPublication("# T\n\nTexte `autre chose`\n"), ["marque jaune"]);
  assert.deepEqual(defautsPublication("# T\n\n```\nbloc\n```\n"), ["marque jaune"]);
  assert.deepEqual(defautsPublication("# T\n\n    bloc indenté\n"), ["marque jaune"]);
  assert.deepEqual(defautsPublication("# T\n\nOublié [À CONFIRMER : durée]\n"), ["renvoi à compléter"]);
  // Sur les vrais textes : tant qu'une version est en projet, son bandeau est bien repéré.
  for (const doc of lireDocuments()) {
    for (const v of doc.versions.filter((version) => version.statut === "projet")) {
      assert.ok(defautsPublication(lireTexte(doc.document, v.version)).includes("bandeau"), `${doc.document} ${v.version}`);
    }
  }
});

test("hors statut « projet » : ni bandeau, ni marque jaune, ni renvoi à compléter", () => {
  for (const doc of lireDocuments()) {
    for (const v of doc.versions.filter((version) => version.statut !== "projet")) {
      assert.deepEqual(defautsPublication(lireTexte(doc.document, v.version)), [], `${doc.document} ${v.version}`);
    }
  }
});

test("documents de l'application : ni prix, ni abonnement payant, ni lien d'achat", () => {
  const interdits = [/€/, /\/tarifs/, /\/cgv/, /payant/i, /\bachat/i, /\bacheter/i, /\btarif/i, /\bprix\b/i, /stripe\.com/i, /\bcheckout\b/i];
  for (const doc of lireDocuments().filter((d) => d.portee === "application")) {
    for (const v of doc.versions) {
      const texte = lireTexte(doc.document, v.version);
      for (const motif of interdits) assert.ok(!motif.test(texte), `${doc.document} ${v.version} contient ${motif}`);
    }
  }
});

// Versions en vigueur des documents de l'application : le front les recopie dans les applications iOS et Android.
// L'abonnement y est régi par une phrase neutre (renvoi aux CGV) : ni moyen ni rythme de paiement, ni prestataire de
// paiement ; et les liens sont absolus, pour que le texte reste autonome hors du site.
test("documents de l'application en vigueur : ni moyen de paiement, ni lien relatif", () => {
  const interdits = [/SEPA/i, /stripe/i, /prélèvement/i, /\bmensuel/i, /\bannuel/i, /carte bancaire/i, /\bIBAN\b/, /\]\(\//];
  for (const doc of lireDocuments().filter((d) => d.portee === "application")) {
    const texte = lireTexte(doc.document, doc.versionEnVigueur);
    for (const motif of interdits) assert.ok(!motif.test(texte), `${doc.document} ${doc.versionEnVigueur} contient ${motif}`);
    assert.ok(texte.includes("L’abonnement de l’établissement est régi par les conditions générales de vente, acceptées par son titulaire."), doc.document);
  }
});

test("aucune trace de « RestoClair » dans le site", () => {
  const fichiers = ["index.html", "README.md", ...readdirSync("src", { recursive: true }).map((f) => join("src", f))].filter((f) => /\.(jsx?|md|html|json)$/.test(f));
  for (const f of fichiers) assert.ok(!readFileSync(f, "utf8").includes("RestoClair"), f);
});

test("index : les adresses suivent l'adresse du site donnée au build (site de test), production par défaut", async () => {
  const { adresseDuSite } = await import("./vite-plugins.mjs");
  const test_ = construireIndex(undefined, "http://localhost:4303");
  assert.ok(test_.every((e) => e.url.startsWith("http://localhost:4303/") && e.markdown.startsWith("http://localhost:4303/legal/")));
  assert.ok(construireIndex().every((e) => e.url.startsWith("https://restoclair.fr/")));
  assert.equal(adresseDuSite({ mode: "test", env: { VITE_SITE_URL: "http://localhost:4303/" } }), "http://localhost:4303");
  assert.equal(adresseDuSite({ mode: "production", env: {} }), "https://restoclair.fr");
  assert.equal(adresseDuSite({ mode: "production", env: { VITE_SITE_URL: " https://restoclair.fr/ " } }), "https://restoclair.fr");
  for (const fausse of ["http://localhost:4303", "https://restoclair.fr/chemin", "restoclair.fr"]) {
    assert.throws(() => adresseDuSite({ mode: "production", env: { VITE_SITE_URL: fausse } }), /https sans chemin/, fausse);
  }
});
