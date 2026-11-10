// Mode maquette (VITE_BILLING_MOCK=true) : réponses simulées de l'API, sans backend.
// L'état est gardé dans sessionStorage pour survivre à la « redirection vers Stripe ».
//
// Scénarios, choisis par l'adresse e-mail saisie à l'inscription :
//   existant@…  -> EMAIL_DEJA_UTILISE          indispo@…  -> SERVICE_PAIEMENT_INDISPONIBLE
//   ko@…        -> le 1er checkout échoue, le 2e réussit (reprise sans recréer le compte)
//   role@…      -> ROLE_NON_AUTORISE_POUR_OFFRE   comptes@… -> COMPTES_INSUFFISANTS
//   sepa@…      -> retour en « activation_provisoire »   lent@… -> la confirmation n'arrive pas (texte du délai à 60 s)
//   expire@…    -> le checkout répond 401 (jeton expiré)   refus@… -> le checkout répond 403 NON_TITULAIRE
//   bloque@…    -> la page de retour reçoit un 403 NON_TITULAIRE de /compte
//   cgvobsolete@… -> l'inscription répond 409 CGV_VERSION_OBSOLETE avec details.cgv, puis accepte la nouvelle version
//   validation@… -> l'inscription répond 400 VALIDATION_ERROR sur l'e-mail et le code postal
//   validationautre@… -> 400 VALIDATION_ERROR sur un chemin inconnu (message général)
//   dejaactif@… -> le checkout répond 409 ABONNEMENT_DEJA_ACTIF   gere@… -> 403 GERE_PAR_ABONNEMENT
//   cgvpaiement@… -> le checkout répond 409 CGV_VERSION_OBSOLETE avec details.cgv, puis accepte la nouvelle version
//   facture@…   -> le checkout répond 409 FACTURE_IMPAYEE
//   cgvillisible@… -> l'inscription répond 409 CGV_VERSION_OBSOLETE sans details (repli : recharger la page)
//   paiementillisible@… -> le checkout répond 409 CGV_VERSION_OBSOLETE sans details (repli : espace ou téléphone)
//   activation@… -> le checkout répond 409 ABONNEMENT_DEJA_ACTIF, motif activation_en_cours : relecture du compte, sans Checkout
//   SIRET commençant par 000000 -> SIRET_INVALIDE
//   Inscription ou checkout sans bloc cgv -> 409 CGV_VERSION_OBSOLETE, comme Apirest
// Toute autre adresse : abonnement « actif » après quelques interrogations.
//
// Reprise d'une inscription (/abonnement/reprendre) :
//   demande d'un lien : réponse identique pour toute adresse, sauf trop@… (429), indispo@… (503), validation@… (400)
//   /abonnement/reprendre#jeton=maquette-reprise-valide      -> nouveau jeton pour marie@exemple.fr, puis paiement normal
//   …#jeton=maquette-reprise-expire (ou -utilise)            -> 410 LIEN_INDISPONIBLE
//   …#jeton=maquette-reprise-actif                           -> 409 ABONNEMENT_DEJA_ACTIF
//   …#jeton=maquette-reprise-activation                      -> 409 ABONNEMENT_DEJA_ACTIF, motif activation_en_cours
//   …#jeton=maquette-reprise-indispo (ou -trop)              -> 503 (ou 429) : le bouton reste, pour réessayer
//
// En développement seulement (npm run dev), sans passer par le formulaire :
//   annule@…  -> le 1er checkout revient sur /tarifs?paiement=annule, le compte reste créé
//   /abonnement/retour?maquette=X, avec X parmi :
//     sans_abonnement, en_attente_paiement, impaye, resilie -> ce statut, sans fin (issue à 60 s)
//       ajouter &session_id=x pour jouer le retour de Stripe : sans_abonnement et en_attente_paiement donnent le délai
//     actif, activation_provisoire, actif_sans_email        -> succès immédiat
//     attente_puis_actif                                    -> « actif » à la 3e interrogation
//     401 -> jeton refusé ; 429 -> Retry-After de 5 s, sans fin ; 429_puis_actif -> « actif » à la 3e
//     must_finalize -> 403 MUST_FINALIZE (identifiants envoyés) : issue « en place »
//     sans_jeton -> efface la session (aussi après un succès : c'est le rechargement)
//   /tarifs?paiement=annule&maquette=avec_jeton (ou sans_jeton) -> annulation avec ou sans compte créé
// Le scénario reste dans la session de l'onglet : maquette=sans_jeton, ou fermer l'onglet, pour en sortir.
import { ApiError } from "./errors.js";
import { EMAIL_SCENARIO, PREFIXE_JETON_SCENARIO } from "./scenarios.js";

