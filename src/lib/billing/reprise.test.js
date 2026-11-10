// Tests de la reprise d'une inscription non payée : lien reçu par e-mail, réponses, appels, maquette. Aucun accès réseau.
import test from "node:test";
import assert from "node:assert/strict";

// config.js lit process.env sous node : à poser avant de charger api.js.
const API = "https://api.exemple.test/v1";
process.env.VITE_API_URL = API;
process.env.VITE_BILLING_MOCK = "false";
const { ApiError, demanderLienReprise, echangerLienReprise, lireReprise } = await import("./api.js");
const { MESSAGE_INDISPONIBLE, MESSAGE_TROP_D_ESSAIS } = await import("./erreurs.js");
const { mockRequete, PREFIXE_JETON_REPRISE } = await import("./mock.js");
const { pageSansTraceurs } = await import("../environnement.js");
const {
  CHEMIN_REPRISE,
  DUREE_LIEN_MINUTES,
  TEXTE_LIEN_INDISPONIBLE,
  annoncerReprise,
  issueDemande,
  issueEchange,
  lireJetonDuFragment,
  prendreAnnonceReprise,
  prendreEmailReprise,
  retenirEmailReprise,
  texteDemandeEnvoyee,
} = await import("./reprise.js");

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

// --- Le lien ---

test("lien : le code se lit dans le fragment #jeton=, sous une forme stricte, rien d'autre", () => {
  assert.equal(lireJetonDuFragment(`#jeton=${CODE}`), CODE);
  assert.equal(lireJetonDuFragment(`jeton=${CODE}`), CODE);
  assert.equal(lireJetonDuFragment(`#autre=1&jeton=${CODE}`), CODE);
  for (const invalide of [undefined, null, "", "#", "#jeton=", "#jeton=court", `#jeton=${CODE}<script>`, `#jeton=${"a".repeat(129)}`, `#code=${CODE}`]) {
    assert.equal(lireJetonDuFragment(invalide), null, String(invalide));
  }
  // Les codes de la maquette ont la même forme que les vrais.
  assert.equal(lireJetonDuFragment(`#jeton=${PREFIXE_JETON_REPRISE}valide`), `${PREFIXE_JETON_REPRISE}valide`);
});

