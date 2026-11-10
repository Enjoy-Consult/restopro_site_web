// Tests du formulaire d'inscription : bornes, erreurs de l'API, mémoire de saisie, mentions, liens versionnés.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { construireIndex, lireDocuments, RACINE_LEGALE } from "../../../scripts/legal.mjs";
import { BUSINESS } from "../business-info.js";
import { ApiError } from "./errors.js";
import {
  MESSAGE_CGV_OBSOLETE_PAIEMENT,
  MESSAGE_INDISPONIBLE,
  MESSAGE_INSCRIPTION_SANS_JETON,
  MESSAGE_REFUS_GENERIQUE,
  MESSAGE_VALIDATION,
  PHRASE_ESSAI_INTERROMPU,
  decouperEspace,
  erreursDeValidation,
  messageErreur,
} from "./erreurs.js";
import {
  TEXTE_CHOIX_ABSENT,
  TEXTE_CHOIX_INVALIDE,
  blocCgv,
  cheminVersionne,
  corpsInscription,
  effacerSaisie,
  lireSaisie,
  mentionsAbonnement,
  prendreExplicationChoix,
  retenirExplicationChoix,
  retenirSaisie,
  suivrePaiement,
} from "./inscription.js";
import { mockCatalogue, mockRequete } from "./mock.js";
import { selectionVersCheckout } from "./pricing.js";
import { BORNES, estMotDePasseValide, validerInscription } from "./validation.js";

const VALIDE = {
  prenom: "Marie", nom: "Martin", email: "marie@exemple.fr", motDePasse: "motdepasse1", confirmation: "motdepasse1",
  nomCommercial: "Chez Marie", raisonSociale: "Marie SAS", siret: "73282932000074",
  ligne1: "1 rue de la Paix", ligne2: "", codePostal: "75002", ville: "Paris", cgv: true,
};

// --- a) Bornes du serveur ---

test("bornes : les valeurs de l'API", () => {
  assert.deepEqual(BORNES, {
    prenom: 50, nom: 50, email: 100, motDePasse: 200, nomCommercial: 100, raisonSociale: 255, ligne1: 255, ligne2: 255, ville: 100,
  });
});

test("bornes : accepté à la limite, refusé au-delà, avec un message sous le champ", () => {
  for (const champ of ["prenom", "nom", "nomCommercial", "raisonSociale", "ligne1", "ligne2", "ville"]) {
    const limite = "a".repeat(BORNES[champ]);
    assert.equal(validerInscription({ ...VALIDE, [champ]: limite })[champ], undefined, champ);
    const message = validerInscription({ ...VALIDE, [champ]: `${limite}a` })[champ];
    assert.ok(message?.includes(`${BORNES[champ]} caractères`), champ);
  }
});

test("bornes : l'e-mail valide mais trop long est refusé, le format reste vérifié d'abord", () => {
  const suffixe = "@exemple.fr";
  const email = (n) => `${"a".repeat(n - suffixe.length)}${suffixe}`;
  assert.equal(validerInscription({ ...VALIDE, email: email(100) }).email, undefined);
  assert.match(validerInscription({ ...VALIDE, email: email(101) }).email, /100 caractères/);
  assert.match(validerInscription({ ...VALIDE, email: `${"a".repeat(120)}` }).email, /pas valide/);
});

test("bornes : on mesure le texte envoyé, sans les espaces autour", () => {
  const prenom = `  ${"a".repeat(BORNES.prenom)}  `;
  assert.equal(validerInscription({ ...VALIDE, prenom }).prenom, undefined);
});

test("mot de passe : la règle du site, plus le maximum de 200", () => {
  const limite = `a1${"b".repeat(198)}`;
  assert.equal(limite.length, 200);
  assert.equal(estMotDePasseValide(limite), true);
  assert.equal(estMotDePasseValide(`${limite}c`), false);
  assert.equal(validerInscription({ ...VALIDE, motDePasse: limite, confirmation: limite }).motDePasse, undefined);
  const trop = `${limite}c`;
  assert.match(validerInscription({ ...VALIDE, motDePasse: trop, confirmation: trop }).motDePasse, /200 caractères/);
  // La règle existante ne change pas : 8 caractères, une lettre, un chiffre.
  for (const refuse of ["abc1", "abcdefgh", "12345678"]) {
    assert.match(validerInscription({ ...VALIDE, motDePasse: refuse, confirmation: refuse }).motDePasse, /au moins 8 caractères/);
  }
});

