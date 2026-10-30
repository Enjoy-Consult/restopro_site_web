import React from "react";
import { MAX_COMPTES_SUPPLEMENTAIRES } from "@/lib/billing/pricing";

// Compteur de comptes supplémentaires d'une catégorie.
export default function Compteur({ id, libelle, detail, valeur, onChange }) {
  const borner = (n) => Math.min(MAX_COMPTES_SUPPLEMENTAIRES, Math.max(0, Number.isFinite(n) ? n : 0));
  const bouton =
    "w-9 h-9 rounded-full flex items-center justify-center text-ink text-[18px] leading-none bg-[#f0ede1] hover:bg-[#e6e2d2] active:scale-95 transition disabled:opacity-35 disabled:hover:bg-[#f0ede1] disabled:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bottle";

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-ink text-[15px] leading-tight">{libelle}</label>
        <span className="block text-faint text-[13px] mt-0.5">{detail}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          className={bouton}
          aria-label={`Retirer un compte ${libelle.toLowerCase()}`}
          disabled={valeur <= 0}
          onClick={() => onChange(borner(valeur - 1))}
        >
          −
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_COMPTES_SUPPLEMENTAIRES}
          value={valeur}
          onChange={(e) => onChange(borner(parseInt(e.target.value, 10)))}
          className="w-10 h-9 text-center bg-transparent text-ink text-[16px] font-medium tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none rounded-md focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-bottle"
        />
        <button
          type="button"
          className={bouton}
          aria-label={`Ajouter un compte ${libelle.toLowerCase()}`}
          disabled={valeur >= MAX_COMPTES_SUPPLEMENTAIRES}
          onClick={() => onChange(borner(valeur + 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}
