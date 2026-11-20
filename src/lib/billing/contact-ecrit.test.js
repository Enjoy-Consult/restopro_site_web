// Consigne de Louis (19/11) : dans les messages d'erreur et d'aide des parcours abonnement, inscription, espace et mot
// de passe, l'adresse e-mail du contact, jamais le téléphone. Hors champ (décision de Louis attendue) : documents
// légaux (la LCEN impose le téléphone de l'éditeur aux mentions légales), Layout.jsx, Home, Contact, Services, About,
// SEO.jsx et le haut et le bas de la page d'essai gratuit.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { BUSINESS } from "../business-info.js";

const PARCOURS = [
  "src/components/billing/ErrorBoundary.jsx",
  "src/lib/billing/erreurs.js", "src/lib/billing/reprise.js", "src/lib/billing/motdepasse.js", "src/lib/billing/espace.js",
  "src/lib/billing/comptes-espace.js", "src/lib/billing/formule-espace.js", "src/lib/billing/transfert-espace.js",
  "src/lib/billing/paiement-espace.js", "src/lib/billing/inscription.js", "src/lib/billing/textes-tarifs.js",
  "src/compte/AvecContact.jsx", "src/compte/Support.jsx", "src/compte/LayoutCompte.jsx",
  "src/compte/pages/Connexion.jsx", "src/compte/pages/MotDePasse.jsx", "src/compte/pages/MotDePasseOublie.jsx",
  "src/compte/pages/MonAbonnement.jsx",
  "src/pages/Inscription.jsx", "src/pages/Tarifs.jsx", "src/pages/AbonnementReprendre.jsx", "src/pages/AbonnementRetour.jsx",
  "src/pages/DefinirMotDePasse.jsx", "src/pages/AccesReserve.jsx",
];

test("parcours abonnement, inscription, espace et mot de passe : l'e-mail du contact, jamais le téléphone", () => {
  const lus = PARCOURS.filter((f) => existsSync(f));
  assert.ok(lus.length >= 15, "liste des fichiers à jour");
  for (const f of lus) {
    const s = readFileSync(f, "utf8");
    assert.doesNotMatch(s, /BUSINESS\.phone|tel:|07 77 75 26 05|appelez-nous|nous appeler/i, f);
  }
  // Page d'essai gratuit : les messages d'échec de l'envoi écrivent ; le haut et le bas de page attendent Louis.
  const essai = readFileSync("src/pages/EssaiGratuit.jsx", "utf8");
  assert.doesNotMatch(essai, /appelez-nous/i);
  assert.match(essai, /réessayez, ou écrivez-nous à \$\{BUSINESS\.email\}\./);
  assert.equal(BUSINESS.email, "contact@restoclair.fr");
});
