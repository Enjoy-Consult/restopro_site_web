// Passages interdits dans les documents « application » (CGU, politique de confidentialité, mentions légales de l'app),
// affichés tels quels sur iOS et Android : règle des magasins d'applications de l'app, reprise À L'IDENTIQUE de
// STORE_FORBIDDEN_TEXTS (dépôt Saule42/App-EnjoyConsult-4.5, src/core/billing/storeLeaks.ts), transmise par le front le
// 10/11/2026. L'import de l'app (scripts/import-legal-texts.mjs) refuse un texte au premier passage en cause.
// Si la liste change dans l'app, la recopier ici telle quelle.
//
// Comparaison, comme l'import de l'app : sur le texte VISIBLE (Markdown rendu : ni **, ni [ ]( ), ni cibles des liens),
// après retrait des caractères invisibles (U+00AD, U+200B à U+200D, U+2060, U+FEFF) et avec les espaces insécables
// (U+00A0, U+202F) ramenées à des espaces. Les adresses e-mail sont permises (contact@restoclair.fr).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";

export const TEXTES_INTERDITS_MAGASINS = [
  ["€", /€/],
  ["HT", /\bHT\b/],
  ["TTC", /\bTTC\b/],
  ["nom de formule", /essentiel|s[ée]r[ée]nit[ée]|expert/i],
  ["formule", /formule/i],
  ["invitation à s'abonner", /abonnez|s['’]abonner|souscri/i],
  ["Payer", /\bpayer\b/i],
  ["Résilier", /r[ée]silier/i],
  ["Changer de formule", /changer de formule/i],
  ["Moyens de paiement", /moyens? de paiement/i],
  ["Choisir une formule", /choisir une formule/i],
  ["Télécharger toutes mes données", /t[ée]l[ée]charger toutes mes donn[ée]es/i],
  ["Gérer les comptes", /g[ée]rer les comptes/i],
  ["Mon compte", /mon compte/i],
  ["remboursement", /rembours/i],
  ["montant", /montant/i],
  ["facture", /factur/i],
  ["payé", /(?:^|[^a-zà-ÿ])pay[ée]e?s?(?![a-zà-ÿ])/i],
  ["offert / gratuit", /offert|gratuit/i],
  ["Ajouter des comptes", /ajouter des comptes/i],
  ["adresse ou espace web", /https?:\/\/|(?:^|[^@\w.-])(?:[\w-]+\.)*restoclair\.fr|espace web|sur (?:le|notre) site/i],
];

// Phrases permises, retirées du texte avant la recherche (storePlatformText.ts de l'app). Exceptions étroites.
export const PHRASES_PERMISES = [/L['’]accès offert se termine le [^.]*\./g, /période d['’]accès offert terminée/g, /supprimer mon compte/gi];

const ENTITES = { amp: "&", lt: "<", gt: ">", quot: "\"", "#x27": "'", "#39": "'", nbsp: "\u00A0" };
const DEBUT_TITRE = "\u0001";
const SEPARATEUR = "\u0000";

// Texte visible d'un Markdown, bloc par bloc (titres, paragraphes, éléments de liste, citations), avec la section de
// chacun, comme l'import de l'app. Les sous-listes sont des blocs à part. sansMarques : les marques `[À …]` (code en
// ligne) sont retirées, comme elles le seront à la publication.
export function blocsVisibles(markdown, { sansMarques = false } = {}) {
  let html = renderToStaticMarkup(createElement(ReactMarkdown, null, String(markdown ?? "")));
  if (sansMarques) html = html.replace(/<code>[\s\S]*?<\/code>/g, "");
  const morceaux = html
    .replace(/<h[1-6][^>]*>/g, `${SEPARATEUR}${DEBUT_TITRE}`)
    .replace(/<\/?(?:p|li|ul|ol|blockquote|h[1-6]|br|hr|table|tr|td|th|pre)[^>]*>/g, SEPARATEUR)
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x27|#39|amp|lt|gt|quot|nbsp);/g, (_, e) => ENTITES[e])
    .split(SEPARATEUR);
  const blocs = [];
  let section = "";
  for (const brut of morceaux) {
    const titre = brut.startsWith(DEBUT_TITRE);
    const texte = brut
      .replace(DEBUT_TITRE, "")
      .replace(/[\u00AD\u200B-\u200D\u2060\uFEFF]/g, "")
      .replace(/[\u00A0\u202F]/g, " ")
      .trim();
    if (!texte) continue;
    if (titre) section = texte;
    blocs.push({ section, texte });
  }
  return blocs;
}

// Passages interdits : [{ regle, section, extrait }], dans l'ordre du texte, après retrait des phrases permises.
export function passagesInterdits(markdown, options = {}) {
  const trouves = [];
  for (const bloc of blocsVisibles(markdown, options)) {
    const texte = PHRASES_PERMISES.reduce((t, phrase) => t.replace(phrase, " "), bloc.texte);
    for (const [regle, motif] of TEXTES_INTERDITS_MAGASINS) {
      const global = new RegExp(motif.source, motif.flags.includes("g") ? motif.flags : `${motif.flags}g`);
      for (const m of texte.matchAll(global)) {
        trouves.push({ regle, section: bloc.section, extrait: texte.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40) });
      }
    }
  }
  return trouves;
}
