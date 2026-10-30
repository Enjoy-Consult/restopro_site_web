// Jeton renvoyé par POST /api/billing/inscription.
// Avec `X-Client-Type: web`, l'API pose la session dans un cookie et ne renvoie en JSON qu'un jeton
// restreint (inscription et paiement). Le nom exact du champ est à confirmer avec Apirest : les noms
// ci-dessous sont des hypothèses, `token` étant l'ancien nom du contrat.
const CHAMPS_JETON = ["tokenRestreint", "jetonRestreint", "restrictedToken", "token"];

export function extraireJetonRestreint(reponse) {
  for (const champ of CHAMPS_JETON) {
    const valeur = reponse?.[champ];
    if (typeof valeur === "string" && valeur) return valeur;
  }
  return null;
}
