import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import Message from "@/components/billing/Message";
import { BUSINESS } from "@/lib/business-info";
import { VENTE_MOT_DE_PASSE } from "@/lib/billing/config";
import { accorderInvitation } from "@/lib/billing/invitation";
import { verifierMotDePasse } from "@/lib/billing/motdepasse-vente";

const CLASSE_CHAMP =
  "w-full border border-border bg-white px-4 py-3.5 text-ink text-[16px] transition-shadow focus:outline-none focus:border-bottle focus:ring-4 focus:ring-bottle/10 disabled:opacity-60";

// Vente sur invitation protégée par un mot de passe (lib/billing/invitation.js) : /tarifs et /inscription affichent
// cette page tant que le bon mot de passe n'a pas été saisi dans ce navigateur. Le mot de passe n'est comparé qu'à son
// empreinte (lib/billing/motdepasse-vente.js) ; il n'est ni gardé ni envoyé nulle part. Une fois accepté, la page est
// rechargée : la vente apparaît (routes, menu « Tarifs »).
export default function AccesReserve() {
  const [motDePasse, setMotDePasse] = useState("");
  const [etat, setEtat] = useState(null);
  const champRef = useRef(null);
  const verification = etat === "verification";

  // Après un refus, le champ est de nouveau actif (rendu terminé) : on y remet le curseur.
  useEffect(() => {
    if (etat === "refus" || etat === "indisponible") champRef.current?.focus();
  }, [etat]);

  async function envoyer(evenement) {
    evenement.preventDefault();
    if (verification || !motDePasse) return;
    setEtat("verification");
    let accepte = false;
    try {
      accepte = await verifierMotDePasse(motDePasse, VENTE_MOT_DE_PASSE);
    } catch {
      accepte = false;
    }
    if (!accepte) {
      setEtat(globalThis.crypto?.subtle ? "refus" : "indisponible");
      setMotDePasse("");
      return;
    }
    if (!accorderInvitation()) {
      setEtat("stockage");
      return;
    }
    // Rechargement complet (même adresse, ancre comprise) : la vente est décidée au chargement de la page.
    window.location.reload();
  }

  return (
    <>
      <SEO title="Accès réservé" description="Page réservée." noindex />

      <section className="pt-12 pb-24 md:pt-20 md:pb-32">
        <div className="max-w-[520px] mx-auto px-5 md:px-6">
          <p className="text-bottle text-[12px] font-medium uppercase tracking-[0.14em] mb-5">Accès réservé</p>
          <h1 className="text-ink mb-5 text-[clamp(2rem,5vw,3rem)]">Page en préparation.</h1>
          <p className="text-muted text-lg leading-relaxed mb-8">
            Cette page n’est pas encore ouverte au public. Si vous avez reçu le mot de passe, saisissez-le ci-dessous.
          </p>

          {etat === "refus" && (
            <Message type="error" className="mb-6">Mot de passe incorrect.</Message>
          )}
          {etat === "stockage" && (
            <Message type="error" className="mb-6">
              Mot de passe accepté, mais ce navigateur bloque l’enregistrement des données du site. Autorisez-les pour
              restoclair.fr, ou utilisez un autre navigateur.
            </Message>
          )}
          {etat === "indisponible" && (
            <Message type="error" className="mb-6">
              Ce navigateur ne permet pas de vérifier le mot de passe. Essayez avec un navigateur à jour.
            </Message>
          )}

          <form onSubmit={envoyer} noValidate>
            <label htmlFor="acces-mot-de-passe" className="block text-ink text-[15px] mb-2">Mot de passe</label>
            <input
              id="acces-mot-de-passe"
              ref={champRef}
              type="password"
              name="password"
              autoComplete="current-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              disabled={verification}
              className={CLASSE_CHAMP}
            />
            <button
              type="submit"
              disabled={verification || !motDePasse}
              aria-busy={verification}
              className="btn-primary mt-6 w-full sm:w-auto text-center disabled:opacity-60 disabled:cursor-wait"
            >
              {verification ? "Vérification…" : "Accéder"}
            </button>
          </form>

          <p className="text-muted text-[15px] leading-relaxed mt-10">
            Pour découvrir l’application RestOclair, demandez un{" "}
            <Link to="/essai-gratuit" className="link-underline">essai gratuit</Link>, ou écrivez-nous à{" "}
            <a href={`mailto:${BUSINESS.email}`} className="link-underline">{BUSINESS.email}</a>.
          </p>
        </div>
      </section>
    </>
  );
}