// --- a) VALIDATION_ERROR ---

test("VALIDATION_ERROR : chaque chemin du contrat va sur le bon champ", () => {
  const cas = {
    "responsable.prenom": "prenom",
    "responsable.nom": "nom",
    "responsable.email": "email",
    "responsable.motDePasse": "motDePasse",
    "restaurant.nomCommercial": "nomCommercial",
    "restaurant.raisonSociale": "raisonSociale",
    "restaurant.siret": "siret",
    "restaurant.adresse.ligne1": "ligne1",
    "restaurant.adresse.ligne2": "ligne2",
    "restaurant.adresse.codePostal": "codePostal",
    "restaurant.adresse.ville": "ville",
    cgvAcceptees: "cgv",
  };
  for (const [path, champ] of Object.entries(cas)) {
    const { champs, general } = erreursDeValidation([{ path, code: "x", message: "y" }]);
    assert.deepEqual(Object.keys(champs), [champ], path);
    assert.equal(general, null, path);
  }
});

test("VALIDATION_ERROR : champs dans l'ordre de la page, quel que soit l'ordre de l'API", () => {
  const { champs } = erreursDeValidation([{ path: "restaurant.adresse.ville" }, { path: "responsable.email" }, { path: "responsable.prenom" }]);
  assert.deepEqual(Object.keys(champs), ["prenom", "email", "ville"]);
});

test("VALIDATION_ERROR : le texte est le nôtre, jamais celui de l'API", () => {
  const { champs } = erreursDeValidation([{ path: "responsable.email", message: "Invalid email" }]);
  assert.ok(!champs.email.includes("Invalid"));
});

test("VALIDATION_ERROR : message général pour ce qu'aucun champ ne peut porter", () => {
  for (const detail of [
    null,
    undefined,
    [],
    "texte",
    12,
    [null],
    [{}],
    [{ path: 12 }],
    [{ path: "restaurant.inconnu" }],
    [{ path: "constructor" }],
    [{ path: "__proto__" }],
    [{ path: "cgv" }],
    [{ path: "cgv.version" }],
    [{ path: "cgv.sha256" }],
  ]) {
    const { champs, general } = erreursDeValidation(detail);
    assert.deepEqual(champs, {}, JSON.stringify(detail));
    assert.equal(general, MESSAGE_VALIDATION, JSON.stringify(detail));
  }
});

test("VALIDATION_ERROR : un chemin connu et un inconnu donnent le champ et le message général", () => {
  const { champs, general } = erreursDeValidation([{ path: "responsable.nom" }, { path: "autre" }]);
  assert.deepEqual(Object.keys(champs), ["nom"]);
  assert.equal(general, MESSAGE_VALIDATION);
});

test("VALIDATION_ERROR : tolérance, chemin en liste et détail seul", () => {
  assert.deepEqual(Object.keys(erreursDeValidation([{ path: ["restaurant", "adresse", "codePostal"] }]).champs), ["codePostal"]);
  assert.deepEqual(Object.keys(erreursDeValidation({ path: "responsable.email" }).champs), ["email"]);
});

test("messageErreur : VALIDATION_ERROR n'est pas une panne", () => {
  assert.equal(messageErreur(new ApiError("VALIDATION_ERROR", 400)), MESSAGE_VALIDATION);
});

// --- c) et f) Messages et renvois vers l'espace ---

test("ABONNEMENT_DEJA_ACTIF et GERE_PAR_ABONNEMENT : renvoi vers l'espace, quel que soit le statut", () => {
  for (const status of [403, 409, 422]) {
    assert.equal(messageErreur(new ApiError("ABONNEMENT_DEJA_ACTIF", status)), "Un abonnement est déjà actif pour ce compte. Gérez-le depuis votre espace.");
    assert.equal(messageErreur(new ApiError("GERE_PAR_ABONNEMENT", status)), "Ce réglage dépend de votre abonnement et se gère depuis votre espace.");
  }
});

