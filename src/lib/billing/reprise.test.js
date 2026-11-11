// Tests de la reprise d'une inscription non payée et de la définition du mot de passe : liens reçus par e-mail, réponses,
// appels (contrat des routes d'Apirest du 10/11), maquette. Aucun accès réseau.
import test from "node:test";
import assert from "node:assert/strict";

// config.js lit process.env sous node : à poser avant de charger api.js.
const API = "https://api.exemple.test/v1";
process.env.VITE_API_URL = API;
process.env.VITE_BILLING_MOCK = "false";
const {
  ApiError,
  annulerInscription,
  consommerLienReprise,
  definirMotDePasse,
  demanderLienReprise,
  lireDefinitionMotDePasse,
  lireReprise,
  lireVerificationMotDePasse,
  verifierLienMotDePasse,
} = await import("./api.js");
const { MESSAGE_INDISPONIBLE, MESSAGE_TROP_D_ESSAIS } = await import("./erreurs.js");
const { MOT_DE_PASSE_REFUSE, PREFIXE_JETON_MDP, PREFIXE_JETON_REPRISE, mockRequete } = await import("./mock.js");
const { pageSansTraceurs } = await import("../environnement.js");
const {
  CHEMIN_REPRISE,
  DUREE_LIEN_MINUTES,
  TEXTE_LIEN_INDISPONIBLE,
  annoncerReprise,
  issueAnnulation,
  issueDemande,
  issueEchange,
  lireJetonDuFragment,
  prendreAnnonceReprise,
  prendreEmailReprise,
  retenirEmailReprise,
  texteDemandeEnvoyee,
} = await import("./reprise.js");
const { CHEMIN_MOT_DE_PASSE, TEXTE_REGLE, heureEcheance, issueDefinition, issueVerification, validerMotDePasse } = await import("./motdepasse.js");

const json = (status, corps) => new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json" } });
const simulerFetch = (t, reponse) => t.mock.method(globalThis, "fetch", async () => reponse());

function simulerNavigateur(t) {
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
}

const CODE = "Q2Hn0x_vZ4kq9mW3rT8yB1cD5eF7gH2jK4lM6nP8qR0"; // 43 caractères, comme 32 octets en base64url

// --- Les liens ---

test("liens : le code se lit dans le fragment #jeton=, sous une forme stricte, rien d'autre", () => {
  assert.equal(lireJetonDuFragment(`#jeton=${CODE}`), CODE);
  assert.equal(lireJetonDuFragment(`jeton=${CODE}`), CODE);
  assert.equal(lireJetonDuFragment(`#autre=1&jeton=${CODE}`), CODE);
  for (const invalide of [undefined, null, "", "#", "#jeton=", "#jeton=court", `#jeton=${CODE}<script>`, `#jeton=${"a".repeat(129)}`, `#code=${CODE}`]) {
    assert.equal(lireJetonDuFragment(invalide), null, String(invalide));
  }
  // Les codes de la maquette ont la même forme que les vrais.
  assert.equal(lireJetonDuFragment(`#jeton=${PREFIXE_JETON_REPRISE}valide`), `${PREFIXE_JETON_REPRISE}valide`);
  assert.equal(lireJetonDuFragment(`#jeton=${PREFIXE_JETON_MDP}valide`), `${PREFIXE_JETON_MDP}valide`);
});

test("liens : ni la page de reprise ni celle du mot de passe ne chargent Google, même sur le site de production", () => {
  assert.equal(CHEMIN_REPRISE, "/abonnement/reprendre");
  assert.equal(CHEMIN_MOT_DE_PASSE, "/compte/mot-de-passe");
  assert.equal(pageSansTraceurs(CHEMIN_REPRISE), true);
  assert.equal(pageSansTraceurs(CHEMIN_MOT_DE_PASSE), true);
});

// --- Mémoire de module ---

test("adresse e-mail : passée en mémoire, lue une seule fois", () => {
  retenirEmailReprise("  marie@exemple.fr ");
  assert.equal(prendreEmailReprise(), "marie@exemple.fr");
  assert.equal(prendreEmailReprise(), "");
  retenirEmailReprise("");
  assert.equal(prendreEmailReprise(), "");
  retenirEmailReprise(undefined);
  assert.equal(prendreEmailReprise(), "");
});

