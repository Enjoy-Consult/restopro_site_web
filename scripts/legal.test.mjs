// Tests des documents légaux : empreinte normalisée, index, immuabilité, règles des documents de l'application.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  RACINE_LEGALE,
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

test("documents de l'application : ni prix, ni abonnement payant, ni lien d'achat", () => {
  const interdits = [/€/, /\/tarifs/, /\/cgv/, /payant/i, /\bachat/i, /\bacheter/i, /\btarif/i, /\bprix\b/i, /stripe\.com/i, /\bcheckout\b/i];
  for (const doc of lireDocuments().filter((d) => d.portee === "application")) {
    for (const v of doc.versions) {
      const texte = lireTexte(doc.document, v.version);
      for (const motif of interdits) assert.ok(!motif.test(texte), `${doc.document} ${v.version} contient ${motif}`);
    }
  }
});

test("aucune trace de « RestoClair » dans le site", () => {
  const fichiers = ["index.html", "README.md", ...readdirSync("src", { recursive: true }).map((f) => join("src", f))].filter((f) => /\.(jsx?|md|html|json)$/.test(f));
  for (const f of fichiers) assert.ok(!readFileSync(f, "utf8").includes("RestoClair"), f);
});
