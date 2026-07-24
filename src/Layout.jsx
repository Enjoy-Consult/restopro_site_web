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

      <footer className="border-t border-border bg-white" itemScope itemType="https://schema.org/ProfessionalService">
        <div className="max-w-[1200px] mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Identite */}
            <div className="flex flex-col gap-3">
              <Link to={createPageUrl("Home")} className="flex items-center gap-2">
                <img
                  src="/img_6598.jpeg"
                  alt="RestOclair"
                  className="w-[28px] h-[28px] object-cover mix-blend-multiply"
                />
                <span className="font-serif font-semibold text-lg text-ink" itemProp="name">RestOclair</span>
              </Link>
              <p className="text-muted text-sm leading-relaxed" itemProp="description">
                Conseil en hygiène et sécurité alimentaire pour les professionnels. Intervention partout en France.
              </p>
            </div>

            {/* NAP */}
            <div className="flex flex-col gap-2 text-sm" itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
              <p className="font-semibold text-ink mb-1">Coordonnées</p>
              <p className="text-muted">
                <span itemProp="streetAddress">{BUSINESS.address.streetAddress}</span>
              </p>
              <p className="text-muted">
                <span itemProp="postalCode">{BUSINESS.address.postalCode}</span>{" "}
                <span itemProp="addressLocality">{BUSINESS.address.city}</span>,{" "}
                <span itemProp="addressRegion">{BUSINESS.address.region}</span>
              </p>
              <a
                href={BUSINESS.phone.href}
                className="text-ink font-medium hover:underline"
                itemProp="telephone"
              >
                {BUSINESS.phone.display}
              </a>
              <a
                href={`mailto:${BUSINESS.email}`}
                className="text-muted hover:underline"
              >
                <span itemProp="email">{BUSINESS.email}</span>
              </a>
              <meta itemProp="addressCountry" content="FR" />
            </div>

            {/* Zones d'intervention */}
            <div className="flex flex-col gap-2 text-sm">
              <p className="font-semibold text-ink mb-1">Zones d'intervention</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted">
                {BUSINESS.serviceAreas.map(area => (
                  <span key={area}>{area}</span>
                ))}
              </div>
              <p className="text-faint text-xs mt-2">Lun-Ven 7h-20h · Sam 8h-18h</p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-3">
            <nav className="flex gap-4 text-sm text-muted">
              {navigation.map(item => (
                <Link key={item.page} to={createPageUrl(item.page)} className="hover:text-ink transition-colors">
                  {item.name}
                </Link>
              ))}
              <Link to={createPageUrl("Sitemap")} className="hover:text-ink transition-colors">Plan du site</Link>
            </nav>
            <p className="text-faint text-xs">
              © {new Date().getFullYear()} {BUSINESS.name} · SIRET en cours · Tous droits réservés
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
