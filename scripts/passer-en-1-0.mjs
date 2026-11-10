// Passage des documents juridiques en version publiée (1.0), une fois les choix de Louis faits.
//
//   node scripts/passer-en-1-0.mjs --choix choix-1.0.json            essai : n'écrit rien, montre ce qui serait produit
//   node scripts/passer-en-1-0.mjs --choix choix-1.0.json --ecrire   écrit <document>/1.0.md et met à jour documents.json
//   node scripts/passer-en-1-0.mjs --squelette > choix-1.0.json      fichier de choix de départ : une entrée par marque
//
// Fichier de choix (JSON) :
//   { "version": "1.0", "enVigueurLe": "2026-11-15",
//     "remplacements": [
//       { "document": "cgv", "retirerMarque": "À VALIDER PAR L’AVOCAT : …" },     « garder » : on retire la marque seule
//       { "document": "cgv", "avant": "texte exact", "apres": "nouveau texte" }   « modifier » ou « retirer » (apres vide)
//     ] }
// Chaque marque et chaque « avant » doit se trouver exactement une fois dans la version en vigueur du document.
// Le résultat ne doit plus contenir ni bandeau « projet », ni texte en `code`, ni renvoi « [À … ] », ni mention d'une
// version de travail (« version 0.x ») : sinon rien n'est écrit, et la liste des problèmes est affichée.
// Les documents sans remplacement passent aussi en 1.0 (bandeau retiré), pour que tout l'ensemble soit publié d'un coup.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import { construireIndex, empreinteTexteLegal, lireDocuments, lireTexte, normaliserTexteLegal, RACINE_LEGALE } from "./legal.mjs";

const dateLongue = (iso) => {
  const date = new Date(`${iso}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso)) || Number.isNaN(date.getTime())) throw new Error(`date invalide : « ${iso} » (attendu AAAA-MM-JJ)`);
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
};

// Apirest compare la version comme une CHAÎNE EXACTE (« 1.0 », ni 1, ni « 1.00 ») : sinon 503 CGV_INDISPONIBLE.
// Forme admise : un entier, un point, un chiffre, en chaîne de caractères.
export function versionValide(version) {
  return typeof version === "string" && /^(0|[1-9]\d*)\.\d$/.test(version);
}

const occurrences = (texte, morceau) => (morceau ? texte.split(morceau).length - 1 : 0);

// Défauts d'un texte à publier (mêmes règles que scripts/legal.test.mjs, « hors statut projet »).
export function defautsDePublication(texte) {
  const defauts = [];
  if (/projet (à faire relire|de travail)/i.test(texte)) defauts.push("bandeau « projet » encore présent");
  // Même moteur que DocumentLegal.jsx : tout <code> du rendu deviendrait une marque jaune.
  if (/<code[\s>]/.test(renderToStaticMarkup(createElement(ReactMarkdown, null, texte)))) defauts.push("texte en code (marque jaune) encore présent");
  if (/\[À [^\]]*\]/.test(texte)) defauts.push("renvoi « [À … ] » encore présent");
  for (const m of texte.matchAll(/version 0\.\d+/gi)) defauts.push(`mention d'une version de travail : « ${m[0]} »`);
  for (const m of texte.matchAll(/\]\([^)]*\/0\.\d+\)/g)) defauts.push(`lien vers une version de travail : « ${m[0].slice(2, -1)} »`);
  return defauts;
}

// Prépare le texte d'une version publiée à partir de la version en vigueur. Fonction pure.
export function preparerTexte(source, { version, enVigueurLe, remplacements = [] }) {
  const problemes = [];
  let texte = source;
  // D'abord les passages remplacés (ils peuvent contenir une marque), puis les marques retirées.
  for (const r of remplacements.filter((x) => x.retirerMarque === undefined)) {
    const n = occurrences(texte, r.avant);
    if (n !== 1) {
      problemes.push(`passage trouvé ${n} fois : « ${String(r.avant ?? "").slice(0, 70)} »`);
      continue;
    }
    texte = texte.replace(r.avant, () => r.apres ?? "");
  }
  // Une même marque peut revenir plusieurs fois (« À VALIDER PAR L’AVOCAT » seul) : il faut autant d'entrées que
  // d'occurrences, toutes retirées.
  const parMarque = new Map();
  for (const r of remplacements.filter((x) => x.retirerMarque !== undefined)) parMarque.set(r.retirerMarque, (parMarque.get(r.retirerMarque) ?? 0) + 1);
  for (const [contenu, attendues] of parMarque) {
    const marque = `\`[${contenu}]\``;
    const n = occurrences(texte, marque);
    if (n !== attendues) {
      problemes.push(`marque trouvée ${n} fois pour ${attendues} décision(s) : « ${contenu.slice(0, 70)} »`);
      continue;
    }
    // La marque suit un mot ou une ponctuation : on retire aussi l'espace qui la précède.
    texte = texte.split(` ${marque}`).join("").split(marque).join("");
  }
  const ligneVersion = /^Version [0-9.]+ — .+$/m;
  if (!ligneVersion.test(texte)) problemes.push("ligne « Version … — date » introuvable");
  else texte = texte.replace(ligneVersion, `Version ${version} — ${dateLongue(enVigueurLe)}`);
  texte = normaliserTexteLegal(texte).replace(/\n{3,}/g, "\n\n");
  problemes.push(...defautsDePublication(texte));
  return { texte, problemes };
}