test("annonce sur /tarifs après la reprise : le nom de l'établissement, lu une seule fois", () => {
  assert.equal(prendreAnnonceReprise(), null);
  annoncerReprise(" Chez Marie ");
  assert.deepEqual(prendreAnnonceReprise(), { restaurant: "Chez Marie" });
  assert.equal(prendreAnnonceReprise(), null);
  annoncerReprise("");
  assert.deepEqual(prendreAnnonceReprise(), { restaurant: null });
});

// --- Textes et issues de la reprise ---

test("demande envoyée : texte du contrat, le même pour toute adresse, sans dire si un compte existe", () => {
  const a = texteDemandeEnvoyee("inconnu@exemple.fr");
  const b = texteDemandeEnvoyee(" marie@exemple.fr ");
  assert.equal(b.email, "marie@exemple.fr");
  assert.equal(a.avant, b.avant);
  assert.equal(a.apres, b.apres);
  assert.equal(`${a.avant}X${a.apres}`, `Si une inscription en attente correspond à l’adresse X, un lien valable ${DUREE_LIEN_MINUTES} minutes vient d’y être envoyé. Pensez à regarder dans vos courriers indésirables.`);
  assert.doesNotMatch(`${a.avant}${a.apres}`, /n’existe pas|inconnu|introuvable/);
  assert.equal(TEXTE_LIEN_INDISPONIBLE, "Ce lien n’est plus valable : il a expiré, a déjà servi ou a été remplacé. Demandez un nouveau lien sur restoclair.fr ou contactez le support.");
});

test("demande : partie, trop d'essais, adresse refusée, panne", () => {
  assert.equal(issueDemande(null), null);
  assert.deepEqual(issueDemande(new ApiError("TROP_D_ESSAIS", 429)), { texte: MESSAGE_TROP_D_ESSAIS });
  assert.deepEqual(issueDemande(new ApiError("VALIDATION_ERROR", 400)), { champ: "email", texte: "Vérifiez votre adresse e-mail." });
  for (const panne of [new ApiError("RESEAU"), new ApiError("ERREUR_INCONNUE", 503)]) {
    assert.deepEqual(issueDemande(panne), { texte: MESSAGE_INDISPONIBLE, telephone: true });
  }
});

test("reprise : lien périmé, déjà actif ou payé, activation en cours, essai à refaire", () => {
  assert.deepEqual(issueEchange(new ApiError("LIEN_INDISPONIBLE", 410)), { type: "lien_indisponible" });
  assert.deepEqual(issueEchange(new ApiError("ERREUR_INCONNUE", 410)), { type: "lien_indisponible" });
  // Un autre refus : ce code ne servira plus, on en demande un autre.
  assert.deepEqual(issueEchange(new ApiError("VALIDATION_ERROR", 400)), { type: "lien_indisponible" });
  assert.deepEqual(issueEchange(new ApiError("ABONNEMENT_DEJA_ACTIF", 409)), { type: "deja_actif" });
  assert.deepEqual(issueEchange(new ApiError("INSCRIPTION_PAYEE", 409)), { type: "deja_actif" });
  const enCours = issueEchange(new ApiError("ABONNEMENT_DEJA_ACTIF", 409, { motif: "activation_en_cours" }));
  assert.equal(enCours.type, "activation_en_cours");
  assert.match(enCours.texte, /en cours de validation/);
  // 429 et panne : le même code peut resservir, le bouton reste.
  assert.deepEqual(issueEchange(new ApiError("TROP_D_ESSAIS", 429)), { type: "erreur", texte: MESSAGE_TROP_D_ESSAIS, garderBouton: true });
  for (const panne of [new ApiError("RESEAU"), new ApiError("ERREUR_INCONNUE", 502)]) {
    assert.deepEqual(issueEchange(panne), { type: "erreur", texte: MESSAGE_INDISPONIBLE, garderBouton: true, telephone: true });
  }
});

