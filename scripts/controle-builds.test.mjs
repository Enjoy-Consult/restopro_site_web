// Tests des contrôles après build : `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { controler, EMPREINTES_SCRIPTS_SITE, marquesJuridiques, problemesBuildCompte, problemesBuildVitrine, scriptsIntegres } from "./controle-builds.mjs";

const HTML_COMPTE = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="referrer" content="no-referrer" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Mon abonnement RestOclair</title>
    <script type="module" crossorigin src="/assets/index-abc.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-abc.css">
  </head>
  <body><div id="root"></div></body>
</html>`;
const FICHIERS_COMPTE = (html = HTML_COMPTE) => [
  { chemin: "index.html", contenu: html },
  { chemin: "assets/index-abc.js", contenu: "console.log('compte');onDoubleClick" },
  { chemin: "assets/index-abc.css", contenu: "body{color:#000}" },
  { chemin: "assets/img_6598-x.jpeg", contenu: null },
];
const compte = (html = HTML_COMPTE, fichiers = FICHIERS_COMPTE(html)) => problemesBuildCompte({ html, fichiers });

test("compte : un build conforme passe (onDoubleClick de React n'est pas doubleclick.net)", () => {
  assert.deepEqual(compte(), []);
});

test("compte : un script ou un style intégré est refusé (CSP sans empreinte ni unsafe-inline)", () => {
  assert.match(compte(HTML_COMPTE.replace("</head>", "<script>window.x=1</script></head>"))[0], /script intégré/);
  assert.match(compte(HTML_COMPTE.replace("</head>", '<script type="application/ld+json">{}</script></head>'))[0], /script intégré/);
  assert.match(compte(HTML_COMPTE.replace("</head>", "<style>body{}</style></head>"))[0], /style intégré/);
  assert.match(compte(HTML_COMPTE.replace('<div id="root">', '<div id="root" style="color:red">'))[0], /style intégré/);
});

test("compte : referrer et noindex obligatoires", () => {
  assert.match(compte(HTML_COMPTE.replace('content="no-referrer"', 'content="strict-origin-when-cross-origin"'))[0], /no-referrer/);
  assert.match(compte(HTML_COMPTE.replace('<meta name="referrer" content="no-referrer" />', ""))[0], /no-referrer/);
  assert.match(compte(HTML_COMPTE.replace("noindex, nofollow", "index, follow"))[0], /noindex/);
});

test("compte : tout ce que charge la page vient de /assets/ du build", () => {
  const externe = HTML_COMPTE.replace("</head>", '<link rel="icon" href="https://restoclair.fr/img_6598.jpeg"></head>');
  assert.match(compte(externe)[0], /hors de \/assets\//);
  const public_ = HTML_COMPTE.replace("</head>", '<link rel="icon" href="/img_6598.jpeg"></head>');
  assert.match(compte(public_)[0], /hors de \/assets\//);
});

test("compte : ni traceur, ni PHP du site, ni bandeau, ni texte juridique, ni fichier hors de /assets/", () => {
  for (const marque of ["https://www.googletagmanager.com/gtm.js", "googleads.g.doubleclick.net", "window.dataLayer", "api.airtable.com", "formsubmit.co", "images.unsplash.com", "/php-api/contact.php", "https://restoclair.fr/php-api", "restoclair_consentement"]) {
    const fichiers = [...FICHIERS_COMPTE(), { chemin: "assets/autre.js", contenu: `x("${marque}")` }];
    assert.equal(compte(HTML_COMPTE, fichiers).length, 1, marque);
  }
  for (const chemin of ["robots.txt", "legal/index.json", "legal/cgv/0.2.md", "img_6598.jpeg"]) {
    const fichiers = [...FICHIERS_COMPTE(), { chemin, contenu: chemin.endsWith(".jpeg") ? null : "{}" }];
    assert.match(compte(HTML_COMPTE, fichiers)[0], /fichier inattendu/, chemin);
  }
});

test("vitrine : le script du consentement de index.html est celui qu'autorise la CSP de restoclair.fr", () => {
  const html = readFileSync("index.html", "utf8");
  const executables = scriptsIntegres(html).filter((s) => !s.donnees);
  assert.equal(executables.length, 1);
  assert.ok(EMPREINTES_SCRIPTS_SITE.includes(executables[0].empreinte), `empreinte ${executables[0].empreinte} : mettre à jour le user.conf du NAS et EMPREINTES_SCRIPTS_SITE`);
  assert.deepEqual(problemesBuildVitrine({ html, fichiers: [{ chemin: "legal/index.json", contenu: "{}" }] }), []);
});

test("vitrine : un script intégré modifié est refusé, un bloc JSON-LD est ignoré, l'index juridique est exigé", () => {
  const html = readFileSync("index.html", "utf8");
  const fichiers = [{ chemin: "legal/index.json", contenu: "{}" }];
  const modifie = html.replace("ads_data_redaction', true", "ads_data_redaction', false");
  assert.notEqual(modifie, html);
  assert.match(problemesBuildVitrine({ html: modifie, fichiers })[0], /n'autorise pas/);
  assert.deepEqual(problemesBuildVitrine({ html: html.replace("</head>", '<script type="application/ld+json">{"a":1}</script></head>'), fichiers }), []);
  assert.match(problemesBuildVitrine({ html, fichiers: [] })[0], /legal\/index\.json est absent/);
});

test("vite.compte.config.js branche le garde-fou du compte : production refusée sans adresses, même en maquette ; test admis", async () => {
  const { resolveConfig } = await import("vite");
  const noms = ["VITE_BILLING_ACTIF", "VITE_BILLING_MOCK", "VITE_API_URL", "VITE_SITE_URL", "VITE_COMPTE_URL", "NODE_ENV"];
  const sauvegarde = Object.fromEntries(noms.map((nom) => [nom, process.env[nom]]));
  // Les variables du processus passent devant .env.local : le résultat ne dépend pas du poste. Sans VITE_BILLING_ACTIF :
  // le compte est contrôlé quand même.
  Object.assign(process.env, { VITE_BILLING_ACTIF: "", VITE_BILLING_MOCK: "false", VITE_API_URL: "", VITE_SITE_URL: "", VITE_COMPTE_URL: "" });
  const config = { configFile: "vite.compte.config.js", logLevel: "silent" };
  try {
    await assert.rejects(resolveConfig(config, "build", "production"), /Build de production du compte refusé[\s\S]*VITE_SITE_URL est vide[\s\S]*VITE_COMPTE_URL est vide/);
    await resolveConfig(config, "build", "test");
    await resolveConfig(config, "serve", "development");
    process.env.VITE_BILLING_MOCK = "true";
    await assert.rejects(resolveConfig(config, "build", "production"), /Build de production du compte refusé/);
  } finally {
    for (const nom of noms) {
      if (sauvegarde[nom] === undefined) delete process.env[nom];
      else process.env[nom] = sauvegarde[nom];
    }
  }
});

test("compte : gestionnaires on…=, javascript:, </script > avec espace et redirection meta sont refusés", () => {
  assert.match(compte(HTML_COMPTE.replace('<div id="root">', '<div id="root" onclick="x()">')).join(), /gestionnaire d'événement/);
  assert.match(compte(HTML_COMPTE.replace("</head>", '<img src="/assets/a.png" onerror="x()"></head>')).join(), /gestionnaire d'événement/);
  assert.match(compte(HTML_COMPTE.replace("</head>", '<a href="javascript:x()">x</a></head>')).join(), /javascript:/);
  assert.match(compte(HTML_COMPTE.replace("</head>", "<script>x()</script ></head>")).join(), /script intégré/);
  assert.match(compte(HTML_COMPTE.replace("</head>", '<meta http-equiv="refresh" content="0;url=https://exemple.fr"></head>')).join(), /refresh/);
});

test("compte : une meta referrer en commentaire ne compte pas, une seconde meta referrer est refusée", () => {
  const commentee = HTML_COMPTE.replace('<meta name="referrer" content="no-referrer" />', '<!-- <meta name="referrer" content="no-referrer" /> -->');
  assert.match(compte(commentee).join(), /no-referrer/);
  const doublee = HTML_COMPTE.replace("</head>", '<meta name="referrer" content="unsafe-url"></head>');
  assert.match(compte(doublee).join(), /aucune autre balise referrer/);
  const robotsCommentee = HTML_COMPTE.replace('<meta name="robots" content="noindex, nofollow" />', "<!-- noindex -->");
  assert.match(compte(robotsCommentee).join(), /noindex/);
});

test("compte : adresses sans guillemets, srcset et imagesrcset hors de /assets/ sont vues", () => {
  assert.match(compte(HTML_COMPTE.replace("</head>", "<link rel=icon href=https://exemple.fr/i.png></head>")).join(), /exemple\.fr/);
  assert.match(compte(HTML_COMPTE.replace("</head>", '<img srcset="/assets/a.png 1x, https://exemple.fr/b.png 2x"></head>')).join(), /exemple\.fr\/b\.png/);
  assert.match(compte(HTML_COMPTE.replace("</head>", '<link rel="preload" as="image" imagesrcset="/i.png 1x"></head>')).join(), /« \/i\.png »/);
});

test("compte : chaque texte juridique est repéré, même écrit en \\uXXXX par un minifieur", () => {
  const marques = marquesJuridiques();
  const documents = JSON.parse(readFileSync("src/content/legal/documents.json", "utf8"));
  for (const doc of documents) {
    for (const { version } of doc.versions) {
      const texte = readFileSync(`src/content/legal/${doc.document}/${version}.md`, "utf8");
      const fichiers = [...FICHIERS_COMPTE(), { chemin: "assets/legal.js", contenu: `const t=${JSON.stringify(texte)};` }];
      assert.ok(compte(HTML_COMPTE, fichiers).some((p) => /trouvé dans assets\/legal\.js/.test(p)), `${doc.document} ${version}`);
      const echappe = JSON.stringify(texte).replace(/[^\x00-\x7f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
      const fichiersEchappes = [...FICHIERS_COMPTE(), { chemin: "assets/legal.js", contenu: `const t=${echappe};` }];
      assert.ok(compte(HTML_COMPTE, fichiersEchappes).some((p) => /trouvé dans assets\/legal\.js/.test(p)), `${doc.document} ${version} (échappé)`);
    }
  }
  assert.ok(marques.length >= documents.length);
  // Les titres de documents.json (pied de page) ne sont pas des textes : ils passent.
  const titres = [...FICHIERS_COMPTE(), { chemin: "assets/titres.js", contenu: JSON.stringify(documents) }];
  assert.deepEqual(compte(HTML_COMPTE, titres), []);
});

test("contrôle d'un dossier absent : message clair, pas d'exception", () => {
  assert.deepEqual(controler("compte", "dossier-qui-n-existe-pas"), ["le dossier dossier-qui-n-existe-pas est absent : lancer le build d'abord"]);
});

test("aucun build ne contient la maquette de paiement (mock.js, jetons de scénario)", () => {
  const html = readFileSync("index.html", "utf8");
  const base = [{ chemin: "legal/index.json", contenu: "{}" }];
  assert.deepEqual(problemesBuildVitrine({ html, fichiers: base }), []);
  assert.match(problemesBuildVitrine({ html, fichiers: [...base, { chemin: "assets/mock-Bs8NBD2j.js", contenu: "x" }] }).join(), /fichier de la maquette/);
  assert.match(problemesBuildVitrine({ html, fichiers: [...base, { chemin: "assets/index-x.js", contenu: '"#jeton=maquette-reprise-valide"' }] }).join(), /maquette de paiement/);
  assert.match(compte(HTML_COMPTE, [...FICHIERS_COMPTE(), { chemin: "assets/x.js", contenu: "mockRequete()" }]).join(), /maquette de paiement/);
});
