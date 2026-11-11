import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  calculerTTC,
  formatHTParPeriode,
  formatMontant,
  formatPourcentage,
  libellePeriode,
} from "@/lib/billing/format";
import {
  categoriesSupplementaires,
  modulesAffichage,
  pmsDeVersion,
  remiseAnnuelle,
  selectionParDefaut,
  restreindreAjouts,
  selectionVersQuery,
  versionsDisponibles,
} from "@/lib/billing/pricing";
import { intituleModules } from "@/lib/billing/textes-tarifs";

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
  const [detailOuvert, setDetailOuvert] = useState(false);

  const version = versions.find((v) => v.cle === selection.version) ?? versions[0];
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
  const supplements = categoriesSupplementaires(catalogue, offre, version);
  const prixMiniSupplement = Math.min(...supplements.map((c) => version.prixCompteSupplementaireCentimes[c.cle]));
  // Les comptes et l'option se choisissent à l'inscription ; ceux d'un aller-retour depuis
  // l'inscription (« Modifier mon choix ») sont transmis tant que la version choisie les propose.
  const lien = `/inscription?${selectionVersQuery(restreindreAjouts(catalogue, selection))}`;

  const choisirVersion = (cle) => setSelection((s) => ({ ...s, version: cle }));
  const prixHT = formatMontant(version.prixBaseCentimes);
  const prixTTC = formatMontant(calculerTTC(version.prixBaseCentimes, catalogue.tvaPourcentage));

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
        <p className="text-faint text-[13px] mt-1 tabular-nums">soit {prixTTC} TTC/{periode}</p>
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

      {/* 3. Détail de la formule, à la demande */}
      <div className="border-t border-[#ece8d9]">
        <button
          type="button"
          aria-expanded={detailOuvert}
          aria-controls={`${id}-detail`}
          onClick={() => setDetailOuvert((o) => !o)}
          className="w-full flex items-center justify-center gap-2 px-3 py-3.5 text-[14px] text-ink font-medium hover:bg-[#faf9f3] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bottle"
        >
          Détail de la formule<span className="sr-only"> {offre.nom}</span>
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" className={`text-bottle shrink-0 transition-transform duration-300 ${detailOuvert ? "rotate-180" : ""}`}>
            <path d="M2.5 5l4.5 4.5L11.5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {detailOuvert && (
          <div id={`${id}-detail`} role="region" aria-label={`Détail de la formule ${offre.nom}`} className="px-5 lg:px-7 pt-4 pb-5 border-t border-[#ece8d9]">
            <dl>
              {supplements.length > 0 && (
                <Ligne label="Comptes supplémentaires">
                  dès {formatHTParPeriode(prixMiniSupplement, version.periode)}, à ajouter à l’étape suivante
                </Ligne>
              )}
              {/* CGV 0.2, article 3.1 : toutes les formules comprennent l'accès depuis un ordinateur.
                  La carte ne lit donc plus fonctions.accesOrdinateur et n'affiche jamais « Non inclus ». */}
              <Ligne label="Accès sur ordinateur">Inclus</Ligne>
              <Ligne label="Assistance DDPP niveau 1">
                {offre.fonctions.ddpp === "incluse" && "Incluse"}
                {offre.fonctions.ddpp === "option" && (optionDdpp ? `En option, ${formatHTParPeriode(optionDdpp.prixCentimes, version.periode)}` : "Non proposée avec cette version")}
                {offre.fonctions.ddpp === "non" && "Non"}
              </Ligne>
              {pms && <Ligne label="PMS">{PMS_TEXTE[pms]}</Ligne>}
              <Ligne label="Équipiers">Illimités, sans supplément</Ligne>
              <Ligne label="Modules">{intituleModules(modules.mode, precedente)}</Ligne>
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

      {/* 4. Choix */}
      <footer className="mt-auto border-t border-[#ece8d9] px-5 lg:px-7 py-4 bg-[#fbfaf5]">
        <Link
          to={lien}
          className={`block w-full text-center py-2.5 text-[15px] font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bottle ${
            miseEnAvant ? "bg-bottle text-bottle-text hover:bg-bottle-hover" : "bg-white text-bottle ring-1 ring-bottle hover:bg-bottle hover:text-bottle-text"
          }`}
        >
          Choisir {offre.nom}
        </Link>
      </footer>
    </article>
  );
}
