// Tests des décisions du retour de paiement et de l'annulation, et des scénarios de la maquette.
import test from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "./errors.js";
import { mockRequete, reponseScenario } from "./mock.js";
import {
  DUREE_MAX_MS,
  INTERVALLE_MS,
  RALENTI_429_MS,
  TEXTE_DELAI,
  TEXTE_INVERIFIABLE,
  TEXTE_NON_CONFIRME,
  conclusionRetour,
  decisionAnnulation,
  decisionDepart,
  decisionRetour,
  estRetourStripe,
  TEXTE_EN_PLACE_SEPA,
  TEXTE_RIEN_RECU,
  phraseIdentifiants,
  planifierRetour,
} from "./retour.js";
import { EMAIL_SCENARIO, SCENARIOS, preparerScenario, scenarioDepuisQuery } from "./scenarios.js";
import { effacerSession, lireSession } from "./session.js";

const NON_CONFIRMES = ["sans_abonnement", "en_attente_paiement", "impaye", "resilie"];

// Déroule la page sur une horloge simulée : lire(n, t) rend { compte } ou { erreur } à la n-ième interrogation.
function derouler(lire, { depart = { jeton: true } } = {}) {
  let t = 0;
  let dernierStatut = depart.dernierStatut ?? null;
  const appels = [];
  let decision = decisionDepart(depart);
  while (decision.type !== "fin") {
    if (decision.type === "attendre") {
      t += decision.delaiMs;
      decision = decision.puis;
    } else {
      appels.push(t);
      const lecture = lire(appels.length, t);
      if (lecture.compte) dernierStatut = lecture.compte.statut;
      decision = decisionRetour({ ...lecture, dernierStatut, ecouleMs: t, retourStripe: depart.retourStripe });
    }
  }
  return { fin: decision, finMs: t, appels };
}

const statut = (s) => () => ({ compte: { statut: s } });

// --- a) et b) : jeton absent ou refusé ---

test("sans jeton : issue neutre, aucun appel, aucune attente", () => {
  const { fin, finMs, appels } = derouler(statut("actif"), { depart: { jeton: false } });
  assert.equal(fin.phase, "inverifiable");
  assert.equal(finMs, 0);
  assert.deepEqual(appels, []);
  assert.equal(
    TEXTE_INVERIFIABLE,
    "Nous ne pouvons pas vérifier votre abonnement depuis cette page. Si vous venez de payer, vous recevrez un e-mail de confirmation."
  );
});

test("401 : même issue tout de suite, jeton effacé, sans attente de 60 s", () => {
  const { fin, finMs, appels } = derouler(() => ({ erreur: new ApiError("INVALID_TOKEN", 401) }));
  assert.deepEqual(fin, { type: "fin", phase: "inverifiable", effacerJeton: true });
  assert.equal(finMs, 0);
  assert.equal(appels.length, 1);
});

test("401 après plusieurs lectures : pas d'attente jusqu'à la fin de la fenêtre", () => {
  const { fin, finMs } = derouler((n) => (n < 4 ? { compte: { statut: "en_attente_paiement" } } : { erreur: new ApiError("INVALID_TOKEN", 401) }));
  assert.equal(fin.phase, "inverifiable");
  assert.equal(finMs, 3 * INTERVALLE_MS);
});

// --- c) : statuts non confirmés, arrivée sans session_id ---

// Un impayé se règle sur la facture ouverte ; les autres statuts se reprennent par un paiement.
const issueNonConfirme = (s) => (s === "impaye" ? "impaye" : "non_confirme");

for (const s of NON_CONFIRMES) {
  test(`${s} stable, sans retour de Stripe : on interroge jusqu'à 60 s, puis issue claire, jeton conservé`, () => {
    const { fin, finMs, appels } = derouler(statut(s));
    assert.equal(fin.phase, issueNonConfirme(s));
    assert.equal(finMs, DUREE_MAX_MS, "ne conclut qu'à la fin de la fenêtre");
    assert.ok(!fin.effacerJeton, "le jeton sert à reprendre le paiement sans recréer le compte");
    assert.equal(appels.length, DUREE_MAX_MS / INTERVALLE_MS);
    assert.ok(appels.every((t) => t < DUREE_MAX_MS));
  });

  test(`${s} juste après Stripe, puis actif : pas de conclusion hâtive`, () => {
    const { fin, finMs } = derouler((n) => ({ compte: { statut: n < 4 ? s : "actif" } }));
    assert.equal(fin.phase, "actif");
    assert.equal(finMs, 3 * INTERVALLE_MS);
  });

  test(`${s} : le statut reste retenu si les lectures suivantes échouent`, () => {
    const { fin } = derouler((n) => (n === 1 ? { compte: { statut: s } } : { erreur: new ApiError("RESEAU") }));
    assert.equal(fin.phase, issueNonConfirme(s));
  });
}

