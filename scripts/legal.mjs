// Documents légaux : empreinte normalisée et index publiés (même calcul pour le site, l'app et Apirest).
// Usage : `node scripts/legal.mjs` affiche l'index des versions en vigueur ; `--historique` toutes les versions.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const RACINE_LEGALE = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "content", "legal");
export const SITE_URL = "https://restoclair.fr";
const AVERTISSEMENT = "Projet à faire relire par un avocat";

// Texte publié, normalisé :
// 1. décodé en UTF-8, sans marque d'ordre des octets (BOM) ;
// 2. fins de ligne converties en \n ;
// 3. sans le bandeau « projet » : le bloc de lignes consécutives commençant par « > » qui contient
//    « Projet à faire relire par un avocat », et la ligne vide qui le suit ;
// 4. terminé par exactement un \n.
export function normaliserTexteLegal(texte) {
  const lignes = texte.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");
  const sortie = [];
  for (let i = 0; i < lignes.length; i++) {
    if (lignes[i].startsWith(">")) {
      let fin = i;
      while (fin + 1 < lignes.length && lignes[fin + 1].startsWith(">")) fin++;
      const bloc = lignes.slice(i, fin + 1);
      if (bloc.some((l) => l.includes(AVERTISSEMENT))) {
        i = fin;
        if (i + 1 < lignes.length && lignes[i + 1] === "") i++;
        continue;
      }
    }
    sortie.push(lignes[i]);
  }
  return `${sortie.join("\n").replace(/\n+$/, "")}\n`;
}

// sha256 (hexadécimal, minuscules) des octets UTF-8 du texte normalisé.
export function empreinteTexteLegal(texte) {
  return createHash("sha256").update(normaliserTexteLegal(texte), "utf8").digest("hex");
}

export function lireDocuments(racine = RACINE_LEGALE) {
  return JSON.parse(readFileSync(join(racine, "documents.json"), "utf8"));
}

export function lireTexte(document, version, racine = RACINE_LEGALE) {
  return readFileSync(join(racine, document, `${version}.md`), "utf8");
}

// Une entrée par version : { document, version, enVigueurLe, sha256, url, markdown, statut, enVigueur }.
export function construireHistorique(racine = RACINE_LEGALE) {
  return lireDocuments(racine).flatMap((doc) =>
    doc.versions.map((v) => ({
      document: doc.document,
      version: v.version,
      enVigueurLe: v.enVigueurLe,
      sha256: empreinteTexteLegal(lireTexte(doc.document, v.version, racine)),
      url: `${SITE_URL}${doc.chemin}/${v.version}`,
      markdown: `${SITE_URL}/legal/${doc.document}/${v.version}.md`,
      statut: v.statut,
      enVigueur: v.version === doc.versionEnVigueur,
    }))
  );
}

// Index des versions en vigueur, au format convenu : [{ document, version, enVigueurLe, sha256, url }]
// (plus markdown et statut).
export function construireIndex(racine = RACINE_LEGALE) {
  return construireHistorique(racine)
    .filter((e) => e.enVigueur)
    .map(({ enVigueur: _enVigueur, ...e }) => e);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const resultat = process.argv.includes("--historique") ? construireHistorique() : construireIndex();
  process.stdout.write(`${JSON.stringify(resultat, null, 2)}\n`);
}
