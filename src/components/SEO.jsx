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
  breadcrumbs = null,
  noindex = false
}) {
  useEffect(() => {
    const siteName = BUSINESS.name;
    const defaultImage = "https://restoclair.fr/images/cuisine-partage-1200x630.jpg";
    const baseUrl = BUSINESS.url;

    // Le nom du site n'est ajouté qu'une fois, même si le titre de la page le contient déjà.
    document.title = title
      ? (title.includes(siteName) ? title : `${title} | ${siteName}`)
      : `${siteName} | Hygiène alimentaire et HACCP pour restaurants`;

    const metaTags = [
      { name: "description", content: description },
      { name: "keywords", content: keywords },
      { name: "robots", content: noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "author", content: siteName },
      { name: "publisher", content: siteName },

      { property: "og:title", content: title || `${siteName} | Hygiène alimentaire et HACCP pour restaurants` },
      { property: "og:description", content: description },
      { property: "og:type", content: pageType },
      { property: "og:site_name", content: siteName },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:image", content: ogImage || defaultImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: title || `${siteName} | Hygiène alimentaire` },
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
        { property: "article:author", content: siteName },
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
        "@type": "Place",
        "name": area
      })),
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
              "@type": "SoftwareApplication",
              "name": "Application RestOclair",
              "applicationCategory": "BusinessApplication",
              "description": "Relevés de températures, traçabilité, plan de nettoyage, score hygiène et dossier d’inspection"
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Audit hygiène",
              "description": "Visite de l’établissement, rapport écrit avec des priorités classées"
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Aide face à la DDPP",
              "description": "Plan d’actions et aide à la rédaction de la réponse, signée et envoyée par l’exploitant"
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
          "@type": "Organization",
          "name": siteName,
          "url": `${baseUrl}/entreprise`
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
          "@type": "Place",
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

  }, [title, description, keywords, ogImage, canonicalUrl, pageType, articleData, serviceData, breadcrumbs, noindex]);

  return null;
}
