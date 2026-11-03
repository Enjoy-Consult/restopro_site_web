// Documents légaux de RestOclair. Chaque texte est un fichier Markdown autonome (titre, version, date,
// avertissement) : le site l'affiche avec DocumentLegal, l'application peut reprendre le même fichier.
// Les documents « application » ne contiennent ni prix ni lien d'achat (règles Apple et Google).
import mentionsLegales from "./mentions-legales.md?raw";
import cgv from "./cgv.md?raw";
import confidentialiteSite from "./confidentialite-site.md?raw";
import cookies from "./cookies.md?raw";
import cguApplication from "./cgu-application.md?raw";
import confidentialiteApplication from "./confidentialite-application.md?raw";
import accordSousTraitance from "./accord-sous-traitance.md?raw";

export const DOCUMENTS_LEGAUX = {
  "mentions-legales": {
    chemin: "/MentionsLegales",
    titre: "Mentions légales",
    description: "Mentions légales du site restoclair.fr et de l’application RestOclair.",
    portee: "site",
    source: mentionsLegales,
  },
  cgv: {
    chemin: "/cgv",
    titre: "Conditions générales de vente de l’abonnement",
    description: "Conditions générales de vente de l’abonnement à l’application RestOclair.",
    portee: "site",
    source: cgv,
  },
  "confidentialite-site": {
    chemin: "/confidentialite",
    titre: "Politique de confidentialité du site",
    description: "Comment le site restoclair.fr traite vos données personnelles.",
    portee: "site",
    source: confidentialiteSite,
  },
  cookies: {
    chemin: "/cookies",
    titre: "Politique de cookies",
    description: "Cookies et traceurs utilisés sur le site restoclair.fr.",
    portee: "site",
    source: cookies,
  },
  "cgu-application": {
    chemin: "/application/cgu",
    titre: "Conditions générales d’utilisation de l’application",
    description: "Conditions générales d’utilisation de l’application RestOclair.",
    portee: "application",
    source: cguApplication,
  },
  "confidentialite-application": {
    chemin: "/application/confidentialite",
    titre: "Politique de confidentialité de l’application",
    description: "Comment l’application RestOclair traite les données personnelles.",
    portee: "application",
    source: confidentialiteApplication,
  },
  "accord-sous-traitance": {
    chemin: "/accord-sous-traitance",
    titre: "Accord de sous-traitance des données",
    description: "Accord de sous-traitance (article 28 du RGPD), annexe aux conditions générales de vente.",
    portee: "site",
    source: accordSousTraitance,
  },
};