test("decouperEspace : le lien porte sur « votre espace », le texte reste entier", () => {
  for (const code of ["ABONNEMENT_DEJA_ACTIF", "GERE_PAR_ABONNEMENT", "CGV_VERSION_OBSOLETE"]) {
    const texte = messageErreur(new ApiError(code, 409));
    const { avant, espace, apres } = decouperEspace(texte);
    assert.equal(espace, "votre espace", code);
    assert.equal(`${avant}${espace}${apres}`, texte, code);
  }
  assert.deepEqual(decouperEspace(MESSAGE_INDISPONIBLE), { avant: MESSAGE_INDISPONIBLE, espace: null, apres: "" });
  assert.equal(decouperEspace(MESSAGE_INSCRIPTION_SANS_JETON).espace, "votre espace");
  assert.equal(decouperEspace(MESSAGE_REFUS_GENERIQUE).espace, null);
});

test("CGV_VERSION_OBSOLETE au paiement : ni panne, ni rechargement sans issue, espace et téléphone", () => {
  const message = messageErreur(new ApiError("CGV_VERSION_OBSOLETE", 409));
  assert.equal(message, MESSAGE_CGV_OBSOLETE_PAIEMENT);
  assert.notEqual(message, MESSAGE_INDISPONIBLE);
  assert.ok(!/recharge/i.test(message));
  assert.ok(message.includes("votre espace"));
  assert.ok(message.includes(BUSINESS.phone.display));
});

test("EMAIL_DEJA_UTILISE : la phrase de l'essai interrompu reste fidèle aux CGV (article 5)", () => {
  assert.match(PHRASE_ESSAI_INTERROMPU, /interrompue/);
  assert.match(PHRASE_ESSAI_INTERROMPU, /compte est conservé/);
  assert.match(PHRASE_ESSAI_INTERROMPU, /votre espace/);
});

// --- d) Saisie gardée ---

test("saisie gardée : les champs reviennent, jamais le mot de passe ni la case d'acceptation", (t) => {
  t.after(effacerSaisie);
  retenirSaisie({ ...VALIDE, motDePasse: "secret-1234", confirmation: "secret-1234" });
  const gardee = lireSaisie();
  for (const champ of ["prenom", "nom", "email", "nomCommercial", "raisonSociale", "siret", "ligne1", "ligne2", "codePostal", "ville"]) {
    assert.equal(gardee[champ], VALIDE[champ], champ);
  }
  for (const absent of ["motDePasse", "confirmation", "cgv"]) assert.ok(!(absent in gardee), absent);
  assert.ok(!JSON.stringify(gardee).includes("secret-1234"));
});

test("saisie gardée : un champ inconnu ajouté au formulaire n'y entre pas par défaut", (t) => {
  t.after(effacerSaisie);
  retenirSaisie({ ...VALIDE, autre: "valeur" });
  assert.ok(!("autre" in lireSaisie()));
});

test("saisie gardée : vide par défaut, sans effet sur le formulaire vide", () => {
  effacerSaisie();
  assert.equal(lireSaisie(), null);
  assert.deepEqual({ ...{ prenom: "" }, ...lireSaisie() }, { prenom: "" });
});

test("redirection vers le paiement : la saisie est effacée avant de partir", (t) => {
  const departs = [];
  globalThis.window = {
    location: {
      assign: (url) => {
        departs.push({ url, saisie: lireSaisie() });
      },
    },
  };
  t.after(() => {
    delete globalThis.window;
    effacerSaisie();
  });
  retenirSaisie(VALIDE);
  assert.equal(suivrePaiement("https://checkout.exemple.test/c/1"), true);
  assert.deepEqual(departs, [{ url: "https://checkout.exemple.test/c/1", saisie: null }]);
  assert.equal(lireSaisie(), null);
});

test("redirection impossible : on reste sur la page, la saisie reste en mémoire", (t) => {
  globalThis.window = { location: { assign: () => assert.fail("aucune redirection attendue") } };
  t.after(() => {
    delete globalThis.window;
    effacerSaisie();
  });
  retenirSaisie(VALIDE);
  for (const url of [undefined, "", "/abonnement/retour", "http://checkout.exemple.test", "javascript:alert(1)"]) {
    assert.equal(suivrePaiement(url), false);
  }
  assert.equal(lireSaisie().email, VALIDE.email);
});

// --- b) Sélection invalide ---

test("renvoi vers /tarifs : l'explication dit ce qui manque, et ne se lit qu'une fois", () => {
  assert.equal(prendreExplicationChoix(), null);

  for (const search of ["", "?offre=expert", "?version=mensuel"]) {
    retenirExplicationChoix(search);
    assert.equal(prendreExplicationChoix(), TEXTE_CHOIX_ABSENT, search);
    assert.equal(prendreExplicationChoix(), null, search);
  }
  for (const search of ["?offre=inconnue&version=mensuel", "?offre=serenite&version=mensuel_engage", "?offre=expert&version=mensuel&comptes=x"]) {
    retenirExplicationChoix(search);
    assert.equal(prendreExplicationChoix(), TEXTE_CHOIX_INVALIDE, search);
    assert.equal(prendreExplicationChoix(), null, search);
  }
});

