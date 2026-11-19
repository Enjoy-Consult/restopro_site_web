import React from "react";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";

// Page « Ouvrir un restaurant » : le pack d'ouverture (PMS + 3 mois d'application). Le PMS est un service futur
// (CGV, article 14 : lancement prévu mi-décembre 2026) : pas de prix ni de commande ici tant que le produit n'existe pas.
const ETAPES = [
  ["Vous décrivez votre activité", "Type de restauration, zones de travail, équipements, produits : un questionnaire guidé, en ligne."],
  ["Nous établissons votre PMS", "Un plan de maîtrise sanitaire établi selon le guide de bonnes pratiques de votre métier, en PDF. Vous le validez et l’appliquez."],
  ["Vous ouvrez avec l’application", "Trois mois d’application offerts pour toute votre équipe : relevés, traçabilité et nettoyage tenus dès le premier service."],
];

export default function OuvrirRestaurant() {
  return (
    <>
      <SEO
        title="Ouvrir un restaurant : votre hygiène prête dès l’ouverture"
        description="Le plan de maîtrise sanitaire est obligatoire avant d’ouvrir. Le pack d’ouverture RestOclair : votre PMS et trois mois d’application offerts. Disponible mi-décembre 2026."
        keywords="ouvrir un restaurant, plan de maîtrise sanitaire ouverture, PMS création restaurant, hygiène ouverture restaurant, HACCP création"
        canonicalUrl={`${window.location.origin}/ouvrir-un-restaurant`}
      />
      <div>
        <section className="pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16 items-start">
              <div className="md:col-span-7">
                <p className="text-faint text-sm mb-4">Disponible mi-décembre 2026</p>
                <h1 className="text-ink mb-6">Vous ouvrez ? Commencez avec une hygiène en ordre.</h1>
                <p className="text-muted text-lg leading-relaxed mb-8 max-w-[560px]">
                  Le plan de maîtrise sanitaire est obligatoire avant d’accueillir vos premiers clients.
                  RestOclair vous l’établit à partir de votre activité, puis vous donne l’application pour le tenir
                  dès le premier service.
                </p>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <Link to="/Contact?sujet=dossiers" className="btn-primary">
                    Préparer mon ouverture
                  </Link>
                  <Link to="/application" className="link-underline text-[15px] py-3">
                    Découvrir l’application
                  </Link>
                </div>
              </div>
              <div className="md:col-span-5">
                <figure>
                  <img
                    src="/images/cuisine-pro-640x400.jpg"
                    alt="Plan de travail d’une cuisine professionnelle"
                    className="w-full aspect-[4/3] object-cover"
                  />
                </figure>
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16">
              <div className="md:col-span-4">
                <h2 className="text-ink">Le pack d’ouverture.</h2>
              </div>
              <div className="md:col-span-8">
                <div className="divide-y divide-border border-t border-border">
                  {ETAPES.map(([titre, texte], i) => (
                    <div key={titre} className="py-8 flex items-start gap-6">
                      <span className="font-serif text-number text-2xl leading-none mt-1 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                      <div>
                        <h3 className="text-ink font-sans font-semibold text-[22px] mb-3">{titre}</h3>
                        <p className="text-muted leading-relaxed">{texte}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-muted leading-relaxed mt-8">
                  Équipiers illimités et gratuits* pendant l’essai comme après. À la fin des trois mois, vous choisissez
                  votre formule, ou vous arrêtez. Le prix du pack sera annoncé à son lancement ; le paiement se fera sur
                  restoclair.fr.
                </p>
                <p className="text-faint text-sm mt-4">
                  *Les équipiers n’ont pas de connexion à eux : ils signent leurs actions avec un code PIN sur l’appareil de l’établissement.
                </p>
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16">
              <div className="md:col-span-4">
                <h2 className="text-ink">Recommandé par un partenaire ?</h2>
              </div>
              <div className="md:col-span-8">
                <p className="text-muted text-lg leading-relaxed">
                  Votre organisme de formation, votre expert-comptable ou votre fournisseur vous a parlé de RestOclair ?
                  Dites-le-nous en prenant contact : nous préparerons votre ouverture avec vous.
                </p>
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6 text-center">
            <h2 className="text-ink mb-4">Votre ouverture approche ?</h2>
            <p className="text-muted text-lg mb-8 max-w-[520px] mx-auto">
              Laissez-nous un message : nous vous recontactons pour préparer votre plan de maîtrise sanitaire.
            </p>
            <Link to="/Contact?sujet=dossiers" className="btn-primary">
              Préparer mon ouverture
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
