import React from "react";
import { motion } from "framer-motion";
import { Clock, Award, Users, Lightbulb } from "lucide-react";

const reasons = [
  {
    icon: Clock,
    title: "Réactivité maximale",
    description: "Intervention sous 24h en cas d'urgence. Nous comprenons que chaque jour de fermeture impacte votre activité."
  },
  {
    icon: Award,
    title: "Expertise terrain",
    description: "15 ans d'expérience en restauration et sécurité alimentaire. Nous connaissons vos réalités quotidiennes."
  },
  {
    icon: Users,
    title: "Approche humaine",
    description: "Pas de jugement, que des solutions. Nous vous accompagnons avec pédagogie et bienveillance."
  },
  {
    icon: Lightbulb,
    title: "Solutions concrètes",
    description: "Des recommandations pratiques et adaptées à votre établissement, pas de théorie inapplicable."
  }
];

export default function WhyUsSection() {
  return (
    <section className="py-24 bg-slate-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v22H20v-1.5zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-emerald-400 font-semibold text-sm uppercase tracking-wider">Pourquoi Nous Choisir</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-4 mb-6">
            Un partenaire de confiance pour votre sérénité
          </h2>
          <p className="text-lg text-slate-400">
            Nous ne sommes pas là pour pointer du doigt, mais pour vous aider 
            à transformer vos contraintes réglementaires en atouts.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {reasons.map((reason, index) => {
            const Icon = reason.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Icon className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{reason.title}</h3>
                <p className="text-slate-400 leading-relaxed">{reason.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}