// --- e) Mentions, tirées des CGV ---

const versionDe = (offre, cle, pms = false) => mockCatalogue(pms).offres.find((o) => o.cle === offre).versions.find((v) => v.cle === cle);

test("mentions : réservé aux professionnels, reconduction, date d'effet, absence de remboursement et garantie de 14 jours", () => {
  for (const version of [versionDe("essentiel", "mensuel"), versionDe("serenite", "annuel"), versionDe("expert", "mensuel_engage", true)]) {
    const texte = mentionsAbonnement(version).join(" ");
    assert.match(texte, /réservé aux professionnels/, version.cle);
    assert.match(texte, /automatiquement/, version.cle);
    assert.match(texte, /votre espace abonnement, sur le site restoclair\.fr\/mon-abonnement/, version.cle);
    assert.doesNotMatch(texte, /Mon compte/, version.cle);
    assert.match(texte, /prend effet à la fin/, version.cle);
    assert.match(texte, /n’est pas remboursée, sauf garantie « satisfait ou remboursé »/, version.cle);
    assert.match(texte, /premier abonnement d’un établissement, vous pouvez demander le remboursement de la première période dans les 14 jours/, version.cle);
  }
});

test("mentions : la date d'effet suit la version choisie", () => {
  const mensuel = mentionsAbonnement(versionDe("serenite", "mensuel")).join(" ");
  assert.match(mensuel, /chaque mois/);
  assert.match(mensuel, /fin de la période mensuelle en cours, comptée à partir de la date de début de l’abonnement/);

  const annuel = mentionsAbonnement(versionDe("serenite", "annuel")).join(" ");
  assert.match(annuel, /chaque année/);
  assert.match(annuel, /fin de l’année payée/);
  assert.match(annuel, /L’année en cours n’est pas remboursée/);

  const engage = mentionsAbonnement(versionDe("serenite", "mensuel_engage", true)).join(" ");
  assert.match(engage, /engagez pour 12 mois/);
  assert.match(engage, /reconduit automatiquement pour 12 mois, sauf résiliation demandée avant l’échéance/);
  assert.match(engage, /fin de l’engagement/);
});

test("mentions : sans version engagée, ni engagement ni PMS ; jamais de « fin du mois »", () => {
  for (const version of [versionDe("essentiel", "mensuel"), versionDe("serenite", "mensuel"), versionDe("serenite", "annuel"), versionDe("expert", "mensuel")]) {
    const texte = mentionsAbonnement(version).join(" ");
    assert.ok(!/engag/i.test(texte), version.cle);
    assert.ok(!/12 mois/.test(texte), version.cle);
    assert.ok(!/PMS/.test(texte), version.cle);
  }
  for (const version of [versionDe("serenite", "mensuel"), versionDe("serenite", "annuel"), versionDe("serenite", "mensuel_engage", true)]) {
    assert.ok(!/fin du mois/.test(mentionsAbonnement(version).join(" ")), version.cle);
  }
  assert.ok(!/PMS/.test(mentionsAbonnement(versionDe("serenite", "mensuel_engage", true)).join(" ")));
});

// --- f) Liens versionnés ---

test("liens de la case d'acceptation : la version en vigueur, en chemin relatif, sur un document qui existe", () => {
  const index = construireIndex();
  const documents = lireDocuments();
  for (const [document, attendu] of [["cgv", "/cgv"], ["cgu-app", "/application/cgu"], ["accord-sous-traitance", "/accord-sous-traitance"]]) {
    const doc = documents.find((d) => d.document === document);
    assert.equal(doc.chemin, attendu);
    assert.equal(cheminVersionne(index, document), `${attendu}/${doc.versionEnVigueur}`);
    // La route /<chemin>/:version d'App.jsx n'affiche que les versions déclarées, dont le texte existe.
    assert.ok(doc.versions.some((v) => v.version === doc.versionEnVigueur));
    assert.ok(existsSync(join(RACINE_LEGALE, document, `${doc.versionEnVigueur}.md`)));
  }
  assert.equal(cheminVersionne(index, "inconnu"), null);
});

