// Tests de la règle des magasins (copie de STORE_FORBIDDEN_TEXTS de l'app) : `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import { blocsVisibles, passagesInterdits } from "./textes-magasins.mjs";

const regles = (md) => passagesInterdits(md).map((p) => p.regle);

test("mots interdits, même au sens courant ; « abonnement » et « paiement » seuls permis", () => {
  assert.deepEqual(regles("L’essentiel est là."), ["nom de formule"]);
  assert.deepEqual(regles("Un expert vous répond."), ["nom de formule"]);
  assert.deepEqual(regles("La facturation et le montant."), ["montant", "facture"]);
  assert.deepEqual(regles("Accès offert, gratuit."), ["offert / gratuit", "offert / gratuit"]);
  assert.deepEqual(regles("L’abonnement de l’établissement et son paiement."), []);
  assert.deepEqual(regles("Vous avez souscrit."), ["invitation à s'abonner"]);
});

test("mots entiers seulement pour HT, TTC, payer, payé ; pas de faux positif", () => {
  assert.deepEqual(regles("Prix HT et TTC."), ["HT", "TTC"]);
  assert.deepEqual(regles("HTML et THT"), []);
  assert.deepEqual(regles("Il faut payer. Montant payé, factures payées."), ["Payer", "montant", "facture", "payé", "payé"]);
  assert.deepEqual(regles("Le paysage et le payement."), []);
});

test("adresses : restoclair.fr et sous-domaines interdits, e-mail permis, lien visible par son texte seulement", () => {
  assert.deepEqual(regles("Écrivez à contact@restoclair.fr."), []);
  assert.deepEqual(regles("Version web : app.restoclair.fr."), ["adresse ou espace web"]);
  assert.deepEqual(regles("Voir https://exemple.org."), ["adresse ou espace web"]);
  assert.deepEqual(regles("Voir les [conditions d’utilisation](https://restoclair.fr/application/cgu)."), []);
  assert.deepEqual(regles("Voir [restoclair.fr](https://restoclair.fr)."), ["adresse ou espace web"]);
  assert.deepEqual(regles("Disponible sur le site et sur notre site."), ["adresse ou espace web", "adresse ou espace web"]);
});

test("phrases permises de l’app, et elles seules", () => {
  assert.deepEqual(regles("Supprimer mon compte."), []);
  assert.deepEqual(regles("Ouvrez Mon compte."), ["Mon compte"]);
  assert.deepEqual(regles("L’accès offert se termine le 3 mars 2027."), []);
  assert.deepEqual(regles("Période d’accès offert terminée."), ["offert / gratuit"], "majuscule : l’exception est en minuscules");
  assert.deepEqual(regles("La période d’accès offert terminée."), []);
  assert.deepEqual(regles("Un accès offert."), ["offert / gratuit"]);
});

test("texte visible : insécables et invisibles normalisés, titres, citations et sous-listes comptés", () => {
  assert.deepEqual(regles("Mon compte"), ["Mon compte"]);
  assert.deepEqual(regles("fac­ture"), ["facture"]);
  assert.deepEqual(regles("## Facturation\n\nTexte."), ["facture"]);
  assert.deepEqual(regles("> Montant"), ["montant"]);
  assert.deepEqual(regles("- Point\n  - sous-point gratuit\n- autre"), ["offert / gratuit"]);
  assert.equal(passagesInterdits("## 3. Données\n\n- un montant").at(0).section, "3. Données");
  assert.deepEqual(blocsVisibles("**Gras** et _italique_ et [lien](https://x.fr)").map((b) => b.texte), ["Gras et italique et lien"]);
  // Marques `[À …]` : retirées sur demande (texte qui sera publié).
  assert.deepEqual(regles("Texte `[À VALIDER : facturation]`"), ["facture"]);
  assert.deepEqual(passagesInterdits("Texte `[À VALIDER : facturation]`", { sansMarques: true }), []);
});

// Règle de l'app du 10/11 au soir (commits 4321af2a et 3ade0575) : « euro » et « payez » interdits ; seul le capital
// social réel (1 000 euros) passe, dans les textes juridiques. Contre-épreuves transmises par le front.
test("euros interdits, sauf le capital social réel ; « payez » interdit", () => {
  for (const accepte of ["Capital social : 1 000 euros", "RestOclair SAS, au capital de 1 000 euros, immatriculée au RCS.", "Capital social : 1000 euros.", "Capital social : 1 000,00 euros ;", "Capital social : 1 000 euros."]) {
    assert.deepEqual(regles(accepte), [], accepte);
  }
  const refuses = {
    "1 000 €": ["€"],
    "49 euros par mois": ["euro"],
    "Capital social : 49 euros.": ["euro"],
    "Abonnement au capital de 49 euros.": ["euro"],
    "Capital social : 1 euro": ["euro"],
    "au capital de 10 000 euros": ["euro"],
    "capital de 1 000 euros, payez": ["euro", "Payer"],
    "Abonnement 1 000 euros": ["euro"],
    "Capital social : 1 000 euros HT": ["HT", "euro"],
    "Capital social : 1 000 euros par mois.": ["euro"],
  };
  for (const [texte, attendu] of Object.entries(refuses)) assert.deepEqual(regles(texte).sort(), attendu.sort(), texte);
  assert.deepEqual(regles("Payez ici, ou il faut payer."), ["Payer", "Payer"]);
  assert.deepEqual(regles("Le pays et le paysage."), []);
  // L'exception ne retire que la tournure : le reste du bloc est cherché comme avant.
  assert.deepEqual(regles("Capital social : 1 000 euros. Facturation mensuelle."), ["facture"]);
});

test("normalisation alignée sur l'import de l'app : formatage Unicode retiré, toute espace ramenée à une espace simple", () => {
  assert.deepEqual(regles("fac\u200Eture"), ["facture"], "LRM");
  assert.deepEqual(regles("fac\u200Fture"), ["facture"], "RLM");
  assert.deepEqual(regles("fac\u2063ture"), ["facture"], "U+2063");
  assert.deepEqual(regles("fac\u2067ture"), ["facture"], "isolat directionnel");
  assert.deepEqual(regles("fac\u034Fture"), ["facture"], "CGJ");
  assert.deepEqual(regles("fac\uFE0Fture"), ["facture"], "sélecteur de variante");
  assert.deepEqual(regles("Mon\u2009compte"), ["Mon compte"], "espace fine");
  assert.deepEqual(regles("sur\u2007le site"), ["adresse ou espace web"], "espace tabulaire");
});
