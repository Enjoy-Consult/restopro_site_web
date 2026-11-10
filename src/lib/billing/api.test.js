// Tests de la couche d'appels, avec fetch simulé : aucun accès réseau.
import test from "node:test";
import assert from "node:assert/strict";
import { mockCatalogue } from "./mock.js";
import { formatPourcentage } from "./format.js";
import { calculer } from "./pricing.js";

// config.js lit process.env sous node : à poser avant de charger api.js.
const API = "https://api.exemple.test/v1";
process.env.VITE_API_URL = `${API}/`;
process.env.VITE_BILLING_MOCK = "false";
const {
  ApiError,
  getCatalogue,
  getCompte,
  inscrire,
  lancerCheckout,
  lireCatalogue,
  lireCheckout,
  lireCompte,
  lireErreur,
  lireInscription,
  lireRetryAfter,
  requete,
  urlDePaiement,
} = await import("./api.js");
const {
  MESSAGE_CATALOGUE_INVALIDE,
  MESSAGE_INDISPONIBLE,
  MESSAGE_INSCRIPTION_SANS_JETON,
  MESSAGE_REFUS_GENERIQUE,
  MESSAGE_TROP_D_ESSAIS,
  messageCatalogue,
  messageErreur,
} = await import("./erreurs.js");
const { BUSINESS } = await import("../business-info.js");

const json = (status, corps, enTetes = {}) =>
  new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json", ...enTetes } });

function simulerFetch(t, reponse) {
  return t.mock.method(globalThis, "fetch", async () => (typeof reponse === "function" ? reponse() : reponse));
}

const refuseAvec = (code, status = 0) => (e) => {
  assert.ok(e instanceof ApiError);
  assert.equal(e.code, code);
  assert.equal(e.status, status);
  return true;
};

// --- requete() ---

test("en-têtes : Content-Type et X-Client-Type sur chaque appel, rien d'autre sans jeton", async (t) => {
  const faux = simulerFetch(t, () => json(200, { ok: true }));
  assert.deepEqual(await requete("GET", "/api/billing/catalogue"), { ok: true });
  const [url, options] = faux.mock.calls[0].arguments;
  assert.equal(url, `${API}/api/billing/catalogue`);
  assert.equal(options.method, "GET");
  assert.equal(options.body, undefined);
  // Ce sont les en-têtes autorisés par le CORS d'Apirest (README) : un autre ferait échouer le précontrôle.
  assert.deepEqual(options.headers, { "Content-Type": "application/json", "X-Client-Type": "web" });
});

test("cookies : chaque appel à l'API part en credentials « omit », avec ou sans jeton", async (t) => {
  const faux = simulerFetch(t, () => json(200, { ok: true }));
  await requete("GET", "/api/billing/catalogue");
  await requete("POST", "/api/billing/checkout", { token: "jeton-abc", corps: {} });
  for (const appel of faux.mock.calls) assert.equal(appel.arguments[1].credentials, "omit");
});

test("Bearer : le jeton part dans Authorization, jamais dans l'URL ni dans le corps", async (t) => {
  const faux = simulerFetch(t, () => json(200, { url: "https://paiement.exemple.test/s/1" }));
  await requete("POST", "/api/billing/checkout", { token: "jeton-abc", corps: { offre: "expert" } });
  const [url, options] = faux.mock.calls[0].arguments;
  assert.equal(options.headers.Authorization, "Bearer jeton-abc");
  assert.equal(options.method, "POST");
  assert.equal(options.body, JSON.stringify({ offre: "expert" }));
  assert.ok(!url.includes("jeton-abc"));
  assert.ok(!options.body.includes("jeton-abc"));
});

test("délai : la requête est abandonnée à 15 s et devient une erreur réseau", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(globalThis, "fetch", (_url, { signal }) =>
    new Promise((_resoudre, rejeter) => {
      signal.addEventListener("abort", () => rejeter(new DOMException("Abandon", "AbortError")));
    })
  );
  let finie = false;
  const appel = requete("GET", "/api/billing/catalogue").finally(() => {
    finie = true;
  });
  appel.catch(() => {});
  t.mock.timers.tick(14999);
  await new Promise(setImmediate);
  assert.equal(finie, false);
  t.mock.timers.tick(1);
  await assert.rejects(appel, refuseAvec("RESEAU"));
});