// --- g) Bloc cgv : contrat final d'Apirest, § D ---

const CGV = { version: "0.1", sha256: "a".repeat(64) };

test("bloc cgv : la version en vigueur et son empreinte, rien d'autre de l'index", () => {
  const index = construireIndex();
  const doc = lireDocuments().find((d) => d.document === "cgv");
  const bloc = blocCgv(index);
  assert.deepEqual(Object.keys(bloc).sort(), ["sha256", "version"]);
  assert.equal(bloc.version, doc.versionEnVigueur);
  assert.match(bloc.sha256, /^[0-9a-f]{64}$/);
  assert.equal(bloc.sha256, index.find((d) => d.document === "cgv").sha256);
});

test("corps de l'inscription : bloc cgv et case acceptée, plus aucun champ à plat", () => {
  const corps = corpsInscription(VALIDE, CGV);
  assert.deepEqual(corps.cgv, CGV);
  assert.equal(corps.cgvAcceptees, true);
  for (const absent of ["cgvVersion", "cgvSha256", "confirmation"]) assert.ok(!(absent in corps), absent);
});

test("corps de l'inscription : texte sans espaces autour, SIRET nettoyé, mot de passe intact, ligne 2 seulement si remplie", () => {
  const corps = corpsInscription(
    { ...VALIDE, prenom: " Marie ", email: " marie@exemple.fr ", motDePasse: " motdepasse1 ", siret: "732 829 320 00074", ville: " Paris ", ligne2: "  " },
    CGV
  );
  assert.deepEqual(corps.responsable, { prenom: "Marie", nom: "Martin", email: "marie@exemple.fr", motDePasse: " motdepasse1 " });
  assert.equal(corps.restaurant.siret, "73282932000074");
  assert.deepEqual(corps.restaurant.adresse, { ligne1: "1 rue de la Paix", codePostal: "75002", ville: "Paris" });
  assert.equal(corpsInscription({ ...VALIDE, ligne2: " Bâtiment B " }, CGV).restaurant.adresse.ligne2, "Bâtiment B");
});

// --- Maquette : les scénarios de la vérification à l'écran ---

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

const corpsMaquette = (email) => corpsInscription({ ...VALIDE, email }, CGV);

test("maquette : sans bloc cgv ou avec un bloc incomplet, 409 sur l'inscription et le checkout, comme Apirest", async (t) => {
  simulerNavigateur(t);
  const refuseCgv = (e) => e.status === 409 && e.code === "CGV_VERSION_OBSOLETE";
  const corps = corpsMaquette("marie@exemple.fr");
  for (const cgv of [undefined, {}, { version: "0.1" }, { sha256: CGV.sha256 }]) {
    await assert.rejects(mockRequete("POST", "/api/billing/inscription", { corps: { ...corps, cgv } }), refuseCgv);
  }
  // Les anciens champs à plat ne remplacent pas le bloc.
  const { cgv: _retire, ...sansBloc } = corps;
  await assert.rejects(mockRequete("POST", "/api/billing/inscription", { corps: { ...sansBloc, cgvVersion: "0.1", cgvSha256: CGV.sha256 } }), refuseCgv);

  const { token } = await mockRequete("POST", "/api/billing/inscription", { corps });
  await assert.rejects(mockRequete("POST", "/api/billing/checkout", { corps: { offre: "serenite", version: "mensuel" }, token }), refuseCgv);
  // Le jeton d'abord : un jeton refusé reste un 401, bloc ou non.
  await assert.rejects(mockRequete("POST", "/api/billing/checkout", { corps: { offre: "serenite" }, token: "autre" }), (e) => e.status === 401);

  const selection = { offre: "serenite", version: "mensuel", comptesSupplementaires: {}, options: { ddpp: false } };
  const { url } = await mockRequete("POST", "/api/billing/checkout", { corps: selectionVersCheckout(selection, CGV), token });
  assert.match(url, /session_id=/);
});

test("maquette : validation@ et validationautre@ passent par erreursDeValidation", async () => {
  await assert.rejects(mockRequete("POST", "/api/billing/inscription", { corps: corpsMaquette("validation@exemple.fr") }), (e) => {
    assert.equal(e.code, "VALIDATION_ERROR");
    const { champs, general } = erreursDeValidation(e.detail);
    assert.deepEqual(Object.keys(champs), ["email", "codePostal"]);
    assert.equal(general, null);
    return true;
  });
  await assert.rejects(mockRequete("POST", "/api/billing/inscription", { corps: corpsMaquette("validationautre@exemple.fr") }), (e) => {
    assert.equal(e.code, "VALIDATION_ERROR");
    assert.deepEqual(erreursDeValidation(e.detail), { champs: {}, general: MESSAGE_VALIDATION });
    return true;
  });
});

