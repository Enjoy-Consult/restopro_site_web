import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Message from "@/components/billing/Message";
import { CHEMINS_COMPTE } from "@/compte/chemins";
import { BUSINESS } from "@/lib/business-info";
import { definirMotDePasse, verifierLienMotDePasse } from "@/lib/billing/api";
import { APP_WEB_URL } from "@/lib/billing/config";
import {
  LONGUEUR_MAX,
  TEXTE_LIEN_INDISPONIBLE_COMPTE,
  TEXTE_REGLE,
  echeanceLien,
  issueDefinitionCompte,
  issueVerification,
  validerMotDePasse,
} from "@/lib/billing/motdepasse";
import { lireJetonDuFragment } from "@/lib/billing/reprise";

const CLASSE_CHAMP =
  "w-full border bg-white px-4 py-3.5 text-ink text-[16px] transition-shadow focus:outline-none focus:border-bottle focus:ring-4 focus:ring-bottle/10 disabled:opacity-60";

function Telephone() {
  return (
    <>
      {" "}Vous pouvez aussi nous appeler au <a href={BUSINESS.phone.href} className="link-underline">{BUSINESS.phone.display}</a>.
    </>
  );
}

// Champ de mot de passe : jamais de majuscule ni de correction automatiques, même affiché en clair (type text), pour
// que le mot de passe enregistré soit celui que la personne a tapé.
function ChampMotDePasse({ id, name, label, valeur, onChange, erreur, aide, visible, disabled }) {
  const decrit = [aide && `${id}-aide`, erreur && `${id}-erreur`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-muted text-[14px] mb-2">{label}</label>
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        value={valeur}
        onChange={onChange}
        autoComplete="new-password"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={LONGUEUR_MAX + 1}
        disabled={disabled}
        aria-invalid={erreur ? "true" : undefined}
        aria-describedby={decrit}
        className={`${CLASSE_CHAMP} ${erreur ? "border-[#8a2424]" : "border-faint"}`}
      />
      {aide && !erreur && <p id={`${id}-aide`} className="text-faint text-[13px] mt-1.5">{aide}</p>}
      {erreur && <p id={`${id}-erreur`} role="alert" className="text-[#8a2424] text-[14px] mt-1.5">{erreur}</p>}
    </div>
  );
}

