// Tests des textes de /tarifs qui dépendent du catalogue : `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import { lireCatalogue } from "./api.js";
import { mockCatalogue } from "./mock.js";
import { modulesAffichage } from "./pricing.js";
import { atoutsTarifs, intituleModules, questionsTarifs } from "./textes-tarifs.js";

const SANS_PMS = lireCatalogue(mockCatalogue(false));
const AVEC_PMS = lireCatalogue(mockCatalogue(true));

const titresAtouts = (catalogue) => atoutsTarifs(catalogue).map(([titre]) => titre);
const reponse = (catalogue, debut) => questionsTarifs(catalogue).find((q) => q.question.startsWith(debut))?.reponse;
const toutLeTexte = (catalogue) =>
  [...atoutsTarifs(catalogue).flat(), ...questionsTarifs(catalogue).flatMap((q) => [q.question, q.reponse])].join("\n");

test("sans version engagée : le texte de la mission, sans mention de l'engagement de 12 mois", () => {
  assert.deepEqual(titresAtouts(SANS_PMS), ["Équipiers illimités", "Sans engagement", "Paiement sécurisé"]);
  assert.equal(atoutsTarifs(SANS_PMS)[1][1], "Les formules mensuelles se résilient depuis votre espace client.");
  assert.equal(reponse(SANS_PMS, "Y a-t-il"), "Les formules mensuelles sont sans engagement. La formule annuelle est payée d’avance pour douze mois.");
  assert.equal(
    reponse(SANS_PMS, "Comment résilier"),
    "Depuis votre espace client. Après la résiliation, vos données restent consultables pendant deux mois en lecture seule, avec un export complet, puis elles sont supprimées."
  );
  assert.ok(!/12 mois|PMS/.test(toutLeTexte(SANS_PMS)));
});

test("avec mensuel_engage : plus aucune phrase « sans engagement » générale", () => {
  assert.deepEqual(titresAtouts(AVEC_PMS), ["Équipiers illimités", "Avec ou sans engagement", "Paiement sécurisé"]);
  const texte = toutLeTexte(AVEC_PMS);
  assert.ok(!texte.includes("Les formules mensuelles sont sans engagement"));
  assert.ok(!texte.includes("Les formules mensuelles se résilient"));
  assert.ok(!titresAtouts(AVEC_PMS).includes("Sans engagement"));
  const engagement = reponse(AVEC_PMS, "Y a-t-il");
  assert.match(engagement, /engage pour 12 mois/);
  assert.match(engagement, /fin de l’engagement/);
  assert.match(engagement, /reconduit automatiquement pour 12 mois, sauf résiliation demandée avant l’échéance/);
  assert.match(engagement, /La formule annuelle est payée d’avance/);
  assert.match(reponse(AVEC_PMS, "Comment résilier"), /Avec un engagement, la résiliation prend effet à la fin de celui-ci/);
});

test("version engagée reçue sans PMS disponible : écartée, le texte reste « sans engagement »", () => {
  const intrus = { ...AVEC_PMS, pmsDisponible: false };
  assert.deepEqual(titresAtouts(intrus), ["Équipiers illimités", "Sans engagement", "Paiement sécurisé"]);
  assert.ok(!/12 mois/.test(toutLeTexte(intrus)));
});

test("l'engagement se lit aussi dans engagementMois, avec la durée du catalogue", () => {
  const offres = SANS_PMS.offres.map((o) => ({ ...o, versions: o.versions.map((v) => (v.cle === "mensuel" && o.cle === "expert" ? { ...v, engagementMois: 24 } : v)) }));
  const catalogue = { ...SANS_PMS, offres };
  assert.ok(titresAtouts(catalogue).includes("Avec ou sans engagement"));
  assert.match(reponse(catalogue, "Y a-t-il"), /engage pour 24 mois/);
  assert.match(atoutsTarifs(catalogue)[1][1], /engagement de 24 mois/);
});

test("mensuel_engage sans durée lisible : 12 mois, la durée de l'article 7 des CGV, jamais « 0 mois »", () => {
  const offres = AVEC_PMS.offres.map((o) => ({ ...o, versions: o.versions.map((v) => ({ ...v, engagementMois: 0 })) }));
  const catalogue = { ...AVEC_PMS, offres };
  assert.match(reponse(catalogue, "Y a-t-il"), /engage pour 12 mois/);
  assert.ok(!toutLeTexte(catalogue).includes("0 mois"));
});

