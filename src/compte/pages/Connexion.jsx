import React, { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import Message from "@/components/billing/Message";
import { CHEMINS_COMPTE } from "@/compte/chemins";
import { BUSINESS } from "@/lib/business-info";
import { seConnecter, seDeconnecter } from "@/lib/billing/api";
import { ecrireSessionEspace, issueConnexion, issueConnexionReussie, lireSessionEspace, prendreRetour } from "@/lib/billing/espace";

const CLASSE_CHAMP =
  "w-full border border-border bg-white px-4 py-3.5 text-ink text-[16px] transition-shadow focus:outline-none focus:border-bottle focus:ring-4 focus:ring-bottle/10 disabled:opacity-60";

// Connexion à l'espace abonnement (POST /api/billing/connexion). Le mot de passe est celui de l'application ; il ne quitte
// la page que vers l'API, et le jeton reçu (2 h) ne vit que dans le stockage de session de compte.restoclair.fr.
// Le limiteur d'Apirest peut faire attendre la réponse (délai croissant) : le bouton reste « Connexion… », sans erreur.
export default function Connexion() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [deja] = useState(() => Boolean(lireSessionEspace()));
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [visible, setVisible] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [issue, setIssue] = useState(null);
  const envoiEnCours = useRef(false);
  const avis = typeof state?.message === "string" ? state.message : null;

  useEffect(() => {
    document.title = "Connexion à mon abonnement · RestOclair";
  }, []);

  if (deja) return <Navigate to={CHEMINS_COMPTE.espace} replace />;

  const connecter = async (e) => {
    e.preventDefault();
    if (envoiEnCours.current) return;
    if (!email.trim() || !motDePasse) {
      setIssue({ texte: "Saisissez votre adresse e-mail et votre mot de passe." });
      document.getElementById(email.trim() ? "champ-mot-de-passe" : "champ-email")?.focus();
      return;
    }
    envoiEnCours.current = true;
    setEnvoi(true);
    setIssue(null);
    try {
      const connexion = await seConnecter(email.trim(), motDePasse);
      const suite = issueConnexionReussie(connexion);
      if (suite.type === "espace") {
        const restaurants = suite.restaurants;
        ecrireSessionEspace({
          token: connexion.token,
          expireLe: connexion.expireLe,
          restaurants,
          restaurantId: restaurants.length === 1 ? restaurants[0].restaurantId : null,
        });
        setMotDePasse("");
        navigate(prendreRetour(), { replace: true });
        return;
      }
      // Personne qui ne peut pas gérer l'abonnement : la session ouverte est aussitôt fermée.
      seDeconnecter(connexion.token).catch(() => {});
      setMotDePasse("");
      setIssue({ texte: suite.texte });
    } catch (erreur) {
      setMotDePasse("");
      setIssue(issueConnexion(erreur));
      requestAnimationFrame(() => document.getElementById("champ-mot-de-passe")?.focus());
    }
    setEnvoi(false);
    envoiEnCours.current = false;
  };

  return (
    <section className="pt-12 pb-24 md:pt-20 md:pb-32">
      <div className="max-w-[560px] mx-auto px-5 md:px-6">
        <p className="text-bottle text-[12px] font-medium uppercase tracking-[0.14em] mb-5">Mon abonnement</p>
        <h1 className="text-ink mb-5 text-[clamp(2rem,5vw,3rem)]">Connexion.</h1>
        <p className="text-muted text-lg leading-relaxed mb-8">
          Connectez-vous avec l’adresse e-mail et le mot de passe de votre compte RestOclair, ceux de l’application.
        </p>

        {avis && <Message type="info" className="mb-6">{avis}</Message>}

        <form onSubmit={connecter} noValidate>
          <div className="flex flex-col gap-5">
            <div>
              <label htmlFor="champ-email" className="block text-muted text-[14px] mb-2">Adresse e-mail</label>
              <input
                id="champ-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                inputMode="email"
                disabled={envoi}
                className={CLASSE_CHAMP}
              />
            </div>
            <div>
              <label htmlFor="champ-mot-de-passe" className="block text-muted text-[14px] mb-2">Mot de passe</label>
              <input
                id="champ-mot-de-passe"
                type={visible ? "text" : "password"}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                autoComplete="current-password"
                disabled={envoi}
                className={CLASSE_CHAMP}
              />
            </div>
            <label className="flex items-center gap-3 text-sm text-muted">
              <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="w-4 h-4 accent-[#1c4b38]" />
              Afficher le mot de passe
            </label>
          </div>

          {issue && (
            <Message type="error" className="mt-6">
              {issue.texte}
              {issue.motDePasse && (
                <>
                  {" "}<Link to={CHEMINS_COMPTE.motDePasseOublie} className="link-underline">Recevoir un lien</Link>.
                </>
              )}
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
              {envoi ? "Connexion…" : "Se connecter"}
            </button>
            <Link to={CHEMINS_COMPTE.motDePasseOublie} className="link-underline text-[15px]">Mot de passe oublié ?</Link>
          </div>
        </form>
      </div>
    </section>
  );
}
