import React, { useEffect } from "react";
import { URL_MOT_DE_PASSE_COMPTE } from "@/lib/billing/config";
import DefinirMotDePasse from "@/pages/DefinirMotDePasse";

// Ancienne adresse du choix du mot de passe (restoclair.fr/compte/mot-de-passe#jeton=…). La page vit maintenant sur
// compte.restoclair.fr/mot-de-passe : on y part aussitôt, fragment compris (il ne quitte jamais le navigateur), sans
// rien vérifier ni consommer ici. Une fois compte.restoclair.fr en service, nginx fera la même redirection en 301.
// Sans VITE_COMPTE_URL (développement), l'ancienne page reste en service.
export default function RedirectionMotDePasse() {
  useEffect(() => {
    if (URL_MOT_DE_PASSE_COMPTE) window.location.replace(`${URL_MOT_DE_PASSE_COMPTE}${window.location.hash}`);
  }, []);
  if (!URL_MOT_DE_PASSE_COMPTE) return <DefinirMotDePasse />;
  return (
    <section className="max-w-[640px] mx-auto px-5 md:px-6 py-24">
      <p className="text-muted text-lg" role="status">Redirection vers votre espace…</p>
    </section>
  );
}
