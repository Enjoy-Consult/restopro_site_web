import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import Etapes from "@/components/billing/Etapes";
import { BUSINESS } from "@/lib/business-info";
import { getCatalogue, getCompte } from "@/lib/billing/api";
import { APP_STORE_URL, BILLING_MOCK_DEV, PLAY_STORE_URL, URL_MON_COMPTE } from "@/lib/billing/config";
import {
  TEXTE_ACTIVATION_EN_COURS,
  TEXTE_DELAI,
  TEXTE_DELAI_REPRISE,
  TEXTE_IMPAYE,
  TEXTE_INVERIFIABLE,
  TEXTE_NON_CONFIRME,
  decisionDepart,
  decisionRetour,
  estActivationEnCours,
  estRetourStripe,
  phraseIdentifiants,
} from "@/lib/billing/retour";
import { preparerScenario } from "@/lib/billing/scenarios";
import { effacerSession, lireSession } from "@/lib/billing/session";

const TITRES = {
  attente: "Nous confirmons votre paiement…",
  actif: "Votre abonnement est actif.",
  provisoire: "Votre prélèvement est en cours de validation.",
  delai: "Confirmation en cours.",
  delai_reprise: "Confirmation en cours.",
  impaye: "Paiement à régulariser.",
  refus: "Confirmation impossible.",
  inverifiable: "Votre abonnement.",
  non_confirme: "Paiement non confirmé.",
};

// Issues sans confirmation : l'espace client et le téléphone restent à portée de main.
function Aide() {
  return (
    <p className="text-muted text-[15px] leading-relaxed mt-5">
      {URL_MON_COMPTE && (
        <>
          Vous pouvez retrouver votre abonnement depuis <a href={URL_MON_COMPTE} className="link-underline">votre espace</a>.{" "}
        </>
      )}
      Une question ? Appelez-nous au <a href={BUSINESS.phone.href} className="link-underline">{BUSINESS.phone.display}</a>.
    </p>
  );
}

function Pastille({ phase }) {
  const base = "w-14 h-14 rounded-full flex items-center justify-center mb-7";
  if (phase === "attente")
    return (
      <span className={`${base} border border-border`} aria-hidden="true">
        <span className="w-6 h-6 border-2 border-border border-t-bottle rounded-full animate-spin" />
      </span>
    );
  const chemin = phase === "actif" ? "M5 12.5l4.5 4.5L19 7.5" : phase === "provisoire" ? "M12 6.5V12l3.5 2" : "M12 7v6M12 16.5v.5";
  return (
    <span className={`${base} ${phase === "actif" ? "bg-bottle text-bottle-text" : "bg-[#eaf0ea] text-bottle"}`} aria-hidden="true">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d={chemin} />
      </svg>
    </span>
  );
}

