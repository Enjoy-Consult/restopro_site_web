import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  EVENEMENT_GESTION,
  appliquerConsentement,
  enregistrerConsentement,
  gtmCharge,
  lireConsentement,
} from "@/lib/consentement";
import { traceursPermis } from "@/lib/environnement";

// Trois boutons de même apparence : refuser est aussi simple et visible qu'accepter.
const BOUTON =
  "w-full sm:w-auto px-5 py-2.5 text-[15px] font-medium text-bottle bg-white ring-1 ring-bottle hover:bg-bottle hover:text-bottle-text transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bottle";

// Bandeau de consentement aux cookies : en bas de l'écran, sans bloquer la navigation, sans croix de fermeture
// (ignorer le bandeau ne vaut pas acceptation : tant que rien n'est choisi, rien n'est chargé).
export default function ConsentementCookies() {
  // Ni bandeau ni Google hors du site de production, ni sur les pages exclues : documents de l'application,
  // reprise d'une inscription, espace abonnement (voir environnement.js).
  const permis = traceursPermis(useLocation().pathname);
  const permisRef = useRef(permis);
  permisRef.current = permis;
  const applique = useRef(false);
  const [ouvert, setOuvert] = useState(() => lireConsentement() === null);
  const [detail, setDetail] = useState(false);
  const [publicite, setPublicite] = useState(() => lireConsentement()?.publicite ?? false);
  const regionRef = useRef(null);

  // Choix déjà enregistré : on l'applique une fois, à la première page où Google est permis. C'est le chargement du site,
  // ou une page suivante quand le site s'est ouvert sur une page exclue (le lien de reprise reçu par e-mail, par exemple).
  useEffect(() => {
    if (!permis || applique.current) return;
    applique.current = true;
    appliquerConsentement(lireConsentement());
  }, [permis]);

  // Arrivée sur une page exclue alors que Google est déjà dans le document (lien interne, retour arrière) : rien ne peut
  // retirer le script, on recharge la page, qui repart sans lui. Le fragment de l'adresse (#jeton=…) est conservé.
  useEffect(() => {
    if (!permis && gtmCharge()) window.location.reload();
  }, [permis]);

  // « Gérer mes cookies » : rouvre le bandeau, prérempli, sur le détail des finalités.
  useEffect(() => {
    const ouvrir = () => {
      // Sur une page exclue, il n'y a aucun choix à gérer : rien ne s'ouvre, ni ici ni plus tard sur une autre page.
      if (!permisRef.current) return;
      setPublicite(lireConsentement()?.publicite ?? false);
      setDetail(true);
      setOuvert(true);
      requestAnimationFrame(() => regionRef.current?.focus());
    };
    window.addEventListener(EVENEMENT_GESTION, ouvrir);
    return () => window.removeEventListener(EVENEMENT_GESTION, ouvrir);
  }, []);

  // Le bandeau ne doit pas masquer la fin des pages : on réserve sa hauteur sous le contenu.
  useEffect(() => {
    const bandeau = regionRef.current;
    if (!ouvert || !permis || !bandeau || typeof ResizeObserver === "undefined") return undefined;
    const observateur = new ResizeObserver(() => {
      document.body.style.paddingBottom = `${bandeau.offsetHeight}px`;
    });
    observateur.observe(bandeau);
    return () => {
      observateur.disconnect();
      document.body.style.paddingBottom = "";
    };
  }, [ouvert, detail, permis]);

  const decider = (accepter) => {
    const { rechargement } = enregistrerConsentement(accepter);
    if (rechargement) {
      window.location.reload();
      return;
    }
    setPublicite(accepter);
    setDetail(false);
    setOuvert(false);
  };

  if (!ouvert || !permis) return null;

  return (
    <section
      ref={regionRef}
      tabIndex={-1}
      aria-labelledby="cookies-titre"
      className="fixed inset-x-0 bottom-0 z-[60] max-h-[75vh] overflow-y-auto bg-white border-t border-border shadow-[0_-12px_40px_-24px_rgba(22,33,27,0.45)] focus:outline-none"
    >
      <div className="max-w-[1200px] mx-auto px-5 md:px-6 py-5 md:py-6 flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-10">
        <div className="flex-1 min-w-0">
          <h2 id="cookies-titre" className="text-ink font-sans font-semibold text-[17px] mb-1.5">Vos choix sur les cookies</h2>
          <p className="text-muted text-[14px] leading-relaxed">
            Avec votre accord, nous utilisons Google Ads pour mesurer l’efficacité de nos annonces et vous montrer
            ensuite des publicités RestOclair sur d’autres sites (remarketing), et Google Analytics pour mesurer la
            fréquentation du site. Rien n’est déposé tant que vous n’avez pas accepté, et vous pouvez changer d’avis à
            tout moment avec le lien « Gérer mes cookies » en bas de page.{" "}
            <Link to="/cookies" className="link-underline">En savoir plus</Link>
          </p>

          {detail && (
            <fieldset className="mt-4 border-t border-border pt-4">
              <legend className="sr-only">Finalités</legend>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publicite}
                  onChange={(e) => setPublicite(e.target.checked)}
                  className="mt-0.5 w-[18px] h-[18px] shrink-0 accent-[#1c4b38]"
                />
                <span>
                  <span className="block text-ink text-[15px] font-medium">
                    Publicité et mesure d’audience (Google Ads et Google Analytics)
                  </span>
                  <span className="block text-faint text-[13px] leading-snug mt-0.5">
                    Savoir si une visite venue d’une annonce Google aboutit à un appel ou à une demande de contact, vous
                    montrer ensuite des publicités RestOclair sur d’autres sites, avec Google comme responsable conjoint,
                    et mesurer la fréquentation du site avec Google Analytics, sans cookie d’audience.
                  </span>
                </span>
              </label>
              <p className="text-faint text-[13px] leading-snug mt-3">
                Les éléments strictement nécessaires (la mémorisation de ce choix, le suivi d’une inscription en cours)
                restent actifs : ils ne servent qu’au fonctionnement du site.
              </p>
            </fieldset>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 shrink-0">
          <button type="button" className={BOUTON} onClick={() => decider(false)}>
            Tout refuser
          </button>
          {detail ? (
            <button type="button" className={BOUTON} onClick={() => decider(publicite)}>
              Enregistrer mes choix
            </button>
          ) : (
            <button type="button" className={BOUTON} onClick={() => setDetail(true)}>
              Personnaliser
            </button>
          )}
          <button type="button" className={BOUTON} onClick={() => decider(true)}>
            Tout accepter
          </button>
        </div>
      </div>
    </section>
  );
}
