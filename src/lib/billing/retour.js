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
// Après un retour de Stripe, ces deux-là ne disent rien du paiement : il peut être fait et pas encore confirmé,
// ou ne jamais avoir abouti (en_attente_paiement veut dire « jamais souscrit » et ne finit jamais seul).
const CONFIRMATION_ATTENDUE = ["sans_abonnement", "en_attente_paiement"];

export const TEXTE_INVERIFIABLE =
  "Nous ne pouvons pas vérifier votre abonnement depuis cette page. Si vous venez de payer, vous recevrez un e-mail de confirmation.";
export const TEXTE_DELAI =
  "La confirmation prend plus de temps que prévu. Vous recevrez un e-mail dès que votre abonnement sera actif.";
export const TEXTE_DELAI_REPRISE =
  "La confirmation prend plus de temps que prévu. Si vous avez payé, vous recevrez un e-mail dès que votre abonnement sera actif. Si le paiement n’a pas abouti, vous pouvez le reprendre : votre compte est conservé.";
// Texte du serveur pour le 409 activation_en_cours.
export const TEXTE_ACTIVATION_EN_COURS =
  "Votre paiement est en cours de validation : votre abonnement sera actif dans quelques instants.";
// Impayé : l'abonnement existe chez Stripe, on règle la facture ouverte, on n'ouvre pas de nouveau paiement.
export const TEXTE_IMPAYE =
  "Un paiement de votre abonnement n’a pas abouti. Réglez la facture en attente depuis votre espace : votre compte est conservé.";
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

// 409 activation_en_cours au checkout : le paiement attend sa confirmation. La page de retour relit le compte,
// sans nouveau Checkout.
export const ADRESSE_ACTIVATION_EN_COURS = "/abonnement/retour?activation=en_cours";

export function estActivationEnCours(search) {
  return new URLSearchParams(search).get("activation") === "en_cours";
}

// Stripe ne met session_id que sur l'adresse de succès : l'annulation revient sur /tarifs, sans lui.
export function estRetourStripe(search) {
  return Boolean(new URLSearchParams(search).get("session_id")) || estActivationEnCours(search);
}

// Fin de la fenêtre. Retour de Stripe et statut en attente : le client doit toujours pouvoir payer, donc délai et
// reprise. Il n'y a pas de double paiement : si un abonnement vit déjà chez Stripe, le serveur refuse le Checkout
// (409 ABONNEMENT_DEJA_ACTIF, activation_en_cours).
// Dans les autres cas, un statut lu non confirmé exclut le texte du délai, qui promet un e-mail.
export function conclusionRetour(dernierStatut, retourStripe = false) {
  if (retourStripe && CONFIRMATION_ATTENDUE.includes(dernierStatut)) return { type: "fin", phase: "delai_reprise" };
  if (dernierStatut === "impaye") return { type: "fin", phase: "impaye" };
  return { type: "fin", phase: NON_CONFIRMES.includes(dernierStatut) ? "non_confirme" : "delai" };
}

// Prochain appel après attenteMs, s'il tombe dans la fenêtre ; sinon on attend sa fin, sans nouvel appel.
export function planifierRetour(dernierStatut, ecouleMs, attenteMs = INTERVALLE_MS, retourStripe = false) {
  const resteMs = DUREE_MAX_MS - ecouleMs;
  const conclusion = conclusionRetour(dernierStatut, retourStripe);
  if (resteMs <= 0) return conclusion;
  return attenteMs < resteMs
    ? { type: "attendre", delaiMs: attenteMs, puis: { type: "interroger" } }
    : { type: "attendre", delaiMs: resteMs, puis: conclusion };
}

// Arrivée sur la page ou « Vérifier à nouveau ». attenteMs : reste d'un Retry-After déjà reçu.
export function decisionDepart({ jeton, attenteMs = 0, dernierStatut = null, retourStripe = false }) {
  if (!jeton) return { type: "fin", phase: "inverifiable" };
  return attenteMs > 0 ? planifierRetour(dernierStatut, 0, attenteMs, retourStripe) : { type: "interroger" };
}

// Après une interrogation : compte lu, ou erreur.
export function decisionRetour({ compte = null, erreur = null, dernierStatut = null, ecouleMs = 0, retourStripe = false }) {
  if (compte?.statut === "actif") return { type: "fin", phase: "actif", compte, effacerJeton: true };
  if (compte?.statut === "activation_provisoire") return { type: "fin", phase: "provisoire", compte, effacerJeton: true };
  if (estSessionExpiree(erreur)) return { type: "fin", phase: "inverifiable", effacerJeton: true };
  const refus = messageRefus(erreur);
  if (refus) return { type: "fin", phase: "refus", refus };

  const statut = compte?.statut ?? dernierStatut;
  if (estTropDEssais(erreur)) {
    const attenteMs = Math.max(erreur.retryAfterMs ?? RALENTI_429_MS, INTERVALLE_MS);
    return { ...planifierRetour(statut, ecouleMs, attenteMs, retourStripe), reprendreDansMs: attenteMs };
  }
  return planifierRetour(statut, ecouleMs, INTERVALLE_MS, retourStripe);
}

// Message de /tarifs?paiement=annule. Stripe ne rend aucun paramètre et le choix n'est pas stocké :
// sans sélection dans l'URL, /inscription renverrait vers /tarifs. On le dit au lieu d'y envoyer le visiteur.
export function decisionAnnulation({ annule, jeton, selection }) {
  if (!annule) return null;
  if (!jeton) return { type: "simple" };
  return selection ? { type: "reprendre", cible: `/inscription?${selectionVersQuery(selection)}` } : { type: "choisir" };
}
