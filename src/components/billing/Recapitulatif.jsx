import React from "react";
import { formatHTParPeriode, formatMontant, formatPourcentage, libellePeriode } from "@/lib/billing/format";

// Récapitulatif d'une formule et de son total (résultat de `calculer`).
export default function Recapitulatif({ calcul, tvaPourcentage }) {
  const periode = libellePeriode(calcul.periode);
  return (
    <div className="bg-white ring-1 ring-border p-6 md:p-7">
      <p className="text-faint text-[12px] uppercase tracking-[0.08em] mb-2">Votre formule</p>
      <h2 className="text-ink font-serif text-[32px] leading-tight">{calcul.offre.nom}</h2>
      <p className="text-muted text-[15px] mt-1">{calcul.version.libelle}</p>

      <ul className="mt-5 pt-4 border-t border-border text-[15px] flex flex-col gap-1.5">
        {calcul.lignes.map((ligne) => (
          <li key={`${ligne.type}-${ligne.categorie ?? ligne.libelle}`} className="flex justify-between gap-4">
            <span className="text-muted">
              {ligne.type === "compte" ? `${ligne.quantite} × compte ${ligne.libelle.toLowerCase()} supplémentaire` : ligne.libelle}
            </span>
            <span className="text-ink">{formatHTParPeriode(ligne.montantCentimes, calcul.periode)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 pt-4 border-t border-border text-[15px]">
        <div className="flex justify-between gap-4 py-0.5">
          <dt className="text-muted">Total HT/{periode}</dt>
          <dd className="text-ink font-medium">{formatMontant(calcul.totalHTCentimes)}</dd>
        </div>
        <div className="flex justify-between gap-4 py-0.5">
          <dt className="text-muted">TVA {formatPourcentage(tvaPourcentage)}</dt>
          <dd className="text-ink">{formatMontant(calcul.tvaCentimes)}</dd>
        </div>
        <div className="flex justify-between gap-4 py-0.5">
          <dt className="text-ink font-medium">Total TTC/{periode}</dt>
          <dd className="text-ink font-semibold">{formatMontant(calcul.totalTTCCentimes)}</dd>
        </div>
      </dl>

      <p className="text-faint text-[13px] leading-relaxed mt-4">
        Le montant exact figure sur la page de paiement.
      </p>
    </div>
  );
}
