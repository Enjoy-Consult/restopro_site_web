// Mode maquette (VITE_BILLING_MOCK=true) : réponses simulées de l'API, sans backend.
// L'état est gardé dans sessionStorage pour survivre à la « redirection vers Stripe ».
//
// Scénarios, choisis par l'adresse e-mail saisie à l'inscription :
//   existant@…  -> EMAIL_DEJA_UTILISE          indispo@…  -> SERVICE_PAIEMENT_INDISPONIBLE
//   ko@…        -> le 1er checkout échoue, le 2e réussit (reprise sans recréer le compte)
//   role@…      -> ROLE_NON_AUTORISE_POUR_OFFRE   comptes@… -> COMPTES_INSUFFISANTS
//   sepa@…      -> retour en « activation_provisoire »   lent@… -> la confirmation n'arrive pas
//   SIRET commençant par 000000 -> SIRET_INVALIDE
// Toute autre adresse : abonnement « actif » après quelques interrogations.
import { ApiError } from "./errors.js";

const CLE_ETAT = "restoclair_billing_mock";
const PAUSE_MS = 250;

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
        fonctions: { accesOrdinateur: false, ddpp: "non", superviseur: false },
        versions: [version("mensuel", "mois", "non", 1999, { responsable: 990, cuisinier: 490, services_techniques: 490 })],
      },
      {
        cle: "serenite",
        nom: "Sérénité",
        comptesInclus: { responsable: 1, superviseur: 1, cuisinier: 3, services_techniques: 1 },
        categoriesAutorisees: ["responsable", "superviseur", "cuisinier", "services_techniques"],
        modules: communs,
        fonctions: { accesOrdinateur: false, ddpp: "incluse", superviseur: true },
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

export async function mockRequete(methode, chemin, { corps, token, pms = false } = {}) {
  await attendre(PAUSE_MS);
  const route = `${methode} ${chemin}`;

  if (route === "GET /api/billing/catalogue") return mockCatalogue(pms);

  if (route === "POST /api/billing/inscription") {
    const email = String(corps?.responsable?.email ?? "").toLowerCase();
    if (email.startsWith("indispo")) throw new ApiError("SERVICE_PAIEMENT_INDISPONIBLE", 503);
    if (email.startsWith("existant")) throw new ApiError("EMAIL_DEJA_UTILISE", 409);
    if (String(corps?.restaurant?.siret ?? "").startsWith("000000")) throw new ApiError("SIRET_INVALIDE", 422);
    const jeton = `mock-${Math.random().toString(36).slice(2)}`;
    const { prenom, nom } = corps.responsable;
    ecrireEtat({ token: jeton, email, titulaire: `${prenom} ${nom}`, essaisCheckout: 0, interrogations: 0, choix: null });
    return { token: jeton, restaurantId: "r-mock", billingAccountId: "ba-mock" };
  }

  if (route === "POST /api/billing/checkout") {
    const etat = etatDuJeton(token);
    if (etat.email.includes("role")) throw new ApiError("ROLE_NON_AUTORISE_POUR_OFFRE", 422, { categorie: "superviseur" });
    if (etat.email.includes("comptes")) throw new ApiError("COMPTES_INSUFFISANTS", 422, { requis: { cuisinier: 2 } });
    etat.essaisCheckout += 1;
    if (etat.email.startsWith("ko") && etat.essaisCheckout === 1) {
      ecrireEtat(etat);
      throw new ApiError("SERVICE_PAIEMENT_INDISPONIBLE", 503);
    }
    etat.choix = { offre: corps.offre, version: corps.version, options: corps.options ?? { ddpp: false } };
    etat.interrogations = 0;
    ecrireEtat(etat);
    return { url: `${window.location.origin}/abonnement/retour?session_id=cs_test_maquette` };
  }

  if (route === "GET /api/billing/compte") {
    const etat = etatDuJeton(token);
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
