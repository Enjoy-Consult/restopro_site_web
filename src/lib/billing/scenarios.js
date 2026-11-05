// Scénarios de la maquette, en développement seulement (voir mock.js) : ailleurs, le paramètre est ignoré.
//   /abonnement/retour?maquette=impaye        /tarifs?paiement=annule&maquette=avec_jeton
// `actif` vaut BILLING_MOCK_DEV dans les pages : éteint par défaut.
import { ecrireSession, effacerSession } from "./session.js";

export const PREFIXE_JETON_SCENARIO = "maquette-";
export const EMAIL_SCENARIO = "marie@exemple.fr";

export const SCENARIOS = [
  "sans_abonnement",
  "en_attente_paiement",
  "activation_provisoire",
  "actif",
  "impaye",
  "resilie",
  "actif_sans_email",
  "attente_puis_actif",
  "401",
  "429",
  "429_puis_actif",
  "avec_jeton",
  "sans_jeton",
];

export function scenarioDepuisQuery(search, actif = false) {
  if (!actif) return null;
  const scenario = new URLSearchParams(search).get("maquette");
  return SCENARIOS.includes(scenario) ? scenario : null;
}

// Pose la session du scénario : le jeton de maquette porte son nom, la suite passe par le chemin normal.
export function preparerScenario(search, actif = false) {
  const scenario = scenarioDepuisQuery(search, actif);
  if (!scenario) return;
  if (scenario === "sans_jeton") effacerSession();
  else ecrireSession({ token: `${PREFIXE_JETON_SCENARIO}${scenario}`, email: EMAIL_SCENARIO });
}
