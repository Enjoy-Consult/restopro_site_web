import React, { useEffect } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation, useNavigationType } from "react-router-dom";
import ErrorBoundary from "@/components/billing/ErrorBoundary";
import LayoutCompte from "@/compte/LayoutCompte";
import { CHEMINS_COMPTE } from "@/compte/chemins";
import Connexion from "@/compte/pages/Connexion";
import MonAbonnement from "@/compte/pages/MonAbonnement";
import MotDePasse from "@/compte/pages/MotDePasse";
import MotDePasseOublie from "@/compte/pages/MotDePasseOublie";
import PageIntrouvableCompte from "@/compte/pages/PageIntrouvableCompte";

// Haut de page à chaque changement de chemin, comme RetourEnHaut de la vitrine (src/App.jsx). Au retour arrière
// (POP), le navigateur rétablit lui-même la position.
function RetourEnHaut() {
  const { pathname } = useLocation();
  const navigation = useNavigationType();
  useEffect(() => {
    if (navigation === "POP") return;
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Un filet par page : la clé le remet à zéro quand l'adresse change (logo, retour arrière, lien), comme les filets
// de la vitrine, au lieu de garder l'écran d'erreur d'une page quittée. Navigation vers la même adresse (le logo depuis
// Mon abonnement) : resetKey (location.key) ne retire que l'écran d'erreur ; jamais la clé, qui remonterait une page
// saine à chaque navigation « replace » sur place (état effacé de Connexion, fragment retiré de MotDePasse).
function FiletParPage({ children }) {
  const { pathname, key } = useLocation();
  return (
    <ErrorBoundary key={pathname} resetKey={key} titre="Page indisponible · RestOclair">
      {children}
    </ErrorBoundary>
  );
}

// Application de compte.restoclair.fr (build compte). Seulement les adresses de l'espace : ni vitrine, ni bandeau des
// cookies, ni Google. Périmètre de l'ouverture du 15/11 : connexion, espace (état, portail, résiliation, export,
// déconnexion), choix et réinitialisation du mot de passe, mot de passe oublié.
export default function AppCompte() {
  return (
    <Router>
      <RetourEnHaut />
      <LayoutCompte>
        <FiletParPage>
          <Routes>
            <Route path="/" element={<Navigate to={CHEMINS_COMPTE.espace} replace />} />
            <Route path={CHEMINS_COMPTE.connexion} element={<Connexion />} />
            <Route path={CHEMINS_COMPTE.espace} element={<MonAbonnement />} />
            <Route path={`${CHEMINS_COMPTE.espace}/*`} element={<PageIntrouvableCompte />} />
            <Route path={CHEMINS_COMPTE.motDePasse} element={<MotDePasse />} />
            <Route path={CHEMINS_COMPTE.motDePasseOublie} element={<MotDePasseOublie />} />
            <Route path="*" element={<PageIntrouvableCompte />} />
          </Routes>
        </FiletParPage>
      </LayoutCompte>
    </Router>
  );
}
