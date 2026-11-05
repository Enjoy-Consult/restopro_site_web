import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import Etapes from "@/components/billing/Etapes";
import Message from "@/components/billing/Message";
import OffreCard from "@/components/billing/OffreCard";
import { BUSINESS } from "@/lib/business-info";
import { getCatalogue } from "@/lib/billing/api";
import { BILLING_MOCK_DEV, URL_MON_COMPTE } from "@/lib/billing/config";
import { messageCatalogue } from "@/lib/billing/erreurs";
import { prendreExplicationChoix } from "@/lib/billing/inscription";
import { selectionDepuisQuery } from "@/lib/billing/pricing";
import { decisionAnnulation } from "@/lib/billing/retour";
import { preparerScenario } from "@/lib/billing/scenarios";
import { lireSession } from "@/lib/billing/session";

const ATOUTS = [
  ["Équipiers illimités", "Gratuits dans toutes les formules, pour signer les actions."],
  ["Sans engagement", "Les formules mensuelles se résilient depuis votre espace client."],
  ["Paiement sécurisé", "Par carte bancaire ou prélèvement SEPA. Le montant exact figure sur la page de paiement."],
];

const QUESTIONS = [
  {
    question: "Y a-t-il un engagement ?",
    reponse:
      "Les formules mensuelles sont sans engagement. La formule annuelle est payée d’avance pour douze mois.",
  },
  {
    question: "Puis-je ajouter des comptes supplémentaires ?",
    reponse:
      "Oui : vous les choisissez lors de l’inscription, puis vous pouvez en ajouter à tout moment depuis votre espace client. Leur prix figure dans le détail de chaque formule.",
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
      <p className="sr-only">Chargement des tarifs…</p>
      <div className="grid min-[700px]:grid-cols-3 gap-4 lg:gap-6" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[400px] bg-white ring-1 ring-border animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function Tarifs() {
  const [params] = useSearchParams();
  const { search } = useLocation();
  const annule = params.get("paiement") === "annule";
  const { data: catalogue, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["billing", "catalogue"],
    queryFn: getCatalogue,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Retour depuis /inscription (« Modifier mon choix ») : on retrouve la configuration choisie.
  const choixPrecedent = catalogue ? selectionDepuisQuery(search, catalogue) : null;

  // Annulation chez Stripe : le jeton dit si le compte existe déjà.
  const [session] = useState(() => {
    preparerScenario(search, BILLING_MOCK_DEV);
    return lireSession();
  });
  const annulation = decisionAnnulation({ annule, jeton: Boolean(session), selection: choixPrecedent });
  const [repriseSansChoix, setRepriseSansChoix] = useState(false);
  // Renvoi depuis /inscription sans choix valable : l'explication vient de la mémoire, une seule fois.
  const [explicationChoix] = useState(prendreExplicationChoix);

  // Carrousel des téléphones : Sérénité (la formule mise en avant) est centrée à l'ouverture.
  const pisteRef = useRef(null);
  const [actif, setActif] = useState(1);

  const carteLaPlusProche = useCallback(() => {
    const piste = pisteRef.current;
    if (!piste) return 0;
    const centre = piste.scrollLeft + piste.clientWidth / 2;
    let meilleur = 0;
    let ecart = Infinity;
    [...piste.children].forEach((carte, i) => {
      const d = Math.abs(carte.offsetLeft + carte.offsetWidth / 2 - centre);
      if (d < ecart) {
        ecart = d;
        meilleur = i;
      }
    });
    return meilleur;
  }, []);

  const aller = useCallback((i) => {
    const piste = pisteRef.current;
    const carte = piste?.children[i];
    if (!carte) return;
    piste.scrollTo({ left: carte.offsetLeft - (piste.clientWidth - carte.offsetWidth) / 2, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const piste = pisteRef.current;
    if (!catalogue || !piste || piste.scrollWidth <= piste.clientWidth) return;
    const i = Math.max(0, catalogue.offres.findIndex((o) => o.cle === (choixPrecedent?.offre ?? "serenite")));
    const carte = piste.children[i];
    if (carte) piste.scrollLeft = carte.offsetLeft - (piste.clientWidth - carte.offsetWidth) / 2;
    setActif(i);
    // seulement à l'arrivée des données
  }, [catalogue]);

  return (
    <>
      <SEO
        title="Tarifs de l’application RestOclair"
        description="Formules Essentiel, Sérénité et Expert : prix HT et TTC, comptes inclus et modules. Comptes supplémentaires au choix à l’inscription."
        canonicalUrl="https://restoclair.fr/tarifs"
      />

      <section className="pt-7 pb-3 md:pt-9 md:pb-4">
        <div className="max-w-[1200px] mx-auto px-5 md:px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-8">
          <h1 className="text-ink text-[clamp(1.75rem,4.6vw,2.5rem)] leading-[1.08]">Un abonnement à la taille de votre équipe.</h1>
          <div className="shrink-0"><Etapes courant={1} /></div>
        </div>
      </section>

      <section className="pb-14 md:pb-20" aria-label="Formules">
        <div className="max-w-[1200px] mx-auto px-5 md:px-6">
          {explicationChoix && <Message type="info" className="mb-8">{explicationChoix}</Message>}

          {annulation && (
            <Message type="info" className="mb-8">
              <p>Paiement annulé. Aucun montant n’a été débité.</p>
              {annulation.type !== "simple" && (
                <p className="mt-2">
                  Votre compte est déjà créé{session.email && <> pour <strong>{session.email}</strong></>}. Il reste à régler votre abonnement.
                </p>
              )}
              {annulation.type === "reprendre" && (
                <Link to={annulation.cible} className="link-underline inline-block mt-2">Reprendre le paiement</Link>
              )}
              {annulation.type === "choisir" && !repriseSansChoix && (
                <button
                  type="button"
                  className="link-underline mt-2"
                  onClick={() => {
                    setRepriseSansChoix(true);
                    pisteRef.current?.focus();
                  }}
                >
                  Reprendre le paiement
                </button>
              )}
              {annulation.type === "choisir" && repriseSansChoix && (
                <p className="mt-2">
                  Votre choix de formule n’a pas pu être conservé après l’annulation. Choisissez de nouveau votre formule ci-dessous : vous passerez ensuite directement au paiement, sans recréer de compte.
                </p>
              )}
            </Message>
          )}

          {isPending && <Chargement />}

          {isError && (
            <Message type="error">
              <p>
                {messageCatalogue(error) ?? "Les tarifs sont momentanément indisponibles. Réessayez dans quelques minutes."} Vous pouvez aussi nous appeler au{" "}
                <a href={BUSINESS.phone.href} className="link-underline">{BUSINESS.phone.display}</a>.
              </p>
              <button type="button" onClick={() => refetch()} disabled={isFetching} className="link-underline mt-2 disabled:opacity-60">
                {isFetching ? "Nouvelle tentative…" : "Réessayer"}
              </button>
            </Message>
          )}

          {catalogue && (
            <>
              <div
                ref={pisteRef}
                onScroll={() => setActif(carteLaPlusProche())}
                role="region"
                aria-label="Les trois formules"
                tabIndex={0}
                className="relative no-scrollbar flex gap-4 overflow-x-auto snap-x snap-mandatory pt-5 pb-4 -mx-5 px-5 min-[700px]:grid min-[700px]:grid-cols-3 min-[700px]:grid-rows-[repeat(4,auto)] min-[700px]:gap-x-4 lg:gap-x-6 min-[700px]:overflow-visible min-[700px]:mx-0 min-[700px]:px-0 min-[700px]:pb-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bottle"
              >
                {catalogue.offres.map((offre, i) => (
                  <OffreCard
                    key={offre.cle}
                    indice={i}
                    catalogue={catalogue}
                    offre={offre}
                    precedente={i > 0 ? catalogue.offres[i - 1] : null}
                    miseEnAvant={offre.cle === "serenite"}
                    initiale={choixPrecedent?.offre === offre.cle ? choixPrecedent : null}
                  />
                ))}
              </div>

              <div className="min-[700px]:hidden flex justify-center gap-2 mt-2" role="group" aria-label="Choisir une formule">
                {catalogue.offres.map((offre, i) => (
                  <button
                    key={offre.cle}
                    type="button"
                    onClick={() => aller(i)}
                    aria-label={`Voir la formule ${offre.nom}`}
                    aria-current={actif === i ? "true" : undefined}
                    className={`h-2 rounded-full transition-all duration-300 ${actif === i ? "w-6 bg-bottle" : "w-2 bg-[#cfcbb9]"}`}
                  />
                ))}
              </div>
            </>
          )}

          {URL_MON_COMPTE && (
            <p className="text-center text-[15px] mt-12">
              <a href={URL_MON_COMPTE} className="link-underline">
                Déjà client ? Gérez votre abonnement depuis votre espace
              </a>
            </p>
          )}
        </div>
      </section>

      <hr className="rule" />
      <section className="py-14 md:py-20" aria-label="Ce qui est inclus partout">
        <div className="max-w-[1200px] mx-auto px-5 md:px-6 grid md:grid-cols-3 gap-8 md:gap-12">
          {ATOUTS.map(([titre, texte]) => (
            <div key={titre}>
              <h3 className="text-ink font-sans font-semibold text-[17px] mb-2">{titre}</h3>
              <p className="text-muted text-[15px] leading-relaxed">{texte}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className="rule" />
      <section className="py-16 md:py-24" aria-labelledby="faq-titre">
        <div className="max-w-[1200px] mx-auto px-5 md:px-6">
          <div className="grid md:grid-cols-12 gap-8 md:gap-16">
            <div className="md:col-span-4">
              <h2 id="faq-titre" className="text-ink">Questions fréquentes</h2>
            </div>
            <div className="md:col-span-8 divide-y divide-border border-y border-border">
              {QUESTIONS.map(({ question, reponse }) => (
                <details key={question} className="group">
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 py-5 text-ink font-medium text-[17px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-bottle">
                    {question}
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-bottle shrink-0 transition-transform duration-300 group-open:rotate-180">
                      <path d="M2.5 5l4.5 4.5L11.5 5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <p className="text-muted leading-relaxed pb-6 max-w-[700px]">{reponse}</p>
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
