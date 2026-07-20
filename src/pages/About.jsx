import React from "react";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function About() {
  return (
    <>
      <SEO
        title="A propos — Thierry Bailleul | RestOclair"
        description="Thierry Bailleul, 20 ans de restauration avant de fonder RestOclair en 2025. Consultant hygiene et securite alimentaire en Ile-de-France."
        keywords="Thierry Bailleul, consultant hygiene alimentaire, RestOclair, parcours restauration"
        canonicalUrl={`${window.location.origin}/About`}
      />
      <div>
        {/* Intro */}
        <section className="pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16 items-start">
              <div className="md:col-span-7">
                <h1 className="text-ink mb-8">
                  Je suis Thierry Bailleul.
                </h1>
                <p className="text-muted text-lg leading-relaxed mb-6">
                  Pendant 20 ans, j'ai travaille en restauration. D'abord derriere les fourneaux,
                  puis en gestion d'etablissement. J'ai vecu les controles sanitaires — des deux cotes
                  du comptoir. Je connais la pression du service, je connais aussi les exigences des
                  inspecteurs. C'est cette double experience qui m'a pousse a creer RestOclair en 2025.
                </p>
                <p className="text-muted text-lg leading-relaxed mb-6">
                  Mon approche est simple : je ne vends pas de la paperasse. Je viens dans votre cuisine,
                  je regarde comment votre equipe travaille, et je vous donne des recommandations
                  que vous pouvez appliquer des le lendemain matin. Pas de jugement, pas de jargon —
                  juste l'experience du terrain.
                </p>
                <p className="text-muted text-lg leading-relaxed">
                  Quand un restaurateur m'appelle en urgence apres un controle, je decroche en moins
                  de 2 h. Et quand je redige un plan d'actions correctives, je sais qu'il sera
                  realiste parce que j'ai moi-meme applique ces procedures pendant deux decennies.
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
                <h2 className="text-ink">Mon parcours en quelques dates.</h2>
              </div>
              <div className="md:col-span-8">
                <div className="divide-y divide-border border-t border-border">
                  <TimelineRow year="2003" text="Premier poste en cuisine — apprentissage des bases HACCP sur le terrain." />
                  <TimelineRow year="2010" text="Responsable d'etablissement. Gestion des controles, formation des equipes." />
                  <TimelineRow year="2020" text="Formation en securite alimentaire et accompagnement reglementaire." />
                  <TimelineRow year="2025" text="Creation de RestOclair. Premier client : un restaurant menace de fermeture apres controle DDPP. Reouverture en 10 jours." />
                </div>
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        {/* Ce que je fais / ne fais pas */}
        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16">
              <div className="md:col-span-4">
                <h2 className="text-ink">Ce que je fais. Et ce que je ne fais pas.</h2>
              </div>
              <div className="md:col-span-8 grid sm:grid-cols-2 gap-12">
                <div>
                  <h3 className="text-ink font-sans font-semibold text-lg mb-4">Je fais</h3>
                  <ul className="space-y-3 text-muted">
                    <li>Intervention urgence sous 24 h</li>
                    <li>Audit terrain dans votre cuisine</li>
                    <li>Redaction PMS, CERFA, plans d'actions</li>
                    <li>Representation aupres de la DDPP</li>
                    <li>Formation de vos equipes sur place</li>
                    <li>Suivi post-controle jusqu'a la conformite</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-ink font-sans font-semibold text-lg mb-4">Je ne fais pas</h3>
                  <ul className="space-y-3 text-muted">
                    <li>Des audits a distance sans venir en cuisine</li>
                    <li>Des rapports de 80 pages inapplicables</li>
                    <li>Du conseil generique sans suivi</li>
                    <li>Du commercial agressif ou des engagements longue duree</li>
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
              Premier echange telephonique gratuit. Je vous dis clairement ce que je peux faire pour vous — et ce qui ne releve pas de mon champ.
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