const CLE_ETAT = "restoclair_billing_mock";
const PAUSE_MS = 250;
const RETRY_AFTER_SCENARIO_MS = 5000;

const MODULES_COMMUNS = [
  ["produits_dlc", "Produits et DLC secondaires (ouverture, décongélation, étiquettes)"],
  ["checklists", "Checklists, dont nettoyage par zone"],
  ["temperatures", "Relevés de température des frigos"],
  ["receptions", "Réceptions et fournisseurs"],
  ["points_controle", "Points de contrôle"],
  ["cycles_thermiques", "Cycles thermiques et refroidissement"],
  ["friteuses", "Friteuses et huiles"],
  ["nuisibles", "Nuisibles"],
  ["documents", "Documents"],
  ["dossier_inspection", "Dossier d’inspection"],
  ["rappel_produit", "Rappel produit"],
  ["allergenes", "Allergènes et carte"],
  ["formation", "Formation hygiène"],
  ["audit_interne", "Audit interne"],
  ["signalements", "Signalements"],
];

const MODULES_EXPERT = [
  ["sondes", "Sondes connectées (hub, Bluetooth)"],
  ["alertes", "Alertes et astreinte par e-mail"],
  ["production", "Recettes, production et livraisons"],
  ["inventaire", "Inventaire et pertes"],
  ["maintenance", "Maintenance préventive"],
  ["microbiologie", "Analyses microbiologiques"],
  ["plats_temoins", "Plats témoins (restauration collective)"],
  ["exports", "Exports et archives"],
  ["statistiques", "Statistiques"],
];

const CATEGORIES = [
  { cle: "responsable", libelle: "Responsable" },
  { cle: "superviseur", libelle: "Superviseur" },
  { cle: "cuisinier", libelle: "Cuisinier" },
  { cle: "services_techniques", libelle: "Services techniques" },
];

const LIBELLES_VERSIONS = {
  mensuel: "Mensuel sans engagement",
  mensuel_engage: "Mensuel, engagement 12 mois, avec PMS",
  annuel: "Annuel, payé d’avance",
};

const version = (cle, periode, pms, prixBaseCentimes, extras, options = []) => ({
  cle,
  libelle: LIBELLES_VERSIONS[cle],
  periode,
  engagementMois: cle === "mensuel_engage" ? 12 : 0,
  pms,
  prixBaseCentimes,
  prixCompteSupplementaireCentimes: extras,
  options,
});

const DDPP = { cle: "ddpp", libelle: "Assistance DDPP niveau 1", prixCentimes: 1000 };

