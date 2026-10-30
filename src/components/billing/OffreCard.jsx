import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Compteur from "@/components/billing/Compteur";
import {
  calculerTTC,
  formatHT,
  formatHTParPeriode,
  formatMontant,
  formatPourcentage,
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
  premier_paiement: "Inclus dès le 1er paiement, mises à jour illimitées",
  troisieme_paiement: "Inclus dès le 3ᵉ paiement, mises à jour illimitées",
};

// Intitulés courts du sélecteur ; le libellé complet du catalogue s'affiche dessous.
const INTITULE_VERSION = { mensuel: "Mensuel", mensuel_engage: "Engagement 12 mois", annuel: "Annuel" };

// « 2 cuisiniers », « 1 services techniques »
function libelleComptes(libelle, n) {
  const minuscule = libelle.toLowerCase();
  return `${n} ${n > 1 && !minuscule.endsWith("s") ? `${minuscule}s` : minuscule}`;
}

function Ligne({ label, children }) {
  return (
    <div className="py-2.5 border-t border-[#ece8d9] first:border-t-0 first:pt-0">
      <dt className="text-faint text-[11px] uppercase tracking-[0.08em] mb-0.5">{label}</dt>
      <dd className="text-ink text-[14px] leading-snug">{children}</dd>
    </div>
  );
}

