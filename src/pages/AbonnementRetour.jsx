import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import { getCatalogue, getCompte } from "@/lib/billing/api";
import { APP_STORE_URL, PLAY_STORE_URL, URL_MON_COMPTE } from "@/lib/billing/config";
import { traiterSessionExpiree } from "@/lib/billing/erreurs";
import { effacerSession, lireSession } from "@/lib/billing/session";

const INTERVALLE_MS = 2000;
const DUREE_MAX_MS = 60000;

const TITRES = {
  attente: "Nous confirmons votre paiement…",
  actif: "Votre abonnement est actif.",
  provisoire: "Votre prélèvement est en cours de validation.",
  delai: "Confirmation en cours.",
};

export default function AbonnementRetour() {
  const [etat, setEtat] = useState({ phase: "attente" });
  const [relance, setRelance] = useState(0);
  // Le catalogue sert seulement à écrire le nom de la formule.
  const { data: catalogue } = useQuery({ queryKey: ["billing", "catalogue"], queryFn: getCatalogue, retry: 1, staleTime: 5 * 60 * 1000 });

  useEffect(() => {
    const session = lireSession();
    if (!session) {
      setEtat({ phase: "delai", sansJeton: true });
      return undefined;
    }

    let arrete = false;
    let minuteur;
    const debut = Date.now();

    const terminer = (phase, compte) => {
      effacerSession(); // statut final obtenu : le jeton n'est plus utile
      setEtat({ phase, compte });
    };

    const interroger = async () => {
      try {
        const compte = await getCompte(session.token);
        if (arrete) return;
        if (compte.statut === "actif") return terminer("actif", compte);
        if (compte.statut === "activation_provisoire") return terminer("provisoire", compte);
      } catch (erreur) {
        if (arrete) return;
        if (traiterSessionExpiree(erreur)) return setEtat({ phase: "delai", sansJeton: true });
      }
      if (Date.now() - debut >= DUREE_MAX_MS) return setEtat({ phase: "delai" });
      minuteur = setTimeout(interroger, INTERVALLE_MS);
    };

    interroger();
    return () => {
      arrete = true;
      clearTimeout(minuteur);
    };
  }, [relance]);

  const { phase, compte } = etat;
  const nomFormule =
    catalogue?.offres.find((o) => o.cle === compte?.offre)?.nom ?? (compte?.offre ? compte.offre.charAt(0).toUpperCase() + compte.offre.slice(1) : "");

  const lien = "inline-block border border-bottle text-bottle px-6 py-3 text-[15px] font-medium hover:bg-[#eaf0ea] transition-colors";

  return (
    <>
      <SEO
        title="Confirmation de votre abonnement"
        description="Confirmation de votre abonnement à l’application RestOclair."
        canonicalUrl="https://restoclair.fr/abonnement/retour"
        noindex
      />

      <section className="pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="max-w-[760px] mx-auto px-6">
          <div aria-live="polite">
            <h1 className="text-ink mb-6">{TITRES[phase]}</h1>

            {phase === "attente" && (
              <div className="flex items-center gap-3 text-muted text-lg" role="status">
                <span className="w-5 h-5 border-2 border-border border-t-ink rounded-full animate-spin" aria-hidden="true" />
                Merci de patienter quelques instants.
              </div>
            )}

            {phase === "actif" && (
              <p className="text-muted text-lg leading-relaxed">
                Votre abonnement {nomFormule} est actif. Les identifiants de votre équipe ont été envoyés à{" "}
                <strong className="text-ink font-medium">{compte?.titulaire?.email}</strong> dans un fichier ZIP.
              </p>
            )}

            {phase === "provisoire" && (
              <p className="text-muted text-lg leading-relaxed">
                Votre prélèvement SEPA est en cours de validation, ce qui prend quelques jours ouvrés. Vous pouvez déjà utiliser l’application.
              </p>
            )}

            {phase === "delai" && (
              <>
                <p className="text-muted text-lg leading-relaxed">
                  La confirmation prend plus de temps que prévu. Vous recevrez un e-mail dès que votre abonnement sera actif.
                </p>
                {!etat.sansJeton && (
                  <button
                    type="button"
                    className="link-underline mt-4"
                    onClick={() => {
                      setEtat({ phase: "attente" });
                      setRelance((n) => n + 1);
                    }}
                  >
                    Vérifier à nouveau
                  </button>
                )}
              </>
            )}
          </div>

          {(APP_STORE_URL || PLAY_STORE_URL || URL_MON_COMPTE) && (
            <>
          <hr className="rule my-10" />

          <h2 className="text-ink text-[24px] mb-5">Installez l’application</h2>
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
              <a href={URL_MON_COMPTE} className="btn-primary text-center">
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