// Catalogue conforme à la section « Catalogue des formules » du cahier des charges.
export function mockCatalogue(pmsDisponible = false) {
  const communs = MODULES_COMMUNS.map(([cle]) => cle);
  const sereniteExtras = { responsable: 990, superviseur: 990, cuisinier: 490, services_techniques: 490 };
  const sereniteVersions = [
    version("mensuel", "mois", "non", 4999, sereniteExtras),
    ...(pmsDisponible ? [version("mensuel_engage", "mois", "troisieme_paiement", 4999, sereniteExtras)] : []),
    version("annuel", "an", pmsDisponible ? "premier_paiement" : "non", 54900, {
      responsable: 11880,
      superviseur: 11880,
      cuisinier: 5880,
      services_techniques: 5880,
    }),
  ];
  const expertExtras = { responsable: 790, superviseur: 790, cuisinier: 390, services_techniques: 390 };
  const expertVersions = [
    version("mensuel", "mois", "non", 9900, expertExtras, [DDPP]),
    ...(pmsDisponible ? [version("mensuel_engage", "mois", "troisieme_paiement", 9900, expertExtras, [DDPP])] : []),
  ];

  return {
    pmsDisponible,
    tvaPourcentage: 20,
    categories: CATEGORIES,
    modules: [...MODULES_COMMUNS, ...MODULES_EXPERT].map(([cle, libelle]) => ({ cle, libelle })),
    offres: [
      {
        cle: "essentiel",
        nom: "Essentiel",
        comptesInclus: { responsable: 1, superviseur: 0, cuisinier: 2, services_techniques: 0 },
        categoriesAutorisees: ["responsable", "cuisinier", "services_techniques"],
        modules: communs,
        fonctions: { accesOrdinateur: true, ddpp: "non", superviseur: false },
        versions: [version("mensuel", "mois", "non", 1999, { responsable: 990, cuisinier: 490, services_techniques: 490 })],
      },
      {
        cle: "serenite",
        nom: "Sérénité",
        comptesInclus: { responsable: 1, superviseur: 1, cuisinier: 3, services_techniques: 1 },
        categoriesAutorisees: ["responsable", "superviseur", "cuisinier", "services_techniques"],
        modules: communs,
        fonctions: { accesOrdinateur: true, ddpp: "incluse", superviseur: true },
        versions: sereniteVersions,
      },
      {
        cle: "expert",
        nom: "Expert",
        comptesInclus: { responsable: 1, superviseur: 2, cuisinier: 5, services_techniques: 2 },
        categoriesAutorisees: ["responsable", "superviseur", "cuisinier", "services_techniques"],
        modules: [...communs, ...MODULES_EXPERT.map(([cle]) => cle)],
        fonctions: { accesOrdinateur: true, ddpp: "option", superviseur: true },
        versions: expertVersions,
      },
    ],
  };
}

const attendre = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function lireEtat() {
  try {
    return JSON.parse(window.sessionStorage.getItem(CLE_ETAT)) ?? null;
  } catch {
    return null;
  }
}

function ecrireEtat(etat) {
  try {
    window.sessionStorage.setItem(CLE_ETAT, JSON.stringify(etat));
  } catch {
    // sans sessionStorage, la maquette ne garde pas son état entre deux pages
  }
}

function etatDuJeton(token) {
  const etat = lireEtat();
  if (!etat || !token || etat.token !== token) throw new ApiError("ACTION_NON_AUTORISEE", 401);
  return etat;
}

const compteScenario = (statut, titulaire = { nom: "Marie Martin", email: EMAIL_SCENARIO }) => ({
  restaurantId: "r-mock",
  statut,
  offre: "serenite",
  version: "mensuel",
  options: { ddpp: false },
  estTitulaire: true,
  titulaire,
});

// Réponse de GET /compte pour un scénario, à sa n-ième interrogation (à partir de 1).
export function reponseScenario(scenario, interrogation) {
  const trop = () => new ApiError("TROP_D_ESSAIS", 429, null, RETRY_AFTER_SCENARIO_MS);
  switch (scenario) {
    case "401":
      throw new ApiError("INVALID_TOKEN", 401);
    case "429":
      throw trop();
    case "429_puis_actif":
      if (interrogation < 3) throw trop();
      return compteScenario("actif");
    case "actif_sans_email":
      return compteScenario("actif", null);
    // Les identifiants sont partis : Apirest a posé « mot de passe à changer », sa garde refuse alors le jeton du site.
    case "must_finalize":
      throw new ApiError("MUST_FINALIZE", 403);
    case "attente_puis_actif":
    case "avec_jeton":
      return compteScenario(interrogation < 3 ? "en_attente_paiement" : "actif");
    default:
      return compteScenario(scenario);
  }
}

// En mémoire seulement : un rechargement repart de la première interrogation.
const interrogationsScenario = new Map();

// Contrat final d'Apirest (§ D) : bloc absent ou incomplet, 409 sur l'inscription et le checkout.
function exigerCgv(corps) {
  if (!corps?.cgv?.version || !corps?.cgv?.sha256) throw new ApiError("CGV_VERSION_OBSOLETE", 409);
}

