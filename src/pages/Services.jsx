import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, ClipboardCheck, FileText, ArrowRight, Phone,
  CheckCircle, Clock, Shield, Users, FileCheck, BookOpen
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const services = {
  urgence: {
    id: "urgence",
    icon: AlertTriangle,
    color: "red",
    title: "Service d'Urgence DDPP",
    subtitle: "Réagissez vite, restez ouvert !",
    heroImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=600&fit=crop",
    description: "Suite à un contrôle sanitaire révélant des non-conformités — qu'elles soient mineures, moyennes ou majeures — voire une mise en demeure, nous intervenons en urgence pour remettre votre restaurant en conformité.",
    objectives: [
      "Éviter toute mise en demeure ou fermeture administrative",
      "Protéger votre chiffre d'affaires en limitant les interruptions",
      "Garantir une qualité sanitaire irréprochable"
    ],
    approach: [
      { icon: Clock, title: "Diagnostic rapide", desc: "Analyse ciblée des points critiques identifiés lors du contrôle" },
      { icon: Shield, title: "Actions immédiates", desc: "Mise en place des solutions correctives prioritaires" },
      { icon: Users, title: "Formation express", desc: "Sensibilisation du personnel aux bonnes pratiques" },
      { icon: CheckCircle, title: "Suivi personnalisé", desc: "Accompagnement jusqu'à la levée des non-conformités" }
    ],
    pricing: "Sur devis selon la situation",
    delay: "Intervention sous 24h"
  },
  audit: {
    id: "audit",
    icon: ClipboardCheck,
    color: "blue",
    title: "Audit Hygiène & Organisation",
    subtitle: "Anticipez, corrigez, maîtrisez",
    heroImage: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=1200&h=600&fit=crop",
    description: "Nous réalisons une analyse complète de la structure et de l'organisation de votre cuisine : inspection des locaux, vérification des équipements, observation des pratiques en place.",
    objectives: [
      "Identifier les écarts sanitaires avant qu'ils ne deviennent problématiques",
      "Anticiper les remarques des inspecteurs DDPP",
      "Obtenir un rapport clair et opérationnel"
    ],
    approach: [
      { icon: ClipboardCheck, title: "Inspection complète", desc: "Audit exhaustif de vos locaux, équipements et process" },
      { icon: FileCheck, title: "Rapport détaillé", desc: "Document précis avec photos et recommandations" },
      { icon: BookOpen, title: "Plan d'actions", desc: "Roadmap priorisée pour la mise en conformité" },
      { icon: Users, title: "Debriefing équipe", desc: "Présentation des résultats et sensibilisation" }
    ],
    pricing: "À partir de 350€ HT",
    delay: "RDV sous 48h"
  },
  administratif: {
    id: "administratif",
    icon: FileText,
    color: "emerald",
    title: "Accompagnement Administratif",
    subtitle: "Votre restaurant en règle",
    heroImage: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&h=600&fit=crop",
    description: "Nous réalisons un audit complet de votre conformité réglementaire et créons tous les documents obligatoires : Plan de Maîtrise Sanitaire, CERFA, obligations EGAlim.",
    objectives: [
      "Disposer d'un PMS personnalisé et à jour",
      "Respecter les obligations d'information client",
      "Être conforme aux lois EGAlim et Climat & Résilience"
    ],
    approach: [
      { icon: FileText, title: "Audit documentaire", desc: "Revue complète de vos documents existants" },
      { icon: Shield, title: "Création PMS", desc: "Plan de Maîtrise Sanitaire adapté à votre activité" },
      { icon: CheckCircle, title: "Mise en conformité", desc: "Allergènes, traçabilité, affichages légaux" },
      { icon: BookOpen, title: "Formation", desc: "Explication des procédures à votre équipe" }
    ],
    pricing: "À partir de 500€ HT",
    delay: "Livraison sous 5 jours"
  }
};

const colorClasses = {
  red: {
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-200",
    button: "bg-red-600 hover:bg-red-700"
  },
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-200",
    button: "bg-blue-600 hover:bg-blue-700"
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    border: "border-emerald-200",
    button: "bg-emerald-600 hover:bg-emerald-700"
  }
};

