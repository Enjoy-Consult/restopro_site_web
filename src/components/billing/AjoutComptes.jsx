import React from "react";
import Compteur from "@/components/billing/Compteur";
import { formatHT, formatHTParPeriode, libellePeriode } from "@/lib/billing/format";
import { categoriesSupplementaires, nombreAjouts } from "@/lib/billing/pricing";

// Comptes supplémentaires et option DDPP, choisis à l'inscription : la carte tarif reste simple.
// `calcul` est le résultat (valide) de `calculer` pour `selection`.
export default function AjoutComptes({ catalogue, calcul, selection, onChange, ouvert, onBasculer, desactive = false }) {
  const { offre, version } = calcul;
  const periode = libellePeriode(version.periode);
  const categories = categoriesSupplementaires(catalogue, offre, version);
  const optionDdpp = offre.fonctions.ddpp === "option" ? version.options.find((o) => o.cle === "ddpp") : null;
  const ajouts = nombreAjouts(selection);
  if (categories.length === 0 && !optionDdpp) return null;

  const titre = optionDdpp ? "Ajouter des comptes ou une option" : "Ajouter des comptes";
  const changerCompte = (categorie, n) =>
    onChange({ ...selection, comptesSupplementaires: { ...selection.comptesSupplementaires, [categorie]: n } });

  return (
    <div className="mt-4 border-t border-border [&+ul]:mt-0">
      <button
        type="button"
        aria-expanded={ouvert}
        aria-controls="ajout-comptes"
        onClick={onBasculer}
        className="w-full flex items-center justify-between gap-3 py-3.5 text-left text-[15px] text-ink font-medium hover:text-bottle transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bottle"
      >
        <span className="flex items-center gap-2 min-w-0">
          {titre}
          {/* Place réservée même à 0 : l'apparition du badge ne fait pas passer le titre à la ligne. */}
          <span
            aria-hidden={ajouts === 0 ? "true" : undefined}
            className={`shrink-0 min-w-[2.25rem] text-center bg-bottle text-bottle-text text-[11px] font-medium px-1.5 py-0.5 rounded-full tabular-nums ${ajouts === 0 ? "invisible" : ""}`}
          >
            +{ajouts}
            <span className="sr-only"> ajouté{ajouts > 1 ? "s" : ""}</span>
          </span>
        </span>
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" className={`text-bottle shrink-0 transition-transform duration-300 ${ouvert ? "rotate-180" : ""}`}>
          <path d="M2.5 5l4.5 4.5L11.5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {ouvert && (
        <fieldset id="ajout-comptes" disabled={desactive} className="pb-4 disabled:opacity-60">
          <legend className="sr-only">{titre}</legend>
          <div className="flex flex-col gap-4">
            {categories.map((c) => (
              <Compteur
                key={c.cle}
                id={`ajout-${c.cle}`}
                libelle={c.libelle}
                detail={`+${formatHT(version.prixCompteSupplementaireCentimes[c.cle])}/${periode}`}
                valeur={selection.comptesSupplementaires[c.cle] ?? 0}
                onChange={(n) => changerCompte(c.cle, n)}
              />
            ))}

            {optionDdpp && (
              <label className="flex items-start gap-3 text-[15px] text-ink cursor-pointer pt-3 border-t border-border">
                <input
                  type="checkbox"
                  checked={selection.options.ddpp}
                  onChange={(e) => onChange({ ...selection, options: { ddpp: e.target.checked } })}
                  className="mt-0.5 w-[18px] h-[18px] shrink-0 accent-[#1c4b38]"
                />
                <span>
                  {optionDdpp.libelle}
                  <span className="block text-faint text-[13px] mt-0.5">+{formatHTParPeriode(optionDdpp.prixCentimes, version.periode)}</span>
                </span>
              </label>
            )}
          </div>
          <p className="text-faint text-[13px] leading-snug mt-4">Vous pourrez aussi en ajouter plus tard depuis votre espace client.</p>
        </fieldset>
      )}
    </div>
  );
}
