// Tests du consentement aux cookies : `npm test` (node --test, sans dépendance).
import test from "node:test";
import assert from "node:assert/strict";
function fauxNavigateur(cookiesDepart = "_gcl_au=1.1.123; autre=ok") {
  const stockage = new Map();
  const scripts = [];
  let cookies = cookiesDepart;
  globalThis.window = {
    localStorage: {
      getItem: (c) => (stockage.has(c) ? stockage.get(c) : null),
      setItem: (c, v) => stockage.set(c, String(v)),
      removeItem: (c) => stockage.delete(c),
    },
    location: { hostname: "restoclair.fr" },
    dispatchEvent: () => true,
  };
  Object.defineProperty(globalThis.window.localStorage, "_gcl_ls", { value: "x", enumerable: true, configurable: true, writable: true });
  globalThis.document = {
    getElementById: (id) => scripts.find((s) => s.id === id) ?? null,
    createElement: () => ({}),
    head: { appendChild: (s) => scripts.push(s) },
    get cookie() { return cookies; },
    set cookie(v) {
      const [paire, ...attributs] = v.split(";");
      const nom = paire.split("=")[0].trim();
      if (attributs.some((a) => a.trim() === "Max-Age=0")) cookies = cookies.split("; ").filter((c) => !c.startsWith(`${nom}=`)).join("; ");
    },
  };
  return { stockage, scripts, cookies: () => cookies };
}

test("consentement : rien n'est chargé sans choix ; refus mémorisé sans charger Google", async () => {
  const nav = fauxNavigateur();
  const c = await import("./consentement.js");
  assert.equal(c.lireConsentement(), null);
  c.appliquerConsentement(c.lireConsentement());
  assert.equal(nav.scripts.length, 0);

  const { rechargement } = c.enregistrerConsentement(false, new Date("2026-11-03T10:00:00Z"));
  assert.equal(rechargement, false);
  assert.equal(nav.scripts.length, 0);
  assert.deepEqual(c.lireConsentement(Date.parse("2026-11-04T10:00:00Z")), { publicite: false, date: "2026-11-03T10:00:00.000Z" });
  assert.ok(!nav.cookies().includes("_gcl_au"));
  // Mode de consentement : tout reste refusé, analytics_storage compris.
  assert.deepEqual(c.signauxConsentement(false), { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" });
});

test("consentement : acceptation, puis retrait qui recharge la page ; choix périmé au bout de 6 mois", async () => {
  const nav = fauxNavigateur();
  const c = await import("./consentement.js");
  c.enregistrerConsentement(true, new Date("2026-11-03T10:00:00Z"));
  assert.equal(nav.scripts.length, 1);
  assert.equal(nav.scripts[0].src, "https://www.googletagmanager.com/gtm.js?id=GTM-MJ9BMVVK");
  assert.deepEqual(c.signauxConsentement(true), { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted", analytics_storage: "denied" });
  // Un second « oui » ne recharge pas GTM.
  c.enregistrerConsentement(true, new Date("2026-11-03T10:05:00Z"));
  assert.equal(nav.scripts.length, 1);
  // Retrait : GTM est déjà dans la page, il faut recharger ; les cookies _gcl sont effacés.
  assert.equal(c.enregistrerConsentement(false, new Date("2026-11-03T11:00:00Z")).rechargement, true);
  assert.ok(!nav.cookies().includes("_gcl_au"));
  assert.ok(nav.cookies().includes("autre=ok"));
  // 6 mois : valable à 179 jours, périmé à 181 jours.
  const debut = Date.parse("2026-11-03T11:00:00Z");
  assert.ok(c.lireConsentement(debut + 179 * 86400000));
  assert.equal(c.lireConsentement(debut + 181 * 86400000), null);
  // Données illisibles ou d'une autre version : on redemande.
  nav.stockage.set(c.CLE_CONSENTEMENT, "{pas du json");
  assert.equal(c.lireConsentement(debut), null);
  nav.stockage.set(c.CLE_CONSENTEMENT, JSON.stringify({ version: 99, publicite: true, date: "2026-11-03T11:00:00Z" }));
  assert.equal(c.lireConsentement(debut), null);
});

test("consentement : les anciens cookies _ga sont effacés au chargement, sans toucher aux autres", async () => {
  const nav = fauxNavigateur("_ga=GA1.1.1; _ga_Z0ZKBK12KB=GS2.1; _gcl_au=1.1.123; autre=ok");
  const c = await import("./consentement.js");
  c.appliquerConsentement(null);
  assert.equal(nav.cookies(), "_gcl_au=1.1.123; autre=ok");
  assert.equal(nav.scripts.length, 0);
});

test("consentement : un retrait impossible à écrire ne laisse pas revenir l'ancien accord au rechargement", async () => {
  const nav = fauxNavigateur();
  const c = await import("./consentement.js?ecriture=1");
  c.enregistrerConsentement(true, new Date("2026-11-03T10:00:00Z"));
  assert.equal(nav.scripts.length, 1);
  const stockageLocal = globalThis.window.localStorage;
  stockageLocal.setItem = () => { throw new Error("stockage plein"); };

  const { rechargement } = c.enregistrerConsentement(false, new Date("2026-11-03T11:00:00Z"));
  assert.equal(rechargement, true);
  assert.equal(nav.stockage.has(c.CLE_CONSENTEMENT), false);
  // Sur la page en cours, le choix le plus récent reste le refus.
  assert.equal(c.lireConsentement(Date.parse("2026-11-03T12:00:00Z")).publicite, false);

  // Après le rechargement (nouvelle page, mémoire vide) : aucun accord, donc rien de chargé, et la question revient.
  nav.scripts.length = 0;
  const recharge = await import("./consentement.js?ecriture=2");
  assert.equal(recharge.lireConsentement(Date.parse("2026-11-03T12:00:00Z")), null);
  recharge.appliquerConsentement(null);
  assert.equal(nav.scripts.length, 0);
});

test("consentement : si l'ancien accord ne peut pas être retiré non plus, la page n'est pas rechargée", async () => {
  const nav = fauxNavigateur();
  const c = await import("./consentement.js?ecriture=3");
  c.enregistrerConsentement(true, new Date("2026-11-03T10:00:00Z"));
  const stockageLocal = globalThis.window.localStorage;
  stockageLocal.setItem = () => { throw new Error("stockage plein"); };
  stockageLocal.removeItem = () => { throw new Error("stockage bloqué"); };

  // Recharger rétablirait l'accord : on reste sur la page, où tout est refusé.
  assert.equal(c.enregistrerConsentement(false, new Date("2026-11-03T11:00:00Z")).rechargement, false);
  assert.equal(nav.stockage.has(c.CLE_CONSENTEMENT), true);
  assert.equal(c.lireConsentement(Date.parse("2026-11-03T12:00:00Z")).publicite, false);
});
