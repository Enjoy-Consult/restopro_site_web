import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CircleCheck, Link2Off, LoaderCircle, Mail } from "lucide-react";
import Message from "@/components/billing/Message";
import CadreConnexion from "@/compte/CadreConnexion";
import { CLASSE_BOUTON, CLASSE_LIEN_SECONDAIRE, ChampSecret } from "@/compte/ChampsConnexion";
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

function EcrireNous() {
  return (
    <>
      {" "}Vous pouvez aussi nous écrire à <a href={`mailto:${BUSINESS.email}`} className="link-underline">{BUSINESS.email}</a>.
    </>
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
    defini: "Mot de passe enregistré.",
    indisponible: "Lien indisponible.",
    absent: "Ouvrez le lien reçu par e-mail.",
    peut_etre_defini: "Mot de passe peut-être déjà enregistré.",
  };
  const titre = TITRES[etape] ?? "Choisissez votre mot de passe.";
  const SYMBOLES = {
    defini: <CircleCheck aria-hidden="true" size={24} strokeWidth={1.75} />,
    indisponible: <Link2Off aria-hidden="true" size={22} strokeWidth={1.75} />,
    absent: <Mail aria-hidden="true" size={22} strokeWidth={1.75} />,
  };
  const sousTitre =
    etape === "formulaire" ? (
      etat.emailMasque ? (
        <>
          Pour <strong className="text-ink font-medium [overflow-wrap:anywhere]">{etat.emailMasque}</strong>, dans l’application et cet espace.
        </>
      ) : (
        "Pour l’application et cet espace abonnement."
      )
    ) : etape === "defini" ? (
      etat.email ? (
        <>
          Connectez-vous avec <strong className="text-ink font-medium [overflow-wrap:anywhere]">{etat.email}</strong>.
        </>
      ) : (
        "Connectez-vous avec votre adresse e-mail."
      )
    ) : etape === "absent" ? (
      "Il a expiré ou a déjà servi ? Demandez-en un nouveau."
    ) : etape === "indisponible" ? (
      TEXTE_LIEN_INDISPONIBLE_COMPTE
    ) : etape === "peut_etre_defini" ? (
      "La confirmation n’est pas arrivée. Essayez de vous connecter avec votre nouveau mot de passe."
    ) : null;
  const nouveauLien = (
    <Link to={CHEMINS_COMPTE.motDePasseOublie} className={CLASSE_BOUTON}>
      Demander un nouveau lien
    </Link>
  );

  return (
    <CadreConnexion surtitre={SYMBOLES[etape] ? null : "Mon compte"} titre={titre} titreRef={titreRef} sousTitre={sousTitre} symbole={SYMBOLES[etape] ?? null}>
      {etape === "verification" && (
        <p className="flex items-center gap-2.5 text-muted text-[16px]" role="status">
          <LoaderCircle aria-hidden="true" size={18} strokeWidth={1.75} className="animate-spin motion-reduce:animate-none text-bottle" />
          Vérification du lien…
        </p>
      )}

      {etape === "erreur" && (
        <>
          <Message type="error">
            {etat.issue.texte}
            {etat.issue.contact && <EcrireNous />}
          </Message>
          {/* Le bouton disparaît à son propre clic : le focus va au titre, qui reste pendant la vérification. */}
          <button
            type="button"
            className={`${CLASSE_BOUTON} mt-6`}
            onClick={() => {
              setRelance((n) => n + 1);
              titreRef.current?.focus();
            }}
          >
            Réessayer
          </button>
        </>
      )}

      {etape === "indisponible" && (
        <>
          {nouveauLien}
          <p className="text-faint text-[14px] mt-3 text-center">
            Besoin d’aide ? <a href={`mailto:${BUSINESS.email}`} className={`${CLASSE_LIEN_SECONDAIRE} link-underline text-muted`}>Nous écrire</a>
          </p>
        </>
      )}

      {etape === "absent" && nouveauLien}

      {etape === "peut_etre_defini" && (
        <>
          <div className="flex flex-col gap-3">
            <Link to={CHEMINS_COMPTE.connexion} className={CLASSE_BOUTON}>Se connecter</Link>
            <Link to={CHEMINS_COMPTE.motDePasseOublie} className={`${CLASSE_LIEN_SECONDAIRE} self-center link-underline`}>
              Demander un nouveau lien
            </Link>
          </div>
        </>
      )}

      {etape === "formulaire" && (
        <form onSubmit={enregistrer} noValidate className="flex flex-col gap-5">
          <ChampSecret
            id="champ-mot-de-passe"
            name="password"
            label="Nouveau mot de passe"
            value={valeurs.motDePasse}
            onChange={modifier("motDePasse")}
            autoComplete="new-password"
            maxLength={LONGUEUR_MAX + 1}
            erreur={erreurs.motDePasse}
            aide={TEXTE_REGLE}
            visible={visible}
            onBasculer={() => setVisible((v) => !v)}
            controle="champ-mot-de-passe champ-confirmation"
            libelleBascule="Afficher les mots de passe"
            readOnly={envoi}
          />
          <ChampSecret
            id="champ-confirmation"
            name="password-confirmation"
            label="Confirmez-le"
            value={valeurs.confirmation}
            onChange={modifier("confirmation")}
            autoComplete="new-password"
            maxLength={LONGUEUR_MAX + 1}
            erreur={erreurs.confirmation}
            visible={visible}
            bascule={false}
            readOnly={envoi}
          />
          {erreurEnvoi && (
            <Message type="error">
              {erreurEnvoi.texte}
              {erreurEnvoi.contact && <EcrireNous />}
            </Message>
          )}
          <button type="submit" aria-disabled={envoi || undefined} aria-busy={envoi} className={`${CLASSE_BOUTON} mt-2`}>
            {envoi ? "Enregistrement…" : "Enregistrer"}
          </button>
          {etat.echeance && <p className="text-faint text-[13px] text-center">Lien valable {etat.echeance}, une seule fois.</p>}
        </form>
      )}

      {etape === "defini" && (
        <div className="flex flex-col gap-3">
          <Link to={CHEMINS_COMPTE.connexion} className={CLASSE_BOUTON}>
            Gérer mon abonnement
          </Link>
          {APP_WEB_URL && (
            <a href={APP_WEB_URL} className={`${CLASSE_LIEN_SECONDAIRE} self-center link-underline`}>
              Ouvrir l’application web
            </a>
          )}
        </div>
      )}
    </CadreConnexion>
  );
}