export function passerEnVersion({ choix, racine = RACINE_LEGALE, ecrire = false }) {
  const { version = "1.0", enVigueurLe, remplacements = [] } = choix;
  if (!enVigueurLe) throw new Error("enVigueurLe manque dans le fichier de choix");
  if (!versionValide(version)) {
    throw new Error(`version « ${JSON.stringify(version)} » refusée : écrire une chaîne exacte comme "1.0" (Apirest compare la chaîne)`);
  }
  const documents = lireDocuments(racine);
  const inconnus = remplacements.filter((r) => !documents.some((d) => d.document === r.document)).map((r) => r.document);
  const resultats = documents.map((doc) => {
    const source = lireTexte(doc.document, doc.versionEnVigueur, racine);
    const { texte, problemes } = preparerTexte(source, { version, enVigueurLe, remplacements: remplacements.filter((r) => r.document === doc.document) });
    if (doc.versions.some((v) => v.version === version)) problemes.push(`la version ${version} existe déjà`);
    return { doc, texte, problemes, sha256: empreinteTexteLegal(texte) };
  });
  const problemes = [...new Set(inconnus)].map((d) => `document inconnu dans les choix : « ${d} »`);
  for (const r of resultats) problemes.push(...r.problemes.map((p) => `${r.doc.document} : ${p}`));
  if (problemes.length > 0 || !ecrire) return { problemes, resultats, ecrit: false };

  for (const r of resultats) writeFileSync(join(racine, r.doc.document, `${version}.md`), r.texte, "utf8");
  const misAJour = documents.map((doc) => {
    const r = resultats.find((x) => x.doc.document === doc.document);
    return { ...doc, versionEnVigueur: version, versions: [...doc.versions, { version, enVigueurLe, statut: "publie", sha256: r.sha256 }] };
  });
  writeFileSync(join(racine, "documents.json"), `${JSON.stringify(misAJour, null, 2)}\n`, "utf8");
  // Relecture de ce qui est écrit : la version doit ressortir en chaîne exacte, partout.
  const index = construireIndex(racine);
  const ecarts = [
    ...lireDocuments(racine).filter((d) => d.versionEnVigueur !== version).map((d) => `${d.document} : versionEnVigueur ${JSON.stringify(d.versionEnVigueur)}`),
    ...index.filter((e) => e.version !== version).map((e) => `${e.document} : version de l'index ${JSON.stringify(e.version)}`),
    ...resultats.filter((r) => !lireTexte(r.doc.document, version, racine).includes(`\nVersion ${version} — `)).map((r) => `${r.doc.document} : ligne « Version ${version} — … » absente`),
  ];
  if (ecarts.length > 0) throw new Error(`version écrite différente de « ${version} » :\n  - ${ecarts.join("\n  - ")}`);
  return { problemes: [], resultats, ecrit: true, index };
}

// Squelette du fichier de choix : chaque marque de chaque version en vigueur, avec la décision « garder » par défaut.
export function squelette(racine = RACINE_LEGALE) {
  const remplacements = lireDocuments(racine).flatMap((doc) =>
    [...lireTexte(doc.document, doc.versionEnVigueur, racine).matchAll(/`\[(À [^`]*)\]`/g)].map((m) => ({ document: doc.document, retirerMarque: m[1] })),
  );
  return { version: "1.0", enVigueurLe: "2026-11-15", remplacements };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  if (args.includes("--squelette")) {
    process.stdout.write(`${JSON.stringify(squelette(), null, 2)}\n`);
  } else {
    const i = args.indexOf("--choix");
    if (i === -1 || !args[i + 1]) {
      console.error("usage : node scripts/passer-en-1-0.mjs --choix <fichier.json> [--ecrire] | --squelette");
      process.exit(2);
    }
    const { problemes, resultats, ecrit, index } = passerEnVersion({ choix: JSON.parse(readFileSync(args[i + 1], "utf8")), ecrire: args.includes("--ecrire") });
    for (const r of resultats) console.log(`${r.doc.document.padEnd(30)} ${r.sha256}`);
    if (problemes.length > 0) {
      console.error(["", "Rien n'est écrit. Problèmes :", ...problemes.map((p) => `  - ${p}`)].join("\n"));
      process.exit(1);
    }
    console.log(ecrit ? "\nVersions écrites, documents.json mis à jour. Index :\n" + JSON.stringify(index, null, 2) : "\nEssai correct : relancer avec --ecrire pour écrire.");
  }
}
