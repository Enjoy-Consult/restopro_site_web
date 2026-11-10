import React from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import ErrorBoundary from "@/components/billing/ErrorBoundary";
import LayoutCompte from "@/compte/LayoutCompte";
import { CHEMINS_COMPTE } from "@/compte/chemins";
import Connexion from "@/compte/pages/Connexion";
import MonAbonnement from "@/compte/pages/MonAbonnement";
import MotDePasse from "@/compte/pages/MotDePasse";
import MotDePasseOublie from "@/compte/pages/MotDePasseOublie";
import PageIntrouvableCompte from "@/compte/pages/PageIntrouvableCompte";

// Application de compte.restoclair.fr (build compte). Seulement les adresses de l'espace : ni vitrine, ni bandeau des
// cookies, ni Google. Périmètre de l'ouverture du 15/11 : connexion, espace (état, portail, résiliation, export,
// déconnexion), choix et réinitialisation du mot de passe, mot de passe oublié.
export default function AppCompte() {
  return (
    <Router>
      <LayoutCompte>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Navigate to={CHEMINS_COMPTE.espace} replace />} />
            <Route path={CHEMINS_COMPTE.connexion} element={<Connexion />} />
            <Route path={CHEMINS_COMPTE.espace} element={<MonAbonnement />} />
            <Route path={`${CHEMINS_COMPTE.espace}/*`} element={<PageIntrouvableCompte />} />
            <Route path={CHEMINS_COMPTE.motDePasse} element={<MotDePasse />} />
            <Route path={CHEMINS_COMPTE.motDePasseOublie} element={<MotDePasseOublie />} />
            <Route path="*" element={<PageIntrouvableCompte />} />
          </Routes>
        </ErrorBoundary>
      </LayoutCompte>
    </Router>
  );
}
