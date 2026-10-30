import React from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import Message from "@/components/billing/Message";
import OffreCard from "@/components/billing/OffreCard";
import { BUSINESS } from "@/lib/business-info";
import { getCatalogue } from "@/lib/billing/api";
import { URL_MON_COMPTE } from "@/lib/billing/config";
import { selectionDepuisQuery } from "@/lib/billing/pricing";

const QUESTIONS = [
  {
    question: "Y a-t-il un engagement ?",
    reponse:
      "Les formules mensuelles sont sans engagement. La formule annuelle est payée d’avance pour douze mois.",
  },
  {
    question: "Puis-je ajouter des comptes supplémentaires ?",
    reponse:
      "Oui, à tout moment depuis votre espace client. Le prix de chaque compte supplémentaire est indiqué sous la formule.",
  },
  {
    question: "Que sont les équipiers ?",
    reponse:
      "Les équipiers sont illimités et gratuits dans toutes les formules. Ils servent à signer les actions, avec les droits du compte auquel ils sont rattachés.",
  },
  {
    question: "Quels moyens de paiement acceptez-vous ?",
    reponse:
      "Le paiement se fait par carte bancaire ou par prélèvement SEPA, sur la page de paiement sécurisée de notre prestataire.",
  },
  {
    question: "Comment résilier ?",
    reponse:
      "Depuis votre espace client. Après la résiliation, vos données restent consultables pendant deux mois en lecture seule, avec un export complet, puis elles sont supprimées.",
  },
];

function Chargement() {
  return (
    <div role="status" aria-live="polite">
      <p className="text-muted mb-6">Chargement des tarifs…</p>
      <div className="grid md:grid-cols-3 gap-6" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[420px] bg-white border border-border animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function Tarifs() {
  const [params] = useSearchParams();
  const { search } = useLocation();
  const annule = params.get("paiement") === "annule";
  const { data: catalogue, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ["billing", "catalogue"],
    queryFn: getCatalogue,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Retour depuis /inscription (« Modifier mon choix ») : on retrouve la configuration choisie.
  const choixPrecedent = catalogue ? selectionDepuisQuery(search, catalogue) : null;

  return (
    <>
      <SEO
        title="Tarifs de l’application RestOclair"
        description="Trois formules pour le suivi hygiène de votre établissement : Essentiel, Sérénité et Expert. Prix HT, comptes inclus, modules et configurateur en direct."
        canonicalUrl="https://restoclair.fr/tarifs"
      />

      <section className="pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="max-w-[1200px] mx-auto px-6">
          <h1 className="text-ink mb-6 max-w-[760px]">Un abonnement adapté à la taille de votre équipe.</h1>
          <p className="text-muted text-lg leading-relaxed max-w-[620px]">
            Choisissez la formule, ajoutez les comptes dont vous avez besoin et voyez le total tout de suite.
            Les équipiers sont illimités et gratuits.
          </p>
          <ol className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-8 text-[15px] text-muted" aria-label="Les étapes">
            {["Choisir votre formule", "Créer votre compte", "Payer en ligne"].map((etape, i) => (
              <li key={etape} className="flex items-center gap-3">
                <span aria-hidden="true" className={`w-7 h-7 flex items-center justify-center text-[13px] font-medium border ${i === 0 ? "bg-bottle text-bottle-text border-bottle" : "border-border text-faint"}`}>{i + 1}</span>
                <span className={i === 0 ? "text-ink font-medium" : ""}>{etape}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pb-16 md:pb-24" aria-label="Formules">
        <div className="max-w-[1200px] mx-auto px-6">
          {annule && (
            <Message type="info" className="mb-8">
              Paiement annulé. Aucun montant n’a été débité.
            </Message>
          )}

          {isPending && <Chargement />}

          {isError && (
            <Message type="error">
              <p>Les tarifs sont momentanément indisponibles. Réessayez dans quelques minutes, ou appelez-nous au {BUSINESS.phone.display}.</p>
              <button type="button" onClick={() => refetch()} disabled={isFetching} className="link-underline mt-2 disabled:opacity-60">
                {isFetching ? "Nouvelle tentative…" : "Réessayer"}
              </button>
            </Message>
          )}

          {catalogue && (
            <div className="grid md:grid-cols-3 gap-10 md:gap-6 items-stretch pt-3">
              {catalogue.offres.map((offre, i) => (
                <OffreCard
                  key={offre.cle}
                  catalogue={catalogue}
                  offre={offre}
                  precedente={i > 0 ? catalogue.offres[i - 1] : null}
                  miseEnAvant={offre.cle === "serenite"}
                  initiale={choixPrecedent?.offre === offre.cle ? choixPrecedent : null}
                />
              ))}
            </div>
          )}

          {URL_MON_COMPTE && (
            <p className="text-center text-[15px] mt-10">
              <a href={URL_MON_COMPTE} className="link-underline">
                Déjà client ? Gérez votre abonnement depuis votre espace
              </a>
            </p>
          )}
        </div>
      </section>

      <hr className="rule" />
      <section className="py-16 md:py-24" aria-labelledby="faq-titre">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid md:grid-cols-12 gap-10 md:gap-16">
            <div className="md:col-span-4">
              <h2 id="faq-titre" className="text-ink">Questions fréquentes</h2>
            </div>
            <div className="md:col-span-8 divide-y divide-border border-y border-border">
              {QUESTIONS.map(({ question, reponse }) => (
                <details key={question} className="group py-5">
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-ink font-medium text-[17px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-bottle">
                    {question}
                    <span aria-hidden="true" className="text-bottle text-xl leading-none group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="text-muted leading-relaxed mt-3 max-w-[620px]">{reponse}</p>
                </details>
              ))}
            </div>
          </div>
          <p className="text-faint text-sm mt-10">
            Une question avant de choisir ? <Link to="/Contact" className="link-underline">Contactez-nous</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
