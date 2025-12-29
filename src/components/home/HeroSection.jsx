import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Phone, Shield, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Decorative Elements */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.1, scale: 1 }}
        transition={{ duration: 1.5 }}
        className="absolute top-20 right-20 w-96 h-96 bg-emerald-500 rounded-full blur-3xl"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.08, scale: 1 }}
        transition={{ duration: 1.5, delay: 0.3 }}
        className="absolute bottom-20 left-10 w-72 h-72 bg-amber-400 rounded-full blur-3xl"
      />

      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full mb-6">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Expert en sécurité alimentaire</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 leading-tight mb-6">
              Votre conformité
              <span className="block text-emerald-600">sanitaire simplifiée</span>
            </h1>

            <p className="text-xl md:text-xl text-slate-600 leading-relaxed mb-8 max-w-xl">
              Accompagnement sur-mesure pour les restaurateurs. 
              Contrôles DDPP, audits hygiène et mise en conformité — 
              nous transformons vos obligations en tranquillité d'esprit.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link to={createPageUrl("Contact")} className="w-full sm:w-auto">
                <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-7 text-xl rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:shadow-xl hover:shadow-emerald-600/30">
                  Demander une intervention
                  <ArrowRight className="ml-2 w-6 h-6" />
                </Button>
              </Link>
              <a href="tel:0680952589" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full px-8 py-7 text-xl rounded-xl border-2 border-slate-200 hover:border-emerald-600 hover:text-emerald-600">
                  <Phone className="mr-2 w-6 h-6" />
                  06 80 95 25 89
                </Button>
              </a>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-200">
              <div className="text-center">
                <p className="text-3xl md:text-3xl font-bold text-slate-900">15+</p>
                <p className="text-sm md:text-sm text-slate-500 leading-tight">Années d'expérience</p>
              </div>
              <div className="text-center border-x border-slate-200">
                <p className="text-3xl md:text-3xl font-bold text-slate-900">200+</p>
                <p className="text-sm md:text-sm text-slate-500 leading-tight">Restaurants accompagnés</p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-3xl font-bold text-slate-900">100%</p>
                <p className="text-sm md:text-sm text-slate-500 leading-tight">Conformité obtenue</p>
              </div>
            </div>
          </motion.div>

          {/* Right Image */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl transform rotate-3" />
              <img 
                src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=700&fit=crop"
                alt="Consultant en hygiène alimentaire inspectant une cuisine professionnelle de restaurant avec un chef cuisinier"
                className="relative rounded-3xl shadow-2xl w-full h-[600px] object-cover"
              />
              
              {/* Floating Card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-6 max-w-xs"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Shield className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Intervention sous 24h</p>
                    <p className="text-sm text-slate-500">En cas d'urgence DDPP</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}