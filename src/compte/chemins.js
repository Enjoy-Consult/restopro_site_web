// Adresses servies par compte.restoclair.fr. Elles doivent correspondre aux blocs « location » du fichier nginx
// de cette origine (user.conf compte.restoclair.fr) : toute autre adresse y répond 404.
export const CHEMINS_COMPTE = {
  connexion: "/connexion",
  espace: "/mon-abonnement",
  motDePasse: "/mot-de-passe",
  motDePasseOublie: "/mot-de-passe-oublie",
};
