import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const navigation = [
  { name: "Services", page: "Services" },
  { name: "Blog", page: "Blog" },
  { name: "A propos", page: "About" },
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

            <a
              href="tel:0680952589"
              className="hidden md:block text-[15px] font-medium text-bottle hover:text-bottle-hover transition-colors"
            >
              06 80 95 25 89
            </a>

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

      <footer className="border-t border-border">
        <div className="max-w-[1200px] mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to={createPageUrl("Home")} className="flex items-center gap-2">
            <img
              src="/img_6598.jpeg"
              alt="RestOclair"
              className="w-[28px] h-[28px] object-cover mix-blend-multiply"
            />
            <span className="font-serif font-semibold text-lg text-ink">RestOclair</span>
          </Link>
          <p className="text-faint text-sm text-center md:text-right">
            Hygiene et securite alimentaire · Ile-de-France · 06 80 95 25 89 · © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
