import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import Message from "@/components/billing/Message";
import useSansReferent from "@/hooks/useSansReferent";
import { BUSINESS } from "@/lib/business-info";
import { definirMotDePasse, verifierLienMotDePasse } from "@/lib/billing/api";
import { APP_WEB_URL } from "@/lib/billing/config";
import LienEspace from "@/components/billing/LienEspace";
import { gtmCharge } from "@/lib/consentement";
import { LONGUEUR_MAX, TEXTE_REGLE, heureEcheance, issueDefinition, issueVerification, validerMotDePasse } from "@/lib/billing/motdepasse";
import { CHEMIN_REPRISE, TEXTE_LIEN_INDISPONIBLE, lireJetonDuFragment } from "@/lib/billing/reprise";

const CLASSE_CHAMP =
  "w-full border bg-white px-4 py-3.5 text-ink text-[16px] transition-shadow focus:outline-none focus:border-bottle focus:ring-4 focus:ring-bottle/10 disabled:opacity-60";

function Telephone() {
  return (
    <>
      {" "}Vous pouvez aussi nous appeler au <a href={BUSINESS.phone.href} className="link-underline">{BUSINESS.phone.display}</a>.
    </>
  );
}

function ChampMotDePasse({ id, label, valeur, onChange, erreur, aide, visible, disabled }) {
  const decrit = [aide && `${id}-aide`, erreur && `${id}-erreur`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-muted text-[14px] mb-2">{label}</label>
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={valeur}
        onChange={onChange}
        autoComplete="new-password"
        maxLength={LONGUEUR_MAX + 1}
        disabled={disabled}
        aria-invalid={erreur ? "true" : undefined}
        aria-describedby={decrit}
        className={`${CLASSE_CHAMP} ${erreur ? "border-[#8a2424]" : "border-border"}`}
      />
      {aide && !erreur && <p id={`${id}-aide`} className="text-faint text-[13px] mt-1.5">{aide}</p>}
      {erreur && <p id={`${id}-erreur`} className="text-[#8a2424] text-[14px] mt-1.5">{erreur}</p>}
    </div>
  );
}

