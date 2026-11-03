import React from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import SEO from "@/components/SEO";
import { BUSINESS } from "@/lib/business-info";
import { DOCUMENTS_LEGAUX } from "@/content/legal";

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

export default function DocumentLegal({ cle, avant = null }) {
  const doc = DOCUMENTS_LEGAUX[cle];
  return (
    <>
      <SEO title={doc.titre} description={doc.description} canonicalUrl={`${BUSINESS.url}${doc.chemin}`} noindex />
      <article className="max-w-[800px] mx-auto px-5 md:px-6 py-12 md:py-16">
        <p className="text-bottle text-[12px] font-medium uppercase tracking-[0.14em] mb-4">
          {doc.portee === "application" ? "Application RestOclair" : "Site restoclair.fr"}
        </p>
        {avant}
        <div className="prose-editorial text-[15px] [&_h1]:text-ink [&_h1]:mb-3 [&_h1]:text-[clamp(1.9rem,4.5vw,2.75rem)] [&_ul]:list-disc [&_ol]:list-decimal [&_h2]:scroll-mt-24 [&_h1+p]:text-faint [&_h1+p]:text-[14px]">
          <ReactMarkdown components={COMPOSANTS}>{doc.source}</ReactMarkdown>
        </div>
      </article>
    </>
  );
}
