import React, { useEffect } from "react";
import { BUSINESS } from "@/lib/business-info";

// Page provisoire d'une adresse de compte.restoclair.fr dont le contenu arrive avec un lot suivant (connexion,
// espace abonnement, mot de passe). Le build compte n'est pas publié avant ces lots.
export default function PageEnPreparation({ titre }) {
  useEffect(() => {
    document.title = `${titre} · RestOclair`;
  }, [titre]);

  return (
    <section className="max-w-[720px] mx-auto px-6 py-24">
      <h1 className="text-ink mb-6">{titre}</h1>
      <p className="text-muted text-[17px]">
        Cette page sera bientôt disponible. Pour toute question sur votre abonnement, appelez-nous au{" "}
        <a href={BUSINESS.phone.href} className="link-underline">{BUSINESS.phone.display}</a> ou écrivez à{" "}
        <a href={`mailto:${BUSINESS.email}`} className="link-underline">{BUSINESS.email}</a>.
      </p>
    </section>
  );
}
