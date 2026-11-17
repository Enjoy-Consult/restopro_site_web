// Formule Expert verrouillée à la vente (décision de Louis du 17/11). Deux sources : le champ « disponible » du
// catalogue de billing, puis, s'il manque, le garde-fou du code (offres-verrouillees.js).
// Seul le premier test décrit l'état d'aujourd'hui (Expert verrouillé) : les autres passent leur propre verrou, et
// restent vrais le jour où Expert rouvre.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ApiError, lireCatalogue } from "./api.js";
import { MESSAGE_FORMULE_INDISPONIBLE, MESSAGE_REFUS_GENERIQUE, messageErreur } from "./erreurs.js";
import { mockCatalogue } from "./mock.js";
import { OFFRES_VERROUILLEES } from "./offres-verrouillees.js";
import { PHRASE_INDISPONIBLE_PAR_DEFAUT, calculer, offreVerrouillee, selectionDepuisQuery, selectionVersQuery } from "./pricing.js";
import { prendreExplicationChoix, retenirExplicationChoix, texteFormuleIndisponible, texteOffreVerrouillee } from "./inscription.js";
import { decisionAnnulation } from "./retour.js";

const PHRASE = "Les sondes de température sont en préparation.";
const VERROU = Object.freeze({ expert: PHRASE });
const catalogue = lireCatalogue(mockCatalogue());
// Catalogue de billing avec le champ « disponible » (0a05904) : Expert fermé, les autres ouverts, ou l'inverse.
const avecDisponible = (dispo) => ({ ...catalogue, offres: catalogue.offres.map((o) => ({ ...o, disponible: dispo[o.cle] ?? true })) });

test("état actuel : Expert est verrouillé par le garde-fou du code, avec la phrase des sondes ; rien d'autre", () => {
  assert.deepEqual({ ...OFFRES_VERROUILLEES }, { expert: PHRASE });
  assert.ok(Object.isFrozen(OFFRES_VERROUILLEES));
  assert.equal(offreVerrouillee("expert"), PHRASE);
  assert.equal(selectionDepuisQuery("offre=expert&version=mensuel", catalogue), null);
});

test("garde-fou du code (champ « disponible » absent) : la clé listée est verrouillée, les autres non", () => {
  assert.equal(offreVerrouillee("expert", VERROU), PHRASE);
  assert.equal(offreVerrouillee({ cle: "expert" }, VERROU), PHRASE);
  for (const cle of ["essentiel", "serenite", "inconnue", "", "toString", "__proto__", "hasOwnProperty", null, undefined]) {
    assert.equal(offreVerrouillee(cle, VERROU), null, String(cle));
  }
  assert.equal(offreVerrouillee("expert", {}), null);
});

test("champ « disponible » du catalogue : il décide quand il est là (true ouvre, false ferme)", () => {
  assert.equal(offreVerrouillee({ cle: "expert", disponible: true }, VERROU), null);
  assert.equal(offreVerrouillee({ cle: "expert", disponible: false }, VERROU), PHRASE);
  assert.equal(offreVerrouillee({ cle: "serenite", disponible: false }, VERROU), PHRASE_INDISPONIBLE_PAR_DEFAUT);
  assert.equal(offreVerrouillee({ cle: "serenite", disponible: true }, VERROU), null);
});

test("catalogue : « disponible » lu tel quel s'il est booléen, ignoré sinon", () => {
  const brut = mockCatalogue();
  const [ess, ser, exp] = brut.offres;
  const lu = lireCatalogue({ ...brut, offres: [{ ...ess, disponible: true }, { ...ser, disponible: "non" }, { ...exp, disponible: false }] });
  assert.equal(lu.offres[0].disponible, true);
  assert.equal("disponible" in lu.offres[1], false);
  assert.equal(lu.offres[2].disponible, false);
  assert.equal("disponible" in catalogue.offres[2], false);
});

test("/inscription : une formule verrouillée n'est jamais une sélection valable, quelle que soit l'adresse", () => {
  for (const search of [
    "offre=expert&version=mensuel",
    "?offre=expert&version=mensuel&ddpp=1",
    "offre=expert&version=mensuel&comptes=cuisinier:2",
    "offre=exp%65rt&version=mensuel",
    "offre=expert&version=mensuel&offre=serenite",
  ]) {
    assert.equal(selectionDepuisQuery(search, catalogue, VERROU), null, search);
  }
  // Paramètre en double : seule la première valeur compte (Sérénité ici), et c'est elle qui part au paiement.
  assert.equal(selectionDepuisQuery("offre=serenite&version=mensuel&offre=expert", catalogue, VERROU)?.offre, "serenite");
  for (const offre of ["essentiel", "serenite"]) {
    assert.equal(selectionDepuisQuery(`offre=${offre}&version=mensuel`, catalogue, VERROU)?.offre, offre);
  }
  // Le prix d'Expert reste calculable : la carte de /tarifs garde son prix et son détail.
  assert.equal(calculer(catalogue, { offre: "expert", version: "mensuel", comptesSupplementaires: {}, options: { ddpp: false } }).ok, true);
});

