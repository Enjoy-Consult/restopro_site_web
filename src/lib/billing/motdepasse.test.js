// Tests de « Mot de passe oublié » et des messages d'attente : `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "./errors.js";
import { messageTropDEssais, MESSAGE_TROP_D_ESSAIS } from "./erreurs.js";
import { issueDefinition, issueOubli, issueVerification, texteLienEnvoye } from "./motdepasse.js";

test("429 : le délai demandé par le serveur est affiché, arrondi au-dessus", () => {
  assert.equal(messageTropDEssais(new ApiError("X", 429)), MESSAGE_TROP_D_ESSAIS);
  assert.equal(messageTropDEssais(new ApiError("X", 429, null, 1000)), "Trop d’essais. Réessayez dans 1 seconde.");
  assert.equal(messageTropDEssais(new ApiError("X", 429, null, 30500)), "Trop d’essais. Réessayez dans 31 secondes.");
  assert.equal(messageTropDEssais(new ApiError("X", 429, null, 60000)), "Trop d’essais. Réessayez dans 1 minute.");
  assert.equal(messageTropDEssais(new ApiError("X", 429, null, 61000)), "Trop d’essais. Réessayez dans 2 minutes.");
  assert.equal(messageTropDEssais(new ApiError("X", 429, null, 0)), MESSAGE_TROP_D_ESSAIS);
});

test("mot de passe oublié : la demande partie ne dit rien du compte ; erreurs lisibles", () => {
  assert.equal(issueOubli(null), null);
  assert.match(issueOubli(new ApiError("X", 429, null, 120000)).texte, /2 minutes/);
  assert.deepEqual(issueOubli(new ApiError("VALIDATION_ERROR", 400)), { champ: "email", texte: "Vérifiez votre adresse e-mail." });
  assert.equal(issueOubli(new ApiError("SERVICE_PAIEMENT_INDISPONIBLE", 503)).telephone, true);
  const texte = texteLienEnvoye("  marie@exemple.fr ");
  assert.equal(texte.email, "marie@exemple.fr");
  assert.match(`${texte.avant}${texte.email}${texte.apres}`, /^Si un compte .* 60 minutes/);
});

test("choix du mot de passe : 429 avec délai, lien indisponible, refus du serveur", () => {
  assert.match(issueVerification(new ApiError("X", 429, null, 5000)).texte, /5 secondes/);
  assert.equal(issueVerification(new ApiError("LIEN_INDISPONIBLE", 410)).type, "lien_indisponible");
  assert.match(issueDefinition(new ApiError("X", 429, null, 90000)).texte, /2 minutes/);
  assert.equal(issueDefinition(new ApiError("VALIDATION_ERROR", 400)).type, "refuse");
});
