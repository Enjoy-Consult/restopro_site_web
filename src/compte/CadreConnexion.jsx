import React, { useEffect, useState } from "react";
import { VISUEL_CONNEXION } from "@/compte/visuel-connexion";

// Cadre des pages de connexion de compte.restoclair.fr (connexion, mot de passe oublié, choix du mot de passe) : peu de
// texte, le formulaire dans une carte ; sur grand écran, un panneau vert avec l'application, qui donne le contexte sans
// phrase de plus ; sur téléphone, un halo vert derrière la carte et le même contexte en bandeau dessous. Classes Tailwind
// seulement, aucun attribut style : la CSP de l'origine est style-src 'self'. Entrée en trois temps (index.css,
// « entree »), coupée si l'on réduit les animations ; le contexte, identique d'une page à l'autre, n'entre qu'au premier
// affichage (il ne clignote pas en passant de la connexion au mot de passe oublié).
//   surtitre, titre, sousTitre : en-tête de la carte ; titreRef : focus du titre à l'arrivée (lecteurs d'écran) ;
//   symbole : icône d'état au-dessus du titre (lien envoyé, mot de passe enregistré…), ou null.
const PHRASE = "Votre abonnement, en un coup d’œil.";
let contexteVu = false;

export default function CadreConnexion({ surtitre, titre, titreRef, sousTitre = null, symbole = null, children }) {
  const [animer] = useState(() => !contexteVu);
  useEffect(() => {
    contexteVu = true;
  }, []);
  const entree = (classe) => (animer ? `entree ${classe}` : "");

  return (
    <section className="flex-1 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] bg-[radial-gradient(130%_55%_at_50%_0%,rgba(28,75,56,0.11),transparent_72%)] lg:bg-none">
      <div className="flex flex-col items-center lg:justify-center px-4 sm:px-6 pt-6 pb-10 sm:pt-12 lg:py-10">
        <div className="w-full max-w-[440px] bg-white px-6 py-8 sm:px-10 sm:py-10 shadow-[0_1px_2px_rgba(22,33,27,0.06),0_18px_40px_-18px_rgba(22,33,27,0.22)] ring-1 ring-[#16211b]/[0.04]">
          {symbole && (
            <div className="entree mb-6 grid place-items-center w-12 h-12 rounded-full bg-[#eaf0ea] text-bottle">{symbole}</div>
          )}
          {surtitre && <p className="entree text-bottle text-[12px] font-medium uppercase tracking-[0.14em] mb-3">{surtitre}</p>}
          <h1 ref={titreRef} tabIndex={-1} className="entree entree-2 text-ink text-[clamp(1.85rem,4.6vw,2.4rem)] leading-[1.1] text-balance focus:outline-none">
            {titre}
          </h1>
          {sousTitre && <p className="entree entree-2 text-muted text-[16px] leading-relaxed text-pretty mt-3">{sousTitre}</p>}
          <div className="entree entree-3 mt-7">{children}</div>
        </div>

        {/* Sur téléphone et tablette : le même contexte, en bandeau sous la carte, à la place d'un espace vide. */}
        <div className={`lg:hidden ${entree("entree-4")} relative mt-4 w-full max-w-[440px] h-[200px] overflow-hidden bg-bottle text-bottle-text px-6 pt-6`}>
          <div aria-hidden="true" className="absolute -top-24 -right-20 w-[300px] h-[300px] rounded-full bg-[radial-gradient(closest-side,rgba(185,207,194,0.22),transparent)]" />
          <p className="relative font-serif text-[clamp(18px,5.6vw,21px)] leading-[1.15] text-balance max-w-[min(160px,45%)]">{PHRASE}</p>
          <figure className="absolute right-4 top-7 w-[min(132px,40%)] -rotate-[6deg] rounded-[26px] bg-[#0f1a14] p-1.5 shadow-[0_24px_40px_-18px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.07)]">
            <img
              src={VISUEL_CONNEXION}
              alt=""
              width="600"
              height="1300"
              loading="lazy"
              decoding="async"
              className="block w-full h-auto rounded-[20px] outline outline-1 -outline-offset-1 outline-black/10"
            />
          </figure>
        </div>
      </div>

      {/* Contexte, sur grand écran seulement : l'application, rien à lire de plus. Le téléphone est plafonné selon la
          hauteur de l'écran, pour que le panneau ne fasse pas défiler la page sur un portable. */}
      <aside className="hidden lg:flex relative overflow-hidden bg-bottle text-bottle-text">
        <div aria-hidden="true" className="absolute -top-48 -right-40 w-[640px] h-[640px] rounded-full bg-[radial-gradient(closest-side,rgba(185,207,194,0.20),transparent)]" />
        <div aria-hidden="true" className="absolute -bottom-56 -left-40 w-[520px] h-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(0,0,0,0.18),transparent)]" />
        <div className="relative flex flex-col w-full px-12 xl:px-16 pt-16">
          <p className={`${entree("entree-2")} font-serif text-[clamp(1.9rem,2.6vw,2.5rem)] leading-[1.12] text-balance max-w-[420px]`}>{PHRASE}</p>
          <ul className={`${entree("entree-3")} mt-6 flex flex-wrap gap-2`} aria-label="Dans votre espace">
            {["Factures", "Moyen de paiement", "Formule"].map((t) => (
              <li key={t} className="rounded-full bg-white/[0.08] px-3.5 py-1.5 text-[13px] text-bottle-text/90 ring-1 ring-white/15">
                {t}
              </li>
            ))}
          </ul>
          <figure className={`${entree("entree-4")} mt-auto self-end -mb-24 mr-2 xl:mr-8 w-[min(300px,62%,max(180px,calc(46vh_-_100px)))] -rotate-[4deg] rounded-[44px] bg-[#0f1a14] p-2.5 shadow-[0_44px_80px_-32px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.07)]`}>
            <img
              src={VISUEL_CONNEXION}
              alt=""
              width="600"
              height="1300"
              loading="lazy"
              decoding="async"
              className="block w-full h-auto rounded-[34px] outline outline-1 -outline-offset-1 outline-black/10"
            />
          </figure>
        </div>
      </aside>
    </section>
  );
}
