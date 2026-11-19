import React from "react";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BUSINESS } from "@/lib/business-info";

// Page « Accompagnement » (remplace « Services ») : des moyens, jamais un résultat qui dépend de l'administration.
// La relation avec la DDPP reste celle de l'exploitant : il signe et envoie sa réponse.
const services = [
  {
    number: "01",
    title: "Aide face à la DDPP",
    subtitle: "Rapport défavorable ou mise en demeure",
    description:
      "Un rapport d’inspection avec des non-conformités, ou une mise en demeure : nous vous aidons à comprendre ce qui est demandé et à y répondre dans les délais.",
    details: [
      "Lecture du rapport avec vous et liste des points à corriger.",
      "Plan d’actions correctives, en commençant par l’urgent.",
      "Aide à la rédaction de votre réponse. Vous la signez et l’envoyez : la relation avec l’administration reste la vôtre.",
      "Suivi des actions jusqu’à leur mise en place dans votre cuisine.",
    ],
    result: "Comprise dans la formule Sérénité pour la réponse à une mise en demeure ; sur devis dans les autres cas.",
    image: "/images/cuisine-service-640x400.jpg",
    imageCaption: "En cuisine, pendant le service",
  },
  {
    number: "02",
    title: "Audit hygiène",
    subtitle: "Une photographie précise de votre établissement",
    description:
      "Un contrôle sanitaire ne se prépare pas la veille. L’audit vous donne une image claire de votre situation et un plan d’action applicable.",
    details: [
      "Visite de votre établissement : cuisine, stockage, vestiaires, sanitaires.",
      "Vérification des températures, de la traçabilité et des procédures de nettoyage.",
      "Rapport écrit avec des priorités classées : urgent, à corriger, recommandation.",
      "Échange avec votre équipe pour expliquer les points clés.",
    ],
    result: "Sur devis, selon la taille et l’activité de l’établissement.",
    image: "/images/cuisine-pro-640x400.jpg",
    imageCaption: "Vérification des procédures en cuisine",
  },
  {
    number: "03",
    title: "PMS sur mesure et documents",
    subtitle: "Pour les activités qui sortent du cadre",
    description:
      "Laboratoire, boucherie, traiteur, cuisine collective : quand votre activité demande plus qu’un plan standard, nous établissons ou remettons à jour vos documents avec vous.",
    details: [
      "Plan de maîtrise sanitaire (PMS) établi selon le guide de bonnes pratiques de votre métier, à valider et appliquer par vous.",
      "Fiches de procédures à afficher aux postes de travail.",
      "Information sur les allergènes et l’origine des viandes.",
      "Classeur de traçabilité simple à tenir, ou repris dans l’application.",
    ],
    result: "Sur devis. Pour une ouverture, voyez aussi notre pack d’ouverture.",
    image: "/images/documents-640x400.jpg",
    imageCaption: "Documents réglementaires",
  },
];

export default function Accompagnement() {
  return (
    <>
      <SEO
        title="Accompagnement : audit, PMS, aide face à la DDPP"
        description="Quand il faut plus qu’une application : audit hygiène, plan de maîtrise sanitaire sur mesure, aide à la réponse après un contrôle de la DDPP."
        keywords="audit hygiène restaurant, plan de maîtrise sanitaire, PMS, mise en demeure DDPP, rapport d’inspection, accompagnement hygiène"
        canonicalUrl={`${window.location.origin}/accompagnement`}
      />
      <div>
        <section className="pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="max-w-[640px]">
              <h1 className="text-ink mb-6">Quand il faut plus qu’une application.</h1>
              <p className="text-muted text-lg leading-relaxed">
                L’application tient le quotidien. Pour le reste, une équipe du métier vous accompagne :
                avant un contrôle, après un contrôle, ou quand votre activité sort du cadre.
              </p>
            </div>
          </div>
        </section>

        <hr className="rule" />

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
                        <li key={i} className="text-muted leading-relaxed pl-4 border-l-2 border-[#d8d4c4]">
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
                        loading="lazy"
                      />
                    </figure>
                  </div>
                </div>
              </div>
            </section>
            {index < services.length - 1 && <hr className="rule" />}
          </React.Fragment>
        ))}

        <hr className="rule" />

        <section className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6 text-center">
            <h2 className="text-ink mb-4">Parlons de votre situation.</h2>
            <p className="text-muted text-lg mb-8 max-w-[520px] mx-auto">
              Appelez-nous ou écrivez-nous : nous vous disons ce que nous pouvons faire, et dans quel délai.
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