test("maquette : dejaactif@, gere@ et cgvpaiement@ échouent au checkout, après la création du compte", async (t) => {
  simulerNavigateur(t);
  for (const [prefixe, code] of [["dejaactif", "ABONNEMENT_DEJA_ACTIF"], ["gere", "GERE_PAR_ABONNEMENT"], ["cgvpaiement", "CGV_VERSION_OBSOLETE"]]) {
    const { token } = await mockRequete("POST", "/api/billing/inscription", { corps: corpsMaquette(`${prefixe}@exemple.fr`) });
    await assert.rejects(mockRequete("POST", "/api/billing/checkout", { corps: { cgv: CGV }, token }), (e) => {
      assert.equal(e.code, code);
      assert.notEqual(messageErreur(e), MESSAGE_INDISPONIBLE);
      return true;
    });
  }
});

// --- 409 CGV_VERSION_OBSOLETE : nouvelle acceptation, et FACTURE_IMPAYEE ---

test("cgvAReaccepter : lit details.cgv, refuse une forme douteuse, ignore l'adresse reçue", async () => {
  const { cgvAReaccepter, cheminCgv } = await import("./inscription.js");
  const sha = "a".repeat(64);
  const refus = (detail) => new ApiError("CGV_VERSION_OBSOLETE", 409, detail);
  assert.deepEqual(cgvAReaccepter(refus({ cgv: { version: "0.2", sha256: sha, url: "https://ailleurs.example/x" } })), { version: "0.2", sha256: sha });
  assert.deepEqual(cgvAReaccepter(refus({ cgv: { version: " 0.2 ", sha256: sha.toUpperCase() } })), { version: "0.2", sha256: sha.toUpperCase() });
  assert.equal(cgvAReaccepter(refus(null)), null, "sans details : repli sur le rechargement");
  assert.equal(cgvAReaccepter(refus({ cgv: { version: "0.2", sha256: "abc" } })), null);
  assert.equal(cgvAReaccepter(refus({ cgv: { version: "../../x", sha256: sha } })), null);
  assert.equal(cgvAReaccepter(refus({ cgv: { version: 2, sha256: sha } })), null);
  assert.equal(cgvAReaccepter(refus({ cgv: { version: "<b>", sha256: sha } })), null);
  assert.equal(cgvAReaccepter(new ApiError("ABONNEMENT_DEJA_ACTIF", 409, { cgv: { version: "0.2", sha256: sha } })), null);
  assert.equal(cheminCgv("0.2"), "/cgv/0.2");
});

test("maquette : cgvobsolete@ et cgvpaiement@ refusent la première version, puis acceptent la nouvelle", async (t) => {
  simulerNavigateur(t);
  const { cgvAReaccepter } = await import("./inscription.js");
  const { EMPREINTE_CGV_MAQUETTE } = await import("./mock.js");

  let nouvelle = null;
  await assert.rejects(mockRequete("POST", "/api/billing/inscription", { corps: corpsMaquette("cgvobsolete@exemple.fr") }), (e) => {
    nouvelle = cgvAReaccepter(e);
    return e.code === "CGV_VERSION_OBSOLETE" && e.status === 409;
  });
  assert.deepEqual(nouvelle, { version: CGV.version, sha256: EMPREINTE_CGV_MAQUETTE });
  const { token: jeton1 } = await mockRequete("POST", "/api/billing/inscription", { corps: { ...corpsMaquette("cgvobsolete@exemple.fr"), cgv: nouvelle } });
  assert.ok(jeton1);

  const { token } = await mockRequete("POST", "/api/billing/inscription", { corps: corpsMaquette("cgvpaiement@exemple.fr") });
  const choix = { offre: "serenite", version: "mensuel", comptesSupplementaires: {}, options: { ddpp: false }, origine: "site" };
  let aAccepter = null;
  await assert.rejects(mockRequete("POST", "/api/billing/checkout", { corps: { ...choix, cgv: CGV }, token }), (e) => {
    aAccepter = cgvAReaccepter(e);
    return true;
  });
  assert.ok(aAccepter);
  const { url } = await mockRequete("POST", "/api/billing/checkout", { corps: { ...choix, cgv: aAccepter }, token });
  assert.match(url, /\/abonnement\/retour\?session_id=/);
});

