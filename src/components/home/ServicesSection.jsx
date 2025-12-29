import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ClipboardCheck, FileText, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const services = [
  {
    id: "urgence",
    icon: AlertTriangle,
    title: "Service d'Urgence DDPP",
    subtitle: "Réagissez vite, restez ouvert",
    description: "Suite à un contrôle sanitaire révélant des non-conformités, nous intervenons en urgence pour remettre votre établissement en conformité et éviter toute fermeture administrative.",
    features: [
      "Intervention sous 24h",
      "Diagnostic rapide des points critiques",
      "Mise en place immédiate de solutions",
      "Suivi jusqu'à levée des non-conformités"
    ],
    color: "red",
    link: "Services?service=urgence"
  },
  {
    id: "audit",
    icon: ClipboardCheck,
    title: "Audit Hygiène & Organisation",
    subtitle: "Anticipez, corrigez, maîtrisez",
    description: "Analyse complète de votre cuisine : inspection des locaux, vérification des équipements, observation des pratiques. Préparez-vous sereinement aux contrôles DDPP.",
    features: [
      "Inspection complète sur site",
      "Rapport détaillé et opérationnel",
      "Recommandations personnalisées",
      "Plan d'actions correctives"
    ],
    color: "blue",
    link: "Services?service=audit"
  },
  {
    id: "administratif",
    icon: FileText,
    title: "Accompagnement Administratif",
    subtitle: "Votre restaurant en règle",
    description: "Plan de Maîtrise Sanitaire, CERFA, obligations EGAlim... Nous créons et mettons à jour tous vos documents obligatoires pour une conformité totale.",
    features: [
      "Création PMS personnalisé",
      "Mise à jour documents légaux",
      "Conformité loi EGAlim",
      "Formation équipe incluse"
    ],
    color: "emerald",
    link: "Services?service=administratif"
  }
];

const colorClasses = {
  red: {
    bg: "bg-red-50",
    iconBg: "bg-red-100",
    icon: "text-red-600",
    border: "border-red-200",
    hover: "group-hover:border-red-400"
  },
  blue: {
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
    icon: "text-blue-600",
    border: "border-blue-200",
    hover: "group-hover:border-blue-400"
  },
  emerald: {
    bg: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    icon: "text-emerald-600",
    border: "border-emerald-200",
    hover: "group-hover:border-emerald-400"
  }
};

export default function ServicesSection() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">Nos Services</span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-4 mb-6">
            Un accompagnement complet pour votre conformité
          </h2>
          <p className="text-lg text-slate-600">
            De l'urgence à la prévention, nous vous accompagnons à chaque étape 
            pour garantir la sécurité alimentaire de votre établissement.
          </p>
        </motion.div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const colors = colorClasses[service.color];
            const Icon = service.icon;
            
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="group"
              >
                <div className={`h-full rounded-2xl border-2 ${colors.border} ${colors.hover} p-8 transition-all duration-300 hover:shadow-xl`}>
                  {/* Icon */}
                  <div className={`w-14 h-14 ${colors.iconBg} rounded-xl flex items-center justify-center mb-6`}>
                    <Icon className={`w-7 h-7 ${colors.icon}`} />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{service.title}</h3>
                  <p className="text-sm font-medium text-slate-500 mb-4">{service.subtitle}</p>
                  <p className="text-slate-600 mb-6 leading-relaxed">{service.description}</p>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm text-slate-700">
                        <div className={`w-1.5 h-1.5 rounded-full ${colors.icon.replace('text-', 'bg-')}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link to={createPageUrl(service.link)}>
                    <Button variant="ghost" className="group/btn p-0 h-auto font-semibold text-slate-900 hover:text-emerald-600 hover:bg-transparent">
                      En savoir plus
                      <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}