import { useEffect } from "react";
import { BUSINESS } from "@/lib/business-info";

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
    const siteName = BUSINESS.name;
    const defaultImage = "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=630&fit=crop";
    const baseUrl = BUSINESS.url;

    document.title = title
      ? `${title} | ${siteName}`
      : `${siteName} - Expert en Securite Alimentaire pour Professionnels`;

    const metaTags = [
      { name: "description", content: description },
      { name: "keywords", content: keywords },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "author", content: `${BUSINESS.founder} - ${siteName}` },
      { name: "publisher", content: siteName },

      { property: "og:title", content: title || `${siteName} - Expert Hygiene Alimentaire` },
      { property: "og:description", content: description },
      { property: "og:type", content: pageType },
      { property: "og:site_name", content: siteName },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:image", content: ogImage || defaultImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: title || `${siteName} - Expertise Hygiene Alimentaire` },
      { property: "og:url", content: canonicalUrl || window.location.href },

      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: ogImage || defaultImage },

      { name: "geo.region", content: "FR-HDF" },
      { name: "geo.placename", content: BUSINESS.address.city },
      { name: "geo.position", content: `${BUSINESS.geo.latitude};${BUSINESS.geo.longitude}` },
      { name: "ICBM", content: `${BUSINESS.geo.latitude}, ${BUSINESS.geo.longitude}` },
    ];

    if (articleData) {
      metaTags.push(
        { property: "article:published_time", content: articleData.publishedDate },
        { property: "article:modified_time", content: articleData.modifiedDate || articleData.publishedDate },
        { property: "article:author", content: BUSINESS.founder },
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
      const attribute = name ? "name" : "property";
      const value = name || property;
      let meta = document.querySelector(`meta[${attribute}="${value}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attribute, value);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    });

    if (canonicalUrl) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonicalUrl);
    }

    const existingSchemas = document.querySelectorAll("script[data-seo-schema]");
    existingSchemas.forEach(script => script.remove());

    const schemas = [];

    const localBusinessSchema = {
      "@type": "ProfessionalService",
      "@id": `${baseUrl}/#localbusiness`,
      "name": BUSINESS.name,
      "legalName": BUSINESS.legalName,
      "description": BUSINESS.description,
      "url": baseUrl,
      "telephone": BUSINESS.phone.e164,
      "email": BUSINESS.email,
      "founder": {
        "@type": "Person",
        "name": BUSINESS.founder,
        "jobTitle": BUSINESS.founderTitle
      },
      "address": {
        "@type": "PostalAddress",
        "streetAddress": BUSINESS.address.streetAddress,
        "addressLocality": BUSINESS.address.city,
        "postalCode": BUSINESS.address.postalCode,
        "addressRegion": BUSINESS.address.region,
        "addressCountry": BUSINESS.address.country
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": BUSINESS.geo.latitude,
        "longitude": BUSINESS.geo.longitude
      },
      "areaServed": BUSINESS.serviceAreas.map(area => ({
        "@type": "City",
        "name": area
      })),
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          "opens": "07:00",
          "closes": "20:00"
        },
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": "Saturday",
          "opens": "08:00",
          "closes": "18:00"
        }
      ],
      "priceRange": BUSINESS.priceRange,
      "foundingDate": `${BUSINESS.foundingYear}`,
      "image": ogImage || defaultImage,
      "sameAs": BUSINESS.sameAs,
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Services RestOclair",
        "itemListElement": [
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Urgence DDPP",
              "description": "Intervention sous 24h après contrôle sanitaire défavorable"
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Audit Hygiène Préventif",
              "description": "Audit complet de votre établissement avant passage de l'inspecteur"
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Dossiers Réglementaires",
              "description": "Création et mise à jour PMS, fiches traçabilité, conformité EGAlim"
            }
          }
        ]
      }
    };
    schemas.push(localBusinessSchema);

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
          "name": BUSINESS.founder,
          "url": `${baseUrl}/About`
        },
        "publisher": {
          "@type": "Organization",
          "name": siteName,
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
        "provider": { "@id": `${baseUrl}/#localbusiness` },
        "areaServed": BUSINESS.serviceAreas.map(area => ({
          "@type": "City",
          "name": area
        })),
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
      "isPartOf": { "@id": `${baseUrl}/#website` },
      "about": { "@id": `${baseUrl}/#localbusiness` },
      "inLanguage": "fr-FR"
    };
    schemas.push(webPageSchema);

    const websiteSchema = {
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
      "url": baseUrl,
      "name": siteName,
      "description": BUSINESS.description,
      "publisher": { "@id": `${baseUrl}/#localbusiness` },
      "inLanguage": "fr-FR"
    };
    schemas.push(websiteSchema);

    const schemaScript = document.createElement("script");
    schemaScript.setAttribute("type", "application/ld+json");
    schemaScript.setAttribute("data-seo-schema", "true");
    schemaScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": schemas
    });
    document.head.appendChild(schemaScript);

  }, [title, description, keywords, ogImage, canonicalUrl, pageType, articleData, serviceData, breadcrumbs]);

  return null;
}