// Choix (lien de l'e-mail du titulaire, 72 h) ou réinitialisation (lien de « Mot de passe oublié ») du mot de passe, sur
// compte.restoclair.fr/mot-de-passe#jeton=… : mêmes routes d'Apirest (…/mot-de-passe/verifier et /definir).
// Vérification à l'ouverture, qui ne consomme pas le lien ; il n'est consommé qu'au clic sur « Enregistrer ».
// Le code quitte la barre d'adresse dès l'arrivée et n'est jamais stocké. Pas de referrer (balise de compte/index.html).
export default function MotDePasse() {
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();
  const [jeton, setJeton] = useState(() => lireJetonDuFragment(window.location.hash));
  // etape : "verification", "formulaire", "defini", "indisponible" (refus du serveur), "absent" (page rouverte sans
  // le lien : rechargement, retour arrière), "peut_etre_defini" (réponse perdue, puis lien refusé), "erreur".
  const [etat, setEtat] = useState(() => ({ etape: jeton ? "verification" : "absent" }));
  // Jeton affiché maintenant : le résultat d'un envoi fait avec un lien précédent est ignoré.
  const jetonCourant = useRef(jeton);
  jetonCourant.current = jeton;
  // Un enregistrement resté sans réponse lisible (coupure, 5xx du proxy) a peut-être abouti : un refus du lien ensuite
  // ne dit pas « expiré » (issueDefinitionCompte).
  const reponsePerdue = useRef(false);
  const [relance, setRelance] = useState(0);
  const [valeurs, setValeurs] = useState({ motDePasse: "", confirmation: "" });
  const [erreurs, setErreurs] = useState({});
  const [visible, setVisible] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState(null);
  const envoiEnCours = useRef(false);
  const titreRef = useRef(null);

  useEffect(() => {
    document.title = "Choisir mon mot de passe · RestOclair";
  }, []);

  useEffect(() => {
    if (!hash) return;
    const lu = lireJetonDuFragment(hash);
    if (lu && lu !== jeton) {
      // Nouveau lien dans la page déjà ouverte : rien du lien précédent ne reste à l'écran.
      setJeton(lu);
      reponsePerdue.current = false;
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
    if (!jeton) return undefined;
    let arrete = false;
    setEtat({ etape: "verification" });
    verifierLienMotDePasse(jeton)
      .then((lien) => {
        if (!arrete) setEtat({ etape: "formulaire", emailMasque: lien.emailMasque, echeance: echeanceLien(lien.expireLe) });
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
    if (["defini", "indisponible", "absent", "peut_etre_defini"].includes(etat.etape)) titreRef.current?.focus();
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
    const envoye = jeton;
    try {
      const { email } = await definirMotDePasse(envoye, valeurs.motDePasse);
      if (jetonCourant.current !== envoye) return;
      setJeton(null);
      setValeurs({ motDePasse: "", confirmation: "" });
      setEtat({ etape: "defini", email });
    } catch (erreur) {
      if (jetonCourant.current !== envoye) return;
      const issue = issueDefinitionCompte(erreur, reponsePerdue.current);
      reponsePerdue.current = issue.reponsePerdue;
      if (issue.type === "lien_indisponible" || issue.type === "peut_etre_defini") {
        setJeton(null);
        setValeurs({ motDePasse: "", confirmation: "" });
        setEtat({ etape: issue.type === "peut_etre_defini" ? "peut_etre_defini" : "indisponible" });
      } else if (issue.type === "refuse") {
        // Le lien reste valable : on corrige et on réessaie. Le champ est encore désactivé : focus après le rendu.
        setErreurs({ motDePasse: issue.texte });
        requestAnimationFrame(() => document.getElementById("champ-mot-de-passe")?.focus());
      } else {
        setErreurEnvoi(issue);
      }
    } finally {
      setEnvoi(false);
      envoiEnCours.current = false;
    }
  };

  const { etape } = etat;
  const TITRES = {
    defini: "Votre mot de passe est enregistré.",
    indisponible: "Lien indisponible.",
    absent: "Ouvrez le lien reçu par e-mail.",
    peut_etre_defini: "Votre mot de passe est peut-être déjà enregistré.",
  };
  const titre = TITRES[etape] ?? "Choisissez votre mot de passe.";

  return (
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
            <Message type="info">{TEXTE_LIEN_INDISPONIBLE_COMPTE}</Message>
            <p className="text-muted text-[15px] leading-relaxed mt-6">
              <Link to={CHEMINS_COMPTE.motDePasseOublie} className="link-underline">Demander un nouveau lien</Link>, ou appelez-nous au{" "}
              <a href={BUSINESS.phone.href} className="link-underline">{BUSINESS.phone.display}</a>.
            </p>
          </>
        )}

        {etape === "absent" && (
          <p className="text-muted text-lg leading-relaxed">
            Pour choisir votre mot de passe, ouvrez le lien reçu par e-mail. S’il a expiré ou s’il a déjà servi,{" "}
            <Link to={CHEMINS_COMPTE.motDePasseOublie} className="link-underline">demandez un nouveau lien</Link>.
          </p>
        )}

        {etape === "peut_etre_defini" && (
          <>
            <Message type="info">
              La réponse précédente ne nous est pas parvenue, mais votre mot de passe a peut-être été enregistré. Essayez de
              vous connecter ; si cela ne marche pas, demandez un nouveau lien.
            </Message>
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
              <Link to={CHEMINS_COMPTE.connexion} className="btn-primary text-center">Se connecter</Link>
              <Link to={CHEMINS_COMPTE.motDePasseOublie} className="link-underline text-[15px]">Demander un nouveau lien</Link>
            </div>
          </>
        )}

        {etape === "formulaire" && (
          <form onSubmit={enregistrer} noValidate>
            <p className="text-muted text-lg leading-relaxed mb-8">
              {etat.emailMasque ? (
                <>
                  Choisissez le mot de passe du compte <strong className="text-ink font-medium [overflow-wrap:anywhere]">{etat.emailMasque}</strong>.
                </>
              ) : (
                "Choisissez le mot de passe de votre compte."
              )}{" "}
              Il sert à vous connecter à l’application et à votre espace abonnement.
              {etat.echeance && <> Ce lien est valable {etat.echeance} et ne sert qu’une fois.</>}
            </p>
            <div className="flex flex-col gap-5">
              <ChampMotDePasse
                id="champ-mot-de-passe"
                name="password"
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
                name="password-confirmation"
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
                  Connectez-vous avec l’adresse <strong className="text-ink font-medium [overflow-wrap:anywhere]">{etat.email}</strong> et ce mot de passe.
                </>
              ) : (
                "Connectez-vous avec votre adresse e-mail et ce mot de passe."
              )}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
              <Link to={CHEMINS_COMPTE.connexion} className="btn-primary text-center">
                Gérer mon abonnement
              </Link>
              {APP_WEB_URL && (
                <a href={APP_WEB_URL} className="link-underline text-[15px]">
                  Ouvrir l’application web
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