// Définition du mot de passe par un lien reçu par e-mail (contrat d'Apirest) : vérification à l'ouverture, sans rien
// consommer ; le lien n'est consommé qu'au clic sur « Enregistrer ». Voir lib/billing/motdepasse.js.
export default function DefinirMotDePasse() {
  useSansReferent();
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();
  // Google déjà dans le document : ConsentementCookies recharge la page, qui repartira sans lui (voir AbonnementReprendre).
  const [rechargement] = useState(gtmCharge);
  // Code du lien, lu une fois à l'arrivée ; il quitte aussitôt la barre d'adresse et n'est jamais stocké par le site.
  const [jeton, setJeton] = useState(() => (rechargement ? null : lireJetonDuFragment(window.location.hash)));
  // etape : "verification", "formulaire", "defini", "indisponible", "erreur" (vérification impossible).
  const [etat, setEtat] = useState(() => ({ etape: jeton ? "verification" : "indisponible" }));
  const [relance, setRelance] = useState(0);
  const [valeurs, setValeurs] = useState({ motDePasse: "", confirmation: "" });
  const [erreurs, setErreurs] = useState({});
  const [visible, setVisible] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState(null);
  const envoiEnCours = useRef(false);
  const titreRef = useRef(null);

  useEffect(() => {
    if (rechargement || !hash) return;
    const lu = lireJetonDuFragment(hash);
    if (lu && lu !== jeton) {
      // Nouveau lien dans la page déjà ouverte : rien du lien précédent ne reste à l'écran.
      setJeton(lu);
      setEtat({ etape: "verification" });
      setValeurs({ motDePasse: "", confirmation: "" });
      setErreurs({});
      setErreurEnvoi(null);
      setVisible(false);
    }
    navigate({ pathname, search }, { replace: true });
  }, [hash]);

  // Vérification du lien, qui ne le consomme pas : adresse masquée et heure d'échéance.
  useEffect(() => {
    if (rechargement || !jeton) return undefined;
    let arrete = false;
    setEtat({ etape: "verification" });
    verifierLienMotDePasse(jeton)
      .then((lien) => {
        if (!arrete) setEtat({ etape: "formulaire", emailMasque: lien.emailMasque, echeance: heureEcheance(lien.expireLe) });
      })
      .catch((erreur) => {
        if (arrete) return;
        const issue = issueVerification(erreur);
        if (issue.type === "lien_indisponible") setJeton(null);
        setEtat(issue.type === "lien_indisponible" ? { etape: "indisponible" } : { etape: "erreur", issue });
      });
    return () => {
      arrete = true;
    };
  }, [jeton, relance]);

  useEffect(() => {
    if (etat.etape === "defini" || etat.etape === "indisponible") titreRef.current?.focus();
  }, [etat.etape]);

  const modifier = (champ) => (e) => {
    setValeurs((v) => ({ ...v, [champ]: e.target.value }));
    setErreurs((err) => ({ ...err, [champ]: undefined }));
    setErreurEnvoi(null);
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    if (envoiEnCours.current || !jeton) return;
    const problemes = validerMotDePasse(valeurs.motDePasse, valeurs.confirmation);
    if (Object.keys(problemes).length > 0) {
      setErreurs(problemes);
      document.getElementById(problemes.motDePasse ? "champ-mot-de-passe" : "champ-confirmation")?.focus();
      return;
    }
    envoiEnCours.current = true;
    setEnvoi(true);
    setErreurEnvoi(null);
    try {
      const { email } = await definirMotDePasse(jeton, valeurs.motDePasse);
      setJeton(null);
      setValeurs({ motDePasse: "", confirmation: "" });
      setEtat({ etape: "defini", email });
    } catch (erreur) {
      const issue = issueDefinition(erreur);
      if (issue.type === "lien_indisponible") {
        setJeton(null);
        setValeurs({ motDePasse: "", confirmation: "" });
        setEtat({ etape: "indisponible" });
      } else if (issue.type === "refuse") {
        // Le lien reste valable : on corrige et on réessaie. Le champ est encore désactivé : focus après le rendu.
        setErreurs({ motDePasse: issue.texte });
        requestAnimationFrame(() => document.getElementById("champ-mot-de-passe")?.focus());
      } else {
        setErreurEnvoi(issue);
      }
    }
    setEnvoi(false);
    envoiEnCours.current = false;
  };

  if (rechargement) return null;

  const { etape } = etat;
  const titre = etape === "defini" ? "Votre mot de passe est enregistré." : etape === "indisponible" ? "Lien indisponible." : "Choisissez votre mot de passe.";

  return (
    <>
      <SEO
        title="Choisir mon mot de passe"
        description="Choisissez le mot de passe de votre compte RestOclair."
        canonicalUrl="https://restoclair.fr/compte/mot-de-passe"
        noindex
      />

      <section className="pt-12 pb-24 md:pt-20 md:pb-32">
        <div className="max-w-[640px] mx-auto px-5 md:px-6">
          <p className="text-bottle text-[12px] font-medium uppercase tracking-[0.14em] mb-5">Mon compte</p>
          <h1 ref={titreRef} tabIndex={-1} className="text-ink mb-5 text-[clamp(2rem,5vw,3rem)] focus:outline-none">{titre}</h1>

          {etape === "verification" && (
            <p className="text-muted text-lg leading-relaxed" role="status">Vérification du lien…</p>
          )}

          {etape === "erreur" && (
            <>
              <Message type="error">
                {etat.issue.texte}
                {etat.issue.telephone && <Telephone />}
              </Message>
              <button type="button" className="link-underline text-[15px] mt-4" onClick={() => setRelance((n) => n + 1)}>
                Réessayer
              </button>
            </>
          )}

          {etape === "indisponible" && (
            <>
              <Message type="info">{TEXTE_LIEN_INDISPONIBLE}</Message>
              <p className="text-muted text-[15px] leading-relaxed mt-6">
                <Link to={CHEMIN_REPRISE} className="link-underline">Demander un nouveau lien</Link>, ou appelez-nous au{" "}
                <a href={BUSINESS.phone.href} className="link-underline">{BUSINESS.phone.display}</a>.
              </p>
            </>
          )}

          {etape === "formulaire" && (
            <form onSubmit={enregistrer} noValidate>
              <p className="text-muted text-lg leading-relaxed mb-8">
                {etat.emailMasque ? (
                  <>
                    Choisissez le mot de passe du compte <strong className="text-ink font-medium">{etat.emailMasque}</strong>.
                  </>
                ) : (
                  "Choisissez le mot de passe de votre compte."
                )}{" "}
                Vous l’utiliserez pour vous connecter à l’application.
                {etat.echeance && <> Ce lien est valable jusqu’à {etat.echeance} et ne sert qu’une fois.</>}
              </p>
              <div className="flex flex-col gap-5">
                <ChampMotDePasse
                  id="champ-mot-de-passe"
                  label="Nouveau mot de passe"
                  valeur={valeurs.motDePasse}
                  onChange={modifier("motDePasse")}
                  erreur={erreurs.motDePasse}
                  aide={TEXTE_REGLE}
                  visible={visible}
                  disabled={envoi}
                />
                <ChampMotDePasse
                  id="champ-confirmation"
                  label="Confirmez le mot de passe"
                  valeur={valeurs.confirmation}
                  onChange={modifier("confirmation")}
                  erreur={erreurs.confirmation}
                  visible={visible}
                  disabled={envoi}
                />
                <label className="flex items-center gap-3 text-sm text-muted">
                  <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="w-4 h-4 accent-[#1c4b38]" />
                  Afficher le mot de passe
                </label>
              </div>
              {erreurEnvoi && (
                <Message type="error" className="mt-6">
                  {erreurEnvoi.texte}
                  {erreurEnvoi.telephone && <Telephone />}
                </Message>
              )}
              <button
                type="submit"
                disabled={envoi}
                aria-busy={envoi}
                className="btn-primary w-full sm:w-auto text-center mt-8 disabled:opacity-60 disabled:cursor-wait"
              >
                {envoi ? "Enregistrement…" : "Enregistrer mon mot de passe"}
              </button>
            </form>
          )}

          {etape === "defini" && (
            <>
              <p className="text-muted text-lg leading-relaxed">
                {etat.email ? (
                  <>
                    Connectez-vous à l’application avec l’adresse <strong className="text-ink font-medium">{etat.email}</strong> et ce mot de passe.
                  </>
                ) : (
                  "Connectez-vous à l’application avec votre adresse e-mail et ce mot de passe."
                )}
              </p>
              <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
                {APP_WEB_URL && (
                  <a href={APP_WEB_URL} className="btn-primary text-center">
                    Ouvrir l’application web
                  </a>
                )}
                <LienEspace className="link-underline text-[15px]">Gérer mon abonnement</LienEspace>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
