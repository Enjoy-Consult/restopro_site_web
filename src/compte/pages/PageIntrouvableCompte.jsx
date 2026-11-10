import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { CHEMINS_COMPTE } from "@/compte/chemins";

// Adresse inconnue sur compte.restoclair.fr. Le serveur répond déjà 404 hors des adresses de l'espace ; cette page
// couvre une adresse inconnue sous /mon-abonnement… ou une navigation interne.
export default function PageIntrouvableCompte() {
  useEffect(() => {
    document.title = "Page introuvable · RestOclair";
  }, []);

  return (
    <section className="max-w-[720px] mx-auto px-6 py-24 text-center">
      <h1 className="text-ink mb-6">Page introuvable</h1>
      <p className="text-muted mb-8">Cette adresse n’existe pas dans votre espace abonnement.</p>
      <Link to={CHEMINS_COMPTE.espace} className="btn-primary">Aller à mon abonnement</Link>
    </section>
  );
}