// --- c bis) : retour de Stripe, la confirmation tarde ---

const RETOUR_STRIPE = { jeton: true, retourStripe: true };

test("retour de Stripe : session_id présent et non vide, quel que soit le reste de l'adresse", () => {
  assert.equal(estRetourStripe("?session_id=cs_test_a1"), true);
  assert.equal(estRetourStripe("?maquette=lent&session_id=cs_live_b2"), true);
  assert.equal(estRetourStripe(""), false);
  assert.equal(estRetourStripe("?session_id="), false);
  assert.equal(estRetourStripe("?maquette=en_attente_paiement"), false);
  assert.equal(estRetourStripe("?paiement=annule"), false);
});

for (const s of ["sans_abonnement", "en_attente_paiement"]) {
  test(`${s} stable après Stripe : à 60 s, délai et reprise du paiement, jeton conservé`, () => {
    const { fin, finMs, appels } = derouler(statut(s), { depart: RETOUR_STRIPE });
    assert.deepEqual(fin, { type: "fin", phase: "delai_reprise" });
    assert.equal(finMs, DUREE_MAX_MS);
    assert.equal(appels.length, DUREE_MAX_MS / INTERVALLE_MS);
  });

  test(`${s} après Stripe : le délai aussi si les lectures suivantes échouent ou sont freinées`, () => {
    const reseau = derouler((n) => (n === 1 ? { compte: { statut: s } } : { erreur: new ApiError("RESEAU") }), { depart: RETOUR_STRIPE });
    assert.equal(reseau.fin.phase, "delai_reprise");
    const freine = derouler((n) => (n === 1 ? { compte: { statut: s } } : { erreur: new ApiError("TROP_D_ESSAIS", 429, null, 120000) }), { depart: RETOUR_STRIPE });
    assert.equal(freine.fin.phase, "delai_reprise");
  });

  test(`${s} après Stripe : « Vérifier à nouveau » conclut pareil, Retry-After en cours ou fenêtre écoulée`, () => {
    const long = derouler(statut("actif"), { depart: { ...RETOUR_STRIPE, attenteMs: 90000, dernierStatut: s } });
    assert.deepEqual(long.appels, []);
    assert.equal(long.fin.phase, "delai_reprise");
    assert.deepEqual(planifierRetour(s, DUREE_MAX_MS, INTERVALLE_MS, true), { type: "fin", phase: "delai_reprise" });
  });
}

for (const s of ["impaye", "resilie"]) {
  test(`${s} après Stripe : reste une issue claire, pas une attente`, () => {
    const { fin, finMs } = derouler(statut(s), { depart: RETOUR_STRIPE });
    assert.equal(fin.phase, issueNonConfirme(s));
    assert.equal(finMs, DUREE_MAX_MS);
  });
}

test("après Stripe, la confirmation qui arrive l'emporte, même après la fenêtre", () => {
  const { fin, finMs } = derouler((n) => ({ compte: { statut: n < 4 ? "en_attente_paiement" : "actif" } }), { depart: RETOUR_STRIPE });
  assert.equal(fin.phase, "actif");
  assert.equal(finMs, 3 * INTERVALLE_MS);
  const tardif = { statut: "actif" };
  assert.equal(decisionRetour({ compte: tardif, dernierStatut: "en_attente_paiement", ecouleMs: DUREE_MAX_MS + 5000, retourStripe: true }).phase, "actif");
});

test("après Stripe : jeton absent ou refusé, même issue neutre", () => {
  assert.equal(derouler(statut("actif"), { depart: { jeton: false, retourStripe: true } }).fin.phase, "inverifiable");
  assert.equal(derouler(() => ({ erreur: new ApiError("INVALID_TOKEN", 401) }), { depart: RETOUR_STRIPE }).fin.phase, "inverifiable");
});

test("le texte des statuts non confirmés ne promet jamais d'e-mail", () => {
  assert.ok(!/e-?mail|courriel|recevrez/i.test(TEXTE_NON_CONFIRME));
  assert.match(TEXTE_NON_CONFIRME, /n’est pas confirmé à ce stade/);
});

