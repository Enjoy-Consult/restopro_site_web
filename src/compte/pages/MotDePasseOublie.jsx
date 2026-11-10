import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Message from "@/components/billing/Message";
import { CHEMINS_COMPTE } from "@/compte/chemins";
import { BUSINESS } from "@/lib/business-info";
import { demanderLienMotDePasse } from "@/lib/billing/api";
import { issueOubli, texteLienEnvoye } from "@/lib/billing/motdepasse";

const CLASSE_CHAMP =
  "w-full border bg-white px-4 py-3.5 text-ink text-[16px] transition-shadow focus:outline-none focus:border-bottle focus:ring-4 focus:ring-bottle/10 disabled:opacity-60";

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

  useEffect(() => {
    document.title = "Mot de passe oublié · RestOclair";
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
    envoiEnCours.current = true;
    setEnvoi(true);
    setIssue(null);
    try {
      await demanderLienMotDePasse(adresse);
      setEnvoye(texteLienEnvoye(adresse));
    } catch (erreur) {
      const resultat = issueOubli(erreur);
      setIssue(resultat);
      if (resultat?.champ) document.getElementById("champ-email")?.focus();
    }
    setEnvoi(false);
    envoiEnCours.current = false;
  };

  return (
    <section className="pt-12 pb-24 md:pt-20 md:pb-32">
      <div className="max-w-[640px] mx-auto px-5 md:px-6">
        <p className="text-bottle text-[12px] font-medium uppercase tracking-[0.14em] mb-5">Mon compte</p>
        <h1 ref={titreRef} tabIndex={-1} className="text-ink mb-5 text-[clamp(2rem,5vw,3rem)] focus:outline-none">
          {envoye ? "Regardez vos e-mails." : "Mot de passe oublié."}
        </h1>

        {envoye ? (
          <>
            <Message type="info">
              {envoye.avant}
              <strong className="font-medium">{envoye.email}</strong>
              {envoye.apres}
            </Message>
            <p className="text-muted text-[15px] leading-relaxed mt-6">
              Rien reçu ? Vérifiez l’adresse et{" "}
              <button type="button" className="link-underline" onClick={() => setEnvoye(null)}>refaites une demande</button>, ou appelez-nous au{" "}
              <a href={BUSINESS.phone.href} className="link-underline">{BUSINESS.phone.display}</a>.
            </p>
          </>
        ) : (
          <form onSubmit={envoyer} noValidate>
            <p className="text-muted text-lg leading-relaxed mb-8">
              Saisissez l’adresse e-mail de votre compte. Nous vous enverrons un lien pour choisir un nouveau mot de passe.
            </p>
            <label htmlFor="champ-email" className="block text-muted text-[14px] mb-2">Adresse e-mail</label>
            <input
              id="champ-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (issue?.champ) setIssue(null);
              }}
              autoComplete="email"
              inputMode="email"
              disabled={envoi}
              aria-invalid={issue?.champ ? "true" : undefined}
              aria-describedby={issue?.champ ? "champ-email-erreur" : undefined}
              className={`${CLASSE_CHAMP} ${issue?.champ ? "border-[#8a2424]" : "border-border"}`}
            />
            {issue?.champ && <p id="champ-email-erreur" className="text-[#8a2424] text-[14px] mt-1.5">{issue.texte}</p>}
            {issue && !issue.champ && (
              <Message type="error" className="mt-6">
                {issue.texte}
                {issue.telephone && (
                  <> Vous pouvez aussi nous appeler au <a href={BUSINESS.phone.href} className="link-underline">{BUSINESS.phone.display}</a>.</>
                )}
              </Message>
            )}
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
              <button
                type="submit"
                disabled={envoi}
                aria-busy={envoi}
                className="btn-primary w-full sm:w-auto text-center disabled:opacity-60 disabled:cursor-wait"
              >
                {envoi ? "Envoi…" : "Recevoir un lien"}
              </button>
              <Link to={CHEMINS_COMPTE.connexion} className="link-underline text-[15px]">Retour à la connexion</Link>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
