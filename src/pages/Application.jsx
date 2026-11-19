import React from "react";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { VENTE_VISIBLE } from "@/lib/billing/invitation";

// Page « L'application » : ce que fait l'application, sans prix (les prix sont sur /tarifs).
const FONCTIONS = [
  ["Relevés de températures", "Chaque enceinte froide, chaque jour, avec une alerte quand une valeur sort des limites."],
  ["Traçabilité", "Réceptions, lots, DLC secondaires et photos des étiquettes, retrouvés en quelques secondes."],
  ["Plan de nettoyage", "Qui a fait quoi, et quand : chaque tâche est signée par l’équipier qui l’a faite."],
  ["Actions correctives", "Un écart est noté avec ce qui a été fait pour le corriger, pour que rien ne reste en suspens."],
  ["Score hygiène", "Un indicateur de 0 à 100 calculé sur vos contrôles, votre traçabilité, vos températures et votre régularité."],
  ["Dossier d’inspection", "Ce que l’inspecteur demande, rangé au même endroit et prêt à montrer le jour du contrôle."],
];

export default function Application() {
  return (
    <>
      <SEO
        title="L’application d’hygiène pour la cuisine"
        description="Relevés de températures, traçabilité, plan de nettoyage, score hygiène et dossier d’inspection : l’application RestOclair, avec des équipiers illimités et gratuits."
        keywords="application HACCP, relevé de températures, traçabilité cuisine, plan de nettoyage, dossier d’inspection, application hygiène restaurant"
        canonicalUrl={`${window.location.origin}/application`}
      />
      <div>
        <section className="pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16 items-center">
              <div className="md:col-span-6">
                <h1 className="text-ink mb-6">Une application pensée pour la cuisine, pas pour le bureau.</h1>
                <p className="text-muted text-lg leading-relaxed mb-8">
                  L’équipe enregistre ses gestes en quelques secondes, sur l’appareil de l’établissement.
                  L’exploitant voit d’un coup d’œil où en est son hygiène, et retrouve tout le jour du contrôle.
                </p>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <Link to="/essai-gratuit" className="btn-primary">
                    Essayer gratuitement
                  </Link>
                  {VENTE_VISIBLE && (
                    <Link to="/tarifs" className="link-underline text-[15px] py-3">
                      Comparer les formules
                    </Link>
                  )}
                </div>
              </div>
              <div className="md:col-span-6">
                <figure>
                  <div className="border border-border bg-white p-2 max-w-[300px] mx-auto">
                    <div className="h-[460px] md:h-[520px] overflow-hidden">
                      <img
                        src="/essai/dashboard.jpg"
                        alt="Tableau de bord de l’application RestOclair"
                        className="w-full h-auto"
                        style={{ filter: "none" }}
                      />
                    </div>
                  </div>
                  <figcaption className="text-faint text-sm mt-3 text-center">
                    Le tableau de bord d’un établissement : score hygiène, températures, tâches du jour.
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16">
              <div className="md:col-span-4">
                <h2 className="text-ink">Ce qu’elle fait pour vous.</h2>
              </div>
              <div className="md:col-span-8 grid sm:grid-cols-2 gap-10">
                {FONCTIONS.map(([titre, texte]) => (
                  <div key={titre}>
                    <h3 className="text-ink font-sans font-semibold text-lg mb-2">{titre}</h3>
                    <p className="text-muted leading-relaxed">{texte}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-16">
              <div className="md:col-span-4">
                <h2 className="text-ink">Toute l’équipe, sans surcoût.</h2>
              </div>
              <div className="md:col-span-8">
                <p className="text-ink text-xl font-medium mb-4">Équipiers illimités et gratuits*</p>
                <p className="text-muted text-lg leading-relaxed mb-6">
                  Chaque équipier signe ses actions avec son code PIN : vous savez qui a relevé la température,
                  qui a reçu la livraison, qui a nettoyé. Les comptes de l’exploitant et des responsables
                  dépendent de la formule choisie.
                </p>
                <p className="text-muted text-lg leading-relaxed mb-6">
                  Sur téléphone et tablette, une saisie faite sans réseau part dès que la connexion revient.
                  Les données sont hébergées en France.
                </p>
                <p className="text-faint text-sm">
                  *Les équipiers n’ont pas de connexion à eux : ils signent leurs actions avec un code PIN sur l’appareil de l’établissement.
                </p>
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6 text-center">
            <h2 className="text-ink mb-4">Essayez-la dans votre cuisine.</h2>
            <p className="text-muted text-lg mb-8 max-w-[520px] mx-auto">
              L’essai est gratuit : nous vous rappelons pour configurer l’application avec vous.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/essai-gratuit" className="btn-primary">
                Demander un essai
              </Link>
              {VENTE_VISIBLE && (
                <Link to="/tarifs" className="link-underline text-[15px]">
                  Voir les tarifs
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
