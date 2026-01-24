import { useEffect } from "react";

export default function SEO({
  title,
  description,
  keywords,
  ogImage,
  canonicalUrl,
  pageType = "website",
  articleData = null,
  serviceData = null,
  breadcrumbs = null
}) {
  useEffect(() => {
    const siteName = "RestOclair";
    const defaultImage = "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=630&fit=crop";
    const baseUrl = "https://restoclair.fr";

    document.title = title ? `${title} | ${siteName}` : `${siteName} - Expert en Securite Alimentaire pour Restaurateurs`;

    const metaTags = [
      { name: "description", content: description },
      { name: "keywords", content: keywords },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "author", content: "Thierry Bailleul - RestOclair" },
      { name: "publisher", content: "RestOclair" },

      { property: "og:title", content: title || `${siteName} - Expert Hygiene Alimentaire` },
      { property: "og:description", content: description },
      { property: "og:type", content: pageType },
      { property: "og:site_name", content: siteName },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:image", content: ogImage || defaultImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: title || "RestOclair - Expertise Hygiene Alimentaire" },
      { property: "og:url", content: canonicalUrl || window.location.href },

      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: ogImage || defaultImage },

      { name: "geo.region", content: "FR-IDF" },
      { name: "geo.placename", content: "Ile-de-France" },
    ];

    if (articleData) {
      metaTags.push(
        { property: "article:published_time", content: articleData.publishedDate },
        { property: "article:modified_time", content: articleData.modifiedDate || articleData.publishedDate },
        { property: "article:author", content: "Thierry Bailleul" },
        { property: "article:section", content: articleData.category }
      );
      if (articleData.tags) {
        articleData.tags.forEach(tag => {
          metaTags.push({ property: "article:tag", content: tag });
        });
      }
    }

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

    if (canonicalUrl) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonicalUrl);
    }

    const existingSchemas = document.querySelectorAll('script[data-seo-schema]');
    existingSchemas.forEach(script => script.remove());

    const schemas = [];

    const baseSchema = {
      "@type": "ProfessionalService",
      "@id": `${baseUrl}/#localbusiness`,
      "name": "RestOclair",
      "description": "Conseil en hygiene et securite alimentaire pour les restaurateurs en Ile-de-France. Urgence DDPP, audit hygiene, creation PMS.",
      "url": baseUrl,
      "telephone": "+33680952589",
      "email": "contact@restoclair.fr",
      "founder": {
        "@type": "Person",
        "name": "Thierry Bailleul",
        "jobTitle": "Consultant en Hygiene et Securite Alimentaire"
      },
      "address": {
        "@type": "PostalAddress",
        "addressRegion": "Ile-de-France",
        "addressCountry": "FR"
      },
      "areaServed": {
        "@type": "GeoCircle",
        "geoMidpoint": {
          "@type": "GeoCoordinates",
          "latitude": 48.8566,
          "longitude": 2.3522
        },
        "geoRadius": "100000"
      },
      "priceRange": "$$",
      "image": ogImage || defaultImage
    };
    schemas.push(baseSchema);

    if (pageType === "article" && articleData) {
      schemas.push({
        "@type": "Article",
        "@id": `${canonicalUrl}#article`,
        "headline": title,
        "description": description,
        "image": ogImage || defaultImage,
        "datePublished": articleData.publishedDate,
        "dateModified": articleData.modifiedDate || articleData.publishedDate,
        "author": {
          "@type": "Person",
          "name": "Thierry Bailleul",
          "url": `${baseUrl}/About`
        },
        "publisher": {
          "@type": "Organization",
          "name": "RestOclair",
          "logo": {
            "@type": "ImageObject",
            "url": `${baseUrl}/img_6598.jpeg`
          }
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": canonicalUrl
        },
        "articleSection": articleData.category,
        "keywords": keywords
      });
    }

    if (serviceData) {
      schemas.push({
        "@type": "Service",
        "@id": `${canonicalUrl}#service`,
        "name": serviceData.name,
        "description": serviceData.description,
        "provider": {
          "@id": `${baseUrl}/#localbusiness`
        },
        "areaServed": "Ile-de-France",
        "serviceType": serviceData.type
      });
    }

    if (breadcrumbs && breadcrumbs.length > 0) {
      schemas.push({
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((crumb, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": crumb.name,
          "item": crumb.url
        }))
      });
    }

    const webPageSchema = {
      "@type": "WebPage",
      "@id": `${canonicalUrl || window.location.href}#webpage`,
      "url": canonicalUrl || window.location.href,
      "name": title,
      "description": description,
      "isPartOf": {
        "@id": `${baseUrl}/#website`
      },
      "about": {
        "@id": `${baseUrl}/#localbusiness`
      },
      "inLanguage": "fr-FR"
    };
    schemas.push(webPageSchema);

    const schemaScript = document.createElement('script');
    schemaScript.setAttribute('type', 'application/ld+json');
    schemaScript.setAttribute('data-seo-schema', 'true');
    schemaScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": schemas
    });
    document.head.appendChild(schemaScript);

  }, [title, description, keywords, ogImage, canonicalUrl, pageType, articleData, serviceData, breadcrumbs]);

  return null;
}