test("lien : la page de reprise ne charge jamais Google, même sur le site de production", () => {
  assert.equal(CHEMIN_REPRISE, "/abonnement/reprendre");
  assert.equal(pageSansTraceurs(CHEMIN_REPRISE), true);
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

test("annonce sur /tarifs après l'échange : lue une seule fois", () => {
  assert.equal(prendreAnnonceReprise(), null);
  annoncerReprise("marie@exemple.fr");
  assert.deepEqual(prendreAnnonceReprise(), { email: "marie@exemple.fr" });
  assert.equal(prendreAnnonceReprise(), null);
  annoncerReprise("");
  assert.deepEqual(prendreAnnonceReprise(), { email: null });
});

// --- Textes et issues ---

test("demande envoyée : même texte pour toute adresse, sans dire si un compte existe", () => {
  const a = texteDemandeEnvoyee("inconnu@exemple.fr");
  const b = texteDemandeEnvoyee(" marie@exemple.fr ");
  assert.equal(b.email, "marie@exemple.fr");
  assert.equal(a.avant, b.avant);
  assert.equal(a.apres, b.apres);
  assert.match(a.avant, /^Si un compte RestOclair existe/);
  assert.ok(a.apres.includes(`${DUREE_LIEN_MINUTES} minutes`));
  assert.match(a.apres, /courriers indésirables/);
  assert.doesNotMatch(`${a.avant}${a.apres}`, /n’existe pas|inconnu|introuvable/);
  assert.ok(TEXTE_LIEN_INDISPONIBLE.includes(`${DUREE_LIEN_MINUTES} minutes`));
});

test("demande : partie, trop d'essais, adresse refusée, panne", () => {
  assert.equal(issueDemande(null), null);
  assert.deepEqual(issueDemande(new ApiError("TROP_D_ESSAIS", 429)), { texte: MESSAGE_TROP_D_ESSAIS });
  assert.deepEqual(issueDemande(new ApiError("VALIDATION_ERROR", 400)), { champ: "email", texte: "Vérifiez votre adresse e-mail." });
  for (const panne of [new ApiError("RESEAU"), new ApiError("ERREUR_INCONNUE", 503)]) {
    assert.deepEqual(issueDemande(panne), { texte: MESSAGE_INDISPONIBLE, telephone: true });
  }
});

test("échange : lien périmé, déjà actif, activation en cours, essai à refaire", () => {
  assert.deepEqual(issueEchange(new ApiError("LIEN_INDISPONIBLE", 410)), { type: "lien_indisponible" });
  assert.deepEqual(issueEchange(new ApiError("ERREUR_INCONNUE", 410)), { type: "lien_indisponible" });
  // Un autre refus : ce code ne servira plus, on en demande un autre.
  assert.deepEqual(issueEchange(new ApiError("VALIDATION_ERROR", 400)), { type: "lien_indisponible" });
  assert.deepEqual(issueEchange(new ApiError("ABONNEMENT_DEJA_ACTIF", 409)), { type: "deja_actif" });
  const enCours = issueEchange(new ApiError("ABONNEMENT_DEJA_ACTIF", 409, { motif: "activation_en_cours" }));
  assert.equal(enCours.type, "activation_en_cours");
  assert.match(enCours.texte, /en cours de validation/);
  // 429 et panne : le même code peut resservir, le bouton reste.
  assert.deepEqual(issueEchange(new ApiError("TROP_D_ESSAIS", 429)), { type: "erreur", texte: MESSAGE_TROP_D_ESSAIS, garderBouton: true });
  for (const panne of [new ApiError("RESEAU"), new ApiError("ERREUR_INCONNUE", 502)]) {
    assert.deepEqual(issueEchange(panne), { type: "erreur", texte: MESSAGE_INDISPONIBLE, garderBouton: true, telephone: true });
  }
});

// --- Appels ---

test("appels : demande et échange en POST JSON, sans jeton ni cookie, le code dans le corps et jamais dans l'URL", async (t) => {
  const faux = simulerFetch(t, () => json(200, { ok: true }));
  assert.equal(await demanderLienReprise("marie@exemple.fr"), undefined);
  faux.mock.mockImplementation(async () => json(200, { data: { token: "jeton-2h", email: "marie@exemple.fr" } }));
  assert.deepEqual(await echangerLienReprise(CODE), { token: "jeton-2h", email: "marie@exemple.fr" });

  const [[urlDemande, demande], [urlEchange, echange]] = faux.mock.calls.map((c) => c.arguments);
  assert.equal(urlDemande, `${API}/api/billing/reprise/demande`);
  assert.equal(urlEchange, `${API}/api/billing/reprise`);
  for (const options of [demande, echange]) {
    assert.equal(options.method, "POST");
    assert.equal(options.credentials, "omit");
    assert.deepEqual(options.headers, { "Content-Type": "application/json", "X-Client-Type": "web" });
  }
  assert.deepEqual(JSON.parse(demande.body), { email: "marie@exemple.fr" });
  assert.deepEqual(JSON.parse(echange.body), { jeton: CODE });
  assert.ok(!urlEchange.includes(CODE));
});

test("appels : échange sans jeton lisible, erreur explicite ; 410 transmis tel quel", async (t) => {
  for (const invalide of [null, {}, { token: "" }, { data: { email: "x" } }]) {
    assert.throws(() => lireReprise(invalide), (e) => e.code === "REPRISE_SANS_JETON");
  }
  assert.deepEqual(lireReprise({ token: " t ", email: 3 }), { token: "t", email: "" });
  simulerFetch(t, () => json(410, { code: "LIEN_INDISPONIBLE", message: "Lien indisponible" }));
  await assert.rejects(echangerLienReprise(CODE), (e) => e.code === "LIEN_INDISPONIBLE" && e.status === 410);
});

// --- Maquette ---

test("maquette : la demande répond pareil pour toute adresse, sauf ses scénarios d'erreur", async (t) => {
  simulerNavigateur(t);
  for (const email of ["marie@exemple.fr", "inconnu@exemple.fr", "existant@exemple.fr"]) {
    assert.deepEqual(await mockRequete("POST", "/api/billing/reprise/demande", { corps: { email } }), { ok: true });
  }
  await assert.rejects(mockRequete("POST", "/api/billing/reprise/demande", { corps: { email: "trop@exemple.fr" } }), (e) => e.status === 429);
  await assert.rejects(mockRequete("POST", "/api/billing/reprise/demande", { corps: { email: "indispo@exemple.fr" } }), (e) => e.status === 503);
  await assert.rejects(mockRequete("POST", "/api/billing/reprise/demande", { corps: { email: "validation@exemple.fr" } }), (e) => e.code === "VALIDATION_ERROR");
});

test("maquette : le lien valable donne un jeton qui paie ; les autres codes donnent leurs refus", async (t) => {
  simulerNavigateur(t);
  const { token, email } = await mockRequete("POST", "/api/billing/reprise", { corps: { jeton: `${PREFIXE_JETON_REPRISE}valide` } });
  assert.equal(email, "marie@exemple.fr");
  const cgv = { version: "0.2", sha256: "a".repeat(64) };
  const { url } = await mockRequete("POST", "/api/billing/checkout", { corps: { offre: "serenite", version: "mensuel", cgv }, token });
  assert.match(url, /\/abonnement\/retour\?session_id=/);

  // Chaque refus de la maquette, puis l'issue que la page en tire.
  const attendu = {
    expire: [(e) => e.code === "LIEN_INDISPONIBLE" && e.status === 410, "lien_indisponible", undefined],
    utilise: [(e) => e.code === "LIEN_INDISPONIBLE" && e.status === 410, "lien_indisponible", undefined],
    actif: [(e) => e.code === "ABONNEMENT_DEJA_ACTIF" && !e.detail, "deja_actif", undefined],
    activation: [(e) => e.code === "ABONNEMENT_DEJA_ACTIF" && e.detail?.motif === "activation_en_cours", "activation_en_cours", undefined],
    indispo: [(e) => e.status === 503, "erreur", true],
    trop: [(e) => e.status === 429, "erreur", true],
  };
  for (const [fin, [verifier, type, garderBouton]] of Object.entries(attendu)) {
    const requete = () => mockRequete("POST", "/api/billing/reprise", { corps: { jeton: `${PREFIXE_JETON_REPRISE}${fin}` } });
    await assert.rejects(requete(), verifier, fin);
    const issue = issueEchange(await requete().catch((e) => e));
    assert.equal(issue.type, type, fin);
    assert.equal(issue.garderBouton, garderBouton, fin);
  }
});
