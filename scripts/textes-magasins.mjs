// Passages interdits dans les documents « application » (CGU, politique de confidentialité, mentions légales de l'app),
// affichés tels quels sur iOS et Android : règle des magasins d'applications de l'app, reprise À L'IDENTIQUE de
// STORE_FORBIDDEN_TEXTS (dépôt Saule42/App-EnjoyConsult-4.5, src/core/billing/storeLeaks.ts), transmise par le front le
// 10/11/2026, mise à jour le même soir (commits de l'app 4321af2a et 3ade0575 : « euro », « payez », capital social).
// L'import de l'app (scripts/import-legal-texts.mjs) refuse un texte au premier passage en cause.
// Si la liste change dans l'app, la recopier ici telle quelle.
//
// Comparaison, comme l'import de l'app : sur le texte VISIBLE (Markdown rendu : ni **, ni [ ]( ), ni cibles des liens),
// après retrait de tous les caractères de formatage Unicode et de quelques invisibles (/[\p{Cf}\u034F\u180E\uFE00-\uFE0F]/u :
// tiret conditionnel, U+200B à U+200F dont LRM et RLM, U+2060 à U+2064, U+2066 à U+2069, U+FEFF…), puis avec toute espace
// Unicode autre que le saut de ligne ramenée à une espace simple (/[^\S\n]/ : insécables, espace fine…). Alignement du
// 10/11 au soir sur l'import de l'app. Les adresses e-mail sont permises (contact@restoclair.fr).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";

export const TEXTES_INTERDITS_MAGASINS = [
  ["€", /€/],
  ["HT", /\bHT\b/],
  ["TTC", /\bTTC\b/],
  // Le prix en toutes lettres ; seul le capital social réel (CAPITAL_SOCIAL_PERMIS, textes juridiques) est permis.
  ["euro", /\beuros?\b/i],
  ["nom de formule", /essentiel|s[ée]r[ée]nit[ée]|expert/i],
  ["formule", /formule/i],
  ["invitation à s'abonner", /abonnez|s['’]abonner|souscri/i],
  ["Payer", /\bpay(?:er|ez)\b/i],
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

// Capital social réel de l'éditeur (LCEN), seule mention d'euros permise, dans les textes juridiques seulement (ce script
// ne traite que ceux-là) : STORE_ALLOWED_LEGAL_SENTENCES de l'app, recopiée telle quelle. « 1 000 », « 1000 » ou
// « 1 000,00 » euros, en toutes lettres, suivi d'une ponctuation, d'un saut de ligne ou de la fin. Si le capital change,
// l'app doit changer d'abord.
export const CAPITAL_SOCIAL_PERMIS = /\b(?:capital social[    ]?:|au capital de)[    ]1[    ]?000(?:,00)?[    ]euros(?=[    ]*(?:[,.;)—–\n-]|$))/gi;

// Phrases permises, retirées du texte avant la recherche, dans l'ordre de l'app : le capital social
// (STORE_ALLOWED_LEGAL_SENTENCES), puis STORE_ALLOWED_ACCES_OFFERT_SENTENCES (storePlatformText.ts). Exceptions étroites.
export const PHRASES_PERMISES = [CAPITAL_SOCIAL_PERMIS, /L['’]accès offert se termine le [^.]+\./g, /période d['’]accès offert terminée/g, /supprimer mon compte/gi];

const ENTITES = { amp: "&", lt: "<", gt: ">", quot: "\"", "#x27": "'", "#39": "'", nbsp: "\u00A0" };
const DEBUT_TITRE = "\u0001";
const SEPARATEUR = "\u0000";

// Retire les éléments <code>…</code> (marques `[À …]`), contenu compris, jusqu'à ce qu'il n'en reste aucun.
function sansCodeEnLigne(html) {
  let reste = html;
  let debut = reste.indexOf("<code>");
  while (debut !== -1) {
    const fin = reste.indexOf("</code>", debut);
    if (fin === -1) break;
    reste = reste.slice(0, debut) + reste.slice(fin + "</code>".length);
    debut = reste.indexOf("<code>");
  }
  return reste;
}

// Retire les balises restantes, caractère par caractère : renderToStaticMarkup échappe le texte (« < » devient &lt;),
// donc un « < » brut ouvre toujours une balise, fermée au « > » suivant. Le texte n'est jamais réinjecté dans du HTML :
// il sert seulement à chercher les passages interdits.
function sansBalises(html) {
  let texte = "";
  let dansBalise = false;
  for (const caractere of html) {
    if (dansBalise) dansBalise = caractere !== ">";
    else if (caractere === "<") dansBalise = true;
    else texte += caractere;
  }
  return texte;
}

// Texte visible d'un Markdown, bloc par bloc (titres, paragraphes, éléments de liste, citations), avec la section de
// chacun, comme l'import de l'app. Les sous-listes sont des blocs à part. sansMarques : les marques `[À …]` (code en
// ligne) sont retirées, comme elles le seront à la publication.
export function blocsVisibles(markdown, { sansMarques = false } = {}) {
  let html = renderToStaticMarkup(createElement(ReactMarkdown, null, String(markdown ?? "")));
  if (sansMarques) html = sansCodeEnLigne(html);
  const separe = html
    .replace(/<h[1-6][^>]*>/g, `${SEPARATEUR}${DEBUT_TITRE}`)
    .replace(/<\/?(?:p|li|ul|ol|blockquote|h[1-6]|br|hr|table|tr|td|th|pre)[^>]*>/g, SEPARATEUR);
  const morceaux = sansBalises(separe)
    .replace(/&(#x27|#39|amp|lt|gt|quot|nbsp);/g, (_, e) => ENTITES[e])
    .split(SEPARATEUR);
  const blocs = [];
  let section = "";
  for (const brut of morceaux) {
    const titre = brut.startsWith(DEBUT_TITRE);
    const texte = brut
      .replace(DEBUT_TITRE, "")
      .replace(/[\p{Cf}\u034F\u180E\uFE00-\uFE0F]/gu, "")
      .replace(/[^\S\n]/g, " ")
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
