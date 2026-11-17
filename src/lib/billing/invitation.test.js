// Vente sur invitation (invitation.js) : sans l'invitation, le public voit le site sans la vente.
import test from "node:test";
import assert from "node:assert/strict";
import { CLE_INVITATION, PARAMETRE_INVITATION, arriveeParLienDeVente, decisionInvitation, venteVisible } from "./invitation.js";

function stockageEnMemoire() {
  const valeurs = new Map();
  return {
    valeurs,
    getItem: (cle) => (valeurs.has(cle) ? valeurs.get(cle) : null),
    setItem: (cle, valeur) => valeurs.set(cle, String(valeur)),
    removeItem: (cle) => valeurs.delete(cle),
  };
}

// Fausse fenêtre : adresse, historique (replaceState noté) et deux stockages.
function fenetre(adresse, { local = stockageEnMemoire(), session = stockageEnMemoire() } = {}) {
  const url = new URL(adresse);
  const remplacements = [];
  return {
    location: { href: url.href, pathname: url.pathname, search: url.search, hash: url.hash },
    history: { state: { idx: 0 }, replaceState: (etat, titre, cible) => remplacements.push({ etat, cible }) },
    localStorage: local,
    sessionStorage: session,
    remplacements,
  };
}

const INVITATION = { billingActif: true, surInvitation: true };

test("lecture du paramètre : demo ouvre, fin ferme, le reste ne dit rien", () => {
  assert.equal(PARAMETRE_INVITATION, "invitation-vente");
  assert.equal(decisionInvitation("?invitation-vente=demo"), "ouvrir");
  assert.equal(decisionInvitation("?a=1&invitation-vente=%20DEMO%20&b=2"), "ouvrir");
  assert.equal(decisionInvitation("?invitation-vente=fin"), "fermer");
  for (const search of ["", "?", "?invitation-vente=", "?invitation-vente=oui", "?invitation=demo", "?demo", null, undefined]) {
    assert.equal(decisionInvitation(search), null, String(search));
  }
});

test("lien recopié avec la ponctuation ou l'espace qui le suivait : toujours reconnu", () => {
  for (const valeur of ["demo.", "demo,", "demo;", "demo)", "demo!", "demo%20", "demo+", "%C2%ABdemo%C2%BB", "DEMO.", "demo...", "'demo'"]) {
    assert.equal(decisionInvitation(`?invitation-vente=${valeur}`), "ouvrir", valeur);
  }
  for (const valeur of ["fin.", "fin)", "FIN,"]) {
    assert.equal(decisionInvitation(`?invitation-vente=${valeur}`), "fermer", valeur);
  }
  // Seuls les bords sont nettoyés : un autre mot ne passe pas.
  for (const valeur of ["demonstration", "de.mo", "demo2", "xdemo", "demo-fin", "fini"]) {
    assert.equal(decisionInvitation(`?invitation-vente=${valeur}`), null, valeur);
  }
});

test("lien d'invitation suivi d'un point : visible, et le paramètre est retiré de l'adresse", () => {
  const f = fenetre("https://restoclair.fr/tarifs?invitation-vente=demo.");
  assert.equal(venteVisible({ ...INVITATION, fenetre: f }), true);
  assert.equal(f.localStorage.getItem(CLE_INVITATION), "1");
  assert.deepEqual(f.remplacements.map((r) => r.cible), ["/tarifs"]);
});

test("sans BILLING_ACTIF : jamais visible, même avec l'invitation, et rien n'est écrit ni retiré", () => {
  const f = fenetre("https://restoclair.fr/tarifs?invitation-vente=demo");
  assert.equal(venteVisible({ billingActif: false, surInvitation: true, fenetre: f }), false);
  assert.equal(venteVisible({ billingActif: false, surInvitation: false, fenetre: f }), false);
  assert.equal(f.localStorage.valeurs.size, 0);
  assert.equal(f.remplacements.length, 0);
});

test("BILLING_ACTIF sans invitation exigée : visible pour tous, comme avant, sans toucher à l'adresse", () => {
  const f = fenetre("https://restoclair.fr/tarifs?invitation-vente=fin");
  f.localStorage.setItem(CLE_INVITATION, "1");
  assert.equal(venteVisible({ billingActif: true, surInvitation: false, fenetre: f }), true);
  assert.equal(f.localStorage.getItem(CLE_INVITATION), "1");
  assert.equal(f.remplacements.length, 0);
  assert.equal(venteVisible({ billingActif: true, surInvitation: false, fenetre: undefined }), true);
});

test("invitation exigée : invisible pour un visiteur qui n'a jamais ouvert le lien", () => {
  for (const adresse of ["https://restoclair.fr/", "https://restoclair.fr/tarifs", "https://restoclair.fr/inscription?offre=expert&version=mensuel"]) {
    const f = fenetre(adresse);
    assert.equal(venteVisible({ ...INVITATION, fenetre: f }), false, adresse);
    assert.equal(f.remplacements.length, 0);
  }
});

