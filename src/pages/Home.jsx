import React from "react";
import SEO from "@/components/SEO";
import HeroSection from "@/components/home/HeroSection";
import ServicesSection from "@/components/home/ServicesSection";
import WhyUsSection from "@/components/home/WhyUsSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import CTASection from "@/components/home/CTASection";

export default function Home() {
  return (
    <>
      <SEO 
        title="Accueil - Conseil en Hygiène & Sécurité Alimentaire"
        description="RestOclair accompagne les restaurateurs d'Île-de-France en hygiène alimentaire. Intervention urgence DDPP sous 24h, audits préventifs et mise en conformité PMS. Expert depuis 15 ans."
        keywords="conseil hygiène alimentaire, sécurité alimentaire restaurant, contrôle DDPP, audit hygiène cuisine, plan maîtrise sanitaire, consultant HACCP, formation hygiène restauration, conformité sanitaire, loi EGAlim, Île-de-France"
        canonicalUrl={window.location.origin}
      />
      <div className="min-h-screen">
        <HeroSection />
        <ServicesSection />
        <WhyUsSection />
        <TestimonialsSection />
        <CTASection />
      </div>
    </>
  );
}