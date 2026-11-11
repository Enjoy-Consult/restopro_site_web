// Tests de l'interrupteur du site de production : `npm test` (node --test, sans dépendance).
import test from "node:test";
import assert from "node:assert/strict";
import {
  SITE_DE_PRODUCTION,
  ecrituresProductionPermises,
  googlePermisDansCeDocument,
  oublierDocumentSansGoogle,
  pageSansTraceurs,
  traceursPermis,
} from "./environnement.js";

test("environnement : sous node, sans MODE=production, ce n'est pas le site de production", () => {
  assert.equal(SITE_DE_PRODUCTION, process.env.MODE === "production");
  assert.equal(ecrituresProductionPermises(false), false);
  assert.equal(ecrituresProductionPermises(true), true);
});

test("environnement : Google seulement sur le site de production, jamais sur les pages exclues", () => {
  for (const chemin of ["/", "/tarifs", "/cgv/0.2", "/Contact", "/cookies"]) {
    assert.equal(traceursPermis(chemin, true), true, chemin);
    assert.equal(traceursPermis(chemin, false), false, chemin);
  }
  for (const chemin of [
    "/application/cgu",
    "/application/confidentialite/0.2",
    "/abonnement/reprendre",
    "/inscription",
    "/abonnement/retour",
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

test("environnement : Google bloqué tant qu'un jeton d'inscription existe, même sur /tarifs (décision du 10/11)", () => {
  assert.equal(traceursPermis("/tarifs", true, false), true);
  assert.equal(traceursPermis("/tarifs", true, true), false);
  assert.equal(traceursPermis("/", true, true), false);
  assert.equal(traceursPermis("/inscription", true, false), false);
  assert.equal(traceursPermis("/abonnement/retour", true, false), false);
});

test("environnement : un document passé par une page sans Google ne le charge plus, pour ne pas devoir recharger", (t) => {
  t.after(oublierDocumentSansGoogle);
  oublierDocumentSansGoogle();
  assert.equal(googlePermisDansCeDocument("/", false, true), true);
  assert.equal(googlePermisDansCeDocument("/tarifs", false, true), true);
  // Arrivée sur l'inscription : plus de Google dans ce document, même de retour sur /tarifs (« Modifier mon choix »).
  assert.equal(googlePermisDansCeDocument("/inscription", false, true), false);
  assert.equal(googlePermisDansCeDocument("/tarifs", false, true), false);
  assert.equal(googlePermisDansCeDocument("/", false, true), false);
  // Un jeton d'inscription suffit aussi à bloquer le document.
  oublierDocumentSansGoogle();
  assert.equal(googlePermisDansCeDocument("/tarifs", true, true), false);
  assert.equal(googlePermisDansCeDocument("/tarifs", false, true), false);
  // Hors du site de production, rien ne change : jamais de Google.
  oublierDocumentSansGoogle();
  assert.equal(googlePermisDansCeDocument("/", false, false), false);
});
