// Jeton restreint expiré (2 h) : le compte existe déjà, on ne propose jamais de le recréer
// (l'API répondrait EMAIL_DEJA_UTILISE) ; on renvoie vers l'espace client.
import { effacerSession } from "./session.js";

export const MESSAGE_SESSION_EXPIREE =
  "Votre session a expiré. Connectez-vous à votre espace pour finaliser votre abonnement.";

export function estSessionExpiree(erreur) {
  return erreur?.status === 401 || erreur?.status === 403;
}

// Si l'erreur est une session expirée : supprime le jeton de sessionStorage et renvoie le message à afficher.
// Sinon renvoie null et ne touche à rien. Le choix de formule n'est jamais stocké : il vit dans l'URL.
export function traiterSessionExpiree(erreur) {
  if (!estSessionExpiree(erreur)) return null;
  effacerSession();
  return MESSAGE_SESSION_EXPIREE;
}
