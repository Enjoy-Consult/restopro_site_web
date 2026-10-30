import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Compteur from "@/components/billing/Compteur";
import {
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
    <div className="py-2 border-t border-[#ece8d9] first:border-t-0 first:pt-0">
      <dt className="text-faint text-[11px] uppercase tracking-[0.08em] mb-0.5">{label}</dt>
      <dd className="text-ink text-[14px] leading-snug">{children}</dd>
    </div>
  );
}

export default function OffreCard({ catalogue, offre, precedente, miseEnAvant, initiale = null, indice = 0 }) {
  const versions = useMemo(() => versionsDisponibles(catalogue, offre), [catalogue, offre]);
  const [selection, setSelection] = useState(() => initiale ?? selectionParDefaut(catalogue, offre));
  // Un seul menu déroulant ouvert à la fois : null | "perso" | "detail".
  const [panneau, setPanneau] = useState(() => {
    const aDesSupplements = initiale && (Object.values(initiale.comptesSupplementaires).some((n) => n > 0) || initiale.options.ddpp);
    return aDesSupplements ? "perso" : null;
  });

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
  
  const basculer = (nom) => setPanneau((courant) => (courant === nom ? null : nom));
  const bouton =
    "min-w-0 flex items-center justify-center gap-1.5 px-1.5 py-3.5 text-[13px] lg:text-[14px] text-ink font-medium hover:bg-[#faf9f3] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bottle";
  const chevron = (ouvert) => (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" className={`text-bottle shrink-0 transition-transform duration-300 ${ouvert ? "rotate-180" : ""}`}>
      <path d="M2.5 5l4.5 4.5L11.5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <article
      aria-labelledby={`${id}-nom`}
      style={{ animationDelay: `${indice * 90}ms` }}
      className={`rise relative min-w-0 overflow-x-clip flex flex-col shrink-0 basis-[84%] snap-center min-[700px]:basis-auto min-[700px]:grid min-[700px]:row-span-4 min-[700px]:grid-rows-subgrid bg-white transition-shadow duration-300 ${
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
      <header className="px-5 lg:px-7 pt-5 pb-3">
        <h2 id={`${id}-nom`} className="text-ink text-[24px] mb-2">{offre.nom}</h2>
        <p className="flex flex-wrap items-baseline gap-x-2 text-ink">
          <span className="font-serif text-[34px] leading-none tracking-tight tabular-nums">{prixHT}</span>
          <span className="text-muted text-[14px]">HT/{periode}</span>
        </p>
        <p className="text-muted text-[13px] leading-snug mt-2.5">
          <span className="text-ink font-medium">Inclus : </span>
          {inclus.join(", ")}
        </p>
      </header>

      {/* 2. Version */}
      <div className="px-5 lg:px-7 pb-3.5">
        <p className="sr-only" aria-live="polite">{version.libelle}</p>
        {!aVersions && (
          <div className="p-1 bg-[#f0ede1] rounded-full">
            <p className="bg-white rounded-full px-2 min-h-[42px] flex items-center justify-center text-center text-[13px] leading-tight text-ink font-medium shadow-sm">
              {version.libelle}
            </p>
          </div>
        )}
        {aVersions && (
          <fieldset>
            <legend className="sr-only">Version de la formule {offre.nom}</legend>
            <div className="grid p-1 gap-1 bg-[#f0ede1] rounded-full" style={{ gridTemplateColumns: `repeat(${versions.length}, minmax(0, 1fr))` }}>
              {versions.map((v) => (
                <label
                  key={v.cle}
                  title={v.libelle}
                  className={`relative flex flex-col items-center justify-center min-h-[42px] text-center cursor-pointer rounded-full px-2 text-[13px] leading-tight transition-all duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-bottle ${
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
          </fieldset>
        )}
      </div>

      {/* 3. Menus déroulants : personnaliser / détail de la formule */}
      <div className="border-t border-[#ece8d9]">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] divide-x divide-[#ece8d9]">
          <button type="button" className={bouton} aria-expanded={panneau === "perso"} aria-controls={`${id}-perso`} onClick={() => basculer("perso")}>
            <span aria-hidden="true" className="hidden lg:inline">Personnaliser</span>
            <span aria-hidden="true" className="lg:hidden">Options</span>
            <span className="sr-only">Personnaliser</span>
            {nbSupplements > 0 && <span className="bg-bottle text-bottle-text text-[11px] font-medium px-1.5 py-0.5 rounded-full">+{nbSupplements}</span>}
            {chevron(panneau === "perso")}
          </button>
          <button type="button" className={bouton} aria-expanded={panneau === "detail"} aria-controls={`${id}-detail`} onClick={() => basculer("detail")}>
            Détail
            {chevron(panneau === "detail")}
          </button>
        </div>

        {panneau === "perso" && (
          <div id={`${id}-perso`} role="region" aria-label={`Personnaliser la formule ${offre.nom}`} className="px-5 lg:px-7 pt-4 pb-5 border-t border-[#ece8d9]">
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
          </div>
        )}

        {panneau === "detail" && (
          <div id={`${id}-detail`} role="region" aria-label={`Détail de la formule ${offre.nom}`} className="px-5 lg:px-7 pt-4 pb-5 border-t border-[#ece8d9]">
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
                {modules.mode === "identiques" && "Les mêmes que l’Essentiel :"}
                {modules.mode === "plus" && `Tous les modules du ${precedente.nom}, plus :`}
                {modules.mode === "complet" && "Liste complète :"}
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
          </div>
        )}
      </div>

      {/* 4. Total et choix */}
      <footer className="mt-auto flex flex-col border-t border-[#ece8d9] px-5 lg:px-7 pt-3.5 pb-4 bg-[#fbfaf5]">
        {calcul.ok && (
          <div aria-live="polite">
            <p className="flex flex-wrap items-baseline justify-between gap-x-3 tabular-nums">
              <span className="text-ink text-[14px] font-medium whitespace-nowrap">Total TTC/{periode}</span>
              <span className="text-ink font-semibold text-[20px] whitespace-nowrap">{formatMontant(calcul.totalTTCCentimes)}</span>
            </p>
            <p className="text-faint text-[12px] leading-snug mt-1 tabular-nums">
              {formatMontant(calcul.totalHTCentimes)} HT + {formatMontant(calcul.tvaCentimes)} de TVA {formatPourcentage(catalogue.tvaPourcentage)}
            </p>
          </div>
        )}

        <div className="mt-auto pt-3">
          <Link
            to={`/inscription?${selectionVersQuery(selection)}`}
            className={`block w-full text-center py-2.5 text-[15px] font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bottle ${
              miseEnAvant ? "bg-bottle text-bottle-text hover:bg-bottle-hover" : "bg-white text-bottle ring-1 ring-bottle hover:bg-bottle hover:text-bottle-text"
            }`}
          >
            Choisir {offre.nom}
          </Link>
        </div>
      </footer>
    </article>
  );
}
