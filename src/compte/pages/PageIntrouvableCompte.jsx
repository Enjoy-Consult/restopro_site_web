import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { CHEMINS_COMPTE } from "@/compte/chemins";

// Adresse inconnue sur compte.restoclair.fr. Le serveur répond déjà 404 hors des adresses de l'espace ; cette page
// couvre une adresse inconnue sous /mon-abonnement… ou une navigation interne. Titre au focus à l'arrivée.
export default function PageIntrouvableCompte() {
  const titreRef = useRef(null);

  useEffect(() => {
    document.title = "Page introuvable · RestOclair";
    titreRef.current?.focus();
  }, []);

  return (
    <section className="max-w-[720px] mx-auto px-6 py-24 text-center">
      <h1 ref={titreRef} tabIndex={-1} className="text-ink mb-6 focus:outline-none">Page introuvable</h1>
      <p className="text-muted mb-8">Cette adresse n’existe pas dans votre espace abonnement.</p>
      <Link to={CHEMINS_COMPTE.espace} className="btn-primary">Aller à mon abonnement</Link>
    </section>
  );
}
