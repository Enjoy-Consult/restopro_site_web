import { useEffect } from "react";

export default function SEO({ 
  title, 
  description, 
  keywords,
  ogImage,
  canonicalUrl 
}) {
  useEffect(() => {
    // Set page title
    document.title = title ? `${title} | RestOclair` : "RestOclair - Expert en Sécurité Alimentaire pour Restaurateurs";

    // Set or update meta tags
    const metaTags = [
      { name: "description", content: description },
      { name: "keywords", content: keywords },
      
      // Open Graph
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:image", content: ogImage || "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=630&fit=crop" },
      
      // Twitter Card
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: ogImage || "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=630&fit=crop" },
      
      // Additional SEO
      { name: "robots", content: "index, follow" },
      { name: "author", content: "RestOclair - Thierry Bailleul" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
    ];

    metaTags.forEach(({ name, property, content }) => {
      if (!content) return;
      
      const attribute = name ? 'name' : 'property';
      const value = name || property;
      
      let meta = document.querySelector(`meta[${attribute}="${value}"]`);
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, value);
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    });

    // Canonical URL
    if (canonicalUrl) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonicalUrl);
    }

    // Schema.org structured data for local business
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      "name": "RestOclair",
      "description": "Conseil en hygiène et sécurité alimentaire pour les restaurateurs en Île-de-France",
      "telephone": "+33680952589",
      "address": {
        "@type": "PostalAddress",
        "addressRegion": "Île-de-France",
        "addressCountry": "FR"
      },
      "areaServed": "Île-de-France",
      "priceRange": "€€",
      "image": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=630&fit=crop"
    };

    let script = document.querySelector('script[type="application/ld+json"]');
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schemaData);

  }, [title, description, keywords, ogImage, canonicalUrl]);

  return null;
}