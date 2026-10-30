// Formats français : « 19,99 € HT », « 15 décembre 2026 ».

const NBSP = " ";

const nombre = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateLongue = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

export function formatMontant(centimes) {
  return `${nombre.format(centimes / 100).replace(/ /g, NBSP)}${NBSP}€`;
}

export function formatHT(centimes) {
  return `${formatMontant(centimes)}${NBSP}HT`;
}

export function formatTTC(centimes) {
  return `${formatMontant(centimes)}${NBSP}TTC`;
}

export function libellePeriode(periode) {
  return periode === "an" ? "an" : "mois";
}

// « 19,99 € HT/mois », « 549,00 € HT/an »
export function formatHTParPeriode(centimes, periode) {
  return `${formatHT(centimes)}/${libellePeriode(periode)}`;
}

export function formatTTCParPeriode(centimes, periode) {
  return `${formatTTC(centimes)}/${libellePeriode(periode)}`;
}

// TTC = HT × (1 + TVA), arrondi au centime.
export function calculerTTC(htCentimes, tvaPourcentage = 20) {
  return Math.round((htCentimes * (100 + tvaPourcentage)) / 100);
}

export function formatDate(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : dateLongue.format(date);
}

export function formatPourcentage(valeur) {
  return `${String(valeur).replace(".", ",")}${NBSP}%`;
}
