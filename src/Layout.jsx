import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Phone, X, Shield, ChefHat } from "lucide-react";

const navigation = [
  { name: "Accueil", page: "Home" },
  { name: "Services", page: "Services" },
  { name: "Blog", page: "Blog" },
  { name: "À Propos", page: "About" },
  { name: "Contact", page: "Contact" }
];

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to={createPageUrl("Home")} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-bold text-xl md:text-xl text-slate-900">Rest</span>
                <span className="font-light text-xl md:text-xl text-emerald-600">Oclair</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navigation.map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`text-sm font-medium transition-colors hover:text-emerald-600 ${
                    currentPageName === item.page ? "text-emerald-600" : "text-slate-700"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-4">
              <a href="tel:0680952589" className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-emerald-600 transition-colors">
                <Phone className="w-4 h-4" />
                06 80 95 25 89
              </a>
              <Link to={createPageUrl("Contact")}>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  Demander un devis
                </Button>
              </Link>
            </div>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col h-full py-6">
                  {/* Mobile Logo */}
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                      <Shield className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-2xl text-slate-900">Rest</span>
                      <span className="font-light text-2xl text-emerald-600">Oclair</span>
                    </div>
                  </div>

                  {/* Mobile Nav */}
                  <nav className="flex flex-col gap-2 flex-1">
                    {navigation.map((item) => (
                      <Link
                        key={item.page}
                        to={createPageUrl(item.page)}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`px-4 py-4 rounded-lg text-lg font-medium transition-colors ${
                          currentPageName === item.page 
                            ? "bg-emerald-50 text-emerald-600" 
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </nav>

                  {/* Mobile CTA */}
                  <div className="space-y-4 pt-6 border-t border-slate-200">
                    <a 
                      href="tel:0680952589" 
                      className="flex items-center justify-center gap-2 py-4 text-lg text-slate-700 hover:text-emerald-600 transition-colors"
                    >
                      <Phone className="w-6 h-6" />
                      06 80 95 25 89
                    </a>
                    <Link to={createPageUrl("Contact")} onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg py-6">
                        Demander un devis
                      </Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white">
        <div className="container mx-auto px-6 lg:px-12 py-16">
          <div className="grid md:grid-cols-4 gap-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="font-bold text-xl">Rest</span>
                  <span className="font-light text-xl text-emerald-400">Oclair</span>
                </div>
              </div>
              <p className="text-slate-400 max-w-md leading-relaxed mb-6">
                Conseil en hygiène et sécurité alimentaire pour les restaurateurs. 
                Transformez vos obligations réglementaires en atouts pour votre établissement.
              </p>
              <a href="tel:0680952589" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
                <Phone className="w-5 h-5" />
                06 80 95 25 89
              </a>
            </div>

            {/* Navigation */}
            <div>
              <h4 className="font-semibold text-lg mb-6">Navigation</h4>
              <nav className="space-y-4">
                {navigation.map((item) => (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className="block text-slate-400 hover:text-white transition-colors"
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-semibold text-lg mb-6">Services</h4>
              <nav className="space-y-4">
                <Link to={createPageUrl("Services?service=urgence")} className="block text-slate-400 hover:text-white transition-colors">
                  Urgence DDPP
                </Link>
                <Link to={createPageUrl("Services?service=audit")} className="block text-slate-400 hover:text-white transition-colors">
                  Audit Hygiène
                </Link>
                <Link to={createPageUrl("Services?service=administratif")} className="block text-slate-400 hover:text-white transition-colors">
                  Accompagnement Administratif
                </Link>
                <Link to={createPageUrl("Blog")} className="block text-slate-400 hover:text-white transition-colors">
                  Blog & Conseils
                </Link>
              </nav>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} RestOclair. Tous droits réservés.
            </p>
            <p className="text-slate-500 text-sm">
              Expert en sécurité alimentaire • Île-de-France
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}