test("annulation : effacée, déjà payée (409 INSCRIPTION_PAYEE), lien périmé, essai à refaire", () => {
  assert.deepEqual(issueAnnulation(null), { type: "annulee" });
  assert.deepEqual(issueAnnulation(new ApiError("INSCRIPTION_PAYEE", 409)), { type: "payee" });
  assert.deepEqual(issueAnnulation(new ApiError("LIEN_INDISPONIBLE", 410)), { type: "lien_indisponible" });
  assert.deepEqual(issueAnnulation(new ApiError("VALIDATION_ERROR", 400)), { type: "lien_indisponible" });
  assert.deepEqual(issueAnnulation(new ApiError("TROP_D_ESSAIS", 429)), { type: "erreur", texte: MESSAGE_TROP_D_ESSAIS, garderBouton: true });
  assert.deepEqual(issueAnnulation(new ApiError("RESEAU")), { type: "erreur", texte: MESSAGE_INDISPONIBLE, garderBouton: true, telephone: true });
});

// --- Mot de passe ---

test("mot de passe : la règle de l'application (8 à 128 caractères, [a-z], [A-Z], [0-9]), et la confirmation", () => {
  assert.deepEqual(validerMotDePasse("Bonjour12", "Bonjour12"), {});
  // Les accents sont permis, mais ne remplacent pas une majuscule ou une minuscule sans accent.
  assert.deepEqual(validerMotDePasse("Éléphant9A", "Éléphant9A"), {});
  for (const refuse of ["bonjour12", "BONJOUR12", "Bonjourxx", "Bon12", "Éléphant9", "ÉCOLEÉ123"]) {
    assert.match(validerMotDePasse(refuse, refuse).motDePasse, /ne suit pas la règle/, refuse);
  }
  assert.match(validerMotDePasse("", "").motDePasse, /Choisissez/);
  assert.match(validerMotDePasse("", "").confirmation, /de nouveau/);
  const limite = `Aa1${"x".repeat(125)}`;
  assert.equal(limite.length, 128);
  assert.deepEqual(validerMotDePasse(limite, limite), {});
  assert.match(validerMotDePasse(`${limite}x`, "x").motDePasse, /128 caractères/);
  assert.match(validerMotDePasse("Bonjour12", "Bonjour13").confirmation, /pas identiques/);
  // Un mot de passe refusé porte seul l'erreur : la confirmation n'en ajoute pas une autre.
  assert.equal(validerMotDePasse("court", "autre").confirmation, undefined);
  assert.match(TEXTE_REGLE, /8 caractères/);
});

test("mot de passe : heure d'échéance du lien, en heure de Paris", () => {
  assert.equal(heureEcheance("2026-11-10T14:05:00Z"), "15:05");
  assert.equal(heureEcheance("2026-07-10T14:05:00Z"), "16:05");
  for (const illisible of [null, undefined, "", "demain"]) assert.equal(heureEcheance(illisible), null);
});

test("mot de passe : vérification et enregistrement, le lien survit à un refus de saisie", () => {
  assert.deepEqual(issueVerification(new ApiError("LIEN_INDISPONIBLE", 410)), { type: "lien_indisponible" });
  assert.deepEqual(issueVerification(new ApiError("TROP_D_ESSAIS", 429)), { type: "erreur", texte: MESSAGE_TROP_D_ESSAIS, reessayer: true });
  assert.deepEqual(issueVerification(new ApiError("RESEAU")), { type: "erreur", texte: MESSAGE_INDISPONIBLE, telephone: true, reessayer: true });
  assert.deepEqual(issueDefinition(new ApiError("LIEN_INDISPONIBLE", 410)), { type: "lien_indisponible" });
  const refuse = issueDefinition(new ApiError("VALIDATION_ERROR", 400));
  assert.equal(refuse.type, "refuse");
  assert.ok(refuse.texte.includes(TEXTE_REGLE));
  assert.deepEqual(issueDefinition(new ApiError("TROP_D_ESSAIS", 429)), { type: "erreur", texte: MESSAGE_TROP_D_ESSAIS });
  assert.deepEqual(issueDefinition(new ApiError("ERREUR_INCONNUE", 500)), { type: "erreur", texte: MESSAGE_INDISPONIBLE, telephone: true });
});

// --- Appels ---

