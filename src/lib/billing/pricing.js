// Calcul des totaux à partir du catalogue de l'API. Aucun prix n'est écrit ici.
import { calculerTTC } from "./format.js";

export const MAX_COMPTES_SUPPLEMENTAIRES = 50;

// Versions proposées : « mensuel_engage » n'existe que si le PMS est disponible.
export function versionsDisponibles(catalogue, offre) {
  return offre.versions.filter((v) => catalogue.pmsDisponible || v.cle !== "mensuel_engage");
}

// Droit au PMS d'une version, ou null (rien à afficher) tant que le PMS n'est pas disponible.
export function pmsDeVersion(catalogue, version) {
  if (!catalogue.pmsDisponible || !version || version.pms === "non") return null;
  return version.pms;
}

export function selectionParDefaut(catalogue, offre) {
  const versions = versionsDisponibles(catalogue, offre);
  return { offre: offre.cle, version: versions[0]?.cle ?? "", comptesSupplementaires: {}, options: { ddpp: false } };
}

// Catégories de comptes supplémentaires proposées pour une version : autorisées par l'offre et tarifées.
export function categoriesSupplementaires(catalogue, offre, version) {
  return catalogue.categories.filter(
    (c) => offre.categoriesAutorisees.includes(c.cle) && version.prixCompteSupplementaireCentimes?.[c.cle] !== undefined
  );
}

// Nombre d'ajouts d'une sélection : comptes supplémentaires et option DDPP.
export function nombreAjouts(selection) {
  const comptes = Object.values(selection.comptesSupplementaires ?? {}).reduce((somme, n) => somme + n, 0);
  return comptes + (selection.options?.ddpp ? 1 : 0);
}

// Même offre et même version, sans comptes supplémentaires ni option.
export function sansAjouts(selection) {
  return { ...selection, comptesSupplementaires: {}, options: { ddpp: false } };
}

// Garde les ajouts encore valables pour l'offre et la version choisies (catégories proposées,
// quantités entières de 1 à MAX, option DDPP si la version la propose) et retire les autres.
export function restreindreAjouts(catalogue, selection) {
  const offre = catalogue.offres.find((o) => o.cle === selection.offre);
  const version = offre && versionsDisponibles(catalogue, offre).find((v) => v.cle === selection.version);
  if (!version) return sansAjouts(selection);
  const proposees = categoriesSupplementaires(catalogue, offre, version).map((c) => c.cle);
  const comptesSupplementaires = Object.fromEntries(
    Object.entries(selection.comptesSupplementaires ?? {}).filter(
      ([categorie, n]) => proposees.includes(categorie) && Number.isInteger(n) && n > 0 && n <= MAX_COMPTES_SUPPLEMENTAIRES
    )
  );
  const ddpp = Boolean(selection.options?.ddpp) && version.options.some((o) => o.cle === "ddpp");
  return { ...selection, comptesSupplementaires, options: { ddpp } };
}

// Renvoie { ok: false, erreur } ou { ok: true, offre, version, lignes, totaux... }.
export function calculer(catalogue, selection) {
  const offre = catalogue.offres.find((o) => o.cle === selection.offre);
  if (!offre) return { ok: false, erreur: "OFFRE_INVALIDE" };
  const version = versionsDisponibles(catalogue, offre).find((v) => v.cle === selection.version);
  if (!version) return { ok: false, erreur: "VERSION_INDISPONIBLE" };

  const lignes = [{ type: "base", libelle: `Formule ${offre.nom}`, quantite: 1, montantCentimes: version.prixBaseCentimes }];

  for (const [categorie, quantite] of Object.entries(selection.comptesSupplementaires ?? {})) {
    if (!Number.isInteger(quantite) || quantite < 0 || quantite > MAX_COMPTES_SUPPLEMENTAIRES)
      return { ok: false, erreur: "QUANTITE_INVALIDE" };
    if (quantite === 0) continue;
    const prix = version.prixCompteSupplementaireCentimes?.[categorie];
    if (!offre.categoriesAutorisees.includes(categorie) || prix === undefined)
      return { ok: false, erreur: "CATEGORIE_NON_AUTORISEE" };
    const libelleCategorie = catalogue.categories.find((c) => c.cle === categorie)?.libelle ?? categorie;
    lignes.push({ type: "compte", categorie, libelle: libelleCategorie, quantite, montantCentimes: prix * quantite });
  }

  if (selection.options?.ddpp) {
    const option = version.options.find((o) => o.cle === "ddpp");
    if (!option) return { ok: false, erreur: "OPTION_INDISPONIBLE" };
    lignes.push({ type: "option", libelle: option.libelle, quantite: 1, montantCentimes: option.prixCentimes });
  }

  const totalHTCentimes = lignes.reduce((somme, l) => somme + l.montantCentimes, 0);
  const totalTTCCentimes = calculerTTC(totalHTCentimes, catalogue.tvaPourcentage);
  return {
    ok: true,
    offre,
    version,
    lignes,
    periode: version.periode,
    totalHTCentimes,
    tvaCentimes: totalTTCCentimes - totalHTCentimes,
    totalTTCCentimes,
  };
}