test("une lecture tardive d'actif l'emporte même après la fenêtre", () => {
  const d = decisionRetour({ compte: { statut: "actif" }, dernierStatut: "impaye", ecouleMs: DUREE_MAX_MS + 5000 });
  assert.equal(d.phase, "actif");
});

test("la conclusion d'un statut inconnu ou absent reste le délai", () => {
  assert.equal(conclusionRetour(null).phase, "delai");
  assert.equal(conclusionRetour("statut_futur").phase, "delai");
  for (const s of NON_CONFIRMES) assert.equal(conclusionRetour(s).phase, issueNonConfirme(s));
});

// --- d) : succès ---

test("actif et activation provisoire : fin immédiate, jeton effacé, compte transmis", () => {
  const compte = { statut: "actif", titulaire: { email: "marie@exemple.fr" } };
  assert.deepEqual(decisionRetour({ compte }), { type: "fin", phase: "actif", compte, effacerJeton: true });
  const provisoire = { statut: "activation_provisoire" };
  assert.deepEqual(decisionRetour({ compte: provisoire }), { type: "fin", phase: "provisoire", compte: provisoire, effacerJeton: true });
});

test("phrase du succès : un lien pour choisir le mot de passe du titulaire, jamais d'identifiants, l'équipe à part, jamais de ZIP", () => {
  const avec = phraseIdentifiants("marie@exemple.fr");
  assert.equal(
    `${avec.avant}${avec.email}${avec.apres}`,
    "Vous allez recevoir à marie@exemple.fr un lien pour choisir votre mot de passe, valable 72 heures. Les identifiants de votre équipe arrivent dans un autre e-mail."
  );
  for (const manquant of [undefined, null, ""]) {
    const sans = phraseIdentifiants(manquant);
    assert.equal(sans.email, null);
    assert.equal(
      `${sans.avant}${sans.apres}`,
      "Vous allez recevoir par e-mail un lien pour choisir votre mot de passe, valable 72 heures. Les identifiants de votre équipe arrivent dans un autre e-mail."
    );
  }
  // Le titulaire ne reçoit jamais d'identifiants ni de mot de passe (réponse de billing du 11/11).
  for (const phrase of [avec, phraseIdentifiants(null)]) assert.ok(!/vos identifiants|mot de passe temporaire/i.test(`${phrase.avant}${phrase.apres}`));
  assert.ok(!JSON.stringify([avec, phraseIdentifiants(null)]).includes("ZIP"));
  assert.match(TEXTE_RIEN_RECU, /courriers indésirables/);
  // D'abord un nouveau lien (qui devient un lien dans la page), puis « Mot de passe oublié » dans l'application.
  assert.equal(TEXTE_RIEN_RECU.split("demandez un nouveau lien").length, 2);
  assert.ok(TEXTE_RIEN_RECU.indexOf("demandez un nouveau lien") < TEXTE_RIEN_RECU.indexOf("« Mot de passe oublié »"));
});

test("403 MUST_FINALIZE : les identifiants sont partis, issue réussie sans statut, jeton effacé", () => {
  const d = decisionRetour({ erreur: new ApiError("MUST_FINALIZE", 403) });
  assert.deepEqual(d, { type: "fin", phase: "en_place", effacerJeton: true });
  // Un autre 403 reste un refus.
  assert.equal(decisionRetour({ erreur: new ApiError("NON_TITULAIRE", 403) }).phase, "refus");
  assert.match(TEXTE_EN_PLACE_SEPA, /SEPA/);
});

// --- e) : délai dépassé et 429 ---

test("délai dépassé sans aucune lecture : texte de la mission, jeton conservé", () => {
  const { fin, finMs } = derouler(() => ({ erreur: new ApiError("RESEAU") }));
  assert.deepEqual(fin, { type: "fin", phase: "delai" });
  assert.equal(finMs, DUREE_MAX_MS);
  assert.equal(TEXTE_DELAI, "La confirmation prend plus de temps que prévu. Vous recevrez un e-mail dès que votre abonnement sera actif.");
});

test("429 : le Retry-After espace les appels", () => {
  const { appels, fin } = derouler(() => ({ erreur: new ApiError("TROP_D_ESSAIS", 429, null, 7000) }));
  assert.deepEqual(appels.slice(0, 3), [0, 7000, 14000]);
  assert.equal(fin.phase, "delai");
  assert.ok(appels.every((t, i) => i === 0 || t - appels[i - 1] >= 7000));
});