export default function AbonnementRetour() {
  const [etat, setEtat] = useState({ phase: "attente" });
  const [relance, setRelance] = useState(0);
  // Gardé d'un « Vérifier à nouveau » à l'autre : dernier statut lu et Retry-After en cours.
  const memoire = useRef({ dernierStatut: null, pasAvant: 0 });
  // Le catalogue sert seulement à écrire le nom de la formule.
  const { data: catalogue } = useQuery({ queryKey: ["billing", "catalogue"], queryFn: getCatalogue, retry: 1, staleTime: 5 * 60 * 1000 });

  useEffect(() => {
    preparerScenario(window.location.search, BILLING_MOCK_DEV);
    const session = lireSession();
    const retourStripe = estRetourStripe(window.location.search);
    let arrete = false;
    let minuteur;
    const debut = Date.now();

    const interroger = async () => {
      let lecture;
      try {
        lecture = { compte: await getCompte(session.token) };
      } catch (erreur) {
        lecture = { erreur };
      }
      if (arrete) return;
      if (lecture.compte) memoire.current.dernierStatut = lecture.compte.statut;
      appliquer(decisionRetour({ ...lecture, dernierStatut: memoire.current.dernierStatut, ecouleMs: Date.now() - debut, retourStripe }));
    };

    const appliquer = (decision) => {
      if (decision.reprendreDansMs) memoire.current.pasAvant = Date.now() + decision.reprendreDansMs;
      if (decision.type === "interroger") {
        interroger();
      } else if (decision.type === "attendre") {
        minuteur = setTimeout(() => appliquer(decision.puis), decision.delaiMs);
      } else {
        if (decision.effacerJeton) effacerSession(); // statut final ou jeton refusé : il n'est plus utile
        setEtat(decision);
      }
    };

    appliquer(
      decisionDepart({
        jeton: Boolean(session),
        attenteMs: memoire.current.pasAvant - debut,
        dernierStatut: memoire.current.dernierStatut,
        retourStripe,
      })
    );
    return () => {
      arrete = true;
      clearTimeout(minuteur);
    };
  }, [relance]);

  const { phase, compte } = etat;
  const nomFormule =
    catalogue?.offres.find((o) => o.cle === compte?.offre)?.nom ?? (compte?.offre ? compte.offre.charAt(0).toUpperCase() + compte.offre.slice(1) : "");
  const identifiants = phraseIdentifiants(compte?.titulaire?.email);

  const lien = "inline-block border border-bottle text-bottle px-6 py-3 text-[15px] font-medium hover:bg-[#eaf0ea] transition-colors";

  const relancer = () => {
    setEtat({ phase: "attente" });
    setRelance((n) => n + 1);
  };

  return (
    <>
      <SEO
        title="Confirmation de votre abonnement"
        description="Confirmation de votre abonnement à l’application RestOclair."
        canonicalUrl="https://restoclair.fr/abonnement/retour"
        noindex
      />

      <section className="pt-12 pb-24 md:pt-20 md:pb-32">
        <div className="max-w-[640px] mx-auto px-5 md:px-6">
          <div className="mb-12"><Etapes courant={3} /></div>
          <div aria-live="polite">
            <Pastille phase={phase} />
            <h1 className="text-ink mb-5 text-[clamp(2rem,5vw,3rem)]">{TITRES[phase]}</h1>

            {phase === "attente" && (
              <p className="text-muted text-lg leading-relaxed" role="status">
                {estActivationEnCours(window.location.search) ? TEXTE_ACTIVATION_EN_COURS : "Merci de patienter quelques instants."}
              </p>
            )}

            {phase === "actif" && (
              <p className="text-muted text-lg leading-relaxed">
                Votre abonnement {nomFormule} est actif. {identifiants.avant}
                {identifiants.email && <strong className="text-ink font-medium">{identifiants.email}</strong>}
                {identifiants.apres}
              </p>
            )}

            {phase === "provisoire" && (
              <p className="text-muted text-lg leading-relaxed">
                Votre prélèvement SEPA est en cours de validation, ce qui prend quelques jours ouvrés. Vous pouvez déjà utiliser l’application.
              </p>
            )}

            {phase === "refus" && (
              <>
                <p className="text-muted text-lg leading-relaxed">{etat.refus}</p>
                <button type="button" className="link-underline mt-4" onClick={relancer}>
                  Vérifier à nouveau
                </button>
                <Aide />
              </>
            )}

            {phase === "delai" && (
              <>
                <p className="text-muted text-lg leading-relaxed">{TEXTE_DELAI}</p>
                <button type="button" className="link-underline mt-4" onClick={relancer}>
                  Vérifier à nouveau
                </button>
                <Aide />
              </>
            )}

            {phase === "delai_reprise" && (
              <>
                <p className="text-muted text-lg leading-relaxed">{TEXTE_DELAI_REPRISE}</p>
                <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
                  <Link to="/tarifs" className="btn-primary text-center">
                    Reprendre le paiement
                  </Link>
                  <button type="button" className="link-underline text-[15px] text-left" onClick={relancer}>
                    Vérifier à nouveau
                  </button>
                </div>
                <Aide />
              </>
            )}

            {phase === "impaye" && (
              <>
                <p className="text-muted text-lg leading-relaxed">{TEXTE_IMPAYE}</p>
                <button type="button" className="link-underline mt-4" onClick={relancer}>
                  Vérifier à nouveau
                </button>
                <Aide />
              </>
            )}

            {phase === "inverifiable" && (
              <>
                <p className="text-muted text-lg leading-relaxed">{TEXTE_INVERIFIABLE}</p>
                <Aide />
              </>
            )}

            {phase === "non_confirme" && (
              <>
                <p className="text-muted text-lg leading-relaxed">{TEXTE_NON_CONFIRME}</p>
                <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
                  <Link to="/tarifs" className="btn-primary text-center">
                    Reprendre le paiement
                  </Link>
                  <button type="button" className="link-underline text-[15px] text-left" onClick={relancer}>
                    Vérifier à nouveau
                  </button>
                </div>
                <Aide />
              </>
            )}
          </div>

          {(APP_STORE_URL || PLAY_STORE_URL || URL_MON_COMPTE) && (
            <>
          <hr className="rule my-12" />

          <h2 className="text-ink text-[24px] mb-5">{APP_STORE_URL || PLAY_STORE_URL ? "Installez l’application" : "Votre espace client"}</h2>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            {APP_STORE_URL && (
              <a href={APP_STORE_URL} className={lien} target="_blank" rel="noopener noreferrer">
                Télécharger pour iPhone (App Store)
              </a>
            )}
            {PLAY_STORE_URL && (
              <a href={PLAY_STORE_URL} className={lien} target="_blank" rel="noopener noreferrer">
                Télécharger pour Android (Google Play)
              </a>
            )}
            {URL_MON_COMPTE && (
              <a href={URL_MON_COMPTE} className="btn-primary text-center order-first sm:order-none">
                Accéder à mon espace
              </a>
            )}
          </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
