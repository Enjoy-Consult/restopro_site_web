import React from "react";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { getTestimonials } from "@/api/airtableService";
import { BUSINESS } from "@/lib/business-info";

export default function Home() {
  const { data: testimonials = [] } = useQuery({
    queryKey: ['testimonials'],
    queryFn: getTestimonials,
    initialData: [],
  });

  const featured = testimonials.find(t => t.is_featured) || testimonials[0];

  return (
    <>
      <SEO
        title="RestOclair - Consultant hygiène et sécurité alimentaire"
        description="Consultant en hygiène et sécurité alimentaire pour professionnels partout en France. Intervention urgence DDPP sous 24h, audits préventifs, dossiers obligatoires. 06 80 95 25 89"
        keywords="consultant hygiène alimentaire, sécurité alimentaire établissement, contrôle DDPP, audit hygiène cuisine, plan maîtrise sanitaire, consultant HACCP, France"
        canonicalUrl={window.location.origin}
      />
      <div>
        {/* Hero */}
        <section className="pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16 items-start">
              <div className="md:col-span-7">
                <h1 className="text-ink mb-6">
                  Un contrôle sanitaire ne devrait jamais fermer votre établissement.
                </h1>
                <p className="text-muted text-lg leading-relaxed mb-8 max-w-[520px]">
                  Depuis 20 ans en restauration, nous aidons les professionnels partout en France
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
              <p><strong className="text-ink">200</strong> <span className="text-muted">établissements accompagnés</span></p>
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
                    description="Vous venez de recevoir un rapport défavorable ou une mise en demeure. Nous intervenons sous 24 h pour rédiger le plan d'actions correctives et vous représenter auprès de l'administration."
                    link="Services"
                  />
                  <ServiceRow
                    number="02"
                    title="Audit hygiène préventif"
                    description="Avant qu'un inspecteur ne vienne, nous réalisons un audit complet de votre établissement. Vous repartez avec un rapport détaillé et des recommandations applicables immédiatement en cuisine."
                    link="Services"
                  />
                  <ServiceRow
                    number="03"
                    title="Dossiers obligatoires (PMS, CERFA, EGAlim)"
                    description="Plan de maîtrise sanitaire, fiches de traçabilité, conformité EGAlim — nous créons ou remettons à jour vos documents réglementaires pour que tout soit en ordre le jour du contrôle."
                    link="Services"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Témoignages */}
        {featured && (
          <section className="bg-bottle py-20 md:py-28">
            <div className="max-w-[800px] mx-auto px-6 text-center">
              <blockquote className="font-serif text-2xl md:text-[34px] leading-[1.3] text-bottle-text mb-8">
                "{featured.content}"
              </blockquote>
              <p className="text-bottle-muted text-base">
                {featured.author_name}
                {featured.restaurant_name && ` — ${featured.restaurant_name}`}
                {featured.location && ` (${featured.location})`}
              </p>
            </div>
          </section>
        )}

        {/* Autres témoignages */}
        {testimonials.length > 1 && (
          <section className="py-16 md:py-24 bg-[#faf9f6]">
            <div className="max-w-[1200px] mx-auto px-6">
              <h2 className="text-ink text-center mb-12">Ce que disent nos clients</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {testimonials
                  .filter(t => t !== featured)
                  .slice(0, 6)
                  .map((t) => (
                    <div key={t.id} className="bg-paper p-6 border border-[#d8d4c4]">
                      <div className="flex gap-1 mb-4">
                        {Array.from({ length: t.rating || 5 }).map((_, i) => (
                          <span key={i} className="text-[#b8860b] text-sm">&#9733;</span>
                        ))}
                      </div>
                      <p className="text-muted leading-relaxed mb-4">"{t.content}"</p>
                      <p className="text-ink font-medium text-[15px]">
                        {t.author_name}
                        {t.restaurant_name && <span className="text-faint font-normal"> — {t.restaurant_name}</span>}
                      </p>
                      {t.location && (
                        <p className="text-faint text-sm mt-1">{t.location}</p>
                      )}
                    </div>
                  ))}
              </div>
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
                  Avant de créer RestOclair en 2025, nous avons passé deux décennies en restauration —
                  du commis au chef d'établissement. Quand nous recommandons une procédure,
                  nous savons si elle est applicable à 6h du matin avec un service complet qui arrive.
                </p>
                <p className="text-muted text-lg leading-relaxed mb-8">
                  Les professionnels qui travaillent avec nous gardent un seul interlocuteur,
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

        {/* Zones d'intervention - SEO local */}
        <section className="py-16 md:py-24 bg-[#faf9f6]">
          <div className="max-w-[1200px] mx-auto px-6">
            <h2 className="text-ink text-center mb-4">Nous intervenons partout en France</h2>
            <p className="text-muted text-center text-lg mb-10 max-w-[600px] mx-auto">
              Nous nous déplaçons dans toutes les régions pour accompagner votre établissement.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[
                { city: "Paris", detail: "75" },
                { city: "Lyon", detail: "69" },
                { city: "Marseille", detail: "13" },
                { city: "Bordeaux", detail: "33" },
                { city: "Lille", detail: "59" },
                { city: "Nantes", detail: "44" },
                { city: "Toulouse", detail: "31" },
                { city: "Strasbourg", detail: "67" },
                { city: "Rennes", detail: "35" },
                { city: "Montpellier", detail: "34" },
              ].map(({ city, detail }) => (
                <div key={city} className="bg-paper border border-[#d8d4c4] px-4 py-3 text-center">
                  <p className="text-ink font-medium text-[15px]">{city}</p>
                  <p className="text-faint text-xs">{detail}</p>
                </div>
              ))}
            </div>
            <p className="text-faint text-sm text-center mt-6">
              Et toutes les villes de France — contactez-nous pour confirmer notre disponibilité dans votre secteur.
            </p>
          </div>
        </section>

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
