import React from "react";
import { URL_ESPACE } from "@/lib/billing/config";

// L'espace abonnement est sur compte.restoclair.fr (README, « Deux builds ») : lien par l'adresse complète, dans le même
// onglet. Sans VITE_COMPTE_URL (développement mal réglé), le texte reste sans lien plutôt que de mener à une page
// introuvable de restoclair.fr ; le garde-fou exige la variable pour une vitrine de production qui vend.
export default function LienEspace({ children, className = "link-underline" }) {
  if (!URL_ESPACE) return <>{children}</>;
  return <a href={URL_ESPACE} className={className}>{children}</a>;
}
