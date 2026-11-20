import { VENTE_VISIBLE } from "@/lib/billing/invitation";
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

  const featured = testimonials.find(t => t.is_featured) || testimonials[0];

  return (
    <>
      <SEO
        title="Hygiène alimentaire et HACCP pour restaurants"
        description="L’application d’hygiène de votre restaurant et une équipe du métier : températures, traçabilité, nettoyage, aide face à la DDPP. Essai gratuit."
        keywords="hygiène alimentaire restaurant, application HACCP, plan de maîtrise sanitaire, traçabilité, relevés de températures, contrôle DDPP"
        canonicalUrl={window.location.origin}
      />
      <div>
        {/* Hero */}
        <section className="pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16 items-start">
              <div className="md:col-span-7">
                <h1 className="text-ink mb-6">
                  Votre hygiène tenue au quotidien. Une équipe à vos côtés le jour où il le faut.
                </h1>
                <p className="text-muted text-lg leading-relaxed mb-8 max-w-[520px]">
                  RestOclair réunit une application pour l’équipe en cuisine et des spécialistes de l’hygiène
                  alimentaire pour l’exploitant. Vous tenez vos relevés sans classeur, et vous n’êtes pas seul
                  quand la DDPP passe.
                </p>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <Link to="/essai-gratuit" className="btn-primary">
                    Essayer gratuitement
                  </Link>
                  {VENTE_VISIBLE ? (
                    <Link to="/tarifs" className="link-underline text-[15px] py-3">
                      Voir les tarifs
                    </Link>
                  ) : (
                    <Link to="/application" className="link-underline text-[15px] py-3">
                      Découvrir l’application
                    </Link>
                  )}
                </div>
              </div>
              <div className="md:col-span-5">
                <figure>
                  <img
                    src="/images/cuisine-service-640x800.jpg"
                    alt="Cuisine professionnelle pendant le service"
                    className="w-full aspect-[4/5] object-cover"
                  />
                  <figcaption className="text-faint text-sm mt-3">
                    En cuisine, pendant le service
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>
        </section>

        {/* Faits vérifiables */}
        <hr className="rule" />
        <section className="py-8">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-12 text-[15px]">
              <p><strong className="text-ink">Équipiers illimités et gratuits*</strong></p>
              <span className="hidden md:block text-border">·</span>
              <p><strong className="text-ink">Données hébergées en France</strong></p>
              <span className="hidden md:block text-border">·</span>
              <p><strong className="text-ink">Essai gratuit</strong> <span className="text-muted">de l’application</span></p>
            </div>
          </div>
        </section>
        <hr className="rule" />

        {/* Trois piliers */}
        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16">
              <div className="md:col-span-4">
                <h2 className="text-ink">
                  Au quotidien, le jour du contrôle, et quand ça se complique.
                </h2>
              </div>
              <div className="md:col-span-8">
                <div className="divide-y divide-border border-t border-border">
                  <ServiceRow
                    number="01"
                    title="Au quotidien"
                    description="Températures, réceptions, DLC, plan de nettoyage : chaque geste est enregistré en quelques secondes et signé par l’équipier, sur l’appareil de l’établissement."
                    to="/application"
                    lien="Découvrir l’application →"
                  />
                  <ServiceRow
                    number="02"
                    title="Le jour du contrôle"
                    description="Votre dossier d’inspection est à jour : relevés, traçabilité et actions correctives sont rangés au même endroit, prêts à montrer."
                    to="/application"
                    lien="Voir le dossier d’inspection →"
                  />
                  <ServiceRow
                    number="03"
                    title="Quand ça se complique"
                    description="Avec la formule Sérénité, l’équipe suit votre score hygiène et vous alerte quand il baisse. En cas de mise en demeure, nous vous aidons à rédiger votre réponse, que vous signez et envoyez."
                    to="/accompagnement"
                    lien="Notre accompagnement →"
                  />
                </div>
                <p className="text-faint text-sm mt-6">
                  *Les équipiers n’ont pas de connexion à eux : ils signent leurs actions avec un code PIN sur l’appareil de l’établissement.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trois portes d'entrée */}
        <section className="pb-20 md:pb-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="border-t border-border pt-16 md:pt-20 grid md:grid-cols-3 gap-10">
              <Porte
                titre="Vous êtes ouvert"
                texte="Mettez l’hygiène de votre cuisine dans une seule application, et choisissez la formule qui vous convient."
                to={VENTE_VISIBLE ? "/tarifs" : "/essai-gratuit"}
                lien={VENTE_VISIBLE ? "Voir les formules →" : "Demander un essai →"}
              />
              <Porte
                titre="Vous ouvrez bientôt"
                texte="Votre plan de maîtrise sanitaire avant l’ouverture, et l’application dès le premier service."
                to="/ouvrir-un-restaurant"
                lien="Préparer mon ouverture →"
              />
              <Porte
                titre="Vous gérez plusieurs sites"
                texte="Une offre dédiée aux groupes, aux chaînes et aux collectivités, dimensionnée avec vous."
                to="/reseaux"
                lien="L’offre réseaux →"
              />
            </div>
          </div>
        </section>

        {/* Application RestOclair */}
        <section className="pb-20 md:pb-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="border-t border-border pt-16 md:pt-20 grid md:grid-cols-12 gap-12 md:gap-16 items-center">
              <div className="md:col-span-5">
                <h2 className="text-ink mb-6">Une application pensée pour la cuisine.</h2>
                <p className="text-muted text-lg leading-relaxed mb-8">
                  Températures, traçabilité, plans de nettoyage, dossier d’inspection : votre suivi hygiène
                  au même endroit, sur l’appareil de l’établissement. L’essai est gratuit.
                </p>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <Link to="/essai-gratuit" className="btn-primary">
                    Tester l’application
                  </Link>
                  <Link to="/application" className="link-underline text-[15px] py-3">
                    Tout ce qu’elle fait
                  </Link>
                </div>
              </div>
              <div className="md:col-span-7">
                <figure>
                  <div className="border border-border bg-white p-2 max-w-[300px] mx-auto">
                    <div className="h-[460px] md:h-[520px] overflow-hidden">
                      <img
                        src="/essai/dashboard.jpg"
                        alt="Tableau de bord de l’application RestOclair"
                        className="w-full h-auto"
                        style={{ filter: "none" }}
                        loading="lazy"
                      />
                    </div>
                  </div>
                  <figcaption className="text-faint text-sm mt-3 text-center">
                    Le tableau de bord d’un établissement dans l’application.
                  </figcaption>
                </figure>
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

        {/* L'équipe */}
        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16 items-start">
              <div className="md:col-span-5">
                <figure>
                  <img
                    src="/images/cuisine-pro-640x400.jpg"
                    alt="Plan de travail d’une cuisine professionnelle"
                    className="w-full aspect-[4/3] object-cover"
                    loading="lazy"
                  />
                </figure>
              </div>
              <div className="md:col-span-7">
                <h2 className="text-ink mb-6">
                  Des gens de la restauration, pas seulement un logiciel.
                </h2>
                <p className="text-muted text-lg leading-relaxed mb-4">
                  RestOclair est née dans les Hauts-de-France, de la rencontre entre la restauration collective,
                  le commerce et le développement logiciel. Les procédures que nous proposons sont pensées pour
                  un service qui commence à 6 h, pas pour un bureau.
                </p>
                <p className="text-muted text-lg leading-relaxed mb-8">
                  Nous développons l’application nous-mêmes, et nous restons joignables quand une situation
                  dépasse ce qu’un logiciel peut faire.
                </p>
                <Link to="/entreprise" className="link-underline text-[15px]">
                  Découvrir l’entreprise →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        {/* CTA */}
        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6 text-center">
            <h2 className="text-ink mb-4">Parlons de votre établissement.</h2>
            <p className="text-muted text-lg mb-8 max-w-[520px] mx-auto">
              Une question sur l’application, un contrôle à venir, une ouverture en préparation :
              l’équipe vous répond. Le premier échange est gratuit.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={createPageUrl("Contact")} className="btn-primary">
                Nous contacter
              </Link>
              <Link to="/essai-gratuit" className="link-underline text-[15px]">
                Essai gratuit
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function ServiceRow({ number, title, description, to, lien }) {
  return (
    <div className="py-8">
      <div className="flex items-start gap-6">
        <span className="font-serif text-number text-2xl leading-none mt-1 shrink-0">{number}</span>
        <div className="flex-1">
          <h3 className="text-ink font-sans font-semibold text-[22px] mb-3">{title}</h3>
          <p className="text-muted leading-relaxed mb-3">{description}</p>
          <Link to={to} className="link-underline text-sm">
            {lien}
          </Link>
        </div>
      </div>
    </div>
  );
}

function Porte({ titre, texte, to, lien }) {
  return (
    <div>
      <h3 className="text-ink font-sans font-semibold text-[22px] mb-3">{titre}</h3>
      <p className="text-muted leading-relaxed mb-4">{texte}</p>
      <Link to={to} className="link-underline text-sm">
        {lien}
      </Link>
    </div>
  );
}
