// Tests du passage en 1.0 : `npm test`. Tout se fait sur une copie temporaire des documents.
import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { empreinteTexteLegal, lireDocuments, lireTexte, RACINE_LEGALE } from "./legal.mjs";
import { defautsDePublication, passerEnVersion, preparerTexte, squelette, versionValide } from "./passer-en-1-0.mjs";

const copie = () => {
  const dossier = mkdtempSync(join(tmpdir(), "legal-1-0-"));
  cpSync(RACINE_LEGALE, dossier, { recursive: true });
  return dossier;
};

// Les renvois des conditions acheteurs publics vers les versions 0.2, à mettre à jour avec le reste.
const RENVOIS = (racine) => {
  const texte = lireTexte("conditions-acheteurs-publics", "0.1", racine);
  const ligne = texte.split("\n").find((l) => l.includes("(version 0.2)"));
  return ligne ? [{ document: "conditions-acheteurs-publics", avant: ligne, apres: ligne.replace(/\/0\.2\)/g, "/1.0)").replace(/\(version 0\.2\)/g, "(version 1.0)") }] : [];
};

test("préparation : marque retirée, passage remplacé, bandeau retiré, ligne de version à jour", () => {
  const source = "# T\n\nVersion 0.2 — 10 novembre 2026\n\n> **Projet à faire relire par un avocat.** Texte.\n\n## 1\n\nUn engagement. `[À VALIDER PAR L’AVOCAT : x]`\n\nAncienne phrase.\n";
  const { texte, problemes } = preparerTexte(source, {
    version: "1.0",
    enVigueurLe: "2026-11-15",
    remplacements: [{ retirerMarque: "À VALIDER PAR L’AVOCAT : x" }, { avant: "Ancienne phrase.", apres: "Nouvelle phrase." }],
  });
  assert.deepEqual(problemes, []);
  assert.equal(texte, "# T\n\nVersion 1.0 — 15 novembre 2026\n\n## 1\n\nUn engagement.\n\nNouvelle phrase.\n");
});

test("préparation : marque oubliée, passage introuvable ou en double, renvoi vers une version de travail", () => {
  const source = "# T\n\nVersion 0.2 — 10 novembre 2026\n\nA. `[À CONFIRMER : y]` B. B. Voir les [CGV](/cgv/0.2) (version 0.2).\n";
  const { problemes } = preparerTexte(source, { version: "1.0", enVigueurLe: "2026-11-15", remplacements: [{ avant: "B." }, { avant: "absent" }] });
  assert.ok(problemes.some((p) => /trouvé 2 fois/.test(p)));
  assert.ok(problemes.some((p) => /trouvé 0 fois/.test(p)));
  assert.ok(problemes.some((p) => /code/.test(p)));
  assert.ok(problemes.some((p) => /renvoi « \[À/.test(p)));
  assert.ok(problemes.some((p) => /version de travail : « version 0\.2 »/.test(p)));
  assert.ok(problemes.some((p) => /lien vers une version de travail : « \/cgv\/0\.2 »/.test(p)));
  assert.throws(() => preparerTexte(source, { version: "1.0", enVigueurLe: "15/11/2026" }), /date invalide/);
});

test("version : une chaîne exacte comme \"1.0\", jamais un nombre ni « 1 » ni « 1.00 » (Apirest compare la chaîne)", () => {
  assert.equal(versionValide("1.0"), true);
  assert.equal(versionValide("2.1"), true);
  for (const refusee of [1, 1.0, "1", "1.00", " 1.0", "1.0 ", "01.0", "v1.0", "", null, undefined]) assert.equal(versionValide(refusee), false, JSON.stringify(refusee));
  for (const version of [1, "1", "1.00"]) {
    assert.throws(() => passerEnVersion({ choix: { version, enVigueurLe: "2026-11-15", remplacements: [] } }), /chaîne exacte/, JSON.stringify(version));
  }
});

test("squelette : une entrée par marque des versions en vigueur", () => {
  const nombre = lireDocuments().reduce((n, d) => n + [...lireTexte(d.document, d.versionEnVigueur).matchAll(/`\[À [^`]*\]`/g)].length, 0);
  assert.equal(squelette().remplacements.length, nombre);
});

test("essai : rien n'est écrit, et un choix incomplet est refusé", () => {
  const racine = copie();
  try {
    const avant = readFileSync(join(racine, "documents.json"), "utf8");
    const incomplet = passerEnVersion({ racine, choix: { enVigueurLe: "2026-11-15", remplacements: [] }, ecrire: true });
    assert.equal(incomplet.ecrit, false);
    assert.ok(incomplet.problemes.length > 0);
    assert.equal(readFileSync(join(racine, "documents.json"), "utf8"), avant);
    assert.equal(existsSync(join(racine, "cgv", "1.0.md")), false);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("écriture complète sur une copie : 1.0 publiées, empreintes enregistrées, règles de publication respectées", () => {
  const racine = copie();
  try {
    const choix = { ...squelette(racine), remplacements: [...squelette(racine).remplacements, ...RENVOIS(racine)] };
    const essai = passerEnVersion({ racine, choix });
    assert.deepEqual(essai.problemes, []);
    assert.equal(essai.ecrit, false);
    const resultat = passerEnVersion({ racine, choix, ecrire: true });
    assert.equal(resultat.ecrit, true);
    for (const doc of lireDocuments(racine)) {
      assert.equal(doc.versionEnVigueur, "1.0");
      const v = doc.versions.find((x) => x.version === "1.0");
      assert.equal(v.statut, "publie");
      const texte = lireTexte(doc.document, "1.0", racine);
      assert.equal(empreinteTexteLegal(texte), v.sha256, doc.document);
      assert.deepEqual(defautsDePublication(texte), [], doc.document);
      assert.match(texte, /Version 1\.0 — 15 novembre 2026/);
    }
    assert.equal(resultat.index.length, lireDocuments(racine).length);
    assert.ok(resultat.index.every((e) => e.version === "1.0" && typeof e.version === "string" && e.statut === "publie"));
    // Dans documents.json écrit, la version est bien la chaîne "1.0" (pas le nombre 1).
    const brut = readFileSync(join(racine, "documents.json"), "utf8");
    assert.equal((brut.match(/"versionEnVigueur": "1\.0"/g) ?? []).length, lireDocuments(racine).length);
    assert.equal((brut.match(/"version": "1\.0"/g) ?? []).length, lireDocuments(racine).length);
    // Une seconde fois : la 1.0 existe déjà, rien n'est écrit.
    assert.ok(passerEnVersion({ racine, choix, ecrire: true }).problemes.some((p) => /existe déjà/.test(p)));
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});