test("délai : un corps qui n'arrive jamais est abandonné lui aussi", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(globalThis, "fetch", async (_url, { signal }) => ({
    ok: true,
    status: 200,
    json: () =>
      new Promise((_resoudre, rejeter) => {
        signal.addEventListener("abort", () => rejeter(new DOMException("Abandon", "AbortError")));
      }),
  }));
  const appel = requete("GET", "/api/billing/catalogue");
  appel.catch(() => {});
  await new Promise(setImmediate);
  t.mock.timers.tick(15000);
  await assert.rejects(appel, refuseAvec("RESEAU"));
});

test("réseau : fetch rejeté devient une erreur réseau, avec le message d'indisponibilité", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(requete("GET", "/api/billing/catalogue"), (e) => {
    assert.equal(e.code, "RESEAU");
    assert.equal(messageErreur(e), MESSAGE_INDISPONIBLE);
    return true;
  });
});

test("4xx et 503 : code, statut et détails du contrat", async (t) => {
  const details = [{ path: "responsable.email", code: "invalid_string", message: "E-mail invalide" }];
  const cas = [
    [400, { code: "VALIDATION_ERROR", message: "Données invalides", details }, details],
    [400, { code: "SIRET_INVALIDE", message: "SIRET invalide" }, null],
    [401, { code: "INVALID_TOKEN", message: "Jeton invalide" }, null],
    [409, { code: "EMAIL_DEJA_UTILISE", message: "Déjà utilisé" }, null],
    [422, { code: "ROLE_NON_AUTORISE_POUR_OFFRE", details: { categorie: "superviseur" } }, { categorie: "superviseur" }],
    [503, { code: "SERVICE_PAIEMENT_INDISPONIBLE", message: "Indisponible" }, null],
  ];
  for (const [status, corps, detail] of cas) {
    simulerFetch(t, () => json(status, corps));
    await assert.rejects(requete("POST", "/api/billing/inscription", { corps: {} }), (e) => {
      refuseAvec(corps.code, status)(e);
      assert.deepEqual(e.detail, detail);
      return true;
    });
    globalThis.fetch.mock.restore();
  }
});

test("429 sans code : erreur connue, message de trop d'essais, distinct de la panne", async (t) => {
  simulerFetch(t, () => json(429, { message: "Trop de requêtes", retryAfter: 900 }, { "Retry-After": "900" }));
  await assert.rejects(requete("POST", "/api/billing/inscription", { corps: {} }), (e) => {
    refuseAvec("TROP_D_ESSAIS", 429)(e);
    assert.equal(messageErreur(e), MESSAGE_TROP_D_ESSAIS);
    assert.equal(messageCatalogue(e), MESSAGE_TROP_D_ESSAIS);
    assert.notEqual(messageErreur(e), MESSAGE_INDISPONIBLE);
    return true;
  });
  assert.match(MESSAGE_TROP_D_ESSAIS, /trop d’essais/i);
  assert.match(MESSAGE_TROP_D_ESSAIS, /plus tard/);
});

test("corps illisible : pas d'exception de lecture, le statut décide", async (t) => {
  simulerFetch(t, () => new Response("<html>Passerelle</html>", { status: 200 }));
  assert.equal(await requete("GET", "/api/billing/catalogue"), null);
  globalThis.fetch.mock.restore();

  simulerFetch(t, () => new Response("<html>Passerelle</html>", { status: 502 }));
  await assert.rejects(requete("GET", "/api/billing/catalogue"), (e) => {
    refuseAvec("ERREUR_INCONNUE", 502)(e);
    assert.equal(messageErreur(e), MESSAGE_INDISPONIBLE);
    return true;
  });
  globalThis.fetch.mock.restore();

  simulerFetch(t, () => new Response("", { status: 429 }));
  await assert.rejects(requete("GET", "/api/billing/catalogue"), refuseAvec("TROP_D_ESSAIS", 429));
});

