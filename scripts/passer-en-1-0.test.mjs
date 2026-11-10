// Tests du passage en 1.0 : `npm test`. Tout se fait sur une copie temporaire des documents.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { empreinteTexteLegal, lireDocuments, lireTexte } from "./legal.mjs";
import { defautsDePublication, passerEnVersion, preparerTexte, squelette, versionSuperieure, versionValide } from "./passer-en-1-0.mjs";

// Documents fictifs, dans un dossier temporaire : les tests ne dépendent pas de l'état réel (0.2 en projet aujourd'hui,
// 1.0 publiées après samedi), sinon le workflow de déploiement, qui lance npm test, se bloquerait après la publication.
const BANDEAU = "> **Projet à faire relire par un avocat.** Texte de travail.\n\n";
const fixture = () => {
  const racine = mkdtempSync(join(tmpdir(), "legal-1-0-"));
  const documents = [
    { document: "cgv", chemin: "/cgv", titre: "CGV", portee: "site", versionEnVigueur: "0.2", versions: [{ version: "0.2", enVigueurLe: "2026-11-10", statut: "projet" }] },
    { document: "conditions-acheteurs-publics", chemin: "/conditions-acheteurs-publics", titre: "Acheteurs publics", portee: "site", versionEnVigueur: "0.1", versions: [{ version: "0.1", enVigueurLe: "2026-11-10", statut: "projet" }] },
    { document: "mentions-legales", chemin: "/MentionsLegales", titre: "Mentions", portee: "site", versionEnVigueur: "0.1", versions: [{ version: "0.1", enVigueurLe: "2026-11-03", statut: "projet" }] },
  ];
  writeFileSync(join(racine, "documents.json"), `${JSON.stringify(documents, null, 2)}\n`);
  const ecrire = (doc, version, texte) => {
    mkdirSync(join(racine, doc), { recursive: true });
    writeFileSync(join(racine, doc, `${version}.md`), texte);
  };
  ecrire("cgv", "0.2", `# CGV\n\nVersion 0.2 — 10 novembre 2026\n\n${BANDEAU}## 10.3\n\nRésiliation. \`[À VALIDER PAR L’AVOCAT]\`\n\n## 16\n\nSuspension. \`[À VALIDER PAR L’AVOCAT]\`\n\n## 22\n\nTransfert. \`[À VALIDER PAR L’AVOCAT : garantie du transfert]\`\n`);
  ecrire("conditions-acheteurs-publics", "0.1", `# Acheteurs publics\n\nVersion 0.1 — 10 novembre 2026\n\n${BANDEAU}## 2\n\n- Le contrat comprend les [CGV](/cgv/0.2) (version 0.2). \`[À CONFIRMER : compte bancaire]\`\n`);
  ecrire("mentions-legales", "0.1", `# Mentions\n\nVersion 0.1 — 3 novembre 2026\n\n${BANDEAU}## 1\n\nÉditeur.\n`);
  return racine;
};
const RENVOI = { document: "conditions-acheteurs-publics", avant: "[CGV](/cgv/0.2) (version 0.2)", apres: "[CGV](/cgv/1.0) (version 1.0)" };

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
  const racine = fixture();
  try {
    const avant = readFileSync(join(racine, "documents.json"), "utf8");
    const incomplet = passerEnVersion({ racine, choix: { enVigueurLe: "2026-11-15", remplacements: [] }, ecrire: true });
    assert.equal(incomplet.ecrit, false);
    assert.ok(incomplet.problemes.some((p) => /renvoi « \[À/.test(p)));
    assert.ok(incomplet.problemes.some((p) => /version de travail/.test(p)));
    assert.equal(readFileSync(join(racine, "documents.json"), "utf8"), avant);
    assert.equal(existsSync(join(racine, "cgv", "1.0.md")), false);
    // Même marque deux fois : il faut deux décisions.
    const uneSeule = passerEnVersion({ racine, choix: { enVigueurLe: "2026-11-15", remplacements: [{ document: "cgv", retirerMarque: "À VALIDER PAR L’AVOCAT" }] } });
    assert.ok(uneSeule.problemes.some((p) => /trouvée 2 fois pour 1 décision/.test(p)));
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("écriture complète sur une copie : 1.0 publiées, empreintes enregistrées, règles de publication respectées", () => {
  const racine = fixture();
  try {
    const choix = { ...squelette(racine), remplacements: [...squelette(racine).remplacements, RENVOI] };
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

test("jamais de republication : version existante, fichier déjà présent ou version inférieure refusés, rien n'est écrasé", () => {
  assert.equal(versionSuperieure("1.1", "1.0"), true);
  assert.equal(versionSuperieure("1.0", "0.2"), true);
  assert.equal(versionSuperieure("10.0", "9.9"), true);
  assert.equal(versionSuperieure("1.0", "1.0"), false);
  assert.equal(versionSuperieure("0.9", "1.0"), false);
  const racine = fixture();
  try {
    const choix = { ...squelette(racine), remplacements: [...squelette(racine).remplacements, RENVOI] };
    // Fichier 1.0.md déjà présent sans être déclaré : refusé, et le fichier reste tel quel.
    writeFileSync(join(racine, "mentions-legales", "1.0.md"), "texte déjà là\n");
    const orphelin = passerEnVersion({ racine, choix, ecrire: true });
    assert.equal(orphelin.ecrit, false);
    assert.ok(orphelin.problemes.some((p) => /1\.0\.md existe déjà sans être déclaré/.test(p)));
    assert.equal(readFileSync(join(racine, "mentions-legales", "1.0.md"), "utf8"), "texte déjà là\n");
    rmSync(join(racine, "mentions-legales", "1.0.md"));
    // Publication de la 1.0, puis tentative de republier la 1.0 avec un autre texte : refusée, empreinte inchangée.
    assert.equal(passerEnVersion({ racine, choix, ecrire: true }).ecrit, true);
    const empreinte = lireDocuments(racine).find((d) => d.document === "cgv").versions.find((v) => v.version === "1.0").sha256;
    const autre = passerEnVersion({ racine, choix: { version: "1.0", enVigueurLe: "2026-11-16", remplacements: [] }, ecrire: true });
    assert.equal(autre.ecrit, false);
    assert.ok(autre.problemes.some((p) => /ne se republie jamais/.test(p)));
    assert.equal(lireDocuments(racine).find((d) => d.document === "cgv").versions.find((v) => v.version === "1.0").sha256, empreinte);
    // Version inférieure à une version déjà déclarée : refusée.
    assert.ok(passerEnVersion({ racine, choix: { version: "0.9", enVigueurLe: "2026-11-16", remplacements: [] } }).problemes.some((p) => /n'est pas supérieure/.test(p)));
    // Une correction passe par la version suivante.
    const correction = passerEnVersion({ racine, choix: { version: "1.1", enVigueurLe: "2026-11-16", remplacements: [] }, ecrire: true });
    assert.deepEqual(correction.problemes, []);
    assert.ok(lireDocuments(racine).every((d) => d.versionEnVigueur === "1.1" && d.versions.some((v) => v.version === "1.0")));
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});
