import React from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import SEO from "@/components/SEO";
import { BUSINESS } from "@/lib/business-info";
import { DOCUMENTS_LEGAUX } from "@/content/legal";
import PageNotFound from "@/lib/PageNotFound";

// Rendu des éléments Markdown dans le style du site.
const COMPOSANTS = {
  // `[À COMPLÉTER : …]` est écrit en code dans les sources : on le surligne pour qu'il ne passe pas inaperçu.
  code: ({ children }) => (
    <mark className="bg-[#fbefc9] text-[#5c4300] px-1 py-0.5 rounded-sm font-sans not-italic">{children}</mark>
  ),
  a: ({ href = "", children }) =>
    href.startsWith("/") ? (
      <Link to={href}>{children}</Link>
    ) : (
      <a href={href} target={href.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer">
        {children}
      </a>
    ),
  // L'avertissement « Projet à faire relire par un avocat » est la première citation de chaque document.
  blockquote: ({ children }) => (
    <div role="note" className="not-italic border-l-2 border-bottle bg-[#eaf0ea] px-4 py-3 my-6 [&_p]:mb-0 [&_p]:text-bottle">
      {children}
    </div>
  ),
};

// `nu` : sans en-tête ni pied de page (pages de l'application, servies aussi aux magasins d'applications).
export default function DocumentLegal({ cle, nu = false, avant = null, apres = null }) {
  const doc = DOCUMENTS_LEGAUX[cle];
  const { version: demandee } = useParams();
  const version = demandee ?? doc.versionEnVigueur;
  const source = doc.sources[version];
  if (!source) return <PageNotFound />;
  const archivee = version !== doc.versionEnVigueur;
  const chemin = demandee ? `${doc.chemin}/${version}` : doc.chemin;

  return (
    <div className={nu ? "min-h-screen bg-paper" : undefined}>
      <SEO title={doc.titre} description={doc.description} canonicalUrl={`${BUSINESS.url}${chemin}`} noindex />
      <article className="max-w-[800px] mx-auto px-5 md:px-6 py-12 md:py-16">
        {!nu && (
          <p className="text-bottle text-[12px] font-medium uppercase tracking-[0.14em] mb-4">
            {doc.portee === "application" ? "Application RestOclair" : "Site restoclair.fr"}
          </p>
        )}
        {archivee && (
          <p role="note" className="text-muted text-[14px] border-l-2 border-border pl-3 mb-6">
            Version {version}, qui n’est plus en vigueur.{" "}
            <Link to={doc.chemin} className="link-underline">Lire la version en vigueur</Link>
          </p>
        )}
        {avant}
        <div className="prose-editorial text-[15px] [&_h1]:text-ink [&_h1]:mb-3 [&_h1]:text-[clamp(1.9rem,4.5vw,2.75rem)] [&_ul]:list-disc [&_ol]:list-decimal [&_h2]:scroll-mt-24 [&_h1+p]:text-faint [&_h1+p]:text-[14px]">
          <ReactMarkdown components={COMPOSANTS}>{source}</ReactMarkdown>
        </div>
        {apres}
      </article>
    </div>
  );
}
