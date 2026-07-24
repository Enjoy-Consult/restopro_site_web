import React from "react";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function About() {
  return (
    <>
      <SEO
        title="À propos — Thierry Bailleul | RestOclair"
        description="Thierry Bailleul, 20 ans de restauration avant de fonder RestOclair en 2025. Consultant hygiène et sécurité alimentaire partout en France."
        keywords="Thierry Bailleul, consultant hygiène alimentaire, RestOclair, parcours restauration"
        canonicalUrl={`${window.location.origin}/About`}
      />
      <div>
        {/* Intro */}
        <section className="pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16 items-start">
              <div className="md:col-span-7">
                <h1 className="text-ink mb-8">
                  RestOclair, fondé par Thierry Bailleul.
                </h1>
                <p className="text-muted text-lg leading-relaxed mb-6">
                  Pendant 20 ans, Thierry a travaillé en restauration. D'abord derrière les fourneaux,
                  puis en gestion d'établissement. Il a vécu les contrôles sanitaires — des deux côtés
                  du comptoir. C'est cette double expérience qui a poussé à créer RestOclair en 2025.
                </p>
                <p className="text-muted text-lg leading-relaxed mb-6">
                  Notre approche est simple : on ne vend pas de la paperasse. On vient dans votre cuisine,
                  on regarde comment votre équipe travaille, et on vous donne des recommandations
                  que vous pouvez appliquer dès le lendemain matin. Pas de jugement, pas de jargon —
                  juste l'expérience du terrain.
                </p>
                <p className="text-muted text-lg leading-relaxed">
                  Quand un professionnel nous appelle en urgence après un contrôle, on décroche en moins
                  de 2 h. Et quand on rédige un plan d'actions correctives, on sait qu'il sera
                  réaliste parce qu'on a nous-mêmes appliqué ces procédures pendant deux décennies.
                </p>
              </div>
              <div className="md:col-span-5">
                <figure>
                  <img
                    src="/img_6598.jpeg"
                    alt="Thierry Bailleul"
                    className="w-full aspect-[4/5] object-cover"
                  />
                  <figcaption className="text-faint text-sm mt-3">
                    Thierry Bailleul, fondateur de RestOclair
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        {/* Parcours */}
        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16">
              <div className="md:col-span-4">
                <h2 className="text-ink">Le parcours RestOclair.</h2>
              </div>
              <div className="md:col-span-8">
                <div className="divide-y divide-border border-t border-border">
                  <TimelineRow year="2003" text="Premier poste en cuisine — apprentissage des bases HACCP sur le terrain." />
                  <TimelineRow year="2010" text="Responsable d'établissement. Gestion des contrôles, formation des équipes." />
                  <TimelineRow year="2020" text="Formation en sécurité alimentaire et accompagnement réglementaire." />
                  <TimelineRow year="2025" text="Création de RestOclair. Premier client : un établissement menacé de fermeture après contrôle DDPP. Réouverture en 10 jours." />
                </div>
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        {/* Ce qu'on fait / ne fait pas */}
        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16">
              <div className="md:col-span-4">
                <h2 className="text-ink">Ce qu'on fait. Et ce qu'on ne fait pas.</h2>
              </div>
              <div className="md:col-span-8 grid sm:grid-cols-2 gap-12">
                <div>
                  <h3 className="text-ink font-sans font-semibold text-lg mb-4">On fait</h3>
                  <ul className="space-y-3 text-muted">
                    <li>Intervention urgence sous 24 h</li>
                    <li>Audit terrain dans votre cuisine</li>
                    <li>Rédaction PMS, CERFA, plans d'actions</li>
                    <li>Représentation auprès de la DDPP</li>
                    <li>Formation de vos équipes sur place</li>
                    <li>Suivi post-contrôle jusqu'à la conformité</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-ink font-sans font-semibold text-lg mb-4">On ne fait pas</h3>
                  <ul className="space-y-3 text-muted">
                    <li>Des audits à distance sans venir en cuisine</li>
                    <li>Des rapports de 80 pages inapplicables</li>
                    <li>Du conseil générique sans suivi</li>
                    <li>Du commercial agressif ou des engagements longue durée</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        {/* CTA */}
        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6 text-center">
            <h2 className="text-ink mb-4">On en discute ?</h2>
            <p className="text-muted text-lg mb-8 max-w-[480px] mx-auto">
              Premier échange téléphonique gratuit. On vous dit clairement ce qu'on peut faire pour vous — et ce qui ne relève pas de notre champ.
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

function TimelineRow({ year, text }) {
  return (
    <div className="py-6 flex items-start gap-6">
      <span className="font-serif text-number text-xl shrink-0 mt-0.5">{year}</span>
      <p className="text-muted leading-relaxed">{text}</p>
    </div>
  );
}
