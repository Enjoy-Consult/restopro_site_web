import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import Message from "@/components/billing/Message";
import useSansReferent from "@/hooks/useSansReferent";
import { BUSINESS } from "@/lib/business-info";
import { annulerInscription, consommerLienReprise, demanderLienReprise } from "@/lib/billing/api";
import { gtmCharge } from "@/lib/consentement";
import { APP_WEB_URL, BILLING_MOCK } from "@/lib/billing/config";
import {
  DUREE_LIEN_MINUTES,
  TEXTE_ANNULATION_CONFIRMEE,
  TEXTE_DEJA_ACTIF,
  TEXTE_EMAIL_INVALIDE,
  TEXTE_INSCRIPTION_PAYEE,
  TEXTE_LIEN_INDISPONIBLE,
  annoncerReprise,
  issueAnnulation,
  issueDemande,
  issueEchange,
  lireJetonDuFragment,
  prendreEmailReprise,
  texteDemandeEnvoyee,
} from "@/lib/billing/reprise";
import { ecrireSession, effacerSession } from "@/lib/billing/session";
import { BORNES, estEmailValide } from "@/lib/billing/validation";

const CLASSE_CHAMP =
  "w-full border bg-white px-4 py-3.5 text-ink text-[16px] transition-shadow focus:outline-none focus:border-bottle focus:ring-4 focus:ring-bottle/10 disabled:opacity-60";

function Telephone() {
  return (
    <>
      {" "}Vous pouvez aussi nous appeler au <a href={BUSINESS.phone.href} className="link-underline">{BUSINESS.phone.display}</a>.
    </>
  );
}

// Déjà abonné : la connexion se fait dans l'application. Pour une inscription déjà payée, la demande d'un lien
// envoie un lien de définition du mot de passe (contrat d'Apirest).
function DejaAbonne() {
  return (
    <p className="text-muted text-[15px] leading-relaxed mt-8">
      Déjà abonné ?{" "}
      {APP_WEB_URL ? (
        <a href={APP_WEB_URL} className="link-underline">Connectez-vous à l’application</a>
      ) : (
        "Connectez-vous à l’application"
      )}
      . Vous n’avez pas reçu vos identifiants ? Demandez un lien ci-dessus : si votre inscription est déjà payée, il vous permettra de définir
      votre mot de passe. Vous pouvez aussi nous appeler au <a href={BUSINESS.phone.href} className="link-underline">{BUSINESS.phone.display}</a>.
    </p>
  );
}