test("appels : routes du contrat, POST JSON sans jeton ni cookie, le code dans le corps et jamais dans l'URL", async (t) => {
  const reponses = [
    json(200, { message: "ok" }),
    json(200, { token: "jeton-2h", restaurantId: "r1", userId: "u1", expireLe: "2026-11-10T16:00:00Z", restaurant: { nom: "Chez Marie" }, creeLe: "2026-11-09T10:00:00Z" }),
    json(200, { annulee: true }),
    json(200, { emailMasque: "m***@exemple.fr", expireLe: "2026-11-10T15:00:00Z" }),
    json(200, { defini: true, email: "marie@exemple.fr" }),
  ];
  const faux = simulerFetch(t, () => reponses.shift());
  assert.equal(await demanderLienReprise("marie@exemple.fr"), undefined);
  assert.deepEqual(await consommerLienReprise(CODE), { token: "jeton-2h", restaurant: "Chez Marie", email: "" });
  assert.equal(await annulerInscription(CODE), undefined);
  assert.deepEqual(await verifierLienMotDePasse(CODE), { emailMasque: "m***@exemple.fr", expireLe: "2026-11-10T15:00:00Z" });
  assert.deepEqual(await definirMotDePasse(CODE, "Bonjour12"), { email: "marie@exemple.fr" });

  const appels = faux.mock.calls.map((c) => c.arguments);
  assert.deepEqual(
    appels.map(([url]) => url.slice(API.length)),
    ["/api/billing/reprise", "/api/billing/reprise/consommer", "/api/billing/reprise/annuler", "/api/billing/mot-de-passe/verifier", "/api/billing/mot-de-passe/definir"]
  );
  for (const [url, options] of appels) {
    assert.equal(options.method, "POST");
    assert.equal(options.credentials, "omit");
    assert.deepEqual(options.headers, { "Content-Type": "application/json", "X-Client-Type": "web" });
    assert.ok(!url.includes(CODE));
  }
  assert.deepEqual(appels.map(([, o]) => JSON.parse(o.body)), [
    { email: "marie@exemple.fr" },
    { jeton: CODE },
    { jeton: CODE },
    { jeton: CODE },
    { jeton: CODE, motDePasse: "Bonjour12" },
  ]);
});

test("appels : réponses illisibles ou incomplètes, 410 transmis tel quel", async (t) => {
  for (const invalide of [null, {}, { token: "" }, { data: { restaurant: { nom: "x" } } }]) {
    assert.throws(() => lireReprise(invalide), (e) => e.code === "REPRISE_SANS_JETON");
  }
  assert.deepEqual(lireReprise({ data: { token: " t ", restaurant: { nom: 3 } } }), { token: "t", restaurant: "", email: "" });
  assert.deepEqual(lireVerificationMotDePasse({}), { emailMasque: "", expireLe: null });
  for (const nonConfirme of [null, {}, { defini: "true" }, { defini: false, email: "x" }]) {
    assert.throws(() => lireDefinitionMotDePasse(nonConfirme), (e) => e.code === "DEFINITION_NON_CONFIRMEE");
  }
  simulerFetch(t, () => json(410, { code: "LIEN_INDISPONIBLE", message: "Lien indisponible" }));
  await assert.rejects(consommerLienReprise(CODE), (e) => e.code === "LIEN_INDISPONIBLE" && e.status === 410);
  await assert.rejects(definirMotDePasse(CODE, "Bonjour12"), (e) => e.code === "LIEN_INDISPONIBLE" && e.status === 410);
});

// --- Maquette ---

const reprise = (route, fin) => mockRequete("POST", `/api/billing/reprise/${route}`, { corps: { jeton: `${PREFIXE_JETON_REPRISE}${fin}` } });

test("maquette : la demande répond pareil pour toute adresse, sauf ses scénarios d'erreur", async (t) => {
  simulerNavigateur(t);
  const reponses = [];
  for (const email of ["marie@exemple.fr", "inconnu@exemple.fr", "existant@exemple.fr"]) {
    reponses.push(await mockRequete("POST", "/api/billing/reprise", { corps: { email } }));
  }
  assert.ok(reponses.every((r) => JSON.stringify(r) === JSON.stringify(reponses[0])));
  await assert.rejects(mockRequete("POST", "/api/billing/reprise", { corps: { email: "trop@exemple.fr" } }), (e) => e.status === 429);
  await assert.rejects(mockRequete("POST", "/api/billing/reprise", { corps: { email: "indispo@exemple.fr" } }), (e) => e.status === 503);
  await assert.rejects(mockRequete("POST", "/api/billing/reprise", { corps: { email: "validation@exemple.fr" } }), (e) => e.code === "VALIDATION_ERROR");
});

