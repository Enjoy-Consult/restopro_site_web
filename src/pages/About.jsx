import React from "react";
import { motion } from "framer-motion";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { 
  Award, Users, Target, Heart, ArrowRight, Phone,
  CheckCircle, Shield, Clock, Lightbulb
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const values = [
  {
    icon: Heart,
    title: "Bienveillance",
    description: "Pas de jugement, que des solutions. Nous comprenons la pression du métier de restaurateur."
  },
  {
    icon: Target,
    title: "Efficacité",
    description: "Des recommandations concrètes et applicables immédiatement, pas de théorie inutile."
  },
  {
    icon: Users,
    title: "Proximité",
    description: "Un interlocuteur unique qui connaît votre établissement et vos enjeux."
  },
  {
    icon: Lightbulb,
    title: "Pédagogie",
    description: "Nous expliquons, formons et accompagnons pour vous rendre autonome."
  }
];

const timeline = [
  { year: "2010", title: "Débuts en restauration", desc: "Expérience terrain en cuisine et management d'équipe" },
  { year: "2015", title: "Expert qualité", desc: "Responsable qualité et sécurité alimentaire en groupe de restauration" },
  { year: "2018", title: "Formation HACCP", desc: "Certification formateur en hygiène alimentaire" },
  { year: "2022", title: "Création Enjoy Consult", desc: "Lancement du cabinet de conseil dédié aux restaurateurs" }
];

export default function About() {
  return (
    <>
      <SEO 
        title="À Propos - Thierry Bailleul, Expert Sécurité Alimentaire"
        description="Thierry Bailleul, consultant en hygiène et sécurité alimentaire depuis 15 ans. Expert terrain en restauration, formateur HACCP certifié. Plus de 200 restaurants accompagnés en Île-de-France."
        keywords="Thierry Bailleul, consultant hygiène alimentaire, expert sécurité alimentaire, formateur HACCP, consultant DDPP, expérience restauration, expert sanitaire Paris"
        canonicalUrl={`${window.location.origin}${window.location.pathname}`}
      />
      <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-24 bg-gradient-to-br from-slate-50 to-emerald-50 overflow-hidden">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">À Propos</span>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-4 mb-6">
                Un expert terrain à vos côtés
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                Fondé par Thierry Bailleul, <strong>Enjoy Consult</strong> est né d'une conviction : 
                les restaurateurs méritent un accompagnement humain, pragmatique et sans jugement 
                pour faire face à leurs obligations sanitaires.
              </p>
              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                Fort de plus de 15 ans d'expérience dans le secteur de la restauration et de la 
                sécurité alimentaire, je connais vos réalités quotidiennes et vos contraintes. 
                Mon objectif : transformer vos obligations en atouts pour votre établissement.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to={createPageUrl("Contact")}>
                  <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6">
                    Me contacter
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl transform rotate-3" />
                <img 
                  src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&h=700&fit=crop"
                  alt="Thierry Bailleul, consultant expert en hygiène et sécurité alimentaire pour restaurants professionnels"
                  className="relative rounded-3xl shadow-2xl w-full h-[500px] object-cover"
                />
              </div>

              {/* Stats Card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-6 grid grid-cols-2 gap-6"
              >
                <div className="text-center">
                  <p className="text-3xl font-bold text-emerald-600">15+</p>
                  <p className="text-sm text-slate-500">Années d'expérience</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-emerald-600">200+</p>
                  <p className="text-sm text-slate-500">Restaurants accompagnés</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24">
        <div className="container mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">Nos Valeurs</span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-4 mb-6">
              Une approche différente du conseil
            </h2>
            <p className="text-lg text-slate-600">
              Pas de jargon technique, pas de rapports interminables. 
              Juste des solutions concrètes et un accompagnement humain.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-slate-50 rounded-2xl p-8 text-center hover:bg-emerald-50 transition-colors"
                >
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Icon className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{value.title}</h3>
                  <p className="text-slate-600">{value.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-24 bg-slate-900">
        <div className="container mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="text-emerald-400 font-semibold text-sm uppercase tracking-wider">Parcours</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-4 mb-6">
              15 ans d'expertise terrain
            </h2>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            {timeline.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="relative pl-8 pb-12 last:pb-0"
              >
                {/* Line */}
                {index !== timeline.length - 1 && (
                  <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-emerald-800" />
                )}
                
                {/* Dot */}
                <div className="absolute left-0 top-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-slate-900" />
                
                {/* Content */}
                <div className="bg-slate-800 rounded-xl p-6">
                  <span className="text-emerald-400 font-bold">{item.year}</span>
                  <h3 className="text-xl font-bold text-white mt-2 mb-2">{item.title}</h3>
                  <p className="text-slate-400">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-emerald-600">
        <div className="container mx-auto px-6 lg:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Prêt à travailler ensemble ?
            </h2>
            <p className="text-xl text-emerald-100 mb-10">
              Discutons de vos besoins et trouvons ensemble la meilleure solution pour votre établissement.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={createPageUrl("Contact")}>
                <Button size="lg" className="bg-white text-emerald-600 hover:bg-emerald-50 px-8 py-6 text-lg">
                  Prendre contact
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href="tel:0680952589">
                <Button variant="outline" size="lg" className="border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg">
                  <Phone className="mr-2 w-5 h-5" />
                  06 80 95 25 89
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
    </>
  );
}