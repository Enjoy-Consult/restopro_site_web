import React from "react";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const services = [
  {
    number: "01",
    title: "Urgence apres controle DDPP",
    subtitle: "Intervention sous 24 h",
    description: `Vous venez de recevoir un rapport defavorable, une mise en demeure, ou une menace de fermeture administrative. Chaque jour compte.`,
    details: [
      "J'interviens sur site sous 24 h apres votre appel.",
      "Je redige le plan d'actions correctives exige par la DDPP.",
      "Je vous represente aupres de l'administration si necessaire.",
      "Je supervise la mise en conformite jusqu'a la levee des reserves.",
    ],
    result: "Objectif : eviter la fermeture et obtenir la levee des non-conformites dans les delais impartis.",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=640&h=400&fit=crop",
    imageCaption: "Cuisine professionnelle — intervention terrain",
  },
  {
    number: "02",
    title: "Audit hygiene preventif",
    subtitle: "Avant que l'inspecteur ne vienne",
    description: `Un controle sanitaire, ca ne se prepare pas la veille. Un audit preventif vous donne une photographie precise de votre situation et un plan d'action clair.`,
    details: [
      "Visite complete de votre etablissement (cuisine, stockage, vestiaires, sanitaires).",
      "Verification des temperatures, de la tracabilite, des procedures de nettoyage.",
      "Rapport ecrit avec priorites classees : urgent / a corriger / recommandation.",
      "Debrief avec votre equipe pour expliquer les points cles.",
    ],
    result: "Objectif : passer le prochain controle DDPP sereinement, sans surprise.",
    image: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=640&h=400&fit=crop",
    imageCaption: "Verification des procedures en cuisine",
  },
  {
    number: "03",
    title: "Dossiers obligatoires (PMS, CERFA, EGAlim)",
    subtitle: "Vos documents reglementaires a jour",
    description: `La paperasse reglementaire n'est pas votre metier — c'est le mien. Je cree ou remets a jour les documents que la DDPP exige lors d'un controle.`,
    details: [
      "Plan de Maitrise Sanitaire (PMS) complet et adapte a votre etablissement.",
      "Fiches CERFA et declarations obligatoires.",
      "Mise en conformite EGAlim (affichage, approvisionnement, informations).",
      "Classeur de tracabilite operationnel et simple a maintenir par votre equipe.",
    ],
    result: "Objectif : des documents que votre equipe utilise vraiment, pas un classeur oublie sur une etagere.",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=640&h=400&fit=crop",
    imageCaption: "Documentation reglementaire",
  },
];

export default function Services() {
  return (
    <>
      <SEO
        title="Services — RestOclair | Urgence DDPP, Audit, Dossiers"
        description="Trois interventions pour les restaurateurs d'Ile-de-France : urgence apres controle DDPP, audit hygiene preventif, creation de dossiers obligatoires (PMS, EGAlim)."
        keywords="urgence DDPP, audit hygiene restaurant, plan maitrise sanitaire, PMS, EGAlim, CERFA, consultant restauration"
        canonicalUrl={`${window.location.origin}/Services`}
      />
      <div>
        {/* Header */}
        <section className="pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="max-w-[600px]">
              <h1 className="text-ink mb-6">Mes services.</h1>
              <p className="text-muted text-lg leading-relaxed">
                Trois interventions, un seul objectif : que votre restaurant reste ouvert
                et conforme, sans que ca devienne votre probleme principal.
              </p>
            </div>
          </div>
        </section>

        <hr className="rule" />

        {/* Services list */}
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
                        <li key={i} className="text-muted leading-relaxed pl-4 border-l-2 border-border">
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

        {/* CTA */}
        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6 text-center">
            <h2 className="text-ink mb-4">Besoin d'une intervention ?</h2>
            <p className="text-muted text-lg mb-8 max-w-[480px] mx-auto">
              Appelez-moi directement ou remplissez le formulaire de contact.
              Reponse sous 2 h en semaine.
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
