import React from "react";
import { Link, matchPath, useLocation } from "react-router-dom";
import { SITE_URL } from "@/lib/billing/config";
import { BUSINESS } from "@/lib/business-info";
import { ICONE } from "@/compte/icone";
import { CHEMINS_COMPTE } from "@/compte/chemins";
import { adresseSite, liensDocuments } from "@/compte/liens";
import DOCUMENTS from "@/content/legal/documents.json";

// Cadre des pages de compte.restoclair.fr : sobre, sans menu de la vitrine, sans « Gérer mes cookies » (aucun traceur
// sur cette origine). Classes Tailwind seulement, aucun attribut style : la CSP de l'origine est style-src 'self'.
// Liens vers restoclair.fr par l'adresse complète. Les documents juridiques s'ouvrent dans un nouvel onglet, sans accès à
// celui-ci ; « Retour au site » quitte l'espace dans le même onglet. Aucun referrer dans les deux cas (meta de index.html).
// Pages de connexion (CadreConnexion) : en-tête sans filet, contenu sur toute la hauteur, pied de page léger ; les liens
// des documents juridiques restent sur chaque page.
const PAGES_CONNEXION = [CHEMINS_COMPTE.connexion, CHEMINS_COMPTE.motDePasse, CHEMINS_COMPTE.motDePasseOublie];

export default function LayoutCompte({ children }) {
  const accueil = adresseSite(SITE_URL);
  const documents = liensDocuments(SITE_URL, DOCUMENTS);
  const { pathname } = useLocation();
  // Mêmes règles que <Routes> : barre finale et casse ignorées (/connexion/ affiche aussi la connexion).
  const connexion = PAGES_CONNEXION.some((chemin) => matchPath(chemin, pathname) !== null);

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className={connexion ? "bg-paper" : "bg-paper border-b border-border"}>
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link to={CHEMINS_COMPTE.espace} className="flex items-center gap-3">
              <img src={ICONE} alt="" className="w-[38px] h-[38px] object-cover mix-blend-multiply" />
              <span className="font-serif font-semibold text-[26px] text-ink">RestOclair</span>
            </Link>
            {accueil && (
              <a href={accueil} className="text-[15px] text-muted hover:text-ink transition-colors">
                Retour au site
              </a>
            )}
          </div>
        </div>
      </header>

      <main className={connexion ? "flex-1 flex flex-col" : "flex-1"}>{children}</main>

      {connexion ? (
        <footer className="border-t border-border">
          <div className="max-w-[1200px] mx-auto px-6 py-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between text-[13px] text-faint">
            <p>
              Une question ? <a href={`mailto:${BUSINESS.email}`} className="inline-flex items-center min-h-[28px] underline underline-offset-2 hover:text-ink">{BUSINESS.email}</a>
            </p>
            {documents.length > 0 && (
              <nav aria-label="Documents juridiques" className="flex flex-wrap gap-x-4 gap-y-1.5">
                {documents.map((doc) => (
                  <a key={doc.cle} href={doc.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[28px] hover:text-ink hover:underline">
                    {doc.libelle}
                  </a>
                ))}
              </nav>
            )}
          </div>
        </footer>
      ) : (
      <footer className="bg-ink">
        <div className="max-w-[1200px] mx-auto px-6 py-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-[14px] text-bottle-muted">
            Une question ? <a href={`mailto:${BUSINESS.email}`} className="hover:underline">{BUSINESS.email}</a>
          </p>
          {documents.length > 0 && (
            <nav aria-label="Documents juridiques" className="flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
              {documents.map((doc) => (
                <a key={doc.cle} href={doc.href} target="_blank" rel="noopener noreferrer" className="text-bottle-muted hover:underline">
                  {doc.libelle}
                </a>
              ))}
            </nav>
          )}
        </div>
      </footer>
      )}
    </div>
  );
}
