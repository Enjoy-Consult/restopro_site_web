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

      <footer className="border-t border-border bg-[#1a1a1a] text-white/80" itemScope itemType="https://schema.org/ProfessionalService">
        <div className="max-w-[1200px] mx-auto px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="md:col-span-1 flex flex-col gap-4">
              <Link to={createPageUrl("Home")} className="flex items-center gap-2">
                <img
                  src="/img_6598.jpeg"
                  alt="RestOclair"
                  className="w-[32px] h-[32px] object-cover rounded"
                />
                <span className="font-serif font-semibold text-lg text-white" itemProp="name">RestOclair</span>
              </Link>
              <p className="text-white/60 text-sm leading-relaxed" itemProp="description">
                Conseil en hygiene et securite alimentaire pour les professionnels de la restauration.
              </p>
            </div>

            {/* Navigation */}
            <div className="flex flex-col gap-3">
              <p className="text-white font-medium text-sm uppercase tracking-wide mb-1">Navigation</p>
              {navigation.map(item => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className="text-white/60 text-sm hover:text-white transition-colors"
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Contact */}
            <div className="flex flex-col gap-3" itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
              <p className="text-white font-medium text-sm uppercase tracking-wide mb-1">Contact</p>
              <a
                href={BUSINESS.phone.href}
                className="text-white/60 text-sm hover:text-white transition-colors"
                itemProp="telephone"
              >
                {BUSINESS.phone.display}
              </a>
              <a
                href={`mailto:${BUSINESS.email}`}
                className="text-white/60 text-sm hover:text-white transition-colors"
              >
                <span itemProp="email">{BUSINESS.email}</span>
              </a>
              <p className="text-white/60 text-sm">
                <span itemProp="streetAddress">{BUSINESS.address.streetAddress}</span><br />
                <span itemProp="postalCode">{BUSINESS.address.postalCode}</span>{" "}
                <span itemProp="addressLocality">{BUSINESS.address.city}</span>
              </p>
              <meta itemProp="addressCountry" content="FR" />
            </div>

            {/* Zones */}
            <div className="flex flex-col gap-3">
              <p className="text-white font-medium text-sm uppercase tracking-wide mb-1">Intervention</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-white/60 text-sm">
                {BUSINESS.serviceAreas.map(area => (
                  <span key={area}>{area}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/40 text-xs">
              &copy; {new Date().getFullYear()} {BUSINESS.name} &middot; Tous droits reserves
            </p>
            <nav className="flex flex-wrap gap-4 text-xs text-white/40">
              <Link to={createPageUrl("MentionsLegales")} className="hover:text-white/70 transition-colors">Mentions legales</Link>
              <Link to={createPageUrl("PolitiqueConfidentialite")} className="hover:text-white/70 transition-colors">Politique de confidentialite</Link>
              <Link to={createPageUrl("Sitemap")} className="hover:text-white/70 transition-colors">Plan du site</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