test("lien d'invitation : visible, mémorisé dans localStorage, paramètre retiré de l'adresse (le reste est gardé)", () => {
  const local = stockageEnMemoire();
  const f = fenetre("https://restoclair.fr/tarifs?offre=expert&invitation-vente=demo#formules", { local });
  assert.equal(venteVisible({ ...INVITATION, fenetre: f }), true);
  assert.equal(local.getItem(CLE_INVITATION), "1");
  assert.deepEqual(f.remplacements, [{ etat: { idx: 0 }, cible: "/tarifs?offre=expert#formules" }]);
  assert.equal(f.sessionStorage.valeurs.size, 0);

  // Pages suivantes, retour de Stripe, autre onglet du même navigateur : sans paramètre, toujours visible.
  for (const adresse of ["https://restoclair.fr/", "https://restoclair.fr/abonnement/retour?session_id=cs_test_a1", "https://restoclair.fr/abonnement/reprendre#jeton=x"]) {
    const suivante = fenetre(adresse, { local });
    assert.equal(venteVisible({ ...INVITATION, fenetre: suivante }), true, adresse);
    assert.equal(suivante.remplacements.length, 0);
  }
});

test("?invitation-vente=fin : la vente disparaît de ce navigateur (les deux stockages sont vidés)", () => {
  const local = stockageEnMemoire();
  const session = stockageEnMemoire();
  local.setItem(CLE_INVITATION, "1");
  session.setItem(CLE_INVITATION, "1");
  const f = fenetre("https://restoclair.fr/?invitation-vente=fin", { local, session });
  assert.equal(venteVisible({ ...INVITATION, fenetre: f }), false);
  assert.equal(local.getItem(CLE_INVITATION), null);
  assert.equal(session.getItem(CLE_INVITATION), null);
  assert.deepEqual(f.remplacements.map((r) => r.cible), ["/"]);
  assert.equal(venteVisible({ ...INVITATION, fenetre: fenetre("https://restoclair.fr/tarifs", { local, session }) }), false);
});

test("localStorage refusé ou plein : sessionStorage prend le relais", () => {
  const session = stockageEnMemoire();
  const plein = { ...stockageEnMemoire(), setItem: () => { throw new Error("QuotaExceededError"); } };
  const f = fenetre("https://restoclair.fr/tarifs?invitation-vente=demo", { local: plein, session });
  assert.equal(venteVisible({ ...INVITATION, fenetre: f }), true);
  assert.equal(session.getItem(CLE_INVITATION), "1");
  assert.equal(venteVisible({ ...INVITATION, fenetre: fenetre("https://restoclair.fr/inscription", { local: plein, session }) }), true);

  // Accès au stockage interdit (lecture de window.localStorage qui lève une exception).
  const interdit = fenetre("https://restoclair.fr/tarifs?invitation-vente=demo", { session: stockageEnMemoire() });
  Object.defineProperty(interdit, "localStorage", { get() { throw new Error("SecurityError"); } });
  assert.equal(venteVisible({ ...INVITATION, fenetre: interdit }), true);
  assert.equal(interdit.sessionStorage.getItem(CLE_INVITATION), "1");
});

test("aucun stockage utilisable : l'invitation ne vaut que pour la page ouverte", () => {
  const casse = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => { throw new Error("x"); } };
  const f = fenetre("https://restoclair.fr/tarifs?invitation-vente=demo", { local: casse, session: casse });
  assert.equal(venteVisible({ ...INVITATION, fenetre: f }), true);
  assert.equal(venteVisible({ ...INVITATION, fenetre: fenetre("https://restoclair.fr/tarifs", { local: casse, session: casse }) }), false);
  assert.equal(venteVisible({ ...INVITATION, fenetre: fenetre("https://restoclair.fr/?invitation-vente=fin", { local: casse, session: casse }) }), false);
});

test("historique indisponible : la vente s'ouvre quand même, l'adresse garde son paramètre", () => {
  const f = fenetre("https://restoclair.fr/tarifs?invitation-vente=demo");
  f.history = { state: null, replaceState: () => { throw new Error("SecurityError"); } };
  assert.equal(venteVisible({ ...INVITATION, fenetre: f }), true);
  assert.equal(f.localStorage.getItem(CLE_INVITATION), "1");
});

const JETON = "a".repeat(43);

test("liens de la vente reçus après une inscription : e-mail avec code, retour de Stripe après paiement", () => {
  assert.equal(arriveeParLienDeVente("/abonnement/reprendre", "", `#jeton=${JETON}`), true);
  assert.equal(arriveeParLienDeVente("/abonnement/reprendre/", "", `#jeton=${JETON}`), true);
  assert.equal(arriveeParLienDeVente("/compte/mot-de-passe", "", `#jeton=${JETON}`), true);
  assert.equal(arriveeParLienDeVente("/abonnement/retour", "?session_id=cs_test_a1B2", ""), true);
  // Sans code valable, ou ailleurs : rien.
  for (const [chemin, search, hash] of [
    ["/abonnement/reprendre", "", ""],
    ["/abonnement/reprendre", "", "#jeton=court"],
    ["/abonnement/reprendre", `?jeton=${JETON}`, ""],
    ["/compte/mot-de-passe", "", "#autre=1"],
    ["/abonnement/retour", "", ""],
    ["/abonnement/retour", "?paiement=annule", ""],
    ["/tarifs", "?session_id=cs_test_a1B2", `#jeton=${JETON}`],
    ["/inscription", "", `#jeton=${JETON}`],
    ["/", "", ""],
    [undefined, undefined, undefined],
  ]) {
    assert.equal(arriveeParLienDeVente(chemin, search, hash), false, `${chemin}${search ?? ""}${hash ?? ""}`);
  }
});

