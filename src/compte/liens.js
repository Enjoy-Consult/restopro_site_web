// Liens du build compte vers le site restoclair.fr : toujours par l'adresse complète (README, « Deux builds »).
// Sans VITE_SITE_URL (poste de développement mal réglé), pas de lien du tout : un chemin relatif mènerait à une page
// introuvable de compte.restoclair.fr. Le garde-fou refuse un build de production du compte sans cette variable.
export function adresseSite(siteUrl, chemin = "/") {
  const base = String(siteUrl ?? "").trim().replace(/\/+$/, "");
  if (!base) return null;
  return `${base}${chemin.startsWith("/") ? chemin : `/${chemin}`}`;
}

// Documents juridiques du pied de page, dans cet ordre, avec un libellé court. documents : le contenu de
// src/content/legal/documents.json (chemins) ; seule cette liste entre dans le bundle, jamais les textes.
const PIED_DE_PAGE = [
  ["mentions-legales", "Mentions légales"],
  ["cgv", "CGV"],
  ["accord-sous-traitance", "Accord de sous-traitance"],
  ["confidentialite-site", "Confidentialité"],
  ["cookies", "Cookies"],
];

export function liensDocuments(siteUrl, documents) {
  return PIED_DE_PAGE.flatMap(([cle, libelle]) => {
    const doc = documents.find((d) => d.document === cle);
    const href = doc && adresseSite(siteUrl, doc.chemin);
    return href ? [{ cle, libelle, href }] : [];
  });
}
