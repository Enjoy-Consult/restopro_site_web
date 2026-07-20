import React from "react";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { getTestimonials } from "@/api/airtableService";

export default function Home() {
  const { data: testimonials = [] } = useQuery({
    queryKey: ['testimonials'],
    queryFn: getTestimonials,
    initialData: [],
  });

  const featured = testimonials.find(t => t.featured) || testimonials[0];

  return (
    <>
      <SEO
        title="RestOclair - Consultant hygiene et securite alimentaire"
        description="Consultant en hygiene et securite alimentaire pour restaurateurs partout en France. Intervention urgence DDPP sous 24h, audits preventifs, dossiers obligatoires. 06 80 95 25 89"
        keywords="consultant hygiene alimentaire, securite alimentaire restaurant, controle DDPP, audit hygiene cuisine, plan maitrise sanitaire, consultant HACCP, France"
        canonicalUrl={window.location.origin}
      />
      <div>
        {/* Hero */}
        <section className="pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16 items-start">
              <div className="md:col-span-7">
                <h1 className="text-ink mb-6">
                  Un controle sanitaire ne devrait jamais fermer votre restaurant.
                </h1>
                <p className="text-muted text-lg leading-relaxed mb-8 max-w-[520px]">
                  Depuis 20 ans en restauration, j'aide les restaurateurs partout en France
                  a passer les controles DDPP sans stress — ou a rattraper la situation
                  quand l'inspecteur est deja venu.
                </p>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <Link to={createPageUrl("Contact")} className="btn-primary">
                    Prendre rendez-vous
                  </Link>
                  <a href="tel:0680952589" className="link-underline text-[15px] py-3">
                    06 80 95 25 89
                  </a>
                </div>
              </div>
              <div className="md:col-span-5">
                <figure>
                  <img
                    src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=640&h=800&fit=crop"
                    alt="Cuisine professionnelle en activite"
                    className="w-full aspect-[4/5] object-cover"
                  />
                  <figcaption className="text-faint text-sm mt-3">
                    Inspection en cuisine
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>
        </section>

        {/* Facts bar */}
        <hr className="rule" />
        <section className="py-8">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-12 text-[15px]">
              <p><strong className="text-ink">200</strong> <span className="text-muted">restaurants accompagnes</span></p>
              <span className="hidden md:block text-border">·</span>
              <p><strong className="text-ink">20 ans</strong> <span className="text-muted">de terrain en restauration</span></p>
              <span className="hidden md:block text-border">·</span>
              <p><strong className="text-ink">24 h</strong> <span className="text-muted">pour intervenir en urgence DDPP</span></p>
            </div>
          </div>
        </section>
        <hr className="rule" />

        {/* Services */}
        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16">
              <div className="md:col-span-4">
                <h2 className="text-ink">
                  Trois interventions, un seul objectif : rester ouvert.
                </h2>
              </div>
              <div className="md:col-span-8">
                <div className="divide-y divide-border border-t border-border">
                  <ServiceRow
                    number="01"
                    title="Urgence apres controle DDPP"
                    description="Vous venez de recevoir un rapport defavorable ou une mise en demeure. J'interviens sous 24 h pour rediger le plan d'actions correctives et vous representer aupres de l'administration."
                    link="Services"
                  />
                  <ServiceRow
                    number="02"
                    title="Audit hygiene preventif"
                    description="Avant qu'un inspecteur ne vienne, je realise un audit complet de votre etablissement. Vous repartez avec un rapport detaille et des recommandations applicables immediatement en cuisine."
                    link="Services"
                  />
                  <ServiceRow
                    number="03"
                    title="Dossiers obligatoires (PMS, CERFA, EGAlim)"
                    description="Plan de maitrise sanitaire, fiches de tracabilite, conformite EGAlim — je cree ou remets a jour vos documents reglementaires pour que tout soit en ordre le jour du controle."
                    link="Services"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        {featured && (
          <section className="bg-bottle py-20 md:py-28">
            <div className="max-w-[800px] mx-auto px-6 text-center">
              <blockquote className="font-serif text-2xl md:text-[34px] leading-[1.3] text-bottle-text mb-8">
                "{featured.quote || featured.text}"
              </blockquote>
              <p className="text-bottle-muted text-base">
                {featured.author || featured.name}
                {featured.establishment && ` — ${featured.establishment}`}
              </p>
            </div>
          </section>
        )}

        {/* Founder */}
        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16 items-start">
              <div className="md:col-span-5">
                <figure>
                  <img
                    src="/img_6598.jpeg"
                    alt="Thierry Bailleul, fondateur de RestOclair"
                    className="w-full aspect-[4/5] object-cover"
                  />
                  <figcaption className="text-faint text-sm mt-3">
                    Thierry Bailleul, fondateur
                  </figcaption>
                </figure>
              </div>
              <div className="md:col-span-7">
                <h2 className="text-ink mb-6">
                  20 ans en cuisine avant de passer de l'autre cote du passe.
                </h2>
                <p className="text-muted text-lg leading-relaxed mb-4">
                  Avant de creer RestOclair en 2025, j'ai passe deux decennies en restauration —
                  du commis au chef d'etablissement. Quand je recommande une procedure,
                  je sais si elle est applicable a 6h du matin avec un service complet qui arrive.
                </p>
                <p className="text-muted text-lg leading-relaxed mb-8">
                  Les restaurateurs qui travaillent avec moi gardent un seul interlocuteur,
                  joignable 7j/7, qui repond sous 2 h et qui connait leur cuisine aussi bien qu'eux.
                </p>
                <Link to={createPageUrl("About")} className="link-underline text-[15px]">
                  Rencontrer Thierry →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        {/* CTA */}
        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6 text-center">
            <h2 className="text-ink mb-4">Parlons de votre situation.</h2>
            <p className="text-muted text-lg mb-8 max-w-[480px] mx-auto">
              Un controle a venir, un rapport defavorable, ou simplement besoin d'un avis ?
              Premier echange gratuit et sans engagement.
            </p>
            <Link to={createPageUrl("Contact")} className="btn-primary">
              Prendre contact
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

function ServiceRow({ number, title, description, link }) {
  return (
    <div className="py-8">
      <div className="flex items-start gap-6">
        <span className="font-serif text-number text-2xl leading-none mt-1 shrink-0">{number}</span>
        <div className="flex-1">
          <h3 className="text-ink font-sans font-semibold text-[22px] mb-3">{title}</h3>
          <p className="text-muted leading-relaxed mb-3">{description}</p>
          <Link to={createPageUrl(link)} className="link-underline text-sm">
            En savoir plus →
          </Link>
        </div>
      </div>
    </div>
  );
}