test("429 : un Retry-After plus long que la fenêtre ne provoque aucun nouvel appel", () => {
  const erreur = new ApiError("TROP_D_ESSAIS", 429, null, 120000);
  const { appels, finMs, fin } = derouler(() => ({ erreur }));
  assert.deepEqual(appels, [0]);
  assert.equal(finMs, DUREE_MAX_MS);
  assert.equal(fin.phase, "delai");
  assert.equal(decisionRetour({ erreur }).reprendreDansMs, 120000);
});

test("429 : jamais plus vite que l'intervalle normal, ralenti par défaut sans durée lisible", () => {
  assert.equal(decisionRetour({ erreur: new ApiError("TROP_D_ESSAIS", 429, null, 500) }).delaiMs, INTERVALLE_MS);
  assert.equal(decisionRetour({ erreur: new ApiError("TROP_D_ESSAIS", 429, null, 0) }).delaiMs, INTERVALLE_MS);
  const defaut = decisionRetour({ erreur: new ApiError("TROP_D_ESSAIS", 429) });
  assert.equal(defaut.delaiMs, RALENTI_429_MS);
  assert.equal(defaut.reprendreDansMs, RALENTI_429_MS);
  assert.ok(RALENTI_429_MS > INTERVALLE_MS);
});

test("429 puis statut non confirmé : pas de promesse d'e-mail à la fin de la fenêtre", () => {
  const { fin } = derouler((n) => (n === 1 ? { compte: { statut: "impaye" } } : { erreur: new ApiError("TROP_D_ESSAIS", 429, null, 5000) }));
  assert.equal(fin.phase, "impaye");
});

test("« Vérifier à nouveau » respecte le Retry-After déjà reçu et le dernier statut lu", () => {
  const d = decisionDepart({ jeton: true, attenteMs: 5000, dernierStatut: "impaye" });
  assert.equal(d.type, "attendre");
  assert.equal(d.delaiMs, 5000);
  assert.deepEqual(d.puis, { type: "interroger" });

  const long = derouler(statut("actif"), { depart: { jeton: true, attenteMs: 90000, dernierStatut: "impaye" } });
  assert.deepEqual(long.appels, []);
  assert.equal(long.fin.phase, "impaye");

  assert.deepEqual(decisionDepart({ jeton: true, attenteMs: -1000 }), { type: "interroger" });
  assert.deepEqual(decisionDepart({ jeton: true }), { type: "interroger" });
});

test("fenêtre déjà écoulée : conclusion immédiate, sans attente", () => {
  assert.deepEqual(planifierRetour(null, DUREE_MAX_MS), { type: "fin", phase: "delai" });
  assert.deepEqual(planifierRetour("impaye", DUREE_MAX_MS + 1), { type: "fin", phase: "impaye" });
  assert.deepEqual(planifierRetour("resilie", DUREE_MAX_MS + 1), { type: "fin", phase: "non_confirme" });
});

test("403 : le refus reçu s'affiche, le jeton reste", () => {
  const d = decisionRetour({ erreur: new ApiError("NON_TITULAIRE", 403) });
  assert.deepEqual(d, { type: "fin", phase: "refus", refus: "Seul le titulaire de l’abonnement peut effectuer cette action." });
});

// --- f) : annulation ---

test("annulation : rien hors annulation, message simple sans jeton", () => {
  assert.equal(decisionAnnulation({ annule: false, jeton: true, selection: null }), null);
  assert.deepEqual(decisionAnnulation({ annule: true, jeton: false, selection: null }), { type: "simple" });
  const selection = { offre: "serenite", version: "annuel", comptesSupplementaires: {}, options: { ddpp: false } };
  assert.deepEqual(decisionAnnulation({ annule: true, jeton: false, selection }), { type: "simple" });
});

test("annulation avec jeton : reprise vers /inscription seulement si le choix est connu", () => {
  const selection = { offre: "serenite", version: "annuel", comptesSupplementaires: { cuisinier: 2 }, options: { ddpp: false } };
  const avec = decisionAnnulation({ annule: true, jeton: true, selection });
  assert.equal(avec.type, "reprendre");
  assert.equal(avec.cible, "/inscription?offre=serenite&version=annuel&comptes=cuisinier%3A2");
  // Cas normal du retour de Stripe : aucun paramètre, donc pas de lien qui rebondirait sur /tarifs.
  assert.deepEqual(decisionAnnulation({ annule: true, jeton: true, selection: null }), { type: "choisir" });
});

// --- g) : scénarios de la maquette ---

