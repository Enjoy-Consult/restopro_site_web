import React from "react";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BUSINESS } from "@/lib/business-info";

// Page « L'entreprise » (remplace « À propos ») : la marque parle en « nous », les personnes apparaissent comme une équipe.
const EQUIPE = [
  ["Thierry Bailleul", "Président", "L’expertise hygiène et restauration collective : procédures, PMS, audits."],
  ["Guillaume Theot", "Directeur général", "Les clients, les réseaux et les partenaires."],
  ["Louis Theot", "Associé", "L’application et la technique."],
];

export default function Entreprise() {
  return (
    <>
      <SEO
        title="L’entreprise : équipe, mission, engagements"
        description="RestOclair, société installée à Roye (Somme) : une application d’hygiène alimentaire et une équipe du métier pour les restaurants, commerces de bouche et cuisines collectives."
        keywords="RestOclair, entreprise hygiène alimentaire, équipe, Roye, Hauts-de-France"
        canonicalUrl={`${window.location.origin}/entreprise`}
      />
      <div>
        {/* Intro */}
        <section className="pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16 items-start">
              <div className="md:col-span-7">
                <h1 className="text-ink mb-8">
                  Nous rendons l’hygiène alimentaire tenable au quotidien.
                </h1>
                <p className="text-muted text-lg leading-relaxed mb-6">
                  RestOclair est une société par actions simplifiée installée à Roye, dans la Somme.
                  Nous travaillons pour les restaurants, les commerces de bouche et les cuisines collectives.
                </p>
                <p className="text-muted text-lg leading-relaxed mb-6">
                  Notre conviction : la conformité ne se joue pas la veille du contrôle, mais dans les gestes de
                  chaque service. Notre rôle est de rendre ces gestes simples à faire et à prouver, et d’être là
                  quand une situation dépasse l’exploitant.
                </p>
                <p className="text-muted text-lg leading-relaxed">
                  Nous ne vendons pas de la paperasse : des procédures que votre équipe peut appliquer dès le
                  lendemain matin, une application qui les rend faciles à tenir, et une aide humaine quand
                  l’administration écrit.
                </p>
              </div>
              <div className="md:col-span-5">
                <figure>
                  <img
                    src="/images/cuisine-service-640x800.jpg"
                    alt="Cuisine professionnelle pendant le service"
                    className="w-full aspect-[4/5] object-cover"
                  />
                </figure>
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        {/* Méthode et engagements */}
        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16">
              <div className="md:col-span-4">
                <h2 className="text-ink">Notre méthode et nos engagements.</h2>
              </div>
              <div className="md:col-span-8">
                <div className="divide-y divide-border border-t border-border">
                  <Ligne titre="Des procédures pensées en cuisine" texte="Elles sont conçues avec des gens de la restauration, pour un service qui commence tôt et des équipes qui changent." />
                  <Ligne titre="Un logiciel fait par nous" texte="L’application RestOclair est développée par notre équipe : nous savons ce qu’elle fait, et nous la faisons évoluer avec vos retours." />
                  <Ligne titre="Une aide humaine" texte="Quand un rapport d’inspection ou une mise en demeure arrive, vous parlez à quelqu’un. Vous gardez la main : c’est vous qui signez et envoyez votre réponse." />
                  <Ligne titre="Vos données en France" texte="Les données de l’application sont hébergées en France. Vous pouvez les exporter à tout moment." />
                  <Ligne titre="Pas d’engagement caché" texte="La durée de chaque formule est indiquée avant le paiement, et la résiliation se fait en ligne." />
                </div>
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        {/* Équipe */}
        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16">
              <div className="md:col-span-4">
                <h2 className="text-ink">L’équipe.</h2>
              </div>
              <div className="md:col-span-8 grid sm:grid-cols-3 gap-10">
                {EQUIPE.map(([nom, fonction, role]) => (
                  <div key={nom}>
                    <h3 className="text-ink font-sans font-semibold text-lg">{nom}</h3>
                    <p className="text-faint text-sm mb-3">{fonction}</p>
                    <p className="text-muted leading-relaxed">{role}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        {/* Ce que nous faisons / ne faisons pas */}
        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16">
              <div className="md:col-span-4">
                <h2 className="text-ink">Ce que nous faisons. Et ce que nous ne faisons pas.</h2>
              </div>
              <div className="md:col-span-8 grid sm:grid-cols-2 gap-12">
                <div>
                  <h3 className="text-ink font-sans font-semibold text-lg mb-4">Nous faisons</h3>
                  <ul className="space-y-3 text-muted">
                    <li>L’application d’hygiène de votre établissement</li>
                    <li>Des audits dans votre cuisine</li>
                    <li>Des plans de maîtrise sanitaire et des plans d’actions</li>
                    <li>L’aide à la rédaction de vos réponses à la DDPP</li>
                    <li>Un suivi après le contrôle</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-ink font-sans font-semibold text-lg mb-4">Nous ne faisons pas</h3>
                  <ul className="space-y-3 text-muted">
                    <li>Des rapports de 80 pages inapplicables</li>
                    <li>Du conseil générique sans suivi</li>
                    <li>Parler à l’administration à votre place</li>
                    <li>Du commercial agressif ou des engagements cachés</li>
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
            <h2 className="text-ink mb-4">Discutons de votre établissement.</h2>
            <p className="text-muted text-lg mb-8 max-w-[520px] mx-auto">
              Premier échange gratuit. Nous vous disons clairement ce que nous pouvons faire pour vous, et ce qui
              ne relève pas de notre champ.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={createPageUrl("Contact")} className="btn-primary">
                Nous contacter
              </Link>
              <a href={BUSINESS.phone.href} className="link-underline text-[15px]">
                {BUSINESS.phone.display}
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Ligne({ titre, texte }) {
  return (
    <div className="py-6">
      <h3 className="text-ink font-sans font-semibold text-lg mb-2">{titre}</h3>
      <p className="text-muted leading-relaxed">{texte}</p>
    </div>
  );
}
