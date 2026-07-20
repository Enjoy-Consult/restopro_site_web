import React from "react";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const services = [
  {
    number: "01",
    title: "Urgence après contrôle DDPP",
    subtitle: "Intervention sous 24 h",
    description: "Vous venez de recevoir un rapport défavorable, une mise en demeure, ou une menace de fermeture administrative. Chaque jour compte.",
    details: [
      "J'interviens sur site sous 24 h après votre appel.",
      "Je rédige le plan d'actions correctives exigé par la DDPP.",
      "Je vous représente auprès de l'administration si nécessaire.",
      "Je supervise la mise en conformité jusqu'à la levée des réserves.",
    ],
    result: "Objectif : éviter la fermeture et obtenir la levée des non-conformités dans les délais impartis.",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=640&h=400&fit=crop",
    imageCaption: "Cuisine professionnelle — intervention terrain",
  },
  {
    number: "02",
    title: "Audit hygiène préventif",
    subtitle: "Avant que l'inspecteur ne vienne",
    description: "Un contrôle sanitaire, ça ne se prépare pas la veille. Un audit préventif vous donne une photographie précise de votre situation et un plan d'action clair.",
    details: [
      "Visite complète de votre établissement (cuisine, stockage, vestiaires, sanitaires).",
      "Vérification des températures, de la traçabilité, des procédures de nettoyage.",
      "Rapport écrit avec priorités classées : urgent / à corriger / recommandation.",
      "Débrief avec votre équipe pour expliquer les points clés.",
    ],
    result: "Objectif : passer le prochain contrôle DDPP sereinement, sans surprise.",
    image: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=640&h=400&fit=crop",
    imageCaption: "Vérification des procédures en cuisine",
  },
  {
    number: "03",
    title: "Dossiers obligatoires (PMS, CERFA, EGAlim)",
    subtitle: "Vos documents réglementaires à jour",
    description: "La paperasse réglementaire n'est pas votre métier — c'est le mien. Je crée ou remets à jour les documents que la DDPP exige lors d'un contrôle.",
    details: [
      "Plan de Maîtrise Sanitaire (PMS) complet et adapté à votre établissement.",
      "Fiches CERFA et déclarations obligatoires.",
      "Mise en conformité EGAlim (affichage, approvisionnement, informations).",
      "Classeur de traçabilité opérationnel et simple à maintenir par votre équipe.",
    ],
    result: "Objectif : des documents que votre équipe utilise vraiment, pas un classeur oublié sur une étagère.",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=640&h=400&fit=crop",
    imageCaption: "Documentation réglementaire",
  },
];

export default function Services() {
  return (
    <>
      <SEO
        title="Services — RestOclair | Urgence DDPP, Audit, Dossiers"
        description="Trois interventions pour les restaurateurs partout en France : urgence après contrôle DDPP, audit hygiène préventif, création de dossiers obligatoires (PMS, EGAlim)."
        keywords="urgence DDPP, audit hygiène restaurant, plan maîtrise sanitaire, PMS, EGAlim, CERFA, consultant restauration"
        canonicalUrl={`${window.location.origin}/Services`}
      />
      <div>
        <section className="pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="max-w-[600px]">
              <h1 className="text-ink mb-6">Mes services.</h1>
              <p className="text-muted text-lg leading-relaxed">
                Trois interventions, un seul objectif : que votre restaurant reste ouvert
                et conforme, sans que ça devienne votre problème principal.
              </p>
            </div>
          </div>
        </section>

        <hr className="rule" />

        {services.map((service, index) => (
          <React.Fragment key={service.number}>
            <section className="py-16 md:py-24">
              <div className="max-w-[1200px] mx-auto px-6">
                <div className="grid md:grid-cols-12 gap-12 md:gap-16">
                  <div className="md:col-span-4">
                    <span className="font-serif text-number text-3xl">{service.number}</span>
                    <h2 className="text-ink mt-3 mb-2">{service.title}</h2>
                    <p className="text-faint text-[15px]">{service.subtitle}</p>
                  </div>
                  <div className="md:col-span-8">
                    <p className="text-muted text-lg leading-relaxed mb-6">{service.description}</p>
                    <ul className="space-y-3 mb-6">
                      {service.details.map((detail, i) => (
                        <li key={i} className="text-muted leading-relaxed pl-4 border-l-2 border-[#d8d4c4]">
                          {detail}
                        </li>
                      ))}
                    </ul>
                    <p className="text-ink font-medium text-[15px] mb-8">{service.result}</p>
                    <figure>
                      <img
                        src={service.image}
                        alt={service.imageCaption}
                        className="w-full max-w-[560px] aspect-[16/10] object-cover"
                      />
                      <figcaption className="text-faint text-sm mt-3">{service.imageCaption}</figcaption>
                    </figure>
                  </div>
                </div>
              </div>
            </section>
            {index < services.length - 1 && <hr className="rule" />}
          </React.Fragment>
        ))}

        <hr className="rule" />

        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6 text-center">
            <h2 className="text-ink mb-4">Besoin d'une intervention ?</h2>
            <p className="text-muted text-lg mb-8 max-w-[480px] mx-auto">
              Appelez-moi directement ou remplissez le formulaire de contact.
              Réponse sous 2 h en semaine.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={createPageUrl("Contact")} className="btn-primary">
                Prendre contact
              </Link>
              <a href="tel:0680952589" className="link-underline text-[15px]">
                06 80 95 25 89
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