// Remise de l'annuel par rapport à 12 mensualités, arrondie au demi-point (« environ −8,5 % »).
export function remiseAnnuelle(offre, catalogue) {
  const annuel = versionsDisponibles(catalogue, offre).find((v) => v.periode === "an");
  const mensuel = versionsDisponibles(catalogue, offre).find((v) => v.cle === "mensuel");
  if (!annuel || !mensuel) return null;
  const remise = (1 - annuel.prixBaseCentimes / (12 * mensuel.prixBaseCentimes)) * 100;
  return remise > 0 ? Math.round(remise * 2) / 2 : null;
}

// Modules affichés sous une formule, par rapport à la précédente (Essentiel, Sérénité, Expert).
export function modulesAffichage(catalogue, offre, precedente) {
  const libelle = (cle) => catalogue.modules.find((m) => m.cle === cle)?.libelle ?? cle;
  if (!precedente) return { mode: "complet", modules: offre.modules.map(libelle) };
  const supplementaires = offre.modules.filter((cle) => !precedente.modules.includes(cle));
  if (supplementaires.length === 0) return { mode: "identiques", modules: [] };
  return { mode: "plus", modules: supplementaires.map(libelle) };
}

// Choix de formule <-> paramètres d'URL de /inscription.
export function selectionVersQuery(selection) {
  const params = new URLSearchParams({ offre: selection.offre, version: selection.version });
  const comptes = Object.entries(selection.comptesSupplementaires ?? {})
    .filter(([, n]) => n > 0)
    .map(([categorie, n]) => `${categorie}:${n}`)
    .join(",");
  if (comptes) params.set("comptes", comptes);
  if (selection.options?.ddpp) params.set("ddpp", "1");
  return params.toString();
}

// Renvoie la sélection si les paramètres sont valides pour ce catalogue, sinon null.
export function selectionDepuisQuery(search, catalogue) {
  const params = new URLSearchParams(search);
  const offre = params.get("offre");
  const version = params.get("version");
  if (!offre || !version) return null;

  const comptesSupplementaires = {};
  const brut = params.get("comptes");
  if (brut) {
    for (const morceau of brut.split(",")) {
      const [categorie, n] = morceau.split(":");
      if (!categorie || !/^\d+$/.test(n ?? "")) return null;
      comptesSupplementaires[categorie] = Number(n);
    }
  }

  const selection = { offre, version, comptesSupplementaires, options: { ddpp: params.get("ddpp") === "1" } };
  return calculer(catalogue, selection).ok ? selection : null;
}

// Corps de POST /api/billing/checkout (hors origine).
export function selectionVersCheckout(selection) {
  const comptesSupplementaires = Object.fromEntries(
    Object.entries(selection.comptesSupplementaires ?? {}).filter(([, n]) => n > 0)
  );
  return {
    offre: selection.offre,
    version: selection.version,
    comptesSupplementaires,
    options: { ddpp: Boolean(selection.options?.ddpp) },
    origine: "site",
  };
}