// --- Acceptation des CGV au fil de la page : quand le panneau « compte créé » redemande la case ---

const NOUVELLE_CGV = { version: "0.2", sha256: "c".repeat(64) };

test("suivi des CGV : un 409 à l'inscription se règle dans le formulaire, rien à refaire au paiement", async () => {
  const { etatCgvInitial, paiementBloqueParCgv, suivreCgv } = await import("./inscription.js");
  let etat = etatCgvInitial(CGV);
  assert.deepEqual(etat, { cgv: CGV, versionRecue: false, aAccepterAuPaiement: false, caseCochee: false });
  assert.equal(paiementBloqueParCgv(etat), false);

  etat = suivreCgv(etat, { type: "refus-inscription", cgv: NOUVELLE_CGV });
  assert.equal(etat.cgv, NOUVELLE_CGV, "le renvoi part avec la nouvelle version");
  assert.equal(etat.versionRecue, true, "le lien du formulaire nomme cette version");
  assert.equal(etat.aAccepterAuPaiement, false);

  // Case du formulaire recochée, inscription acceptée : un échec du Checkout (503, 429, 422…) ou un retour
  // arrière depuis Stripe ne change rien, le paiement reste possible sans nouvelle case.
  etat = suivreCgv(etat, { type: "compte-cree" });
  assert.equal(etat.cgv, NOUVELLE_CGV);
  assert.equal(etat.aAccepterAuPaiement, false);
  assert.equal(paiementBloqueParCgv(etat), false);
});

test("suivi des CGV : un 409 au Checkout fait cocher la nouvelle version dans le panneau", async () => {
  const { etatCgvInitial, paiementBloqueParCgv, suivreCgv } = await import("./inscription.js");
  let etat = suivreCgv(etatCgvInitial(CGV), { type: "compte-cree" });

  etat = suivreCgv(etat, { type: "refus-paiement", cgv: NOUVELLE_CGV });
  assert.equal(etat.cgv, NOUVELLE_CGV);
  assert.equal(etat.aAccepterAuPaiement, true);
  assert.equal(paiementBloqueParCgv(etat), true, "« Passer au paiement » attend la case");

  etat = suivreCgv(etat, { type: "case", cochee: true });
  assert.equal(paiementBloqueParCgv(etat), false);
  etat = suivreCgv(etat, { type: "case", cochee: false });
  assert.equal(paiementBloqueParCgv(etat), true);

  // Case cochée, puis un nouveau refus avec une autre version : la case se décoche, le bloc change (le focus y revient).
  etat = suivreCgv(etat, { type: "case", cochee: true });
  const encoreAutre = { version: "0.3", sha256: "d".repeat(64) };
  const apres = suivreCgv(etat, { type: "refus-paiement", cgv: encoreAutre });
  assert.equal(apres.cgv, encoreAutre);
  assert.notEqual(apres.cgv, etat.cgv);
  assert.equal(paiementBloqueParCgv(apres), true);

  // Cocher ne remplace pas le bloc : le focus ne revient pas sur la case à chaque clic.
  assert.equal(suivreCgv(apres, { type: "case", cochee: true }).cgv, apres.cgv);
});

test("suivi des CGV : un autre compte repasse par la case du formulaire, le panneau ne la redemande pas", async () => {
  const { etatCgvInitial, paiementBloqueParCgv, suivreCgv } = await import("./inscription.js");
  let etat = suivreCgv(etatCgvInitial(CGV), { type: "refus-paiement", cgv: NOUVELLE_CGV });
  etat = suivreCgv(etat, { type: "autre-compte" });
  assert.equal(etat.cgv, NOUVELLE_CGV, "le formulaire affiche la version reçue");
  assert.equal(etat.versionRecue, true);
  assert.equal(etat.aAccepterAuPaiement, false);
  etat = suivreCgv(etat, { type: "compte-cree" });
  assert.equal(paiementBloqueParCgv(etat), false);
});

