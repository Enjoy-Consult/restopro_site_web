// Tests de « Mot de passe oublié » et des messages d'attente : `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "./errors.js";
import { messageTropDEssais, MESSAGE_TROP_D_ESSAIS } from "./erreurs.js";
import { MESSAGE_INDISPONIBLE } from "./erreurs.js";
import { echeanceLien, issueDefinition, issueDefinitionCompte, issueOubli, issueVerification, texteLienEnvoye } from "./motdepasse.js";

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

// Lien de l'e-mail des identifiants : 72 h (relecture du 10/11, A15). Une heure seule tromperait dès le lendemain.
test("échéance du lien : l'heure le jour même, sinon le jour et l'heure, en heure de Paris (lien de 72 h)", () => {
  const vendredi = Date.parse("2026-11-13T09:00:00Z"); // vendredi 13 novembre, 10:00 à Paris
  assert.equal(echeanceLien(new Date(vendredi + 72 * 3600000).toISOString(), vendredi), "jusqu’au lundi 16 novembre à 10:00");
  assert.equal(echeanceLien("2026-11-13T20:06:00Z", vendredi), "jusqu’à 21:06");
  assert.equal(echeanceLien("2026-11-14T09:00:00Z", vendredi), "jusqu’au samedi 14 novembre à 10:00");
  // Minuit à Paris, pas en UTC : 23:30 UTC le 13 est déjà le 14 à Paris.
  assert.equal(echeanceLien("2026-11-13T23:30:00Z", vendredi), "jusqu’au samedi 14 novembre à 00:30");
  assert.equal(echeanceLien("2026-11-13T22:30:00Z", Date.parse("2026-11-13T22:00:00Z")), "jusqu’à 23:30");
  // Le premier du mois, et le changement d'heure d'octobre (72 h plus tard, une heure de moins à l'horloge).
  assert.equal(echeanceLien("2026-11-01T10:00:00Z", Date.parse("2026-10-29T10:00:00Z")), "jusqu’au dimanche 1er novembre à 11:00");
  assert.equal(echeanceLien("2026-10-26T08:00:00Z", Date.parse("2026-10-23T08:00:00Z")), "jusqu’au lundi 26 octobre à 09:00");
  assert.equal(echeanceLien("2026-11-11T09:00:00Z", vendredi), "jusqu’au mercredi 11 novembre à 10:00", "11 n'est pas un premier");
  for (const illisible of [null, undefined, "", "demain"]) assert.equal(echeanceLien(illisible, vendredi), null);
});

// A18 : le lien a pu être consommé sans que la page le sache ; un refus du lien ensuite ne dit pas « expiré ».
test("réponse perdue : 2xx sans « defini », réseau et 5xx ; le lien refusé ensuite mène à « peut-être enregistré »", () => {
  assert.deepEqual(issueDefinitionCompte(new ApiError("DEFINITION_NON_CONFIRMEE")), { type: "peut_etre_defini", reponsePerdue: true });
  for (const erreur of [new ApiError("RESEAU"), new ApiError("ERREUR_INCONNUE", 502), new ApiError("ERREUR_INCONNUE", 504), new ApiError("X", 503)]) {
    const issue = issueDefinitionCompte(erreur);
    assert.deepEqual(issue, { type: "erreur", texte: MESSAGE_INDISPONIBLE, telephone: true, reponsePerdue: true }, `${erreur.code} ${erreur.status}`);
    // Nouvel essai : 410, le lien a servi au premier envoi.
    assert.deepEqual(issueDefinitionCompte(new ApiError("LIEN_INDISPONIBLE", 410), issue.reponsePerdue), { type: "peut_etre_defini", reponsePerdue: true });
  }
  // Sans réponse perdue : lien indisponible ; un refus de saisie ou un 429 ne perd rien.
  assert.deepEqual(issueDefinitionCompte(new ApiError("LIEN_INDISPONIBLE", 410)), { type: "lien_indisponible", reponsePerdue: false });
  assert.equal(issueDefinitionCompte(new ApiError("VALIDATION_ERROR", 400)).type, "refuse");
  assert.equal(issueDefinitionCompte(new ApiError("VALIDATION_ERROR", 400)).reponsePerdue, false);
  assert.equal(issueDefinitionCompte(new ApiError("X", 429, null, 5000)).reponsePerdue, false);
  // Une réponse perdue reste retenue : un refus de saisie entre-temps ne l'efface pas.
  assert.equal(issueDefinitionCompte(new ApiError("VALIDATION_ERROR", 400), true).reponsePerdue, true);
  // La vitrine garde issueDefinition tel quel.
  assert.equal(issueDefinition(new ApiError("DEFINITION_NON_CONFIRMEE")).type, "erreur");
});
