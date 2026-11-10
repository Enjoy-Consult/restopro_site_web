import React from "react";
import { Link } from "react-router-dom";
import { gtmCharge } from "@/lib/consentement";
import { CHEMIN_REPRISE, retenirEmailReprise } from "@/lib/billing/reprise";

// Lien vers la page de reprise d'une inscription. L'adresse déjà saisie y passe en mémoire, jamais dans l'URL.
// Google ne doit pas tourner sur cette page (environnement.js) : s'il est déjà chargé, on recharge le document pour l'y
// ouvrir sans lui. L'adresse est alors perdue, et le visiteur la saisit de nouveau.
export default function LienReprise({ email, className = "link-underline", children }) {
  return (
    <Link to={CHEMIN_REPRISE} reloadDocument={gtmCharge()} onClick={() => retenirEmailReprise(email)} className={className}>
      {children}
    </Link>
  );
}