test("maquette cgvobsoleterole@ : après le 409 de l'inscription, l'échec du Checkout ne redemande pas les CGV", async (t) => {
  simulerNavigateur(t);
  const { cgvAReaccepter, etatCgvInitial, paiementBloqueParCgv, suivreCgv } = await import("./inscription.js");
  const email = "cgvobsoleterole@exemple.fr";
  let etat = etatCgvInitial(CGV);
  await assert.rejects(mockRequete("POST", "/api/billing/inscription", { corps: corpsInscription({ ...VALIDE, email }, etat.cgv) }), (e) => {
    etat = suivreCgv(etat, { type: "refus-inscription", cgv: cgvAReaccepter(e) });
    return e.code === "CGV_VERSION_OBSOLETE";
  });
  const { token } = await mockRequete("POST", "/api/billing/inscription", { corps: corpsInscription({ ...VALIDE, email }, etat.cgv) });
  etat = suivreCgv(etat, { type: "compte-cree" });

  const selection = { offre: "serenite", version: "mensuel", comptesSupplementaires: {}, options: { ddpp: false } };
  await assert.rejects(mockRequete("POST", "/api/billing/checkout", { corps: selectionVersCheckout(selection, etat.cgv), token }), (e) => {
    assert.equal(e.code, "ROLE_NON_AUTORISE_POUR_OFFRE");
    assert.equal(cgvAReaccepter(e), null, "pas un refus des CGV : l'état n'évolue pas");
    return true;
  });
  assert.equal(etat.aAccepterAuPaiement, false);
  assert.equal(paiementBloqueParCgv(etat), false, "après correction du récapitulatif, « Passer au paiement » reste possible");
});

test("FACTURE_IMPAYEE au checkout : texte du front, chemin vers l'espace, pas de panne", async (t) => {
  simulerNavigateur(t);
  const { token } = await mockRequete("POST", "/api/billing/inscription", { corps: corpsMaquette("facture@exemple.fr") });
  await assert.rejects(mockRequete("POST", "/api/billing/checkout", { corps: { cgv: CGV }, token }), (e) => {
    assert.equal(e.code, "FACTURE_IMPAYEE");
    const message = messageErreur(e);
    assert.match(message, /^Une facture impayée doit être réglée avant de choisir une formule\./);
    assert.notEqual(message, MESSAGE_INDISPONIBLE);
    assert.notEqual(decouperEspace(message).espace, null, "« votre espace » devient un lien");
    return true;
  });
});

test("version reçue d'un 409 : gardée en mémoire de module pour « Modifier mon choix », jamais la case", async () => {
  const { etatCgvDepart, etatCgvInitial, garderCgv, effacerCgvGardee, suivreCgv } = await import("./inscription.js");
  const build = { version: "0.1", sha256: "a".repeat(64) };
  const recue = { version: "0.1", sha256: "b".repeat(64) };
  effacerCgvGardee();
  assert.deepEqual(etatCgvDepart(build), etatCgvInitial(build));

  const apresRefus = suivreCgv(suivreCgv(etatCgvInitial(build), { type: "refus-paiement", cgv: recue }), { type: "case", cochee: true });
  garderCgv(apresRefus);
  assert.deepEqual(etatCgvDepart(build), { cgv: recue, versionRecue: true, aAccepterAuPaiement: true, caseCochee: false });

  garderCgv(etatCgvInitial(build));
  assert.deepEqual(etatCgvDepart(build), etatCgvInitial(build), "sans version reçue, rien n'est gardé");

  garderCgv(suivreCgv(etatCgvInitial(build), { type: "refus-inscription", cgv: recue }));
  effacerCgvGardee();
  assert.deepEqual(etatCgvDepart(build), etatCgvInitial(build));
});

test("maquette : cgvillisible@ et paiementillisible@ atteignent les replis sans details", async (t) => {
  simulerNavigateur(t);
  const { cgvAReaccepter } = await import("./inscription.js");
  await assert.rejects(mockRequete("POST", "/api/billing/inscription", { corps: corpsMaquette("cgvillisible@exemple.fr") }), (e) => {
    assert.equal(e.code, "CGV_VERSION_OBSOLETE");
    assert.equal(cgvAReaccepter(e), null);
    return true;
  });
  const { token } = await mockRequete("POST", "/api/billing/inscription", { corps: corpsMaquette("paiementillisible@exemple.fr") });
  await assert.rejects(mockRequete("POST", "/api/billing/checkout", { corps: { cgv: CGV }, token }), (e) => {
    assert.equal(cgvAReaccepter(e), null);
    assert.equal(messageErreur(e), MESSAGE_CGV_OBSOLETE_PAIEMENT);
    return true;
  });
});
