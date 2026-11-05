// Retour de paiement et annulation : décisions pures, sans React ni réseau, testées sous node.
import { estSessionExpiree, estTropDEssais, messageRefus } from "./erreurs.js";
import { selectionVersQuery } from "./pricing.js";

export const INTERVALLE_MS = 2000;
export const DUREE_MAX_MS = 60000;
// 429 sans durée lisible : on ralentit quand même.
export const RALENTI_429_MS = 10000;

// Juste après Stripe, ces statuts peuvent précéder « actif » de quelques secondes :
// on ne conclut qu'à la fin de la fenêtre de confirmation.
const NON_CONFIRMES = ["sans_abonnement", "en_attente_paiement", "impaye", "resilie"];

export const TEXTE_INVERIFIABLE =
  "Nous ne pouvons pas vérifier votre abonnement depuis cette page. Si vous venez de payer, vous recevrez un e-mail de confirmation.";
export const TEXTE_DELAI =
  "La confirmation prend plus de temps que prévu. Vous recevrez un e-mail dès que votre abonnement sera actif.";
export const TEXTE_NON_CONFIRME =
  "Votre paiement n’est pas confirmé à ce stade. S’il n’a pas abouti, vous pouvez le reprendre en choisissant de nouveau votre formule : votre compte est conservé.";

const ENVOI_IDENTIFIANTS = "par e-mail, avec un lien sécurisé valable 72 heures.";

// Phrase du succès, découpée pour mettre l'adresse en avant. Sans adresse lisible : phrase sans adresse.
export function phraseIdentifiants(email) {
  return email
    ? { avant: "Les identifiants de votre équipe ont été envoyés à ", email, apres: ` ${ENVOI_IDENTIFIANTS}` }
    : { avant: `Les identifiants de votre équipe ont été envoyés ${ENVOI_IDENTIFIANTS}`, email: null, apres: "" };
}

// Une décision est l'une de :
//   { type: "interroger" }                                  appeler GET /compte maintenant
//   { type: "attendre", delaiMs, puis }                     patienter, puis appliquer la décision `puis`
//   { type: "fin", phase, compte?, refus?, effacerJeton? }  afficher l'issue
// reprendreDansMs (sur un 429) : aucun appel avant ce délai, même après « Vérifier à nouveau ».

// Fin de la fenêtre. Un statut lu non confirmé exclut le texte du délai, qui promet un e-mail.
export function conclusionRetour(dernierStatut) {
  return { type: "fin", phase: NON_CONFIRMES.includes(dernierStatut) ? "non_confirme" : "delai" };
}

// Prochain appel après attenteMs, s'il tombe dans la fenêtre ; sinon on attend sa fin, sans nouvel appel.
export function planifierRetour(dernierStatut, ecouleMs, attenteMs = INTERVALLE_MS) {
  const resteMs = DUREE_MAX_MS - ecouleMs;
  if (resteMs <= 0) return conclusionRetour(dernierStatut);
  return attenteMs < resteMs
    ? { type: "attendre", delaiMs: attenteMs, puis: { type: "interroger" } }
    : { type: "attendre", delaiMs: resteMs, puis: conclusionRetour(dernierStatut) };
}

// Arrivée sur la page ou « Vérifier à nouveau ». attenteMs : reste d'un Retry-After déjà reçu.
export function decisionDepart({ jeton, attenteMs = 0, dernierStatut = null }) {
  if (!jeton) return { type: "fin", phase: "inverifiable" };
  return attenteMs > 0 ? planifierRetour(dernierStatut, 0, attenteMs) : { type: "interroger" };
}

// Après une interrogation : compte lu, ou erreur.
export function decisionRetour({ compte = null, erreur = null, dernierStatut = null, ecouleMs = 0 }) {
  if (compte?.statut === "actif") return { type: "fin", phase: "actif", compte, effacerJeton: true };
  if (compte?.statut === "activation_provisoire") return { type: "fin", phase: "provisoire", compte, effacerJeton: true };
  if (estSessionExpiree(erreur)) return { type: "fin", phase: "inverifiable", effacerJeton: true };
  const refus = messageRefus(erreur);
  if (refus) return { type: "fin", phase: "refus", refus };

  const statut = compte?.statut ?? dernierStatut;
  if (estTropDEssais(erreur)) {
    const attenteMs = Math.max(erreur.retryAfterMs ?? RALENTI_429_MS, INTERVALLE_MS);
    return { ...planifierRetour(statut, ecouleMs, attenteMs), reprendreDansMs: attenteMs };
  }
  return planifierRetour(statut, ecouleMs);
}

// Message de /tarifs?paiement=annule. Stripe ne rend aucun paramètre et le choix n'est pas stocké :
// sans sélection dans l'URL, /inscription renverrait vers /tarifs. On le dit au lieu d'y envoyer le visiteur.
export function decisionAnnulation({ annule, jeton, selection }) {
  if (!annule) return null;
  if (!jeton) return { type: "simple" };
  return selection ? { type: "reprendre", cible: `/inscription?${selectionVersQuery(selection)}` } : { type: "choisir" };
}
