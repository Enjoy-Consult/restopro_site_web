import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MailCheck } from "lucide-react";
import Message from "@/components/billing/Message";
import CadreConnexion from "@/compte/CadreConnexion";
import { CLASSE_BOUTON, CLASSE_LIEN_SECONDAIRE, Champ } from "@/compte/ChampsConnexion";
import { CHEMINS_COMPTE } from "@/compte/chemins";
import { BUSINESS } from "@/lib/business-info";
import { demanderLienMotDePasse } from "@/lib/billing/api";
import { AIDE_ADRESSE_INSCRIPTION, TEXTE_RIEN_RECU_ADRESSE, issueOubli, texteLienEnvoye } from "@/lib/billing/motdepasse";

// « Mot de passe oublié » (spécification de la connexion, demande 9) : l'adresse e-mail, puis la même réponse dans tous
// les cas. Apirest envoie, si le compte y a droit, un lien de 60 minutes vers /mot-de-passe#jeton=… (page MotDePasse).
// Le serveur peut faire attendre la réponse (temps plancher, délai croissant du limiteur) : le bouton reste « Envoi… »,
// sans message d'erreur ; seul un 429 affiche le délai demandé.
export default function MotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [issue, setIssue] = useState(null);
  const [envoye, setEnvoye] = useState(null);
  const envoiEnCours = useRef(false);
  const titreRef = useRef(null);

  // Titre au focus à l'arrivée sur la page, puis après l'envoi : un lecteur d'écran repart du haut.
  useEffect(() => {
    document.title = "Mot de passe oublié · RestOclair";
    titreRef.current?.focus();
  }, []);

  useEffect(() => {
    if (envoye) titreRef.current?.focus();
  }, [envoye]);

  const envoyer = async (e) => {
    e.preventDefault();
    if (envoiEnCours.current) return;
    const adresse = email.trim();
    if (!adresse || !adresse.includes("@")) {
      setIssue({ champ: "email", texte: "Saisissez l’adresse e-mail de votre compte." });
      document.getElementById("champ-email")?.focus();
      return;
    }
    // Pendant l'envoi, le champ est en lecture seule et le bouton aria-disabled : le focus reste en place.
    envoiEnCours.current = true;
    setEnvoi(true);
    setIssue(null);
    try {
      await demanderLienMotDePasse(adresse);
      setEnvoye(texteLienEnvoye(adresse));
    } catch (erreur) {
      const resultat = issueOubli(erreur);
      setIssue(resultat);
      if (resultat?.champ) requestAnimationFrame(() => document.getElementById("champ-email")?.focus());
    } finally {
      setEnvoi(false);
      envoiEnCours.current = false;
    }
  };

  const refaire = () => {
    setEnvoye(null);
    requestAnimationFrame(() => document.getElementById("champ-email")?.focus());
  };

  return (
    <CadreConnexion
      surtitre={envoye ? null : "Mon compte"}
      titre={envoye ? "Regardez vos e-mails." : "Mot de passe oublié."}
      titreRef={titreRef}
      sousTitre={envoye ? null : "Recevez un lien pour en choisir un nouveau."}
      symbole={envoye ? <MailCheck aria-hidden="true" size={24} strokeWidth={1.75} /> : null}
    >
      {envoye ? (
        <>
          <p className="text-muted text-[16px] leading-relaxed text-pretty" role="status">
            {envoye.avant}
            <strong className="text-ink font-medium [overflow-wrap:anywhere]">{envoye.email}</strong>
            {envoye.apres}
          </p>
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-faint text-[14px] leading-relaxed text-pretty">
              {TEXTE_RIEN_RECU_ADRESSE}
              <a href={`mailto:${BUSINESS.email}`} className="link-underline text-muted">{BUSINESS.email}</a>.
            </p>
            <button type="button" className={`${CLASSE_LIEN_SECONDAIRE} link-underline text-muted mt-1`} onClick={refaire}>
              Refaire une demande
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={envoyer} noValidate className="flex flex-col gap-5">
          <Champ
            id="champ-email"
            label="Adresse e-mail"
            name="username"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (issue?.champ) setIssue(null);
            }}
            autoComplete="username"
            inputMode="email"
            readOnly={envoi}
            aide={AIDE_ADRESSE_INSCRIPTION}
            erreur={issue?.champ ? issue.texte : null}
          />
          {issue && !issue.champ && (
            <Message type="error">
              {issue.texte}
              {issue.contact && (
                <> Vous pouvez aussi nous écrire à <a href={`mailto:${BUSINESS.email}`} className="link-underline">{BUSINESS.email}</a>.</>
              )}
            </Message>
          )}
          <button type="submit" aria-disabled={envoi || undefined} aria-busy={envoi} className={`${CLASSE_BOUTON} mt-2`}>
            {envoi ? "Envoi…" : "Recevoir un lien"}
          </button>
          <Link to={CHEMINS_COMPTE.connexion} className={`${CLASSE_LIEN_SECONDAIRE} self-center text-muted hover:text-ink`}>
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
            Retour à la connexion
          </Link>
        </form>
      )}
    </CadreConnexion>
  );
}