test("429 : l'attente demandée vient de l'en-tête, sinon du corps (en-tête masqué par le CORS)", async (t) => {
  const attente = async (reponse) => {
    simulerFetch(t, () => reponse);
    const e = await requete("GET", "/api/billing/compte", { token: "jeton" }).catch((erreur) => erreur);
    globalThis.fetch.mock.restore();
    assert.equal(e.status, 429);
    return e.retryAfterMs;
  };
  assert.equal(await attente(json(429, { retryAfter: 900 }, { "Retry-After": "30" })), 30000);
  assert.equal(await attente(json(429, { message: "Trop", retryAfter: 900 })), 900000);
  assert.equal(await attente(json(429, { data: { retryAfter: "12" } })), 12000);
  assert.equal(await attente(json(429, { message: "Trop" })), null);
  assert.equal(await attente(new Response("<html>", { status: 429 })), null);
});

test("seul un 429 porte une attente", async (t) => {
  simulerFetch(t, () => json(503, { code: "SERVICE_PAIEMENT_INDISPONIBLE", retryAfter: 60 }, { "Retry-After": "60" }));
  const e = await requete("GET", "/api/billing/compte").catch((erreur) => erreur);
  assert.equal(e.status, 503);
  assert.equal(e.retryAfterMs, null);
});

test("lireRetryAfter : secondes, date HTTP, valeurs illisibles", () => {
  const maintenant = Date.parse("2026-11-05T12:00:00Z");
  assert.equal(lireRetryAfter("120", null, maintenant), 120000);
  assert.equal(lireRetryAfter(" 1.5 ", null, maintenant), 1500);
  assert.equal(lireRetryAfter("Thu, 05 Nov 2026 12:00:30 GMT", null, maintenant), 30000);
  assert.equal(lireRetryAfter("Thu, 05 Nov 2026 11:00:00 GMT", null, maintenant), 0, "date passée : rien à attendre");
  assert.equal(lireRetryAfter(null, 45, maintenant), 45000);
  assert.equal(lireRetryAfter("bientôt", 45, maintenant), 45000);
  for (const illisible of [undefined, null, "", "   ", "bientôt", -5, NaN, Infinity, {}, true]) {
    assert.equal(lireRetryAfter(illisible, illisible, maintenant), null);
  }
});

// --- lireErreur() ---

test("lireErreur : format d'Apirest, variantes et enveloppe", () => {
  const details = [{ path: "restaurant.adresse.codePostal", code: "too_small", message: "Trop court" }];
  assert.deepEqual(lireErreur({ code: "VALIDATION_ERROR", message: "x", details }), { code: "VALIDATION_ERROR", detail: details });
  assert.deepEqual(lireErreur({ error: { code: "SIRET_INVALIDE" } }), { code: "SIRET_INVALIDE", detail: null });
  assert.deepEqual(lireErreur({ erreur: { code: "NON_TITULAIRE", detail: { a: 1 } } }), { code: "NON_TITULAIRE", detail: { a: 1 } });
  assert.deepEqual(lireErreur({ error: "EMAIL_DEJA_UTILISE" }), { code: "EMAIL_DEJA_UTILISE", detail: null });
  assert.deepEqual(lireErreur({ data: { code: "OFFRE_INVALIDE", details: { b: 2 } } }), { code: "OFFRE_INVALIDE", detail: { b: 2 } });
  assert.deepEqual(lireErreur({ code: 500, error: { code: "CODE_VALIDE" } }), { code: "CODE_VALIDE", detail: null });
});

test("lireErreur : corps sans code ou illisible", () => {
  const vide = { code: null, detail: null };
  for (const corps of [null, undefined, "", "Erreur", 12, [], {}, { message: "Trop de requêtes", retryAfter: 900 }, { error: "Not Found" }, { code: "minuscule" }, { code: {} }]) {
    assert.deepEqual(lireErreur(corps), vide);
  }
});

// --- Lecture des quatre réponses ---

test("catalogue de la maquette : relu sans changement, avec et sans PMS", () => {
  assert.deepEqual(lireCatalogue(mockCatalogue(false)), mockCatalogue(false));
  assert.deepEqual(lireCatalogue(mockCatalogue(true)), mockCatalogue(true));
});

test("catalogue enveloppé dans { data }, sur le trajet complet", async (t) => {
  const faux = simulerFetch(t, () => json(200, { data: mockCatalogue(false) }));
  assert.deepEqual(await getCatalogue(), mockCatalogue(false));
  assert.equal(faux.mock.calls[0].arguments[0], `${API}/api/billing/catalogue`);
});

