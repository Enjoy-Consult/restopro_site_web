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

test("mentions : réservé aux professionnels, reconduction, date d'effet et absence de remboursement", () => {
  for (const version of [versionDe("essentiel", "mensuel"), versionDe("serenite", "annuel"), versionDe("expert", "mensuel_engage", true)]) {
    const texte = mentionsAbonnement(version).join(" ");
    assert.match(texte, /réservé aux professionnels/, version.cle);
    assert.match(texte, /automatiquement/, version.cle);
    assert.match(texte, /votre espace « Mon compte », sur le web/, version.cle);
    assert.match(texte, /prend effet à la fin/, version.cle);
    assert.match(texte, /n’est pas remboursée/, version.cle);
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