test("scénarios : ignorés hors du serveur de développement", () => {
  assert.equal(scenarioDepuisQuery("?maquette=impaye"), null);
  assert.equal(scenarioDepuisQuery("?maquette=impaye", false), null);
  assert.equal(scenarioDepuisQuery("?maquette=impaye", true), "impaye");
  assert.equal(scenarioDepuisQuery("?maquette=inconnu", true), null);
  assert.equal(scenarioDepuisQuery("?maquette=constructor", true), null);
  assert.equal(scenarioDepuisQuery("", true), null);

  effacerSession();
  preparerScenario("?maquette=impaye");
  assert.equal(lireSession(), null, "aucune session posée par défaut");
});

test("BILLING_MOCK_DEV : faux sans le vrai booléen DEV de Vite, même avec la maquette", async () => {
  process.env.VITE_BILLING_MOCK = "true";
  process.env.DEV = "true"; // process.env ne contient que des chaînes : un build pose DEV à false
  try {
    const config = await import("./config.js?maquette-sans-dev");
    assert.equal(config.BILLING_MOCK, true);
    assert.equal(config.BILLING_MOCK_DEV, false);
  } finally {
    delete process.env.VITE_BILLING_MOCK;
    delete process.env.DEV;
  }
});

test("scénarios : la session posée porte le scénario, sans_jeton l'efface", () => {
  preparerScenario("?maquette=impaye", true);
  assert.deepEqual(lireSession(), { token: "maquette-impaye", email: EMAIL_SCENARIO });
  preparerScenario("?maquette=sans_jeton", true);
  assert.equal(lireSession(), null);
});

test("scénarios : chaque statut du contrat et leurs variantes", () => {
  for (const s of [...NON_CONFIRMES, "actif", "activation_provisoire"]) {
    assert.ok(SCENARIOS.includes(s));
    assert.equal(reponseScenario(s, 1).statut, s);
  }
  assert.equal(reponseScenario("actif", 1).titulaire.email, EMAIL_SCENARIO);
  assert.equal(reponseScenario("actif_sans_email", 1).titulaire, null);
  assert.equal(reponseScenario("attente_puis_actif", 2).statut, "en_attente_paiement");
  assert.equal(reponseScenario("attente_puis_actif", 3).statut, "actif");
});

test("scénarios : 401 et 429 comme l'API réelle", () => {
  assert.throws(() => reponseScenario("401", 1), (e) => e.status === 401 && e.code === "INVALID_TOKEN");
  assert.throws(() => reponseScenario("429", 9), (e) => e.status === 429 && e.retryAfterMs === 5000);
  assert.throws(() => reponseScenario("429_puis_actif", 2), (e) => e.status === 429);
  assert.equal(reponseScenario("429_puis_actif", 3).statut, "actif");
});

test("scénarios : le jeton de maquette n'ouvre rien hors développement", async () => {
  const compte = { token: "maquette-impaye" };
  await assert.rejects(mockRequete("GET", "/api/billing/compte", compte), (e) => e.status === 401);
  const lu = await mockRequete("GET", "/api/billing/compte", { ...compte, scenarios: true });
  assert.equal(lu.statut, "impaye");
});

test("maquette : lent@ revient de Stripe avec session_id, la confirmation n'arrive pas : délai et reprise", async (t) => {
  const donnees = new Map();
  globalThis.window = {
    location: { origin: "http://localhost:5173" },
    sessionStorage: {
      getItem: (cle) => donnees.get(cle) ?? null,
      setItem: (cle, valeur) => donnees.set(cle, valeur),
      removeItem: (cle) => donnees.delete(cle),
    },
  };
  t.after(() => {
    delete globalThis.window;
  });

  const cgv = { version: "0.1", sha256: "a".repeat(64) };
  const corps = { responsable: { email: "lent@exemple.fr", prenom: "Marie", nom: "Martin" }, restaurant: { siret: "73282932000074" }, cgv };
  const { token } = await mockRequete("POST", "/api/billing/inscription", { corps });
  const { url } = await mockRequete("POST", "/api/billing/checkout", { corps: { offre: "serenite", version: "mensuel", cgv }, token });
  const retourStripe = estRetourStripe(new URL(url).search);
  assert.equal(retourStripe, true);

  const compte = await mockRequete("GET", "/api/billing/compte", { token });
  assert.equal(compte.statut, "en_attente_paiement");
  assert.deepEqual(decisionRetour({ compte, dernierStatut: compte.statut, ecouleMs: DUREE_MAX_MS, retourStripe }), { type: "fin", phase: "delai_reprise" });
});

