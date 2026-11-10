import React from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import ErrorBoundary from "@/components/billing/ErrorBoundary";
import LayoutCompte from "@/compte/LayoutCompte";
import { CHEMINS_COMPTE } from "@/compte/chemins";
import MotDePasse from "@/compte/pages/MotDePasse";
import MotDePasseOublie from "@/compte/pages/MotDePasseOublie";
import PageEnPreparation from "@/compte/pages/PageEnPreparation";
import PageIntrouvableCompte from "@/compte/pages/PageIntrouvableCompte";

// Application de compte.restoclair.fr (build compte). Seulement les adresses de l'espace : ni vitrine, ni bandeau des
// cookies, ni Google. Les pages provisoires seront remplacées lot par lot : connexion (lot 4), espace abonnement
// (lots 3, 5, 7 à 12), choix du mot de passe (déplacé depuis /compte/mot-de-passe), mot de passe oublié (S7).
export default function AppCompte() {
  return (
    <Router>
      <LayoutCompte>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Navigate to={CHEMINS_COMPTE.espace} replace />} />
            <Route path={CHEMINS_COMPTE.connexion} element={<PageEnPreparation titre="Connexion à mon abonnement" />} />
            <Route path={`${CHEMINS_COMPTE.espace}/*`} element={<PageEnPreparation titre="Mon abonnement" />} />
            <Route path={CHEMINS_COMPTE.motDePasse} element={<MotDePasse />} />
            <Route path={CHEMINS_COMPTE.motDePasseOublie} element={<MotDePasseOublie />} />
            <Route path="*" element={<PageIntrouvableCompte />} />
          </Routes>
        </ErrorBoundary>
      </LayoutCompte>
    </Router>
  );
}
