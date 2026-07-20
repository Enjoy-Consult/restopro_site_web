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
        title="RestOclair - Consultant hygiène et sécurité alimentaire"
        description="Consultant en hygiène et sécurité alimentaire pour restaurateurs partout en France. Intervention urgence DDPP sous 24h, audits préventifs, dossiers obligatoires. 06 80 95 25 89"
        keywords="consultant hygiène alimentaire, sécurité alimentaire restaurant, contrôle DDPP, audit hygiène cuisine, plan maîtrise sanitaire, consultant HACCP, France"
        canonicalUrl={window.location.origin}
      />
      <div>
        {/* Hero */}
        <section className="pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16 items-start">
              <div className="md:col-span-7">
                <h1 className="text-ink mb-6">
                  Un contrôle sanitaire ne devrait jamais fermer votre restaurant.
                </h1>
                <p className="text-muted text-lg leading-relaxed mb-8 max-w-[520px]">
                  Depuis 20 ans en restauration, j'aide les restaurateurs partout en France
                  à passer les contrôles DDPP sans stress — ou à rattraper la situation
                  quand l'inspecteur est déjà venu.
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
                    alt="Cuisine professionnelle en activité"
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
              <p><strong className="text-ink">200</strong> <span className="text-muted">restaurants accompagnés</span></p>
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
                    title="Urgence après contrôle DDPP"
                    description="Vous venez de recevoir un rapport défavorable ou une mise en demeure. J'interviens sous 24 h pour rédiger le plan d'actions correctives et vous représenter auprès de l'administration."
                    link="Services"
                  />
                  <ServiceRow
                    number="02"
                    title="Audit hygiène préventif"
                    description="Avant qu'un inspecteur ne vienne, je réalise un audit complet de votre établissement. Vous repartez avec un rapport détaillé et des recommandations applicables immédiatement en cuisine."
                    link="Services"
                  />
                  <ServiceRow
                    number="03"
                    title="Dossiers obligatoires (PMS, CERFA, EGAlim)"
                    description="Plan de maîtrise sanitaire, fiches de traçabilité, conformité EGAlim — je crée ou remets à jour vos documents réglementaires pour que tout soit en ordre le jour du contrôle."
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
                  20 ans en cuisine avant de passer de l'autre côté du passe.
                </h2>
                <p className="text-muted text-lg leading-relaxed mb-4">
                  Avant de créer RestOclair en 2025, j'ai passé deux décennies en restauration —
                  du commis au chef d'établissement. Quand je recommande une procédure,
                  je sais si elle est applicable à 6h du matin avec un service complet qui arrive.
                </p>
                <p className="text-muted text-lg leading-relaxed mb-8">
                  Les restaurateurs qui travaillent avec moi gardent un seul interlocuteur,
                  joignable 7j/7, qui répond sous 2 h et qui connaît leur cuisine aussi bien qu'eux.
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
              Un contrôle à venir, un rapport défavorable, ou simplement besoin d'un avis ?
              Premier échange gratuit et sans engagement.
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
