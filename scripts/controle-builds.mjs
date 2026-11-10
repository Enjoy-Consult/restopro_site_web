// Contrôles après build, pour les deux builds (README, « Deux builds ») :
//   node scripts/controle-builds.mjs vitrine dist
//   node scripts/controle-builds.mjs compte dist-compte
// Sortie en erreur (code 1) au moindre problème. Les règles sont des fonctions pures, testées par controle-builds.test.mjs.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Empreintes des scripts intégrés que la CSP de restoclair.fr autorise (script-src du user.conf restoclair.fr du 10/11,
// dossier « Nginx NAS 2026-11-10 »). Si le script du consentement de index.html change, mettre à jour le user.conf
// sur le NAS (Louis) ET cette liste : sinon la CSP, une fois bloquante, empêcherait le consentement de Google.
export const EMPREINTES_SCRIPTS_SITE = ["sha256-QULhTizkQlJ6JUqllmQ/4QmXkIrNQiHe5223lqFSIPk="];

// Rien de tout cela ne doit entrer dans le bundle du compte : traceurs, PHP du site (Airtable, FormSubmit), bandeau des
// cookies. Les textes juridiques ont leurs propres marques, tirées des fichiers eux-mêmes (marquesJuridiques).
export const MARQUES_INTERDITES_COMPTE = [
  "googletagmanager",
  "google-analytics",
  "googleadservices",
  "doubleclick.net",
  "gtag(",
  "dataLayer",
  "airtable",
  "formsubmit",
  "unsplash",
  "php-api",
  "restoclair_consentement",
];