test("scénarios : du premier appel à l'issue, les statuts de la maquette suivent la décision", () => {
  const issue = (scenario, depart) => {
    const lire = (n) => {
      try {
        return { compte: reponseScenario(scenario, n) };
      } catch (erreur) {
        return { erreur };
      }
    };
    return derouler(lire, { depart }).fin.phase;
  };
  assert.equal(issue("actif"), "actif");
  assert.equal(issue("actif_sans_email"), "actif");
  assert.equal(issue("activation_provisoire"), "provisoire");
  assert.equal(issue("attente_puis_actif"), "actif");
  assert.equal(issue("429_puis_actif"), "actif");
  assert.equal(issue("401"), "inverifiable");
  assert.equal(issue("429"), "delai");
  for (const s of NON_CONFIRMES) assert.equal(issue(s), issueNonConfirme(s));
  // Même scénario, avec &session_id=x dans l'adresse.
  assert.equal(issue("en_attente_paiement", RETOUR_STRIPE), "delai_reprise");
  assert.equal(issue("sans_abonnement", RETOUR_STRIPE), "delai_reprise");
  assert.equal(issue("impaye", RETOUR_STRIPE), "impaye");
  assert.equal(issue("resilie", RETOUR_STRIPE), "non_confirme");
  assert.equal(issue("attente_puis_actif", RETOUR_STRIPE), "actif");
});

// --- garde serveur du double paiement et règlement d'un impayé ---

test("délai après Stripe : le texte reste conditionnel et propose de reprendre", async () => {
  const { TEXTE_DELAI_REPRISE, TEXTE_IMPAYE } = await import("./retour.js");
  assert.match(TEXTE_DELAI_REPRISE, /Si vous avez payé, vous recevrez un e-mail/);
  assert.match(TEXTE_DELAI_REPRISE, /vous pouvez le reprendre/);
  assert.ok(!/e-?mail|recevrez/i.test(TEXTE_IMPAYE), "un impayé ne promet pas d'e-mail");
  assert.equal(TEXTE_IMPAYE, "Votre paiement n’a pas abouti. Réglez-le depuis votre espace abonnement : votre compte et vos données sont conservés.");
  // « espace abonnement » est le nom de l'espace du site, pas l'affirmation qu'un abonnement existe.
  assert.ok(!/abonnement/i.test(TEXTE_IMPAYE.replace("espace abonnement", "")), "neutre : après un premier prélèvement refusé, aucun abonnement n'est conclu");
});

test("409 activation_en_cours : relecture du compte sans nouveau Checkout, jeton conservé", async () => {
  const { estActivationEnCoursRefus, traiterFinDeSession } = await import("./erreurs.js");
  const { ADRESSE_ACTIVATION_EN_COURS, estActivationEnCours, TEXTE_ACTIVATION_EN_COURS } = await import("./retour.js");
  const refus = new ApiError("ABONNEMENT_DEJA_ACTIF", 409, { motif: "activation_en_cours" });
  assert.equal(estActivationEnCoursRefus(refus), true);
  assert.equal(estActivationEnCoursRefus(new ApiError("ABONNEMENT_DEJA_ACTIF", 409)), false, "SEPA : 409 sans motif");
  assert.equal(estActivationEnCoursRefus(new ApiError("ABONNEMENT_DEJA_ACTIF", 409, { motif: "autre" })), false);
  assert.equal(estActivationEnCoursRefus(new ApiError("GERE_PAR_ABONNEMENT", 409, { motif: "activation_en_cours" })), false);

  const recherche = new URL(ADRESSE_ACTIVATION_EN_COURS, "https://restoclair.fr").search;
  assert.equal(estActivationEnCours(recherche), true);
  assert.equal(estRetourStripe(recherche), true);
  assert.equal(estActivationEnCours("?session_id=x"), false);
  assert.equal(TEXTE_ACTIVATION_EN_COURS, "Votre paiement est en cours de validation : votre abonnement sera actif dans quelques instants.");
  // Le traitement général efface le jeton : la page doit tester l'activation en cours avant lui.
  assert.equal(typeof traiterFinDeSession, "function");
  // Attente bornée, puis reprise si l'abonnement n'arrive pas.
  const { fin, finMs } = derouler(statut("en_attente_paiement"), { depart: { jeton: true, retourStripe: estRetourStripe(recherche) } });
  assert.equal(fin.phase, "delai_reprise");
  assert.equal(finMs, DUREE_MAX_MS);
  assert.ok(!fin.effacerJeton);
});
