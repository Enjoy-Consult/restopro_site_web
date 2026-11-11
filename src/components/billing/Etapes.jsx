import React from "react";

const ETAPES = ["Votre formule", "Votre compte", "Le paiement"];

// Fil d'Ariane du parcours d'abonnement ; `courant` va de 1 à 3.
export default function Etapes({ courant }) {
  return (
    <ol className="flex items-center gap-3 sm:gap-4 text-[14px]" aria-label="Étapes de l’abonnement">
      {ETAPES.map((etape, i) => {
        const numero = i + 1;
        const fait = numero < courant;
        const actif = numero === courant;
        return (
          <li key={etape} className="flex items-center gap-3 sm:gap-4" aria-current={actif ? "step" : undefined}>
            <span className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-medium transition-colors ${
                  actif ? "bg-bottle text-bottle-text" : fait ? "bg-bottle-muted text-bottle" : "border border-border text-faint"
                }`}
              >
                {fait ? "✓" : numero}
              </span>
              <span className={`${actif ? "text-ink font-medium" : "text-faint"} ${actif ? "" : "hidden sm:inline"}`}>{etape}</span>
              {fait && <span className="sr-only">(terminée)</span>}
            </span>
            {numero < ETAPES.length && <span aria-hidden="true" className="w-6 sm:w-10 h-px bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}