test("e-mail ouvert sur un autre appareil (jamais invité) : la page du lien s'ouvre, et la suite aussi", () => {
  const local = stockageEnMemoire();
  const telephone = fenetre(`https://restoclair.fr/abonnement/reprendre#jeton=${JETON}`, { local });
  assert.equal(venteVisible({ ...INVITATION, fenetre: telephone }), true);
  assert.equal(local.getItem(CLE_INVITATION), "1");
  // Le code reste dans l'adresse : la page de reprise le lit et l'efface elle-même.
  assert.equal(telephone.remplacements.length, 0);
  // Après la reprise, la page suivante (rechargement, inscription, tarifs) reste visible sur ce téléphone.
  assert.equal(venteVisible({ ...INVITATION, fenetre: fenetre("https://restoclair.fr/inscription?offre=expert&version=mensuel", { local }) }), true);

  for (const adresse of [`https://restoclair.fr/compte/mot-de-passe#jeton=${JETON}`, "https://restoclair.fr/abonnement/retour?session_id=cs_test_a1"]) {
    assert.equal(venteVisible({ ...INVITATION, fenetre: fenetre(adresse) }), true, adresse);
  }
});

test("retour de Stripe sans aucun stockage : la page de retour s'ouvre quand même", () => {
  const casse = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => { throw new Error("x"); } };
  const f = fenetre("https://restoclair.fr/abonnement/retour?session_id=cs_test_a1", { local: casse, session: casse });
  assert.equal(venteVisible({ ...INVITATION, fenetre: f }), true);
});

test("?invitation-vente=fin l'emporte sur un lien de la vente", () => {
  const local = stockageEnMemoire();
  local.setItem(CLE_INVITATION, "1");
  const f = fenetre("https://restoclair.fr/abonnement/retour?session_id=cs_test_a1&invitation-vente=fin", { local });
  assert.equal(venteVisible({ ...INVITATION, fenetre: f }), false);
  assert.equal(local.getItem(CLE_INVITATION), null);
  assert.deepEqual(f.remplacements.map((r) => r.cible), ["/abonnement/retour?session_id=cs_test_a1"]);
});

test("sans fenêtre (node) : invisible quand l'invitation est exigée", () => {
  assert.equal(venteVisible({ ...INVITATION, fenetre: undefined }), false);
});

test("config.js : VENTE_SUR_INVITATION n'existe qu'avec BILLING_ACTIF", async () => {
  const noms = ["VITE_BILLING_ACTIF", "VITE_VENTE_SUR_INVITATION"];
  const sauvegarde = Object.fromEntries(noms.map((nom) => [nom, process.env[nom]]));
  const cas = [
    [{}, false],
    [{ VITE_VENTE_SUR_INVITATION: "true" }, false],
    [{ VITE_BILLING_ACTIF: "true" }, false],
    [{ VITE_BILLING_ACTIF: "true", VITE_VENTE_SUR_INVITATION: " TRUE " }, true],
    [{ VITE_BILLING_ACTIF: "true", VITE_VENTE_SUR_INVITATION: "false" }, false],
  ];
  try {
    let n = 0;
    for (const [valeurs, attendu] of cas) {
      for (const nom of noms) delete process.env[nom];
      Object.assign(process.env, valeurs);
      const config = await import(`./config.js?invitation=${n++}`);
      assert.equal(config.VENTE_SUR_INVITATION, attendu, JSON.stringify(valeurs));
    }
  } finally {
    for (const nom of noms) {
      if (sauvegarde[nom] === undefined) delete process.env[nom];
      else process.env[nom] = sauvegarde[nom];
    }
  }
});

test("les routes et les liens de la vente lisent VENTE_VISIBLE, plus BILLING_ACTIF", async () => {
  const { readFileSync } = await import("node:fs");
  for (const fichier of ["src/App.jsx", "src/Layout.jsx", "src/pages/Home.jsx", "src/pages/EssaiGratuit.jsx"]) {
    const source = readFileSync(fichier, "utf8");
    assert.ok(!/\bBILLING_ACTIF\b/.test(source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")), `${fichier} lit encore BILLING_ACTIF`);
    assert.match(source, /import \{ VENTE_VISIBLE \} from ["']@\/lib\/billing\/invitation["'];/, fichier);
  }
  assert.match(readFileSync("src/pages/Tarifs.jsx", "utf8"), /noindex=\{VENTE_SUR_INVITATION\}/);
});
