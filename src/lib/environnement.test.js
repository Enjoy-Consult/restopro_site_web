// Tests de l'interrupteur du site de production : `npm test` (node --test, sans dépendance).
import test from "node:test";
import assert from "node:assert/strict";
import { SITE_DE_PRODUCTION, ecrituresProductionPermises, pageSansTraceurs, traceursPermis } from "./environnement.js";

test("environnement : sous node, sans MODE=production, ce n'est pas le site de production", () => {
  assert.equal(SITE_DE_PRODUCTION, process.env.MODE === "production");
  assert.equal(ecrituresProductionPermises(false), false);
  assert.equal(ecrituresProductionPermises(true), true);
});

test("environnement : Google seulement sur le site de production, jamais sur les pages exclues", () => {
  for (const chemin of ["/", "/tarifs", "/inscription", "/abonnement/retour", "/cgv/0.2", "/Contact", "/cookies"]) {
    assert.equal(traceursPermis(chemin, true), true, chemin);
    assert.equal(traceursPermis(chemin, false), false, chemin);
  }
  for (const chemin of [
    "/application/cgu",
    "/application/confidentialite/0.2",
    "/abonnement/reprendre",
    "/compte/mot-de-passe",
    "/mon-abonnement",
    "/mon-abonnement/connexion",
  ]) {
    assert.equal(pageSansTraceurs(chemin), true, chemin);
    assert.equal(traceursPermis(chemin, true), false, chemin);
  }
  // Pas de faux positifs sur un préfixe voisin.
  for (const chemin of ["/abonnement/reprendre-plus-tard", "/mon-abonnements", "/applications", "/compte", "/compte/mot-de-passe-oublie"]) {
    assert.equal(pageSansTraceurs(chemin), false, chemin);
  }
  assert.equal(pageSansTraceurs(undefined), false);
});