test("toutes les mensuelles engagées : ni « sans engagement », ni « au choix »", () => {
  const offres = AVEC_PMS.offres
    .filter((o) => o.cle !== "essentiel")
    .map((o) => ({ ...o, versions: o.versions.filter((v) => v.cle !== "mensuel" && v.periode === "mois") }));
  const catalogue = { ...AVEC_PMS, offres };
  assert.deepEqual(titresAtouts(catalogue), ["Équipiers illimités", "Engagement de 12 mois", "Paiement sécurisé"]);
  assert.ok(!/sans engagement|Cela dépend/i.test(toutLeTexte(catalogue)));
});

test("pas de version annuelle au catalogue : aucune phrase sur l'annuel", () => {
  const offres = SANS_PMS.offres.map((o) => ({ ...o, versions: o.versions.filter((v) => v.periode !== "an") }));
  const catalogue = { ...SANS_PMS, offres };
  assert.equal(reponse(catalogue, "Y a-t-il"), "Les formules mensuelles sont sans engagement.");
});

test("annuel seul : pas de « sans engagement », la question ne parle que de l'annuel", () => {
  const offres = SANS_PMS.offres
    .filter((o) => o.cle === "serenite")
    .map((o) => ({ ...o, versions: o.versions.filter((v) => v.periode === "an") }));
  const catalogue = { ...SANS_PMS, offres };
  assert.deepEqual(titresAtouts(catalogue), ["Équipiers illimités", "Paiement sécurisé"]);
  assert.equal(reponse(catalogue, "Y a-t-il"), "La formule annuelle est payée d’avance pour douze mois.");
});

test("un annuel qui annonce engagementMois n'est pas présenté comme un mensuel engagé", () => {
  const offres = SANS_PMS.offres.map((o) => ({ ...o, versions: o.versions.map((v) => (v.periode === "an" ? { ...v, engagementMois: 12 } : v)) }));
  const catalogue = { ...SANS_PMS, offres };
  assert.ok(titresAtouts(catalogue).includes("Sans engagement"));
  assert.ok(!/Le mensuel avec engagement/.test(toutLeTexte(catalogue)));
});

test("sans catalogue (chargement ou panne) : rien sur l'engagement, le reste de la page demeure", () => {
  for (const catalogue of [undefined, null]) {
    assert.deepEqual(titresAtouts(catalogue), ["Équipiers illimités", "Paiement sécurisé"]);
    assert.equal(reponse(catalogue, "Y a-t-il"), undefined);
    assert.equal(questionsTarifs(catalogue).length, 4);
    assert.ok(!/engagement/i.test(toutLeTexte(catalogue)));
  }
});

test("intitulé des modules : suit la formule précédente du catalogue", () => {
  assert.equal(intituleModules("identiques", { nom: "Essentiel" }), "Les mêmes que l’Essentiel :");
  assert.equal(intituleModules("identiques", { nom: "Sérénité" }), "Les mêmes que le Sérénité :");
  assert.equal(intituleModules("plus", { nom: "Sérénité" }), "Tous les modules du Sérénité, plus :");
  assert.equal(intituleModules("plus", { nom: "Essentiel" }), "Tous les modules de l’Essentiel, plus :");
  assert.equal(intituleModules("plus", { nom: "Élite" }), "Tous les modules de l’Élite, plus :");
  assert.equal(intituleModules("complet", null), "Liste complète :");
});

test("intitulé des modules sur le catalogue : les textes de la mission", () => {
  const [essentiel, serenite, expert] = SANS_PMS.offres;
  const intitule = (offre, precedente) => intituleModules(modulesAffichage(SANS_PMS, offre, precedente).mode, precedente);
  assert.equal(intitule(essentiel, null), "Liste complète :");
  assert.equal(intitule(serenite, essentiel), "Les mêmes que l’Essentiel :");
  assert.equal(intitule(expert, serenite), "Tous les modules du Sérénité, plus :");
  // Sérénité absent du catalogue : l'Expert se compare à l'Essentiel, sans parler d'une formule disparue.
  assert.equal(intitule(expert, essentiel), "Tous les modules de l’Essentiel, plus :");
});
