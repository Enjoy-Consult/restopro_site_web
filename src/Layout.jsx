import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BUSINESS } from "@/lib/business-info";

const navigation = [
  { name: "Services", page: "Services" },
  { name: "Blog", page: "Blog" },
  { name: "À propos", page: "About" },
  { name: "Contact", page: "Contact" }
];

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="sticky top-0 z-50 bg-paper border-b border-border">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl("Home")} className="flex items-center gap-3">
              <img
                src="/img_6598.jpeg"
                alt="RestOclair"
                className="w-[38px] h-[38px] object-cover mix-blend-multiply"
              />
              <span className="font-serif font-semibold text-[26px] text-ink">RestOclair</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              {navigation.map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`text-[15px] font-sans transition-colors ${
                    currentPageName === item.page ? "text-ink font-medium" : "text-muted hover:text-ink"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-4">
              <a
                href="tel:0680952589"
                className="text-[15px] font-medium text-bottle hover:text-bottle-hover transition-colors"
              >
                06 80 95 25 89
              </a>
              <Link
                to={createPageUrl("Contact")}
                className="btn-primary text-[14px] px-4 py-2"
              >
                Prendre contact
              </Link>
            </div>

            <button
              className="md:hidden p-2 text-ink"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-paper px-6 py-6">
            <nav className="flex flex-col gap-4">
              {navigation.map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-[17px] ${
                    currentPageName === item.page ? "text-ink font-medium" : "text-muted"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
            <hr className="rule my-4" />
            <a
              href="tel:0680952589"
              className="text-[17px] font-medium text-bottle"
            >
              06 80 95 25 89
            </a>
          </div>
        )}
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-ink" itemScope itemType="https://schema.org/ProfessionalService">
        <div className="max-w-[1200px] mx-auto px-6 pt-16 pb-8">
          {/* Top row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
            {/* Brand + description */}
            <div className="md:col-span-5 flex flex-col gap-5">
              <Link to={createPageUrl("Home")} className="flex items-center gap-2.5">
                <img
                  src="/img_6598.jpeg"
                  alt="RestOclair"
                  className="w-[36px] h-[36px] object-cover rounded-sm brightness-110"
                />
                <span className="font-serif font-semibold text-xl text-paper" itemProp="name">RestOclair</span>
              </Link>
              <p className="text-paper/50 text-sm leading-relaxed max-w-[320px]" itemProp="description">
                Conseil en hygiene et securite alimentaire pour les professionnels de la restauration. Intervention partout en France.
              </p>
              <div className="flex gap-5 mt-1">
                <a
                  href={BUSINESS.phone.href}
                  className="text-paper/70 text-sm hover:text-paper transition-colors"
                  itemProp="telephone"
                >
                  {BUSINESS.phone.display}
                </a>
                <a
                  href={`mailto:${BUSINESS.email}`}
                  className="text-paper/70 text-sm hover:text-paper transition-colors"
                >
                  <span itemProp="email">{BUSINESS.email}</span>
                </a>
              </div>
            </div>

            {/* Nav links */}
            <div className="md:col-span-3">
              <p className="text-paper/40 text-xs font-medium uppercase tracking-wider mb-4">Navigation</p>
              <nav className="flex flex-col gap-2.5">
                {navigation.map(item => (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className="text-paper/70 text-sm hover:text-paper transition-colors w-fit"
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Address */}
            <div className="md:col-span-4" itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
              <p className="text-paper/40 text-xs font-medium uppercase tracking-wider mb-4">Adresse</p>
              <p className="text-paper/70 text-sm leading-relaxed">
                <span itemProp="streetAddress">{BUSINESS.address.streetAddress}</span><br />
                <span itemProp="postalCode">{BUSINESS.address.postalCode}</span>{" "}
                <span itemProp="addressLocality">{BUSINESS.address.city}</span>
              </p>
              <meta itemProp="addressCountry" content="FR" />
              <p className="text-paper/40 text-xs font-medium uppercase tracking-wider mb-4 mt-8">Zones d'intervention</p>
              <p className="text-paper/70 text-sm leading-relaxed">
                {BUSINESS.serviceAreas.join(" \u00B7 ")}
              </p>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-14 pt-6 border-t border-paper/10 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-paper/30 text-xs">
              &copy; {new Date().getFullYear()} {BUSINESS.name}
            </p>
            <nav className="flex flex-wrap gap-5 text-xs">
              <Link to={createPageUrl("MentionsLegales")} className="text-paper/40 hover:text-paper/70 transition-colors">Mentions legales</Link>
              <Link to={createPageUrl("PolitiqueConfidentialite")} className="text-paper/40 hover:text-paper/70 transition-colors">Confidentialite</Link>
              <Link to={createPageUrl("Sitemap")} className="text-paper/40 hover:text-paper/70 transition-colors">Plan du site</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