test("maquette : la reprise donne un jeton qui paie, puis le code ne sert plus ; les autres codes donnent leurs refus", async (t) => {
  simulerNavigateur(t);
  const fin = `valide-${t.name.length}`;
  const ok = await reprise("consommer", fin);
  assert.equal(ok.restaurant.nom, "Chez Marie");
  const cgv = { version: "0.2", sha256: "a".repeat(64) };
  const { url } = await mockRequete("POST", "/api/billing/checkout", { corps: { offre: "serenite", version: "mensuel", cgv }, token: ok.token });
  assert.match(url, /\/abonnement\/retour\?session_id=/);
  assert.deepEqual(issueEchange(await reprise("consommer", fin).catch((e) => e)), { type: "lien_indisponible" }, "code consommé");

  // Chaque refus de la maquette, puis l'issue que la page en tire.
  const attendu = {
    expire: ["lien_indisponible", undefined],
    utilise: ["lien_indisponible", undefined],
    actif: ["deja_actif", undefined],
    payee: ["deja_actif", undefined],
    activation: ["activation_en_cours", undefined],
    indispo: ["erreur", true],
    trop: ["erreur", true],
  };
  for (const [suffixe, [type, garderBouton]] of Object.entries(attendu)) {
    const erreur = await reprise("consommer", suffixe).then(() => null, (e) => e);
    assert.ok(erreur instanceof ApiError, suffixe);
    const issue = issueEchange(erreur);
    assert.equal(issue.type, type, suffixe);
    assert.equal(issue.garderBouton, garderBouton, suffixe);
  }
});

test("maquette : l'annulation efface l'inscription non payée, refuse une inscription payée, puis le code ne sert plus", async (t) => {
  simulerNavigateur(t);
  assert.deepEqual(issueAnnulation(await reprise("annuler", "a-annuler").then(() => null)), { type: "annulee" });
  assert.deepEqual(issueAnnulation(await reprise("annuler", "a-annuler").catch((e) => e)), { type: "lien_indisponible" });
  assert.deepEqual(issueAnnulation(await reprise("annuler", "payee").catch((e) => e)), { type: "payee" });
  assert.deepEqual(issueAnnulation(await reprise("annuler", "expire").catch((e) => e)), { type: "lien_indisponible" });
});

test("maquette : définition du mot de passe, un refus de saisie ne consomme pas le lien, une réussite si", async (t) => {
  simulerNavigateur(t);
  const jeton = `${PREFIXE_JETON_MDP}valide-${t.name.length}`;
  const mdp = (route, corps) => mockRequete("POST", `/api/billing/mot-de-passe/${route}`, { corps: { jeton, ...corps } });
  const lien = await mdp("verifier");
  assert.equal(lien.emailMasque, "m***@exemple.fr");
  assert.ok(heureEcheance(lien.expireLe));
  // Vérifier ne consomme rien.
  await mdp("verifier");
  assert.equal(issueDefinition(await mdp("definir", { motDePasse: MOT_DE_PASSE_REFUSE }).catch((e) => e)).type, "refuse");
  assert.deepEqual(await mdp("definir", { motDePasse: "Bonjour12" }), { defini: true, email: "marie@exemple.fr" });
  assert.deepEqual(issueVerification(await mdp("verifier").catch((e) => e)), { type: "lien_indisponible" });
  assert.deepEqual(issueDefinition(await mdp("definir", { motDePasse: "Bonjour12" }).catch((e) => e)), { type: "lien_indisponible" });
  for (const [suffixe, type] of [["expire", "lien_indisponible"], ["indispo", "erreur"], ["trop", "erreur"]]) {
    const erreur = await mockRequete("POST", "/api/billing/mot-de-passe/verifier", { corps: { jeton: `${PREFIXE_JETON_MDP}${suffixe}` } }).catch((e) => e);
    assert.equal(issueVerification(erreur).type, type, suffixe);
  }
});

test("abonnement déjà actif : connexion avec le mot de passe choisi grâce au lien, jamais d'identifiants (billing, 11/11)", async () => {
  const { TEXTE_DEJA_ACTIF } = await import("./reprise.js");
  assert.match(TEXTE_DEJA_ACTIF, /mot de passe choisi grâce au lien reçu par e-mail/);
  assert.match(TEXTE_DEJA_ACTIF, /« Mot de passe oublié » sur l’écran de connexion de l’application/);
  assert.doesNotMatch(TEXTE_DEJA_ACTIF, /identifiants/);
});