test("/inscription avec le champ « disponible » : billing ouvre ou ferme sans toucher au code", () => {
  // Billing rouvre Expert : la même adresse redevient valable, même avec le garde-fou du code.
  assert.equal(selectionDepuisQuery("offre=expert&version=mensuel", avecDisponible({ expert: true }), VERROU)?.offre, "expert");
  // Billing ferme Sérénité : elle se verrouille sans ligne dans le code.
  assert.equal(selectionDepuisQuery("offre=serenite&version=mensuel", avecDisponible({ serenite: false }), VERROU), null);
  // Sans verrou du tout, la lecture de l'adresse reste complète.
  const sel = selectionDepuisQuery("offre=expert&version=mensuel&ddpp=1", catalogue, {});
  assert.equal(selectionVersQuery(sel), "offre=expert&version=mensuel&ddpp=1");
});

test("renvoi vers /tarifs avec une formule verrouillée : message clair, nommé d'après le catalogue, lu une seule fois", () => {
  retenirExplicationChoix("?offre=expert&version=mensuel", catalogue, VERROU);
  const message = prendreExplicationChoix();
  assert.equal(message, texteOffreVerrouillee("Expert", PHRASE));
  assert.equal(message, "La formule Expert n’est pas encore disponible. Les sondes de température sont en préparation. Choisissez une autre formule ci-dessous.");
  assert.equal(prendreExplicationChoix(), null);
  retenirExplicationChoix("?offre=expert", null, VERROU);
  assert.match(prendreExplicationChoix(), /^La formule demandée n’est pas encore disponible\. Les sondes/);
  retenirExplicationChoix("?offre=serenite&version=mensuel", avecDisponible({ serenite: false }), VERROU);
  assert.equal(prendreExplicationChoix(), texteOffreVerrouillee("Sérénité", PHRASE_INDISPONIBLE_PAR_DEFAUT));
});

test("/tarifs après une annulation chez Stripe avec une formule verrouillée : pas de « Reprendre le paiement » vers elle", () => {
  const selection = selectionDepuisQuery("offre=expert&version=mensuel", catalogue, VERROU);
  assert.deepEqual(decisionAnnulation({ annule: true, jeton: true, selection }), { type: "choisir" });
});

test("409 FORMULE_INDISPONIBLE de billing : message propre, jamais l'erreur générique", () => {
  const erreur = new ApiError("FORMULE_INDISPONIBLE", 409, { offre: "expert" });
  assert.equal(messageErreur(erreur), MESSAGE_FORMULE_INDISPONIBLE);
  assert.notEqual(messageErreur(erreur), MESSAGE_REFUS_GENERIQUE);
  assert.equal(
    texteFormuleIndisponible("Expert"),
    "La formule Expert n’est pas encore disponible à la souscription. Choisissez une autre formule depuis la page des tarifs.",
  );
  const inscription = readFileSync("src/pages/Inscription.jsx", "utf8");
  assert.match(inscription, /case "FORMULE_INDISPONIBLE":\s*return texteFormuleIndisponible\(calcul\.offre\.nom\);/);
});

test("pages : la carte lit l'offre entière et affiche « Bientôt disponible » ; /inscription transmet le catalogue", () => {
  const carte = readFileSync("src/components/billing/OffreCard.jsx", "utf8");
  assert.match(carte, /const verrou = offreVerrouillee\(offre\);/);
  assert.match(carte, /<button\s+type="button"\s+disabled[\s\S]{0,400}Bientôt disponible<span className="sr-only"> : formule \{offre\.nom\}<\/span>\s*<\/button>/);
  assert.match(carte, /\{verrou\}<\/p>/);
  assert.match(carte, /\{verrou \? "" : ", à ajouter à l’étape suivante"\}/);
  assert.match(carte, /<footer className="mt-auto min-\[700px\]:mt-0 /);
  assert.doesNotMatch(readFileSync("src/lib/billing/pricing.js", "utf8"), /Object\.hasOwn\(/);
  const inscription = readFileSync("src/pages/Inscription.jsx", "utf8");
  assert.match(inscription, /const selection = selectionDepuisQuery\(search, catalogue\);/);
  assert.match(inscription, /retenirExplicationChoix\(search, catalogue\);/);
  assert.match(readFileSync("src/pages/Tarifs.jsx", "utf8"), /selectionDepuisQuery\(search, catalogue\)/);
});
