import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import Message from "@/components/billing/Message";
import { BUSINESS } from "@/lib/business-info";
import { demanderLienReprise, echangerLienReprise } from "@/lib/billing/api";
import { gtmCharge } from "@/lib/consentement";
import { APP_WEB_URL, BILLING_MOCK } from "@/lib/billing/config";
import {
  DUREE_LIEN_MINUTES,
  TEXTE_DEJA_ACTIF,
  TEXTE_EMAIL_INVALIDE,
  TEXTE_LIEN_INDISPONIBLE,
  annoncerReprise,
  issueDemande,
  issueEchange,
  lireJetonDuFragment,
  prendreEmailReprise,
  texteDemandeEnvoyee,
} from "@/lib/billing/reprise";
import { ecrireSession } from "@/lib/billing/session";
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

// Déjà abonné : la connexion se fait dans l'application, avec les identifiants reçus par e-mail.
function DejaAbonne() {
  return (
    <p className="text-muted text-[15px] leading-relaxed mt-8">
      Déjà abonné ?{" "}
      {APP_WEB_URL ? (
        <a href={APP_WEB_URL} className="link-underline">Connectez-vous à l’application</a>
      ) : (
        "Connectez-vous à l’application"
      )}{" "}
      avec les identifiants reçus par e-mail. Vous ne les retrouvez pas ? Utilisez « Mot de passe oublié » sur l’écran de connexion, ou appelez-nous au{" "}
      <a href={BUSINESS.phone.href} className="link-underline">{BUSINESS.phone.display}</a>.
    </p>
  );
}

// Reprise d'une inscription non payée (CGV 0.2, article 5) : demande d'un lien par e-mail, puis échange du lien
// contre un nouveau jeton de paiement. Voir lib/billing/reprise.js.
export default function AbonnementReprendre() {
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();
  // Google déjà dans le document (arrivée par un lien interne ou par le retour arrière) : ConsentementCookies recharge
  // la page, qui repartira sans lui. D'ici là, on ne lit ni n'efface le code, et on n'affiche rien.
  const [rechargement] = useState(gtmCharge);
  // Code du lien, lu une fois à l'arrivée. Il quitte aussitôt la barre d'adresse et n'est jamais écrit dans le stockage du navigateur.
  const [jeton, setJeton] = useState(() => (rechargement ? null : lireJetonDuFragment(window.location.hash)));
  const [echange, setEchange] = useState({ envoi: false, issue: null });

  const [email, setEmail] = useState(prendreEmailReprise);
  const [erreurEmail, setErreurEmail] = useState(null);
  const [demande, setDemande] = useState({ envoi: false, envoyee: null, erreur: null });
  const envoiEnCours = useRef(false);
  const titreRef = useRef(null);

  // Le code quitte la barre d'adresse dès son arrivée, y compris par un lien ouvert alors que la page l'est déjà.
  useEffect(() => {
    if (rechargement || !hash) return;
    const lu = lireJetonDuFragment(hash);
    if (lu && lu !== jeton) {
      setJeton(lu);
      setEchange({ envoi: false, issue: null });
    }
    navigate({ pathname, search }, { replace: true });
  }, [hash]);

  const reprendre = async () => {
    if (envoiEnCours.current || !jeton) return;
    envoiEnCours.current = true;
    setEchange({ envoi: true, issue: null });
    try {
      const reprise = await echangerLienReprise(jeton);
      ecrireSession({ token: reprise.token, email: reprise.email });
      annoncerReprise(reprise.email);
      navigate("/tarifs");
      return;
    } catch (erreur) {
      const issue = issueEchange(erreur);
      // Le code ne servira plus : on revient à la demande d'un nouveau lien.
      if (!issue.garderBouton) setJeton(null);
      setEchange({ envoi: false, issue });
      requestAnimationFrame(() => titreRef.current?.focus());
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

  const issue = echange.issue;
  // Abonnement déjà actif ou en cours d'activation : rien à reprendre, la demande d'un lien n'a plus de sens.
  const sansDemande = issue?.type === "deja_actif" || issue?.type === "activation_en_cours";
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
                disabled={echange.envoi}
                aria-busy={echange.envoi}
                className="btn-primary w-full sm:w-auto text-center disabled:opacity-60 disabled:cursor-wait"
              >
                {echange.envoi ? "Un instant…" : "Reprendre mon inscription"}
              </button>
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
                      <Link to={{ pathname, hash: "#jeton=maquette-reprise-valide" }} className="link-underline">le lien de reprise de la maquette</Link>.
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
              <DejaAbonne />
            </>
          )}

          <p className="text-faint text-sm mt-10">
            Pas encore inscrit ? <Link to="/tarifs" className="link-underline">Choisissez votre formule</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