export default function Services() {
  const urlParams = new URLSearchParams(window.location.search);
  const serviceParam = urlParams.get("service");
  const [activeTab, setActiveTab] = useState(serviceParam || "urgence");

  useEffect(() => {
    if (serviceParam && services[serviceParam]) {
      setActiveTab(serviceParam);
    }
  }, [serviceParam]);

  const getServiceSEO = () => {
    const seoData = {
      urgence: {
        title: "Urgence DDPP - Intervention Rapide Contrôle Sanitaire",
        description: "Contrôle DDPP avec non-conformités ? Intervention sous 24h pour éviter la fermeture de votre restaurant. Remise en conformité rapide et efficace par expert certifié.",
        keywords: "urgence DDPP, contrôle sanitaire restaurant, mise en demeure DDPP, fermeture administrative, remise en conformité hygiène, intervention urgente restaurant"
      },
      audit: {
        title: "Audit Hygiène Restaurant - Inspection Préventive DDPP",
        description: "Audit hygiène complet de votre restaurant. Anticipez les contrôles DDPP avec une inspection préventive détaillée. Rapport et plan d'action personnalisé. Tarif dès 350€.",
        keywords: "audit hygiène restaurant, inspection cuisine professionnelle, contrôle préventif DDPP, diagnostic sanitaire, audit HACCP, vérification conformité restaurant"
      },
      administratif: {
        title: "Plan Maîtrise Sanitaire (PMS) - Conformité Administrative",
        description: "Création de votre Plan de Maîtrise Sanitaire personnalisé. Conformité CERFA, loi EGAlim, traçabilité et allergènes. Accompagnement administratif complet pour restaurants.",
        keywords: "plan maîtrise sanitaire, PMS restaurant, CERFA restauration, loi EGAlim, conformité administrative restaurant, traçabilité alimentaire, gestion allergènes"
      }
    };
    return seoData[activeTab] || seoData.urgence;
  };

  const seo = getServiceSEO();

  return (
    <>
      <SEO 
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        canonicalUrl={`${window.location.origin}${window.location.pathname}`}
      />
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <section className="bg-white border-b border-slate-200 py-16">
        <div className="container mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">Nos Services</span>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-4 mb-6">
              Des solutions adaptées à chaque situation
            </h1>
            <p className="text-lg text-slate-600">
              De l'urgence DDPP à la prévention, découvrez nos offres d'accompagnement 
              pour garantir la conformité sanitaire de votre établissement.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Tabs Navigation */}
      <div className="container mx-auto px-6 lg:px-12 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-12">
          <TabsList className="w-full max-w-2xl mx-auto grid grid-cols-3 h-auto bg-white border border-slate-200 rounded-xl p-1.5">
            {Object.values(services).map((service) => {
              const Icon = service.icon;
              return (
                <TabsTrigger 
                  key={service.id} 
                  value={service.id}
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white py-3 px-4 rounded-lg transition-all"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{service.id === "urgence" ? "Urgence" : service.id === "audit" ? "Audit" : "Administratif"}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.values(services).map((service) => {
            const Icon = service.icon;
            const colors = colorClasses[service.color];

            return (
              <TabsContent key={service.id} value={service.id} className="space-y-12">
                {/* Hero */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="relative rounded-3xl overflow-hidden"
                >
                  <img 
                    src={service.heroImage} 
                    alt={`${service.title} - ${service.subtitle} pour restaurants professionnels`}
                    className="w-full h-80 md:h-96 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${colors.bg} rounded-full mb-4`}>
                      <Icon className={`w-4 h-4 ${colors.text}`} />
                      <span className={`text-sm font-medium ${colors.text}`}>{service.delay}</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">{service.title}</h2>
                    <p className="text-xl text-slate-200">{service.subtitle}</p>
                  </div>
                </motion.div>

                {/* Content Grid */}
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Main Content */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Description */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                      <h3 className="text-xl font-bold text-slate-900 mb-4">Présentation</h3>
                      <p className="text-slate-600 leading-relaxed text-lg">{service.description}</p>
                    </div>

                    {/* Objectives */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                      <h3 className="text-xl font-bold text-slate-900 mb-6">Nos objectifs</h3>
                      <ul className="space-y-4">
                        {service.objectives.map((objective, idx) => (
                          <li key={idx} className="flex items-start gap-4">
                            <div className={`w-6 h-6 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                              <CheckCircle className={`w-4 h-4 ${colors.text}`} />
                            </div>
                            <span className="text-slate-700">{objective}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Approach */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                      <h3 className="text-xl font-bold text-slate-900 mb-6">Notre approche</h3>
                      <div className="grid sm:grid-cols-2 gap-6">
                        {service.approach.map((step, idx) => {
                          const StepIcon = step.icon;
                          return (
                            <div key={idx} className="flex gap-4">
                              <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                                <StepIcon className={`w-6 h-6 ${colors.text}`} />
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-900 mb-1">{step.title}</h4>
                                <p className="text-sm text-slate-600">{step.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-6">
                    {/* Pricing Card */}
                    <div className={`rounded-2xl p-8 ${colors.bg} border ${colors.border}`}>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Tarification</h3>
                      <p className={`text-2xl font-bold ${colors.text} mb-4`}>{service.pricing}</p>
                      <p className="text-sm text-slate-600 mb-6">{service.delay}</p>
                      <Link to={createPageUrl("Contact") + `?service=${service.id}`}>
                        <Button className={`w-full ${colors.button} text-white py-6`}>
                          Demander un devis
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </Link>
                    </div>

                    {/* Contact Card */}
                    <div className="bg-slate-900 rounded-2xl p-8 text-white">
                      <h3 className="text-xl font-bold mb-4">Besoin d'aide ?</h3>
                      <p className="text-slate-300 mb-6">Notre équipe est disponible pour répondre à toutes vos questions.</p>
                      <a href="tel:0680952589" className="flex items-center gap-3 text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">
                        <Phone className="w-5 h-5" />
                        06 80 95 25 89
                      </a>
                    </div>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </>
  );
}