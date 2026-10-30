// Jeton de l'inscription : sessionStorage uniquement (jamais localStorage ni cookie).
// Une copie en mémoire sert de secours si sessionStorage est indisponible.

const CLE = "restoclair_billing_session";
let memoire = null;

export function lireSession() {
  try {
    const brut = window.sessionStorage.getItem(CLE);
    if (brut) {
      const session = JSON.parse(brut);
      if (session?.token) return session;
    }
  } catch {
    // sessionStorage indisponible : on retombe sur la mémoire
  }
  return memoire;
}

export function ecrireSession(session) {
  memoire = session;
  try {
    window.sessionStorage.setItem(CLE, JSON.stringify(session));
  } catch {
    // ignoré : la copie en mémoire suffit pour la page en cours
  }
}

export function effacerSession() {
  memoire = null;
  try {
    window.sessionStorage.removeItem(CLE);
  } catch {
    // ignoré
  }
}