test("catalogue vide ou invalide : erreur connue, message distinct de la panne", async (t) => {
  const { offres: _o, ...sansOffres } = mockCatalogue(false);
  const { categories: _c, ...sansCategories } = mockCatalogue(false);
  const { modules: _m, ...sansModules } = mockCatalogue(false);
  const invalides = [
    null, undefined, "", "texte", 12, true, [], {}, { data: null }, { data: [] }, { data: {} },
    { offres: [] }, { offres: "x" }, { offres: [null, 1, "x", {}, []] },
    sansOffres, sansCategories, sansModules,
    { ...mockCatalogue(false), offres: [] },
    { ...mockCatalogue(false), categories: [{}] },
    { ...mockCatalogue(false), offres: mockCatalogue(false).offres.map((o) => ({ ...o, versions: [] })) },
  ];
  for (const corps of invalides) {
    assert.throws(() => lireCatalogue(corps), (e) => {
      refuseAvec("CATALOGUE_INVALIDE")(e);
      assert.equal(messageCatalogue(e), MESSAGE_CATALOGUE_INVALIDE);
      return true;
    });
  }
  assert.notEqual(MESSAGE_CATALOGUE_INVALIDE, MESSAGE_INDISPONIBLE);
  assert.equal(messageCatalogue(new ApiError("RESEAU")), null);

  simulerFetch(t, () => new Response("<html>", { status: 200 }));
  await assert.rejects(getCatalogue(), refuseAvec("CATALOGUE_INVALIDE"));
});

test("TVA absente ou illisible : jamais « undefined % », et le TTC reste juste", () => {
  const base = mockCatalogue(false);
  const { tvaPourcentage: _t, ...sansTva } = base;
  for (const tva of [undefined, null, "", "abc", -1, 500, {}, true]) {
    const lu = lireCatalogue(tva === undefined ? sansTva : { ...base, tvaPourcentage: tva });
    assert.equal(lu.tvaPourcentage, 20);
    assert.ok(!formatPourcentage(lu.tvaPourcentage).includes("undefined"));
    assert.equal(calculer(lu, { offre: "essentiel", version: "mensuel" }).totalTTCCentimes, 2399);
  }
  assert.equal(lireCatalogue({ ...base, tvaPourcentage: "20" }).tvaPourcentage, 20);
  assert.equal(lireCatalogue({ ...base, tvaPourcentage: 5.5 }).tvaPourcentage, 5.5);
});

test("catalogue : une offre incomplète est écartée, les autres restent", () => {
  const base = mockCatalogue(false);
  const avec = (changement) => lireCatalogue({ ...base, offres: [{ ...base.offres[0], ...changement }, base.offres[1]] }).offres.map((o) => o.cle);
  for (const changement of [
    { nom: "" },
    { comptesInclus: undefined },
    { comptesInclus: {} },
    { categoriesAutorisees: undefined },
    { modules: "x" },
    { fonctions: undefined },
    { fonctions: { ddpp: "peut-etre" } },
    { versions: [{ cle: "mensuel" }] },
    { versions: [{ ...base.offres[0].versions[0], prixBaseCentimes: "gratuit" }] },
    { versions: [{ ...base.offres[0].versions[0], prixBaseCentimes: 0 }] },
    { versions: [{ ...base.offres[0].versions[0], periode: "semaine" }] },
    { versions: [{ ...base.offres[0].versions[0], libelle: undefined }] },
  ]) {
    assert.deepEqual(avec(changement), ["serenite"]);
  }
});

test("catalogue : accès sur ordinateur lu tel quel, null s'il est absent ou illisible", () => {
  const base = mockCatalogue(false);
  const lu = (accesOrdinateur) => lireCatalogue({
    ...base,
    offres: [{ ...base.offres[0], fonctions: { ...base.offres[0].fonctions, accesOrdinateur } }],
  }).offres[0].fonctions.accesOrdinateur;
  assert.equal(lu(true), true);
  assert.equal(lu(false), false);
  for (const illisible of [undefined, null, "true", 1]) assert.equal(lu(illisible), null);
});

