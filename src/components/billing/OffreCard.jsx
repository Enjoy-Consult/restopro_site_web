import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Compteur from "@/components/billing/Compteur";
import {
  calculerTTC,
  formatHT,
  formatHTParPeriode,
  formatMontant,
  formatPourcentage,
  formatTTCParPeriode,
  libellePeriode,
} from "@/lib/billing/format";
import {
  calculer,
  modulesAffichage,
  pmsDeVersion,
  remiseAnnuelle,
  selectionParDefaut,
  selectionVersQuery,
  versionsDisponibles,
} from "@/lib/billing/pricing";

const PMS_TEXTE = {
  premier_paiement: "PMS inclus dès le 1er paiement, mises à jour illimitées",
  troisieme_paiement: "PMS inclus dès le 3ᵉ paiement, mises à jour illimitées",
};

// « 2 cuisiniers », « 1 services techniques »
function libelleComptes(libelle, n) {
  const minuscule = libelle.toLowerCase();
  return `${n} ${n > 1 && !minuscule.endsWith("s") ? `${minuscule}s` : minuscule}`;
}

export default function OffreCard({ catalogue, offre, precedente, miseEnAvant }) {
  const versions = useMemo(() => versionsDisponibles(catalogue, offre), [catalogue, offre]);
  const [selection, setSelection] = useState(() => selectionParDefaut(catalogue, offre));

  const version = versions.find((v) => v.cle === selection.version) ?? versions[0];
  const calcul = useMemo(() => calculer(catalogue, selection), [catalogue, selection]);
  const remise = remiseAnnuelle(offre, catalogue);
  const modules = modulesAffichage(catalogue, offre, precedente);
  const pms = pmsDeVersion(catalogue, version);
  const optionDdpp = version.options.find((o) => o.cle === "ddpp");
  const periode = libellePeriode(version.periode);
  const id = `offre-${offre.cle}`;

  const inclus = catalogue.categories
    .filter((c) => (offre.comptesInclus[c.cle] ?? 0) > 0)
    .map((c) => libelleComptes(c.libelle, offre.comptesInclus[c.cle]));
  const supplements = catalogue.categories
    .filter((c) => version.prixCompteSupplementaireCentimes?.[c.cle] !== undefined && offre.categoriesAutorisees.includes(c.cle));

  const choisirVersion = (cle) => setSelection((s) => ({ ...s, version: cle, options: { ddpp: false } }));
  const changerCompte = (categorie, n) =>
    setSelection((s) => ({ ...s, comptesSupplementaires: { ...s.comptesSupplementaires, [categorie]: n } }));

  return (
    <article
      aria-labelledby={`${id}-nom`}
      className={`relative flex flex-col bg-white p-6 md:p-7 ${miseEnAvant ? "border-2 border-bottle" : "border border-border"}`}
    >
      {miseEnAvant && (
        <span className="absolute -top-3 left-6 bg-bottle text-bottle-text text-[12px] font-medium tracking-wide px-3 py-1">
          Le plus choisi
        </span>
      )}

      <h2 id={`${id}-nom`} className="text-ink mb-4">{offre.nom}</h2>

      <p className="text-ink font-serif text-[32px] leading-none">{formatHTParPeriode(version.prixBaseCentimes, version.periode)}</p>
      <p className="text-faint text-[14px] mt-2 mb-5">{formatTTCParPeriode(calculerTTC(version.prixBaseCentimes, catalogue.tvaPourcentage), version.periode)}</p>

      {versions.length > 1 && (
        <fieldset className="mb-6">
          <legend className="sr-only">Version de la formule {offre.nom}</legend>
          <div className="flex flex-col gap-2">
            {versions.map((v) => (
              <label
                key={v.cle}
                className={`flex items-start gap-3 border px-3 py-2.5 cursor-pointer text-[14px] leading-snug has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-bottle ${
                  v.cle === version.cle ? "border-bottle bg-[#eaf0ea]" : "border-border"
                }`}
              >
                <input
                  type="radio"
                  name={`${id}-version`}
                  value={v.cle}
                  checked={v.cle === version.cle}
                  onChange={() => choisirVersion(v.cle)}
                  className="mt-0.5 shrink-0 accent-[#1c4b38]"
                />
                <span>
                  <span className="text-ink block">{v.libelle}</span>
                  {v.periode === "an" && (
                    <span className="text-faint block">
                      {formatHTParPeriode(v.prixBaseCentimes, v.periode)}
                      {remise ? `, environ −${formatPourcentage(remise)}` : ""}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <ul className="flex flex-col gap-3 text-[15px] text-muted leading-relaxed border-t border-border pt-5">
        <li>
          <strong className="text-ink font-medium">Comptes inclus : </strong>
          {inclus.join(", ")}
        </li>
        <li>
          <strong className="text-ink font-medium">Comptes supplémentaires, par {periode} : </strong>
          {supplements
            .map((c) => `${c.libelle.toLowerCase()} ${formatHT(version.prixCompteSupplementaireCentimes[c.cle])}`)
            .join(" ; ")}
        </li>
        <li>
          <strong className="text-ink font-medium">Modules</strong>
          {modules.mode === "identiques" && <span> : les mêmes que l’Essentiel</span>}
          {modules.mode === "plus" && <span> : tous les modules du {precedente.nom}, plus :</span>}
          {modules.mode !== "identiques" && (
            <ul className="list-disc pl-5 mt-1.5 text-[14px] flex flex-col gap-0.5">
              {modules.modules.map((m) => <li key={m}>{m}</li>)}
            </ul>
          )}
        </li>
        {offre.fonctions.accesOrdinateur && (
          <li>
            <strong className="text-ink font-medium">Accès sur ordinateur</strong>
          </li>
        )}
        <li>
          <strong className="text-ink font-medium">Assistance DDPP niveau 1 : </strong>
          {offre.fonctions.ddpp === "incluse" && "incluse"}
          {offre.fonctions.ddpp === "option" && `en option, ${optionDdpp ? formatHTParPeriode(optionDdpp.prixCentimes, "mois") : "sur demande"}`}
          {offre.fonctions.ddpp === "non" && "non"}
        </li>
        {pms && <li>{PMS_TEXTE[pms]}</li>}
        <li>
          <strong className="text-ink font-medium">Équipiers illimités</strong>, sans supplément
        </li>
      </ul>

      <div className="mt-auto pt-6">
        <div className="border-t border-border pt-5">
          <h3 className="text-ink font-sans font-semibold text-[16px] mb-4">Votre configuration</h3>

          <p className="text-faint text-[13px] mb-3">Comptes supplémentaires</p>
          <div className="flex flex-col gap-4">
            {supplements.map((c) => (
              <Compteur
                key={c.cle}
                id={`${id}-${c.cle}`}
                libelle={c.libelle}
                detail={`+${formatHT(version.prixCompteSupplementaireCentimes[c.cle])}/${periode}`}
                valeur={selection.comptesSupplementaires[c.cle] ?? 0}
                onChange={(n) => changerCompte(c.cle, n)}
              />
            ))}

            {offre.fonctions.ddpp === "option" && optionDdpp && (
              <label className="flex items-start gap-3 text-[15px] text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={selection.options.ddpp}
                  onChange={(e) => setSelection((s) => ({ ...s, options: { ddpp: e.target.checked } }))}
                  className="mt-1 w-4 h-4 shrink-0 accent-[#1c4b38]"
                />
                <span>
                  {optionDdpp.libelle}
                  <span className="block text-faint text-[13px]">+{formatHTParPeriode(optionDdpp.prixCentimes, "mois")}</span>
                </span>
              </label>
            )}
          </div>

          {calcul.ok && (
            <dl className="mt-5 pt-4 border-t border-border text-[15px]" aria-live="polite">
              <div className="flex justify-between gap-4 py-0.5">
                <dt className="text-muted">Total HT/{periode}</dt>
                <dd className="text-ink font-medium">{formatMontant(calcul.totalHTCentimes)}</dd>
              </div>
              <div className="flex justify-between gap-4 py-0.5">
                <dt className="text-muted">TVA {formatPourcentage(catalogue.tvaPourcentage)}</dt>
                <dd className="text-ink">{formatMontant(calcul.tvaCentimes)}</dd>
              </div>
              <div className="flex justify-between gap-4 py-0.5">
                <dt className="text-ink font-medium">Total TTC/{periode}</dt>
                <dd className="text-ink font-semibold">{formatMontant(calcul.totalTTCCentimes)}</dd>
              </div>
            </dl>
          )}

          <p className="text-faint text-[13px] leading-relaxed mt-4">
            Prix HT, TVA {formatPourcentage(catalogue.tvaPourcentage)} en sus. Paiement par carte bancaire ou prélèvement SEPA.
            Le montant exact figure sur la page de paiement.
          </p>

          <Link to={`/inscription?${selectionVersQuery(selection)}`} className="btn-primary w-full text-center mt-5">
            Choisir {offre.nom}
          </Link>
        </div>
      </div>
    </article>
  );
}
