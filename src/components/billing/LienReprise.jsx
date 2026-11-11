import React from "react";
import { Link } from "react-router-dom";
import { gtmCharge } from "@/lib/consentement";
import { CHEMIN_REPRISE, retenirEmailReprise } from "@/lib/billing/reprise";

// Lien vers la page de reprise d'une inscription. L'adresse déjà saisie y passe en mémoire, jamais dans l'URL.
// Google ne doit pas tourner sur cette page (environnement.js) : s'il est chargé au moment du clic, on ouvre la page
// dans un nouveau document, sans lui. L'adresse est alors perdue, et le visiteur la saisit de nouveau.
export default function LienReprise({ email, className = "link-underline", children }) {
  const suivre = (e) => {
    retenirEmailReprise(email);
    if (!gtmCharge()) return;
    e.preventDefault();
    window.location.assign(CHEMIN_REPRISE);
  };
  return (
    <Link to={CHEMIN_REPRISE} onClick={suivre} className={className}>
      {children}
    </Link>
  );
}