test("catalogue : lecture tolérante des champs secondaires", () => {
  const base = mockCatalogue(false);
  const version = base.offres[0].versions[0];
  const { options: _o, pms: _p, engagementMois: _e, prixCompteSupplementaireCentimes: _x, ...minimale } = version;
  const lu = lireCatalogue({
    ...base,
    pmsDisponible: "oui",
    offres: [{
      ...base.offres[0],
      modules: ["produits_dlc", "module_inconnu", 12],
      categoriesAutorisees: ["cuisinier", 12],
      versions: [{ ...minimale, prixBaseCentimes: "1999.00" }, { ...version, cle: "mensuel_engage" }],
    }],
  });
  assert.equal(lu.pmsDisponible, false);
  const [offre] = lu.offres;
  assert.deepEqual(offre.modules, ["produits_dlc"]);
  assert.deepEqual(offre.categoriesAutorisees, ["cuisinier"]);
  // Sans PMS, la version engagée disparaît dès la lecture.
  assert.deepEqual(offre.versions, [{ ...minimale, prixBaseCentimes: 1999, engagementMois: 0, pms: "non", prixCompteSupplementaireCentimes: {}, options: [] }]);

  const prix = lireCatalogue({
    ...base,
    offres: [{
      ...base.offres[2],
      versions: [{
        ...base.offres[2].versions[0],
        prixCompteSupplementaireCentimes: { cuisinier: "390", superviseur: "x", responsable: -1 },
        options: [null, { cle: "ddpp" }, { cle: "ddpp", libelle: "Assistance", prixCentimes: "1000" }],
        pms: "inconnu",
      }],
    }],
  }).offres[0].versions[0];
  assert.deepEqual(prix.prixCompteSupplementaireCentimes, { cuisinier: 390 });
  assert.deepEqual(prix.options, [{ cle: "ddpp", libelle: "Assistance", prixCentimes: 1000 }]);
  assert.equal(prix.pms, "non");
});

test("inscription : jeton lu, enveloppe comprise ; sans jeton, erreur explicite qui ne propose pas de recréer le compte", async (t) => {
  const corps = { token: "jeton", restaurantId: "r1", billingAccountId: "b1", userId: "u1" };
  assert.deepEqual(lireInscription(corps), corps);
  assert.deepEqual(lireInscription({ data: corps }), corps);
  for (const invalide of [null, "x", [], {}, { token: "" }, { token: "  " }, { token: 12 }, { data: {} }]) {
    assert.throws(() => lireInscription(invalide), refuseAvec("INSCRIPTION_SANS_JETON"));
  }
  const message = messageErreur(new ApiError("INSCRIPTION_SANS_JETON"));
  assert.equal(message, MESSAGE_INSCRIPTION_SANS_JETON);
  assert.ok(message.includes(BUSINESS.phone.display));

  const faux = simulerFetch(t, () => json(201, { data: corps }));
  assert.equal((await inscrire({ responsable: {} })).token, "jeton");
  assert.equal(faux.mock.calls[0].arguments[0], `${API}/api/billing/inscription`);
  globalThis.fetch.mock.restore();

  simulerFetch(t, () => json(201, { restaurantId: "r1" }));
  await assert.rejects(inscrire({ responsable: {} }), refuseAvec("INSCRIPTION_SANS_JETON"));
});

test("checkout : url lue, enveloppe comprise ; sans url, erreur explicite et message d'indisponibilité", async (t) => {
  assert.deepEqual(lireCheckout({ url: "https://paiement.exemple.test/s/1" }), { url: "https://paiement.exemple.test/s/1" });
  assert.deepEqual(lireCheckout({ data: { url: "https://paiement.exemple.test/s/1" } }), { url: "https://paiement.exemple.test/s/1" });
  for (const invalide of [null, "x", [], {}, { url: "" }, { url: 12 }, { url: null }, { data: {} }]) {
    assert.throws(() => lireCheckout(invalide), refuseAvec("CHECKOUT_SANS_URL"));
  }
  assert.equal(messageErreur(new ApiError("CHECKOUT_SANS_URL")), MESSAGE_INDISPONIBLE);

  const faux = simulerFetch(t, () => json(200, {}));
  await assert.rejects(lancerCheckout("jeton", { offre: "expert" }), refuseAvec("CHECKOUT_SANS_URL"));
  const [url, options] = faux.mock.calls[0].arguments;
  assert.equal(url, `${API}/api/billing/checkout`);
  assert.equal(options.headers.Authorization, "Bearer jeton");
});