// Reprise d'une inscription non payée (CGV 0.2, article 5) : demande d'un lien par e-mail ; puis, au clic seulement,
// reprise du paiement ou annulation de l'inscription. Voir lib/billing/reprise.js.
export default function AbonnementReprendre() {
  useSansReferent();
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();
  // Google déjà dans le document (arrivée par un lien interne ou par le retour arrière) : ConsentementCookies recharge
  // la page, qui repartira sans lui. D'ici là, on ne lit ni n'efface le code, et on n'affiche rien.
  const [rechargement] = useState(gtmCharge);
  // Code du lien, lu une fois à l'arrivée. Il quitte aussitôt la barre d'adresse et n'est jamais écrit dans le stockage du navigateur.
  const [jeton, setJeton] = useState(() => (rechargement ? null : lireJetonDuFragment(window.location.hash)));
  // action : null, "reprise" ou "annulation" (requête en cours) ; confirmer : l'annulation attend sa confirmation.
  const [echange, setEchange] = useState({ action: null, issue: null, confirmer: false });

  const [email, setEmail] = useState(prendreEmailReprise);
  const [erreurEmail, setErreurEmail] = useState(null);
  const [demande, setDemande] = useState({ envoi: false, envoyee: null, erreur: null });
  const envoiEnCours = useRef(false);
  const titreRef = useRef(null);
  const avertissementRef = useRef(null);
  const boutonAnnulerRef = useRef(null);

  // La confirmation de l'annulation remplace le bouton qui avait le focus : on le place sur l'avertissement, lu par les
  // lecteurs d'écran, puis on le rend au bouton « Annuler mon inscription » si l'on garde l'inscription.
  const ouvrirConfirmation = () => {
    setEchange({ action: null, issue: null, confirmer: true });
    requestAnimationFrame(() => avertissementRef.current?.focus());
  };
  const fermerConfirmation = () => {
    setEchange({ action: null, issue: null, confirmer: false });
    requestAnimationFrame(() => boutonAnnulerRef.current?.focus());
  };

  // Le code quitte la barre d'adresse dès son arrivée, y compris par un lien ouvert alors que la page l'est déjà.
  useEffect(() => {
    if (rechargement || !hash) return;
    const lu = lireJetonDuFragment(hash);
    if (lu && lu !== jeton) {
      setJeton(lu);
      setEchange({ action: null, issue: null, confirmer: false });
    }
    navigate({ pathname, search }, { replace: true });
  }, [hash]);

  const apresRefus = (issue) => {
    // Le code ne servira plus : on revient à la demande d'un nouveau lien.
    if (!issue.garderBouton) setJeton(null);
    setEchange({ action: null, issue, confirmer: false });
    requestAnimationFrame(() => titreRef.current?.focus());
  };

  const reprendre = async () => {
    if (envoiEnCours.current || !jeton) return;
    envoiEnCours.current = true;
    setEchange({ action: "reprise", issue: null, confirmer: false });
    try {
      const reprise = await consommerLienReprise(jeton);
      ecrireSession({ token: reprise.token, email: reprise.email, restaurant: reprise.restaurant });
      annoncerReprise(reprise.restaurant);
      navigate("/tarifs");
      return;
    } catch (erreur) {
      apresRefus(issueEchange(erreur));
    }
    envoiEnCours.current = false;
  };

  const annuler = async () => {
    if (envoiEnCours.current || !jeton) return;
    envoiEnCours.current = true;
    setEchange({ action: "annulation", issue: null, confirmer: true });
    let erreur = null;
    try {
      await annulerInscription(jeton);
    } catch (e) {
      erreur = e;
    }
    const issue = issueAnnulation(erreur);
    // Inscription effacée : un jeton de paiement resté dans l'onglet ne doit plus proposer de payer.
    if (issue.type === "annulee") effacerSession();
    if (issue.type === "annulee" || issue.type === "payee") {
      setJeton(null);
      setEchange({ action: null, issue, confirmer: false });
      requestAnimationFrame(() => titreRef.current?.focus());
    } else {
      apresRefus(issue);
    }
    envoiEnCours.current = false;
  };

  const demanderLien = async (e) => {
    e.preventDefault();
    if (envoiEnCours.current) return;
    const adresse = email.trim();
    if (!adresse || !estEmailValide(adresse)) {
      setErreurEmail(adresse ? TEXTE_EMAIL_INVALIDE : "Indiquez votre adresse e-mail.");
      document.getElementById("champ-email")?.focus();
      return;
    }
    if (adresse.length > BORNES.email) {
      setErreurEmail(`L’adresse e-mail ne doit pas dépasser ${BORNES.email} caractères.`);
      document.getElementById("champ-email")?.focus();
      return;
    }
    setErreurEmail(null);
    envoiEnCours.current = true;
    setDemande({ envoi: true, envoyee: null, erreur: null });
    let erreur = null;
    try {
      await demanderLienReprise(adresse);
    } catch (e2) {
      erreur = e2;
    }
    const issue = issueDemande(erreur);
    if (issue?.champ === "email") {
      setErreurEmail(issue.texte);
      setDemande({ envoi: false, envoyee: null, erreur: null });
      document.getElementById("champ-email")?.focus();
    } else {
      setDemande({ envoi: false, envoyee: issue ? null : adresse, erreur: issue });
      requestAnimationFrame(() => titreRef.current?.focus());
    }
    envoiEnCours.current = false;
  };

  if (rechargement) return null;

  const { issue, action, confirmer } = echange;
  const occupe = action !== null;
  // Abonnement déjà actif, en cours d'activation, déjà payé ou inscription annulée : la demande d'un lien n'a plus de sens.
  const sansDemande = ["deja_actif", "activation_en_cours", "annulee", "payee"].includes(issue?.type);
  const envoyee = demande.envoyee ? texteDemandeEnvoyee(demande.envoyee) : null;

  return (
    <>
      <SEO
        title="Reprendre mon inscription"
        description="Recevez un lien pour reprendre votre inscription à l’application RestOclair."
        canonicalUrl="https://restoclair.fr/abonnement/reprendre"
        noindex
      />

      <section className="pt-12 pb-24 md:pt-20 md:pb-32">
        <div className="max-w-[640px] mx-auto px-5 md:px-6">
          <p className="text-bottle text-[12px] font-medium uppercase tracking-[0.14em] mb-5">Inscription</p>
          <h1 ref={titreRef} tabIndex={-1} className="text-ink mb-5 text-[clamp(2rem,5vw,3rem)] focus:outline-none">
            Reprendre mon inscription.
          </h1>

          {jeton ? (
            <>
              <p className="text-muted text-lg leading-relaxed mb-8">
                Votre compte est conservé : il reste à choisir votre formule et à régler votre abonnement. Ce lien ne sert qu’une fois.
              </p>
              {issue?.type === "erreur" && (
                <Message type="error" className="mb-6">
                  {issue.texte}
                  {issue.telephone && <Telephone />}
                </Message>
              )}
              <button
                type="button"
                onClick={reprendre}
                disabled={occupe}
                aria-busy={action === "reprise"}
                className="btn-primary w-full sm:w-auto text-center disabled:opacity-60 disabled:cursor-wait"
              >
                {action === "reprise" ? "Un instant…" : "Reprendre mon inscription"}
              </button>

              <div className="mt-10 border-t border-border pt-6">
                {confirmer ? (
                  <div role="group" aria-labelledby="annulation-titre">
                    <p id="annulation-titre" ref={avertissementRef} tabIndex={-1} className="text-ink text-[15px] leading-relaxed focus:outline-none">
                      Annuler l’inscription efface votre compte et les informations de l’établissement. Aucun paiement n’a été fait. Ce lien ne servira
                      plus.
                    </p>
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <button
                        type="button"
                        onClick={annuler}
                        disabled={occupe}
                        aria-busy={action === "annulation"}
                        className="border border-[#8a2424] text-[#8a2424] px-5 py-2.5 text-[15px] font-medium hover:bg-[#fbefed] transition-colors disabled:opacity-60 disabled:cursor-wait"
                      >
                        {action === "annulation" ? "Annulation…" : "Confirmer l’annulation"}
                      </button>
                      <button
                        type="button"
                        onClick={fermerConfirmation}
                        disabled={occupe}
                        className="link-underline text-[15px] text-left disabled:opacity-60"
                      >
                        Garder mon inscription
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted text-[15px] leading-relaxed">
                    Vous ne souhaitez plus vous abonner ?{" "}
                    <button
                      ref={boutonAnnulerRef}
                      type="button"
                      onClick={ouvrirConfirmation}
                      disabled={occupe}
                      className="link-underline disabled:opacity-60"
                    >
                      Annuler mon inscription
                    </button>
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              {issue?.type === "lien_indisponible" && <Message type="info" className="mb-8">{TEXTE_LIEN_INDISPONIBLE}</Message>}
              {issue?.type === "deja_actif" && <Message type="info" className="mb-8">{TEXTE_DEJA_ACTIF}</Message>}
              {issue?.type === "activation_en_cours" && (
                <Message type="info" className="mb-8">
                  {issue.texte} Vous recevrez un e-mail dès qu’il sera actif.
                </Message>
              )}
              {issue?.type === "annulee" && <Message type="info" className="mb-8">{TEXTE_ANNULATION_CONFIRMEE}</Message>}
              {issue?.type === "payee" && (
                <Message type="info" className="mb-8">
                  {TEXTE_INSCRIPTION_PAYEE}
                  <Telephone />
                </Message>
              )}

              {sansDemande ? null : envoyee ? (
                <div aria-live="polite">
                  <Message type="info">
                    {envoyee.avant}
                    <strong>{envoyee.email}</strong>
                    {envoyee.apres}
                  </Message>
                  {BILLING_MOCK && (
                    <p className="text-faint text-[13px] leading-relaxed mt-4">
                      Maquette : aucun e-mail ne part. Ouvrez{" "}
                      <Link to={{ pathname, hash: "#jeton=maquette-reprise-valide" }} className="link-underline">le lien de reprise de la maquette</Link>{" "}
                      ou{" "}
                      <Link to={{ pathname: "/compte/mot-de-passe", hash: "#jeton=maquette-mdp-valide" }} className="link-underline">
                        celui de définition du mot de passe
                      </Link>
                      .
                    </p>
                  )}
                  <button type="button" className="link-underline text-[15px] mt-6" onClick={() => setDemande({ envoi: false, envoyee: null, erreur: null })}>
                    Recevoir un nouveau lien, ou à une autre adresse
                  </button>
                </div>
              ) : (
                <form onSubmit={demanderLien} noValidate>
                  <p className="text-muted text-lg leading-relaxed mb-8">
                    Votre inscription s’est interrompue avant le paiement ? Votre compte est conservé. Indiquez l’adresse e-mail utilisée à l’inscription :
                    nous vous envoyons un lien pour la reprendre, valable {DUREE_LIEN_MINUTES} minutes.
                  </p>
                  <label htmlFor="champ-email" className="block text-muted text-[14px] mb-2">Adresse e-mail</label>
                  <input
                    id="champ-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErreurEmail(null);
                    }}
                    autoComplete="email"
                    maxLength={BORNES.email + 1}
                    aria-invalid={erreurEmail ? "true" : undefined}
                    aria-describedby={erreurEmail ? "champ-email-erreur" : undefined}
                    className={`${CLASSE_CHAMP} ${erreurEmail ? "border-[#8a2424]" : "border-border"}`}
                  />
                  {erreurEmail && <p id="champ-email-erreur" className="text-[#8a2424] text-[14px] mt-1.5">{erreurEmail}</p>}
                  {demande.erreur && (
                    <Message type="error" className="mt-6">
                      {demande.erreur.texte}
                      {demande.erreur.telephone && <Telephone />}
                    </Message>
                  )}
                  <button
                    type="submit"
                    disabled={demande.envoi}
                    aria-busy={demande.envoi}
                    className="btn-primary w-full sm:w-auto text-center mt-8 disabled:opacity-60 disabled:cursor-wait"
                  >
                    {demande.envoi ? "Envoi en cours…" : "Recevoir le lien"}
                  </button>
                </form>
              )}
              {!sansDemande && <DejaAbonne />}
            </>
          )}

          {!["deja_actif", "activation_en_cours", "payee"].includes(issue?.type) && (
            <p className="text-faint text-sm mt-10">
              {issue?.type === "annulee" ? "Vous changez d’avis ? " : "Pas encore inscrit ? "}
              <Link to="/tarifs" className="link-underline">Choisissez votre formule</Link>.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
