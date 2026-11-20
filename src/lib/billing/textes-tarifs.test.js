// Tests des textes de /tarifs qui dépendent du catalogue : `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import { lireCatalogue } from "./api.js";
import { mockCatalogue } from "./mock.js";
import { modulesAffichage } from "./pricing.js";
import { MENTION_EQUIPIERS, RENVOI_EQUIPIERS, atoutsTarifs, intituleModules, questionsTarifs } from "./textes-tarifs.js";

const SANS_PMS = lireCatalogue(mockCatalogue(false));
const AVEC_PMS = lireCatalogue(mockCatalogue(true));

const titresAtouts = (catalogue) => atoutsTarifs(catalogue).map(([titre]) => titre);
const reponse = (catalogue, debut) => questionsTarifs(catalogue).find((q) => q.question.startsWith(debut))?.reponse;
const toutLeTexte = (catalogue) =>
  [...atoutsTarifs(catalogue).flat(), ...questionsTarifs(catalogue).flatMap((q) => [q.question, q.reponse])].join("\n");

test("sans version engagée : le texte de la mission, sans mention de l'engagement de 12 mois", () => {
  assert.deepEqual(titresAtouts(SANS_PMS), ["Équipiers illimités et gratuits", "Sans engagement", "Paiement sécurisé"]);
  assert.equal(atoutsTarifs(SANS_PMS)[1][1], "Les formules mensuelles se résilient depuis votre espace abonnement ou depuis l’application web.");
  assert.equal(reponse(SANS_PMS, "Y a-t-il"), "Les formules mensuelles sont sans engagement. La formule annuelle est payée d’avance pour douze mois.");
  assert.equal(
    reponse(SANS_PMS, "Comment résilier"),
    "Depuis votre espace abonnement, sur le site, ou depuis l’application web. Après la résiliation, vos données restent consultables pendant deux mois en lecture seule, avec un export complet, puis elles sont supprimées."
  );
  assert.ok(!/12 mois|PMS/.test(toutLeTexte(SANS_PMS)));
});