// « Nouvelle » version des scénarios cgvobsolete@ et cgvpaiement@ : même numéro, autre empreinte.
// Le premier envoi est refusé avec details.cgv, comme Apirest ; le renvoi avec cette empreinte passe.
export const EMPREINTE_CGV_MAQUETTE = "b".repeat(64);

// Code de reprise des scénarios (voir l'en-tête) : la fin du code choisit la réponse.
export const PREFIXE_JETON_REPRISE = "maquette-reprise-";

function nouvelleSession(email, titulaire) {
  const jeton = `mock-${Math.random().toString(36).slice(2)}`;
  ecrireEtat({ token: jeton, email, titulaire, essaisCheckout: 0, interrogations: 0, choix: null });
  return jeton;
}

function exigerNouvelleCgv(corps) {
  if (corps?.cgv?.sha256 === EMPREINTE_CGV_MAQUETTE) return;
  const version = corps?.cgv?.version ?? "0.1";
  throw new ApiError("CGV_VERSION_OBSOLETE", 409, {
    cgv: { version, sha256: EMPREINTE_CGV_MAQUETTE, url: `https://restoclair.fr/cgv/${version}` },
  });
}

export async function mockRequete(methode, chemin, { corps, token, pms = false, scenarios = false } = {}) {
  await attendre(PAUSE_MS);
  const route = `${methode} ${chemin}`;

  if (route === "GET /api/billing/catalogue") return mockCatalogue(pms);

  if (scenarios && token?.startsWith(PREFIXE_JETON_SCENARIO)) {
    if (route === "POST /api/billing/checkout") {
      exigerCgv(corps);
      return { url: `${window.location.origin}/abonnement/retour?session_id=cs_test_maquette` };
    }
    if (route === "GET /api/billing/compte") {
      const n = (interrogationsScenario.get(token) ?? 0) + 1;
      interrogationsScenario.set(token, n);
      return reponseScenario(token.slice(PREFIXE_JETON_SCENARIO.length), n);
    }
  }

  if (route === "POST /api/billing/inscription") {
    exigerCgv(corps);
    const email = String(corps?.responsable?.email ?? "").toLowerCase();
    if (email.startsWith("indispo")) throw new ApiError("SERVICE_PAIEMENT_INDISPONIBLE", 503);
    if (email.startsWith("existant")) throw new ApiError("EMAIL_DEJA_UTILISE", 409);
    if (email.startsWith("cgvobsolete")) exigerNouvelleCgv(corps);
    if (email.startsWith("cgvillisible")) throw new ApiError("CGV_VERSION_OBSOLETE", 409);
    if (email.startsWith("validationautre"))
      throw new ApiError("VALIDATION_ERROR", 400, [{ path: "restaurant.autre", code: "custom", message: "Refusé" }]);
    if (email.startsWith("validation"))
      throw new ApiError("VALIDATION_ERROR", 400, [
        { path: "restaurant.adresse.codePostal", code: "invalid_string", message: "Code postal invalide" },
        { path: "responsable.email", code: "invalid_string", message: "E-mail invalide" },
      ]);
    if (String(corps?.restaurant?.siret ?? "").startsWith("000000")) throw new ApiError("SIRET_INVALIDE", 422);
    const { prenom, nom } = corps.responsable;
    return { token: nouvelleSession(email, `${prenom} ${nom}`), restaurantId: "r-mock", billingAccountId: "ba-mock" };
  }

  if (route === "POST /api/billing/reprise/demande") {
    const email = String(corps?.email ?? "").toLowerCase();
    if (email.startsWith("trop")) throw new ApiError("TROP_D_ESSAIS", 429, null, RETRY_AFTER_SCENARIO_MS);
    if (email.startsWith("indispo")) throw new ApiError("SERVICE_PAIEMENT_INDISPONIBLE", 503);
    if (email.startsWith("validation")) throw new ApiError("VALIDATION_ERROR", 400, [{ path: "email", code: "invalid_string", message: "E-mail invalide" }]);
    return { ok: true };
  }

  if (route === "POST /api/billing/reprise") {
    const fin = String(corps?.jeton ?? "").startsWith(PREFIXE_JETON_REPRISE) ? String(corps.jeton).slice(PREFIXE_JETON_REPRISE.length) : "valide";
    if (fin === "expire" || fin === "utilise") throw new ApiError("LIEN_INDISPONIBLE", 410);
    if (fin === "activation") throw new ApiError("ABONNEMENT_DEJA_ACTIF", 409, { motif: "activation_en_cours" });
    if (fin === "actif") throw new ApiError("ABONNEMENT_DEJA_ACTIF", 409);
    if (fin === "indispo") throw new ApiError("SERVICE_PAIEMENT_INDISPONIBLE", 503);
    if (fin === "trop") throw new ApiError("TROP_D_ESSAIS", 429, null, RETRY_AFTER_SCENARIO_MS);
    return { token: nouvelleSession(EMAIL_SCENARIO, "Marie Martin"), email: EMAIL_SCENARIO };
  }

  if (route === "POST /api/billing/checkout") {
    const etat = etatDuJeton(token);
    exigerCgv(corps);
    if (etat.email.startsWith("expire")) throw new ApiError("ACTION_NON_AUTORISEE", 401);
    if (etat.email.startsWith("refus")) throw new ApiError("NON_TITULAIRE", 403);
    if (etat.email.startsWith("dejaactif")) throw new ApiError("ABONNEMENT_DEJA_ACTIF", 409);
    if (etat.email.startsWith("activation")) throw new ApiError("ABONNEMENT_DEJA_ACTIF", 409, { motif: "activation_en_cours" });
    if (etat.email.startsWith("gere")) throw new ApiError("GERE_PAR_ABONNEMENT", 403);
    if (etat.email.startsWith("cgvpaiement")) exigerNouvelleCgv(corps);
    if (etat.email.startsWith("paiementillisible")) throw new ApiError("CGV_VERSION_OBSOLETE", 409);
    if (etat.email.startsWith("facture")) throw new ApiError("FACTURE_IMPAYEE", 409, { montantTTCCentimes: 5999 });
    if (etat.email.includes("role")) throw new ApiError("ROLE_NON_AUTORISE_POUR_OFFRE", 422, { categorie: "superviseur" });
    if (etat.email.includes("comptes")) throw new ApiError("COMPTES_INSUFFISANTS", 422, { requis: { cuisinier: 2 } });
    etat.essaisCheckout += 1;
    if (etat.email.startsWith("ko") && etat.essaisCheckout === 1) {
      ecrireEtat(etat);
      throw new ApiError("SERVICE_PAIEMENT_INDISPONIBLE", 503);
    }
    if (scenarios && etat.email.startsWith("annule") && etat.essaisCheckout === 1) {
      ecrireEtat(etat);
      return { url: `${window.location.origin}/tarifs?paiement=annule` };
    }
    etat.choix = { offre: corps.offre, version: corps.version, options: corps.options ?? { ddpp: false } };
    etat.interrogations = 0;
    ecrireEtat(etat);
    return { url: `${window.location.origin}/abonnement/retour?session_id=cs_test_maquette` };
  }

  if (route === "GET /api/billing/compte") {
    const etat = etatDuJeton(token);
    if (etat.email.startsWith("bloque")) throw new ApiError("NON_TITULAIRE", 403);
    etat.interrogations += 1;
    ecrireEtat(etat);
    let statut = "en_attente_paiement";
    if (!etat.email.includes("lent") && etat.interrogations >= 3) {
      statut = etat.email.includes("sepa") ? "activation_provisoire" : "actif";
    }
    return {
      restaurantId: "r-mock",
      statut,
      offre: etat.choix?.offre ?? null,
      version: etat.choix?.version ?? null,
      options: etat.choix?.options ?? { ddpp: false },
      estTitulaire: true,
      titulaire: { nom: etat.titulaire, email: etat.email },
    };
  }

  throw new ApiError("ERREUR_INCONNUE", 404);
}
