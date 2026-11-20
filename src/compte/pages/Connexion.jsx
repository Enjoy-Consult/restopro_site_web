import React, { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import Message from "@/components/billing/Message";
import CadreConnexion from "@/compte/CadreConnexion";
import { CLASSE_BOUTON, CLASSE_LIEN_SECONDAIRE, Champ, ChampSecret } from "@/compte/ChampsConnexion";
import { CHEMINS_COMPTE } from "@/compte/chemins";
import { BUSINESS } from "@/lib/business-info";
import { seConnecter, seDeconnecter } from "@/lib/billing/api";
import { echeanceLocale, ecrireSessionEspace, issueConnexion, issueConnexionReussie, lireSessionEspace, prendreRetour } from "@/lib/billing/espace";

// Connexion à l'espace abonnement (POST /api/billing/connexion). Le mot de passe est celui de l'application ; il ne quitte
// la page que vers l'API, et le jeton reçu (2 h) ne vit que dans le stockage de session de compte.restoclair.fr.
// Le limiteur d'Apirest peut faire attendre la réponse (délai croissant) : le bouton reste « Connexion… », sans erreur.
export default function Connexion() {
  const navigate = useNavigate();
  const { pathname, search, state } = useLocation();
  const [deja] = useState(() => Boolean(lireSessionEspace()));
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [visible, setVisible] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [issue, setIssue] = useState(null);
  const envoiEnCours = useRef(false);
  // Avis de l'arrivée (session expirée, déconnexion), gardé ici : l'état de l'historique est aussitôt effacé, sinon
  // l'avis reviendrait à chaque rechargement de la page et à chaque retour arrière sur elle.
  const [avis] = useState(() => (typeof state?.message === "string" ? state.message : null));
  const titreRef = useRef(null);

  useEffect(() => {
    document.title = "Connexion à mon abonnement · RestOclair";
    if (deja) return;
    // Titre au focus à l'arrivée : un lecteur d'écran repart du haut de la nouvelle page.
    titreRef.current?.focus();
    if (state?.message !== undefined) navigate({ pathname, search }, { replace: true, state: null });
  }, []);

  if (deja) return <Navigate to={CHEMINS_COMPTE.espace} replace />;

  const connecter = async (e) => {
    e.preventDefault();
    if (envoiEnCours.current) return;
    // Champ vide : l'erreur sous le champ (aria-invalid), puis le focus, après le rendu, sur le premier champ vide.
    const manque = { email: !email.trim(), motDePasse: !motDePasse };
    if (manque.email || manque.motDePasse) {
      setIssue({
        champs: {
          email: manque.email ? "Saisissez votre adresse e-mail." : null,
          motDePasse: manque.motDePasse ? "Saisissez votre mot de passe." : null,
        },
      });
      requestAnimationFrame(() => document.getElementById(manque.email ? "champ-email" : "champ-mot-de-passe")?.focus());
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
          echeance: echeanceLocale(connexion.expireLe),
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
    <CadreConnexion
      surtitre="Mon abonnement"
      titre="Connexion."
      titreRef={titreRef}
      sousTitre="Avec vos identifiants de l’application RestOclair."
    >
      {avis && <Message type="info" className="mb-6">{avis}</Message>}

      {/* Pendant l'envoi : champs en lecture seule et bouton aria-disabled, jamais disabled, pour garder le focus. */}
      <form onSubmit={connecter} noValidate className="flex flex-col gap-5">
        <Champ
          id="champ-email"
          label="Adresse e-mail"
          name="username"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (issue?.champs) setIssue(null);
          }}
          autoComplete="username"
          inputMode="email"
          readOnly={envoi}
          aide="L’adresse e-mail donnée lors de votre inscription."
          erreur={issue?.champs?.email ?? null}
        />
        <ChampSecret
          id="champ-mot-de-passe"
          label="Mot de passe"
          name="password"
          value={motDePasse}
          onChange={(e) => {
            setMotDePasse(e.target.value);
            if (issue?.champs) setIssue(null);
          }}
          autoComplete="current-password"
          visible={visible}
          onBasculer={() => setVisible((v) => !v)}
          readOnly={envoi}
          erreur={issue?.champs?.motDePasse ?? null}
        />

        {issue?.texte && (
          <Message type="error">
            {issue.texte}
            {issue.motDePasse && (
              <>
                {" "}<Link to={CHEMINS_COMPTE.motDePasseOublie} className="link-underline">Recevoir un lien</Link>.
              </>
            )}
            {issue.contact && (
              <> Écrivez-nous à <a href={`mailto:${BUSINESS.email}`} className="link-underline">{BUSINESS.email}</a>.</>
            )}
          </Message>
        )}

        <button type="submit" aria-disabled={envoi || undefined} aria-busy={envoi} className={`${CLASSE_BOUTON} mt-2`}>
          {envoi ? "Connexion…" : "Se connecter"}
        </button>
        <Link to={CHEMINS_COMPTE.motDePasseOublie} className={`${CLASSE_LIEN_SECONDAIRE} self-center link-underline`}>
          Mot de passe oublié ?
        </Link>
      </form>
    </CadreConnexion>
  );
}
