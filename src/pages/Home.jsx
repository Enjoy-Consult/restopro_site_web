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
        title="RestOclair - Sécurité Alimentaire, transformez vos obligations en atouts"
        description="RestOclair, consultant en hygiène et sécurité alimentaire pour restaurateurs en Île-de-France. Intervention urgence DDPP sous 24h, audits hygiène préventifs, création PMS personnalisé. Contact : 06 80 95 25 89"
        keywords="consultant hygiène alimentaire, sécurité alimentaire restaurant, contrôle DDPP, audit hygiène cuisine, plan maîtrise sanitaire, consultant HACCP, formation hygiène restauration, conformité sanitaire, loi EGAlim, Île-de-France"
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