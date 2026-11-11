// Tests des liens du build compte vers restoclair.fr : `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { adresseSite, liensDocuments } from "./liens.js";
import { CHEMINS_COMPTE } from "./chemins.js";

test("adresse complète vers le site, sans double barre ; rien sans VITE_SITE_URL", () => {
  assert.equal(adresseSite("https://restoclair.fr"), "https://restoclair.fr/");
  assert.equal(adresseSite("https://restoclair.fr/", "/cgv"), "https://restoclair.fr/cgv");
  assert.equal(adresseSite(" http://localhost:4303// ", "cgv/0.2"), "http://localhost:4303/cgv/0.2");
  for (const vide of [undefined, "", "  ", "/"]) assert.equal(adresseSite(vide, "/cgv"), null, String(vide));
});

const DOCUMENTS = JSON.parse(readFileSync(new URL("../content/legal/documents.json", import.meta.url), "utf8"));

test("pied de page : documents juridiques du site, par leur chemin de documents.json", () => {
  assert.deepEqual(
    liensDocuments("https://restoclair.fr", DOCUMENTS).map((l) => l.href),
    ["https://restoclair.fr/MentionsLegales", "https://restoclair.fr/cgv", "https://restoclair.fr/accord-sous-traitance", "https://restoclair.fr/confidentialite", "https://restoclair.fr/cookies"],
  );
  assert.deepEqual(liensDocuments("", DOCUMENTS), []);
});

test("adresses de compte.restoclair.fr : celles du fichier nginx de l'origine", () => {
  assert.deepEqual(Object.values(CHEMINS_COMPTE).sort(), ["/connexion", "/mon-abonnement", "/mot-de-passe", "/mot-de-passe-oublie"]);
});
