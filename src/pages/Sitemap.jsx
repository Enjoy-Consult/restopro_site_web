import React, { useEffect, useState } from "react";
import { getBlogPosts } from "@/api/airtableService";
import { useQuery } from "@tanstack/react-query";

export default function Sitemap() {
  const [sitemap, setSitemap] = useState("");

  const { data: blogPosts = [] } = useQuery({
    queryKey: ['blogPosts'],
    queryFn: async () => {
      const allPosts = await getBlogPosts();
      return allPosts.filter(p => p.published);
    },
  });

  useEffect(() => {
    const baseUrl = window.location.origin;
    
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'weekly' },
      { url: '/Services', priority: '0.9', changefreq: 'monthly' },
      { url: '/About', priority: '0.8', changefreq: 'monthly' },
      { url: '/Contact', priority: '0.9', changefreq: 'monthly' },
      { url: '/Blog', priority: '0.8', changefreq: 'daily' },
    ];

    const blogPostPages = blogPosts.map(post => ({
      url: `/BlogPost?slug=${post.slug}`,
      priority: '0.7',
      changefreq: 'monthly',
      lastmod: post.updated_date || post.created_date
    }));

    const allPages = [...staticPages, ...blogPostPages];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    ${page.lastmod ? `<lastmod>${new Date(page.lastmod).toISOString().split('T')[0]}</lastmod>` : ''}
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    setSitemap(xml);
  }, [blogPosts]);

  return (
    <div className="py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <h1 className="text-ink mb-6">Plan du site</h1>
        <p className="text-muted text-lg mb-12 max-w-[600px]">
          Sitemap XML pour l'indexation par les moteurs de recherche.
        </p>

        <div className="mb-8">
          <h2 className="text-ink mb-4">Pages incluses</h2>
          <ul className="space-y-2 text-muted text-[15px]">
            <li>Accueil</li>
            <li>Services</li>
            <li>A propos</li>
            <li>Contact</li>
            <li>Blog ({blogPosts.length} articles)</li>
          </ul>
        </div>

        <hr className="rule my-8" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-ink">sitemap.xml</h2>
          <button
            onClick={() => {
              navigator.clipboard.writeText(sitemap);
            }}
            className="btn-primary text-sm"
          >
            Copier le XML
          </button>
        </div>
        <div className="bg-ink p-6 overflow-auto">
          <pre className="text-paper text-xs overflow-x-auto">
            <code>{sitemap}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