// Bloc repliable : la carte reste courte, le détail s'ouvre à la demande.
function Depliant({ titre, indice, defaultOpen = false, children }) {
  return (
    <details open={defaultOpen} className="group border-t border-[#ece8d9]">
      <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-5 lg:px-7 py-3.5 text-[15px] text-ink font-medium hover:bg-[#faf9f3] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bottle">
        <span className="flex items-center gap-2">
          {titre}
          {indice && <span className="bg-bottle text-bottle-text text-[11px] font-medium px-2 py-0.5 rounded-full">{indice}</span>}
        </span>
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-bottle shrink-0 transition-transform duration-300 group-open:rotate-180">
          <path d="M2.5 5l4.5 4.5L11.5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="px-5 lg:px-7 pb-5">{children}</div>
    </details>
  );
}

export default function OffreCard({ catalogue, offre, precedente, miseEnAvant, initiale = null, indice = 0 }) {
  const versions = useMemo(() => versionsDisponibles(catalogue, offre), [catalogue, offre]);
  const [selection, setSelection] = useState(() => initiale ?? selectionParDefaut(catalogue, offre));

  const version = versions.find((v) => v.cle === selection.version) ?? versions[0];
  const calcul = useMemo(() => calculer(catalogue, selection), [catalogue, selection]);
  const remise = remiseAnnuelle(offre, catalogue);
  const modules = modulesAffichage(catalogue, offre, precedente);
  // Même quand ils sont identiques à la formule précédente, la liste complète reste consultable.
  const listeModules =
    modules.mode === "identiques"
      ? offre.modules.map((cle) => catalogue.modules.find((m) => m.cle === cle)?.libelle ?? cle)
      : modules.modules;
  const pms = pmsDeVersion(catalogue, version);
  const optionDdpp = version.options.find((o) => o.cle === "ddpp");
  const periode = libellePeriode(version.periode);
  const id = `offre-${offre.cle}`;
  const aVersions = versions.length > 1;

  const inclus = catalogue.categories
    .filter((c) => (offre.comptesInclus[c.cle] ?? 0) > 0)
    .map((c) => libelleComptes(c.libelle, offre.comptesInclus[c.cle]));
  const supplements = catalogue.categories.filter(
    (c) => version.prixCompteSupplementaireCentimes?.[c.cle] !== undefined && offre.categoriesAutorisees.includes(c.cle)
  );
  const prixMiniSupplement = Math.min(...supplements.map((c) => version.prixCompteSupplementaireCentimes[c.cle]));
  const nbSupplements =
    Object.values(selection.comptesSupplementaires).reduce((somme, n) => somme + n, 0) + (selection.options.ddpp ? 1 : 0);

  const choisirVersion = (cle) => setSelection((s) => ({ ...s, version: cle, options: { ddpp: false } }));
  const changerCompte = (categorie, n) =>
    setSelection((s) => ({ ...s, comptesSupplementaires: { ...s.comptesSupplementaires, [categorie]: n } }));

  const prixHT = formatMontant(version.prixBaseCentimes);
  const prixTTC = formatMontant(calculerTTC(version.prixBaseCentimes, catalogue.tvaPourcentage));

  return (
    <article
      aria-labelledby={`${id}-nom`}
      style={{ animationDelay: `${indice * 90}ms` }}
      className={`rise relative flex flex-col shrink-0 basis-[84%] snap-center min-[620px]:basis-auto min-[620px]:grid min-[620px]:row-span-5 min-[620px]:grid-rows-subgrid bg-white transition-shadow duration-300 ${
        miseEnAvant
          ? "ring-2 ring-bottle shadow-[0_24px_60px_-28px_rgba(28,75,56,0.55)]"
          : "ring-1 ring-border hover:shadow-[0_18px_44px_-30px_rgba(22,33,27,0.45)]"
      }`}
    >
      {miseEnAvant && (
        <span className="absolute -top-3 left-5 lg:left-7 bg-bottle text-bottle-text text-[11px] font-medium tracking-[0.08em] uppercase px-3 py-1.5 z-10">
          Le plus choisi
        </span>
      )}

      {/* 1. Nom, prix et comptes inclus */}
      <header className="px-5 lg:px-7 pt-7 pb-4">
        <h2 id={`${id}-nom`} className="text-ink text-[26px] mb-3">{offre.nom}</h2>
        <p className="flex flex-wrap items-baseline gap-x-2 text-ink">
          <span className="font-serif text-[38px] leading-none tracking-tight tabular-nums">{prixHT}</span>
          <span className="text-muted text-[14px]">HT/{periode}</span>
        </p>
        <p className="text-faint text-[13px] mt-1.5">soit {prixTTC} TTC/{periode}</p>
        <p className="text-muted text-[14px] leading-snug mt-4">
          <span className="text-ink font-medium">Inclus : </span>
          {inclus.join(", ")}
        </p>
      </header>

      {/* 2. Version */}
      <div className="px-5 lg:px-7 pb-4">
        {!aVersions && (
          <>
            <div className="p-1 bg-[#f0ede1] rounded-full">
              <p className="bg-white rounded-full px-2 min-h-[44px] flex items-center justify-center text-center text-[13px] leading-tight text-ink font-medium shadow-sm">
                {INTITULE_VERSION[version.cle] ?? version.libelle}
              </p>
            </div>
            <p className="text-faint text-[12px] mt-2 leading-snug">{version.libelle}</p>
          </>
        )}
        {aVersions && (
          <fieldset>
            <legend className="sr-only">Version de la formule {offre.nom}</legend>
            <div className="grid p-1 gap-1 bg-[#f0ede1] rounded-full" style={{ gridTemplateColumns: `repeat(${versions.length}, minmax(0, 1fr))` }}>
              {versions.map((v) => (
                <label
                  key={v.cle}
                  className={`relative flex flex-col items-center justify-center min-h-[44px] text-center cursor-pointer rounded-full px-2 text-[13px] leading-tight transition-all duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-bottle ${
                    v.cle === version.cle ? "bg-white text-ink font-medium shadow-sm" : "text-muted hover:text-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name={`${id}-version`}
                    value={v.cle}
                    checked={v.cle === version.cle}
                    onChange={() => choisirVersion(v.cle)}
                    className="sr-only"
                  />
                  {INTITULE_VERSION[v.cle] ?? v.libelle}
                  {v.periode === "an" && remise && (
                    <span className="block text-[11px] text-bottle font-medium">−{formatPourcentage(remise)}</span>
                  )}
                </label>
              ))}
            </div>
            <p className="text-faint text-[12px] mt-2 leading-snug" aria-live="polite">
              {version.libelle}
              {version.periode === "an" && (
                <>
                  {" "}· {formatHTParPeriode(version.prixBaseCentimes, version.periode)}
                  {remise ? `, environ −${formatPourcentage(remise)}` : ""}
                </>
              )}
            </p>
          </fieldset>
        )}
      </div>

      {/* 3. Personnaliser */}
      <div>
        <Depliant titre="Personnaliser" indice={nbSupplements > 0 ? `+${nbSupplements}` : null} defaultOpen={nbSupplements > 0}>
          <p className="text-faint text-[13px] mb-4">Comptes supplémentaires{offre.fonctions.ddpp === "option" ? " et option" : ""}</p>
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
              <label className="flex items-start gap-3 text-[15px] text-ink cursor-pointer pt-3 border-t border-[#ece8d9]">
                <input
                  type="checkbox"
                  checked={selection.options.ddpp}
                  onChange={(e) => setSelection((s) => ({ ...s, options: { ddpp: e.target.checked } }))}
                  className="mt-0.5 w-[18px] h-[18px] shrink-0 accent-[#1c4b38]"
                />
                <span>
                  {optionDdpp.libelle}
                  <span className="block text-faint text-[13px] mt-0.5">+{formatHTParPeriode(optionDdpp.prixCentimes, "mois")}</span>
                </span>
              </label>
            )}
          </div>
        </Depliant>
      </div>

      {/* 4. Total et choix */}
      <footer className="border-t border-[#ece8d9] px-5 lg:px-7 pt-4 pb-5 bg-[#fbfaf5]">
        {calcul.ok && (
          <div aria-live="polite">
            <p className="text-faint text-[11px] uppercase tracking-[0.08em] mb-1.5">Votre total par {periode}</p>
            <dl className="text-[14px] tabular-nums">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Total HT</dt>
                <dd className="text-ink">{formatMontant(calcul.totalHTCentimes)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">TVA {formatPourcentage(catalogue.tvaPourcentage)}</dt>
                <dd className="text-ink">{formatMontant(calcul.tvaCentimes)}</dd>
              </div>
              <div className="flex justify-between gap-4 pt-1.5 mt-1.5 border-t border-[#e6e2d3] text-[16px]">
                <dt className="text-ink font-medium whitespace-nowrap">Total TTC</dt>
                <dd className="text-ink font-semibold whitespace-nowrap">{formatMontant(calcul.totalTTCCentimes)}</dd>
              </div>
            </dl>
          </div>
        )}

        <Link
          to={`/inscription?${selectionVersQuery(selection)}`}
          className={`block w-full text-center mt-4 py-3.5 text-[15px] font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bottle ${
            miseEnAvant ? "bg-bottle text-bottle-text hover:bg-bottle-hover" : "bg-white text-bottle ring-1 ring-bottle hover:bg-bottle hover:text-bottle-text"
          }`}
        >
          Choisir {offre.nom}
        </Link>
      </footer>

      {/* 5. Détail de la formule, à la demande */}
      <div>
        <Depliant titre="Détail de la formule">
          <dl>
            <Ligne label="Comptes supplémentaires">dès {formatHTParPeriode(prixMiniSupplement, version.periode)}</Ligne>
            {offre.fonctions.accesOrdinateur && <Ligne label="Accès sur ordinateur">Inclus</Ligne>}
            <Ligne label="Assistance DDPP niveau 1">
              {offre.fonctions.ddpp === "incluse" && "Incluse"}
              {offre.fonctions.ddpp === "option" && `En option, ${optionDdpp ? formatHTParPeriode(optionDdpp.prixCentimes, "mois") : "sur demande"}`}
              {offre.fonctions.ddpp === "non" && "Non"}
            </Ligne>
            {pms && <Ligne label="PMS">{PMS_TEXTE[pms]}</Ligne>}
            <Ligne label="Équipiers">Illimités, sans supplément</Ligne>
            <Ligne label="Modules">
              {modules.mode === "identiques" && "Les mêmes que l’Essentiel : "}
              {modules.mode === "plus" && `Tous les modules du ${precedente.nom}, plus : `}
              {modules.mode === "complet" && "Liste complète : "}
            </Ligne>
          </dl>
          <ul className="mt-1 text-[13px] text-muted flex flex-col gap-1.5">
            {listeModules.map((m) => (
              <li key={m} className="flex gap-2.5 leading-snug">
                <svg aria-hidden="true" width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#1c4b38" strokeWidth="1.8" className="shrink-0 mt-[3px]">
                  <path d="M2.5 7.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {m}
              </li>
            ))}
          </ul>
        </Depliant>
      </div>
    </article>
  );
}