test("avec mensuel_engage : plus aucune phrase « sans engagement » générale", () => {
  assert.deepEqual(titresAtouts(AVEC_PMS), ["Équipiers illimités et gratuits", "Avec ou sans engagement", "Paiement sécurisé"]);
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
  assert.deepEqual(titresAtouts(intrus), ["Équipiers illimités et gratuits", "Sans engagement", "Paiement sécurisé"]);
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
  assert.deepEqual(titresAtouts(catalogue), ["Équipiers illimités et gratuits", "Engagement de 12 mois", "Paiement sécurisé"]);
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
  assert.deepEqual(titresAtouts(catalogue), ["Équipiers illimités et gratuits", "Paiement sécurisé"]);
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
    assert.deepEqual(titresAtouts(catalogue), ["Équipiers illimités et gratuits", "Paiement sécurisé"]);
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

test("comptes supplémentaires : ajout par écrit au support, comme le disent les CGV en vigueur (article 4.2)", async () => {
  const { readFileSync } = await import("node:fs");
  const faq = questionsTarifs(lireCatalogue(mockCatalogue())).find((q) => q.question === "Puis-je ajouter des comptes supplémentaires ?");
  assert.match(faq.reponse, /le titulaire de l’abonnement peut en ajouter à tout moment en écrivant à contact@restoclair\.fr/);
  assert.doesNotMatch(faq.reponse, /espace abonnement/);
  const inscription = readFileSync("src/components/billing/AjoutComptes.jsx", "utf8");
  assert.match(inscription, /en ajouter plus tard en écrivant à \{BUSINESS\.email\}/);
  assert.doesNotMatch(inscription, /ajouter plus tard depuis votre espace abonnement/);
  // Tant que les CGV en vigueur renvoient l'ajout au support, la vitrine ne promet pas l'espace abonnement.
  const documents = JSON.parse(readFileSync("src/content/legal/documents.json", "utf8"));
  const cgv = documents.find((d) => d.document === "cgv");
  const texte = readFileSync(`src/content/legal/cgv/${cgv.versionEnVigueur}.md`, "utf8");
  assert.match(texte, /Seul le titulaire ajoute des comptes supplémentaires\. Il le demande au support RestOclair/);
});

test("équipiers : « Équipiers illimités et gratuits* » en gras sur chaque carte, renvoi sous les cartes, même formule partout", async () => {
  const { readFileSync } = await import("node:fs");
  assert.equal(MENTION_EQUIPIERS, "Équipiers illimités et gratuits");
  assert.equal(RENVOI_EQUIPIERS, "Les équipiers n’ont pas de connexion propre : ils signent leurs actions avec un code PIN, sur l’appareil de l’établissement.");
  // Carte : dans l'en-tête (hors du détail, qui ne s'affiche qu'à la demande), en gras, avec l'astérisque.
  const carte = readFileSync("src/components/billing/OffreCard.jsx", "utf8");
  const entete = carte.slice(carte.indexOf("{/* 1. Nom, prix et comptes inclus */}"), carte.indexOf("{/* 2. Version */}"));
  assert.match(entete, /<strong className="font-semibold">\{MENTION_EQUIPIERS\}\*<\/strong>/);
  assert.match(carte, /<Ligne label="Équipiers">Illimités et gratuits\*<\/Ligne>/);
  assert.doesNotMatch(carte, /sans supplément/);
  // Page : le renvoi est rendu une seule fois, après la piste des cartes et ses points de navigation, hors de la grille.
  const page = readFileSync("src/pages/Tarifs.jsx", "utf8");
  const piste = page.slice(page.indexOf("{catalogue.offres.map("), page.indexOf('aria-label="Choisir une formule"'));
  assert.ok(piste.length > 0 && !piste.includes("RENVOI_EQUIPIERS"), "pas de renvoi dans la piste des cartes");
  assert.ok(page.indexOf("* {RENVOI_EQUIPIERS}") > page.indexOf('aria-label="Choisir une formule"'));
  assert.equal(page.match(/\{RENVOI_EQUIPIERS\}/g).length, 1);
  // Atouts et FAQ : la même formule.
  for (const catalogue of [SANS_PMS, AVEC_PMS, null]) {
    assert.deepEqual(atoutsTarifs(catalogue)[0], [MENTION_EQUIPIERS, `Dans toutes les formules. ${RENVOI_EQUIPIERS}`]);
  }
  assert.match(reponse(SANS_PMS, "Que sont les équipiers"), /illimités et gratuits dans toutes les formules/);
  assert.doesNotMatch(toutLeTexte(SANS_PMS), /sans supplément/);
});

test("Sérénité sans superviseur (décision de Louis du 19/11) : ni inclus, ni supplémentaire, ni fonction", () => {
  const serenite = SANS_PMS.offres.find((o) => o.cle === "serenite");
  assert.equal(serenite.comptesInclus.superviseur ?? 0, 0);
  assert.equal(serenite.categoriesAutorisees.includes("superviseur"), false);
  assert.equal(serenite.fonctions.superviseur, false);
  for (const catalogue of [SANS_PMS, AVEC_PMS]) {
    for (const version of catalogue.offres.find((o) => o.cle === "serenite").versions) {
      assert.equal(Object.hasOwn(version.prixCompteSupplementaireCentimes, "superviseur"), false, version.cle);
    }
  }
  // Expert inchangé (décision attendue).
  assert.equal(SANS_PMS.offres.find((o) => o.cle === "expert").comptesInclus.superviseur, 2);
});

test("ce que la formule apporte (Louis, 19/11) : suivi, PMS offert**, courrier à la DDPP ; Expert reprend tout Sérénité", async () => {
  const { TEXTE_SUIVI, TEXTE_COURRIER_DDPP, pointsFormule, renvoiPms, ligneSuivi } = await import("./textes-tarifs.js");
  const [essentiel, serenite, expert] = SANS_PMS.offres;
  assert.deepEqual(pointsFormule(essentiel), []);
  assert.deepEqual(pointsFormule(serenite), [
    { cle: "suivi", texte: TEXTE_SUIVI },
    { cle: "pms", texte: "PMS offert", precision: "en annuel, dès le 1er paiement" },
    { cle: "ddpp", texte: TEXTE_COURRIER_DDPP },
  ]);
  assert.deepEqual(pointsFormule(expert).map((p) => p.cle), ["suivi", "pms", "ddpp"]);
  assert.equal(pointsFormule(expert)[1].precision, "en mensuel avec engagement, dès le 3e paiement");
  assert.equal(pointsFormule(expert)[2].texte, "Aide à la rédaction de votre réponse à la DDPP en cas de mise en demeure, avec l’assistance DDPP en option : un courrier qui présente vos mesures correctives, signé et envoyé par vous.");
  for (const p of [...pointsFormule(serenite), ...pointsFormule(expert)]) assert.ok((p.texte.match(/ : /g) ?? []).length <= 1, p.texte);
  // Suivi lu sur le catalogue : sans le champ (billing pas à jour), ni point ni ligne ; false : « Non » au détail.
  const sansSuivi = { ...serenite, fonctions: { ...serenite.fonctions, suivi: null } };
  assert.deepEqual(pointsFormule(sansSuivi).map((p) => p.cle), ["pms", "ddpp"]);
  assert.equal(ligneSuivi(sansSuivi), null);
  assert.equal(ligneSuivi(essentiel), "Non");
  assert.equal(ligneSuivi(serenite), "Inclus : nous vous contactons si votre score baisse");
  // Jamais de représentation ni de conseil juridique (article 20 ; loi du 31/12/1971), jamais de bilan régulier promis.
  for (const t of [TEXTE_COURRIER_DDPP, TEXTE_SUIVI, ...pointsFormule(expert).map((p) => p.texte)]) {
    assert.doesNotMatch(t, /représent|conseil juridique|avocat|chaque (mois|semaine)|bilan|audit/i, t);
  }
  assert.match(TEXTE_COURRIER_DDPP, /signé et envoyé par vous/);
  // Renvoi « ** » : les règles de l'article 14.2, la date prévue tant que le PMS n'est pas disponible.
  assert.equal(
    renvoiPms(SANS_PMS),
    "Lancement prévu à la mi-décembre 2026, sans date garantie. Le PMS (plan de maîtrise sanitaire) est offert en Sérénité annuel dès le 1er paiement, et en Sérénité ou Expert en mensuel avec engagement dès le 3e paiement, quand cette version sera proposée. Pas de PMS offert en mensuel sans engagement. Mises à jour illimitées tant que le droit est ouvert.",
  );
  assert.doesNotMatch(renvoiPms(AVEC_PMS), /mi-décembre|quand cette version/);
  assert.equal(renvoiPms({ ...SANS_PMS, offres: [essentiel] }), null);
  assert.equal(renvoiPms(null), null);
});

test("catalogue : fonctions.suivi lu tel quel s'il est booléen, null sinon", () => {
  const brut = mockCatalogue();
  assert.deepEqual(SANS_PMS.offres.map((o) => o.fonctions.suivi), [false, true, true]);
  const sans = lireCatalogue({ ...brut, offres: brut.offres.map((o) => ({ ...o, fonctions: { ...o.fonctions, suivi: undefined } })) });
  assert.deepEqual(sans.offres.map((o) => o.fonctions.suivi), [null, null, null]);
  const illisible = lireCatalogue({ ...brut, offres: brut.offres.map((o) => ({ ...o, fonctions: { ...o.fonctions, suivi: "oui" } })) });
  assert.deepEqual(illisible.offres.map((o) => o.fonctions.suivi), [null, null, null]);
});

test("carte et page : les trois points avant « Inclus », renvois * et ** sous les cartes, PMS « Offert » au détail", async () => {
  const { readFileSync } = await import("node:fs");
  const carte = readFileSync("src/components/billing/OffreCard.jsx", "utf8");
  const entete = carte.slice(carte.indexOf("{/* 1. Nom, prix et comptes inclus */}"), carte.indexOf("{/* 2. Version */}"));
  assert.ok(entete.indexOf("points.map") > 0 && entete.indexOf("points.map") < entete.indexOf("Inclus : "), "points avant les comptes");
  assert.ok(entete.indexOf("Inclus : ") < entete.indexOf("{MENTION_EQUIPIERS}*"), "équipiers après les comptes");
  assert.match(entete, /<strong className="font-semibold">\{p\.texte\}\*\*<\/strong> — \{p\.precision\}/);
  assert.doesNotMatch(carte, /Inclus dès le/);
  // « Offert** » dans les deux cas de la ligne PMS : version avec PMS (catalogue) et règles de l'article 14.2.
  assert.match(carte, /premier_paiement: "Offert\*\* dès le 1er paiement, mises à jour illimitées"/);
  assert.match(carte, /troisieme_paiement: "Offert\*\* dès le 3e paiement, mises à jour illimitées"/);
  assert.match(carte, /`Offert\*\* \$\{pmsOffert\}`/);
  assert.notEqual((await import("./textes-tarifs.js")).renvoiPms(AVEC_PMS), null);
  // Catégories que la formule ne propose pas (CGV 4.1) : dites au détail.
  assert.match(carte, /<Ligne label="Non proposés">/);
  assert.match(carte, /<Ligne label="Suivi du score hygiène">/);
  const page = readFileSync("src/pages/Tarifs.jsx", "utf8");
  assert.ok(page.indexOf("* {RENVOI_EQUIPIERS}") < page.indexOf("** {renvoiPms(catalogue)}"));
  assert.match(page, /<Link to="\/cgv"[^>]*>article 14 des CGV<\/Link>/);
});