// Marques de chaque texte juridique (toutes les versions de documents.json) : son titre en Markdown (« # … ») et le début
// de son premier long paragraphe. Un texte importé dans le bundle (?raw) y figure tel quel.
export function marquesJuridiques(racine = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/content/legal")) {
  const documents = JSON.parse(readFileSync(path.join(racine, "documents.json"), "utf8"));
  const marques = new Set();
  for (const doc of documents) {
    for (const { version } of doc.versions) {
      const lignes = readFileSync(path.join(racine, doc.document, `${version}.md`), "utf8").split("\n").map((l) => l.trim());
      const titre = lignes.find((l) => l.startsWith("# "));
      if (titre) marques.add(titre);
      const paragraphe = lignes.find((l) => /^[A-ZÀ-Ý]/.test(l) && l.length >= 80 && !/[`[\]]/.test(l));
      if (paragraphe) marques.add(paragraphe.slice(0, 60));
    }
  }
  return [...marques];
}

// Un minifieur peut écrire les caractères non ASCII en \uXXXX ou \xXX : on compare sur le texte rétabli.
const retablir = (texte) => texte
  .replace(/\\u\{([0-9a-f]+)\}/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\x([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));

const sansCommentaires = (html) => html.replace(/<!--[\s\S]*?-->/g, "");

const EXTENSIONS_TEXTE = new Set([".html", ".js", ".mjs", ".css", ".json", ".txt", ".md", ".xml", ".svg", ".map", ".webmanifest"]);

// Scripts sans src d'une page HTML, avec leur type. Les blocs de données (application/ld+json) ne s'exécutent pas.
export function scriptsIntegres(html) {
  return [...sansCommentaires(html).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .filter(([, attributs]) => !/\bsrc\s*=/i.test(attributs))
    .map(([, attributs, contenu]) => ({
      donnees: /type\s*=\s*["']?application\/(ld\+)?json/i.test(attributs),
      empreinte: `sha256-${createHash("sha256").update(contenu).digest("base64")}`,
    }));
}

// Contenus des balises <meta name="…"> (hors commentaires), dans l'ordre.
const metas = (html, nom) =>
  [...sansCommentaires(html).matchAll(/<meta\b[^>]*>/gi)]
    .filter(([balise]) => new RegExp(`name\\s*=\\s*["']?${nom}["'\\s>/]`, "i").test(balise))
    .map(([balise]) => balise.match(/content\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)?.slice(1).find((v) => v !== undefined) ?? "");

// Adresses chargées ou suivies par la page : src, href, srcset, imagesrcset, poster, data, avec ou sans guillemets.
function adressesHtml(html) {
  const adresses = [];
  for (const m of sansCommentaires(html).matchAll(/\s(src|href|srcset|imagesrcset|poster|data)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    const valeur = m[2] ?? m[3] ?? m[4] ?? "";
    const liste = /srcset$/i.test(m[1]) ? valeur.split(",").map((v) => v.trim().split(/\s+/)[0]) : [valeur.trim()];
    for (const adresse of liste.filter(Boolean)) adresses.push({ attribut: m[1].toLowerCase(), adresse });
  }
  return adresses;
}

// fichiers : [{ chemin: "assets/index-x.js", contenu: "…" | null (binaire) }], chemins relatifs au dossier du build.
export function problemesBuildCompte({ html, fichiers, marques = [...MARQUES_INTERDITES_COMPTE, ...marquesJuridiques()] }) {
  const problemes = [];
  const page = sansCommentaires(html);
  if (scriptsIntegres(html).length > 0) problemes.push("index.html contient un script intégré : la CSP de compte (script-src 'self') le bloquerait");
  if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(page)) problemes.push("index.html contient un gestionnaire d'événement intégré (on…=) : la CSP de compte le bloquerait");
  if (/javascript\s*:/i.test(page)) problemes.push("index.html contient une adresse javascript: : la CSP de compte la bloquerait");
  if (/<style\b/i.test(page) || /\sstyle\s*=/i.test(page)) problemes.push("index.html contient un style intégré : la CSP de compte (style-src 'self') le bloquerait");
  if (/<meta\b[^>]*http-equiv\s*=\s*["']?refresh/i.test(page)) problemes.push("index.html contient une redirection <meta http-equiv=\"refresh\">");
  const referrers = metas(html, "referrer");
  if (referrers.length === 0 || referrers.some((r) => r.trim().toLowerCase() !== "no-referrer")) {
    problemes.push("index.html doit avoir <meta name=\"referrer\" content=\"no-referrer\">, et aucune autre balise referrer");
  }
  if (!metas(html, "robots").some((r) => /noindex/i.test(r))) problemes.push("index.html n'a pas de <meta name=\"robots\"> avec noindex");
  for (const { attribut, adresse } of adressesHtml(html)) {
    if (!adresse.startsWith("/assets/")) problemes.push(`index.html charge « ${adresse} » (${attribut}) hors de /assets/ du build`);
  }
  for (const { chemin, contenu } of fichiers) {
    if (chemin !== "index.html" && !chemin.startsWith("assets/")) problemes.push(`fichier inattendu dans le build compte : ${chemin}`);
    if (contenu === null) continue;
    const texte = retablir(contenu);
    for (const marque of marques) {
      if (texte.includes(marque)) problemes.push(`« ${marque} » trouvé dans ${chemin}`);
    }
  }
  return problemes;
}

export function problemesBuildVitrine({ html, fichiers }) {
  const problemes = [];
  for (const { donnees, empreinte } of scriptsIntegres(html)) {
    if (!donnees && !EMPREINTES_SCRIPTS_SITE.includes(empreinte)) {
      problemes.push(`index.html contient un script intégré (${empreinte}) que la CSP de restoclair.fr n'autorise pas : mettre à jour le user.conf du NAS et EMPREINTES_SCRIPTS_SITE`);
    }
  }
  if (!fichiers.some((f) => f.chemin === "legal/index.json")) problemes.push("legal/index.json est absent : l'API ne pourrait plus lire les documents juridiques");
  return problemes;
}

function lireBuild(dossier) {
  const fichiers = [];
  const parcourir = (relatif) => {
    for (const nom of readdirSync(path.join(dossier, relatif))) {
      const chemin = relatif ? `${relatif}/${nom}` : nom;
      if (statSync(path.join(dossier, chemin)).isDirectory()) parcourir(chemin);
      else fichiers.push({ chemin, contenu: EXTENSIONS_TEXTE.has(path.extname(nom).toLowerCase()) ? readFileSync(path.join(dossier, chemin), "utf8") : null });
    }
  };
  parcourir("");
  const html = fichiers.find((f) => f.chemin === "index.html")?.contenu;
  return { html, fichiers };
}

export function controler(build, dossier) {
  if (!existsSync(dossier) || !statSync(dossier).isDirectory()) return [`le dossier ${dossier} est absent : lancer le build d'abord`];
  const { html, fichiers } = lireBuild(dossier);
  if (html === undefined) return [`${dossier}/index.html est absent`];
  if (build === "compte") return problemesBuildCompte({ html, fichiers });
  if (build === "vitrine") return problemesBuildVitrine({ html, fichiers });
  return [`build inconnu : « ${build} » (vitrine ou compte)`];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [build, dossier] = process.argv.slice(2);
  const problemes = build && dossier ? controler(build, dossier) : ["usage : node scripts/controle-builds.mjs vitrine|compte <dossier>"];
  if (problemes.length > 0) {
    console.error([`Contrôle du build ${build ?? ""} (${dossier ?? ""}) : refusé.`, ...problemes.map((p) => `  - ${p}`)].join("\n"));
    process.exit(1);
  }
  console.log(`Contrôle du build ${build} (${dossier}) : correct.`);
}
