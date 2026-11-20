import { useEffect } from "react";

// Pages ouvertes par un lien qui porte un code (#jeton=…) : politique « no-referrer » tant que la page est affichée.
// Le fragment ne part jamais dans l'en-tête Referer, mais la règle du contrat d'Apirest est de n'en envoyer aucun.
// Le navigateur applique la dernière balise lue et ne revient pas en arrière quand on la retire : en quittant la page,
// on remet donc la politique d'avant (celle d'une autre balise, sinon la valeur par défaut des navigateurs).
const PAR_DEFAUT = "strict-origin-when-cross-origin";

export default function useSansReferent() {
  useEffect(() => {
    const precedente = document.querySelector('meta[name="referrer"]')?.getAttribute("content") || PAR_DEFAUT;
    const meta = document.createElement("meta");
    meta.setAttribute("name", "referrer");
    meta.setAttribute("content", "no-referrer");
    document.head.appendChild(meta);
    return () => {
      meta.setAttribute("content", precedente);
      meta.remove();
    };
  }, []);
}
