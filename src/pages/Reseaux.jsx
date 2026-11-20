import React from "react";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { BUSINESS } from "@/lib/business-info";

// Page « Réseaux et collectivités » : offre à part, sans prix public ni référence tant qu'aucun client n'a donné son
// accord écrit. La supervision de plusieurs établissements n'est pas dans les formules de /tarifs.
const ETAPES = [
  ["Une démonstration de 30 minutes", "La vue d’ensemble pour la direction, puis l’application telle que vos équipes l’utiliseront."],
  ["Un chiffrage pour votre réseau", "Selon le nombre de sites, les activités et le déploiement à prévoir."],
  ["Un pilote sur quelques sites", "Un essai en conditions réelles avec vos équipes, avant de déployer plus largement."],
];

export default function Reseaux() {
  return (
    <>
      <SEO
        title="Réseaux, chaînes et collectivités"
        description="Plusieurs établissements, une même exigence : un plan de maîtrise sanitaire par site, l’application dans chaque cuisine et une vue d’ensemble pour la direction. Offre sur rendez-vous."
        keywords="hygiène multi-sites, logiciel HACCP réseau, restauration collective, chaîne de restaurants, apparthôtel, collectivité, supervision hygiène"
        canonicalUrl={`${window.location.origin}/reseaux`}
      />
      <div>
        <section className="pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="max-w-[680px]">
              <h1 className="text-ink mb-6">Plusieurs établissements, une même exigence.</h1>
              <p className="text-muted text-lg leading-relaxed mb-8">
                Pour les groupes, les chaînes, les apparthôtels et les collectivités : un plan de maîtrise sanitaire
                par site, l’application dans chaque cuisine, et une vue d’ensemble pour la direction qualité.
                C’est une offre à part, dimensionnée avec vous.
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Link to="/Contact?sujet=autre" className="btn-primary">
                  Demander une démonstration
                </Link>
                <a href={BUSINESS.phone.href} className="link-underline text-[15px] py-3">
                  {BUSINESS.phone.display}
                </a>
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16">
              <div className="md:col-span-4">
                <h2 className="text-ink">Ce que l’offre réunit.</h2>
              </div>
              <div className="md:col-span-8 grid sm:grid-cols-2 gap-10">
                <Bloc titre="Un PMS par site" texte="Chaque établissement a un plan adapté à son activité, sur une base commune au réseau." />
                <Bloc titre="L’application dans chaque cuisine" texte="Relevés, traçabilité, nettoyage et actions correctives, avec des équipiers illimités et gratuits sur chaque site." />
                <Bloc titre="Une vue d’ensemble" texte="Le score hygiène de chaque site et ses écarts, pour savoir où agir en priorité." />
                <Bloc titre="Des droits par rôle" texte="Équipes, responsables de site, responsables de zone et direction voient ce qui les concerne." />
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16">
              <div className="md:col-span-4">
                <h2 className="text-ink">Comment nous travaillons ensemble.</h2>
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
                  Acheteurs publics : nos <Link to="/conditions-acheteurs-publics" className="link-underline">conditions pour les acheteurs publics</Link> s’appliquent.
                </p>
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6 text-center">
            <h2 className="text-ink mb-4">Parlons de votre réseau.</h2>
            <p className="text-muted text-lg mb-8 max-w-[520px] mx-auto">
              Indiquez-nous le nombre de sites et leur activité : nous vous proposons un rendez-vous.
            </p>
            <Link to="/Contact?sujet=autre" className="btn-primary">
              Demander une démonstration
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

function Bloc({ titre, texte }) {
  return (
    <div>
      <h3 className="text-ink font-sans font-semibold text-lg mb-2">{titre}</h3>
      <p className="text-muted leading-relaxed">{texte}</p>
    </div>
  );
}