test("compte : les six statuts du contrat ; sans statut connu, erreur explicite", async (t) => {
  for (const statut of ["sans_abonnement", "en_attente_paiement", "activation_provisoire", "actif", "impaye", "resilie"]) {
    assert.equal(lireCompte({ statut }).statut, statut);
    assert.equal(lireCompte({ data: { statut } }).statut, statut);
  }
  for (const invalide of [null, "x", [], {}, { statut: "" }, { statut: "inconnu" }, { statut: 1 }, { data: {} }]) {
    assert.throws(() => lireCompte(invalide), refuseAvec("COMPTE_SANS_STATUT"));
  }
  const faux = simulerFetch(t, () => json(200, { data: { statut: "actif", offre: "serenite" } }));
  assert.equal((await getCompte("jeton")).offre, "serenite");
  const [url, options] = faux.mock.calls[0].arguments;
  assert.equal(url, `${API}/api/billing/compte`);
  assert.equal(options.headers.Authorization, "Bearer jeton");
});

test("compte : offre et titulaire mal formés ne cassent pas l'affichage", () => {
  assert.deepEqual(lireCompte({ statut: "actif", offre: 12, titulaire: "Marie" }), { statut: "actif", offre: null, titulaire: null });
  assert.deepEqual(
    lireCompte({ statut: "actif", offre: "expert", titulaire: { nom: "Marie Martin", email: { a: 1 } } }),
    { statut: "actif", offre: "expert", titulaire: { nom: "Marie Martin", email: "" } }
  );
});

// --- Redirection vers le paiement ---

test("urlDePaiement : https valide seulement", () => {
  assert.equal(urlDePaiement("https://checkout.exemple.test/c/pay/cs_1#x"), "https://checkout.exemple.test/c/pay/cs_1#x");
  for (const url of [
    undefined, null, 12, {}, ["https://checkout.exemple.test"], "", "undefined", "/undefined", "/abonnement/retour",
    "//checkout.exemple.test", "http://checkout.exemple.test", "ftp://checkout.exemple.test", "https://",
    "javascript:alert(1)", "data:text/html,x",
  ]) {
    assert.equal(urlDePaiement(url), null);
  }
});

test("urlDePaiement : en maquette, seulement l'origine du site", () => {
  const origine = "http://localhost:5173";
  assert.equal(urlDePaiement(`${origine}/abonnement/retour?session_id=cs_test_maquette`, origine), `${origine}/abonnement/retour?session_id=cs_test_maquette`);
  assert.equal(urlDePaiement("https://checkout.exemple.test/s", origine), "https://checkout.exemple.test/s");
  assert.equal(urlDePaiement("http://autre.exemple.test/s", origine), null);
  assert.equal(urlDePaiement("/abonnement/retour", origine), null);
  assert.equal(urlDePaiement(`${origine}/abonnement/retour`, null), null);
  // L'origine de ces adresses vaut "null" : elle ne doit jamais ouvrir l'exception.
  assert.equal(urlDePaiement("javascript:alert(1)", "null"), null);
});

// --- Messages ---

test("messageErreur : refus conservés, le reste est une indisponibilité", () => {
  assert.equal(messageErreur(new ApiError("NON_TITULAIRE", 403)), "Seul le titulaire de l’abonnement peut effectuer cette action.");
  assert.equal(messageErreur(new ApiError("CODE_INCONNU", 403)), MESSAGE_REFUS_GENERIQUE);
  assert.equal(messageErreur(new ApiError("SERVICE_PAIEMENT_INDISPONIBLE", 503)), MESSAGE_INDISPONIBLE);
  assert.equal(messageErreur(new TypeError("autre")), MESSAGE_INDISPONIBLE);
});

test("messageErreur : un 4xx au code inconnu n'est pas présenté comme une panne", async () => {
  const { messageErreur, MESSAGE_INDISPONIBLE, MESSAGE_REFUS_GENERIQUE } = await import("./erreurs.js");
  assert.equal(messageErreur(new ApiError("CODE_INCONNU", 422)), MESSAGE_REFUS_GENERIQUE);
  assert.equal(messageErreur(new ApiError("CODE_INCONNU", 409)), MESSAGE_REFUS_GENERIQUE);
  assert.equal(messageErreur(new ApiError("CODE_INCONNU", 500)), MESSAGE_INDISPONIBLE);
  assert.equal(messageErreur(new ApiError("RESEAU", 0)), MESSAGE_INDISPONIBLE);
});
