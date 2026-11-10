// Essais de php-api/contact.php sous PHP WebAssembly, sans réseau ni Airtable : config.php est remplacé par un
// double qui capte ce qui partirait vers Airtable. Hors de npm test, car PHP WebAssembly pèse près de 500 Mo et
// n'est pas une dépendance du site. Usage, avec @php-wasm/node et @php-wasm/universal installés ailleurs :
//   PHP_WASM_DIR=/Volumes/T7/Developer/essais-php-restoclair node scripts/essais-php-contact.mjs
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const racine = process.env.PHP_WASM_DIR;
if (!racine) {
  console.error("PHP_WASM_DIR manquant : dossier où @php-wasm/node et @php-wasm/universal sont installés.");
  process.exit(2);
}
const exiger = createRequire(join(racine, "package.json"));
const charger = (nom) => import(pathToFileURL(exiger.resolve(nom)).href);
const { loadNodeRuntime } = await charger("@php-wasm/node");
const { PHP } = await charger("@php-wasm/universal");

const dossier = join(dirname(fileURLToPath(import.meta.url)), "..", "php-api");
const php = new PHP(await loadNodeRuntime("8.4", { emscriptenOptions: { processId: 1 } }));
php.mkdir("/www/php-api");
for (const f of ["contact.php", "securite.php"]) php.writeFile(`/www/php-api/${f}`, readFileSync(join(dossier, f)));
php.writeFile("/www/php-api/config.php", `<?php
define('AIRTABLE_BASE_ID', 'base_essai');
define('AIRTABLE_TOKEN', 'jeton_essai');
define('AIRTABLE_API_URL', 'https://exemple.invalid/v0/' . AIRTABLE_BASE_ID);
define('ALLOWED_ORIGINS', ['https://restoclair.fr', 'https://www.restoclair.fr']);
function setCorsHeaders() {
  header("Content-Type: application/json; charset=utf-8");
  if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
}
function airtableRequest($endpoint, $method = 'GET', $data = null) {
  file_put_contents('/tmp/capture.json', json_encode($data));
  return ['status' => 200, 'data' => ['records' => [['id' => 'rec_essai']]]];
}
`);

let ip = 0;
async function envoyer(corps) {
  try { php.unlink("/tmp/capture.json"); } catch {}
  ip += 1;
  const r = await php.run({
    scriptPath: "/www/php-api/contact.php",
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://restoclair.fr" },
    body: new TextEncoder().encode(JSON.stringify(corps)),
    $_SERVER: { REMOTE_ADDR: `10.0.0.${ip}`, HTTP_ORIGIN: "https://restoclair.fr", REQUEST_METHOD: "POST" },
  });
  let champs = null;
  try { champs = JSON.parse(php.readFileAsText("/tmp/capture.json")).records[0].fields; } catch {}
  return { statut: r.httpStatusCode, texte: r.text, champs };
}

const base = { name: "Marie Martin", email: "marie@exemple.fr", phone: "0612345678", message: "Bonjour" };
let echecs = 0;
function verifier(nom, condition, detail) {
  console.log(`${condition ? "ok  " : "ÉCHEC"} ${nom}${condition ? "" : " : " + JSON.stringify(detail)}`);
  if (!condition) echecs += 1;
}

// (1) Urgence déduite du sujet quand le formulaire n'envoie pas d'urgence (nouveau formulaire).
let r = await envoyer({ ...base, subject: "urgence" });
verifier("sujet urgence -> Urgent (contrôle en cours)", r.statut === 200 && r.champs?.Urgence === "Urgent (contrôle en cours)", r);
r = await envoyer({ ...base, subject: "urgence_ddpp" });
verifier("ancien sujet urgence_ddpp -> Urgent (contrôle en cours)", r.champs?.Urgence === "Urgent (contrôle en cours)", r);
r = await envoyer({ ...base, subject: "audit" });
verifier("sujet audit -> Normal", r.champs?.Urgence === "Normal", r);
r = await envoyer({ ...base, subject: "dossiers", urgency: "information" });
verifier("urgence envoyée explicitement : gardée", r.champs?.Urgence === "Simple renseignement", r);
r = await envoyer({ ...base });
verifier("sans sujet ni urgence : pas de champ Urgence", r.statut === 200 && r.champs && !("Urgence" in r.champs), r);

// (2) Champ « Nom de l'établissement », comme la version du serveur.
r = await envoyer({ ...base, subject: "audit", restaurant: "Chez Marie" });
verifier("restaurant -> Nom de l'établissement", r.champs?.["Nom de l'établissement"] === "Chez Marie", r);
verifier("restaurant -> Demande spécifique gardé", r.champs?.["Demande spécifique"] === "Chez Marie", r);
r = await envoyer({ ...base, subject: "audit", restaurant_name: "Ancien Nom" });
verifier("ancien champ restaurant_name -> Nom de l'établissement", r.champs?.["Nom de l'établissement"] === "Ancien Nom", r);
r = await envoyer({ ...base, subject: "audit" });
verifier("sans restaurant : pas de champ Nom de l'établissement", r.champs && !("Nom de l'établissement" in r.champs), r);

// Non-régression : libellés Airtable et refus.
r = await envoyer({ ...base, subject: "dossiers" });
verifier("sujet dossiers -> Accompagnement Administratif", r.champs?.["Raison de la prise de contact"] === "Accompagnement Administratif", r);
r = await envoyer({ ...base, subject: "inconnu" });
verifier("sujet inconnu refusé (422), rien envoyé", r.statut === 422 && r.champs === null, r);
r = await envoyer({ ...base, _honey: "robot" });
verifier("pot de miel : 200 sans envoi", r.statut === 200 && r.champs === null, r);

console.log(echecs ? `${echecs} échec(s)` : "tous les essais réussis");
process.exit(echecs ? 1 : 0);
