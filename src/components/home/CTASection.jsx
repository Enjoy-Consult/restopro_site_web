import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Phone, ArrowRight, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CTASection() {
  return (
    <section className="py-16 md:py-24 bg-emerald-600 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500 rounded-full blur-3xl opacity-50 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-700 rounded-full blur-3xl opacity-50 translate-x-1/2 translate-y-1/2" />
      
      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-full mb-8">
              <Shield className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">Intervention rapide garantie</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Besoin d'un accompagnement ?
              <span className="block mt-2">Parlons-en dès maintenant.</span>
            </h2>

            <p className="text-xl md:text-xl text-emerald-100 mb-10 max-w-2xl mx-auto leading-relaxed">
              Que vous fassiez face à un contrôle DDPP ou que vous souhaitiez 
              anticiper, nous sommes là pour vous aider.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={createPageUrl("Contact")} className="w-full sm:w-auto">
                <Button size="lg" className="w-full bg-white text-emerald-600 hover:bg-emerald-50 px-8 py-7 text-xl md:text-lg rounded-xl shadow-lg transition-all hover:shadow-xl">
                  Demander une intervention
                  <ArrowRight className="ml-2 w-6 h-6 md:w-5 md:h-5" />
                </Button>
              </Link>
              <a href="tel:0680952589" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full border-2 border-white text-white hover:bg-white/10 px-8 py-7 text-xl md:text-lg rounded-xl">
                  <Phone className="mr-2 w-6 h-6 md:w-5 md:h-5" />
                  06 80 95 25 89
                </Button>
              </a>
            </div>

            <p className="text-emerald-200 mt-8 text-lg md:text-base">
              Réponse sous 2h • Intervention sous 24h en cas d'urgence
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}