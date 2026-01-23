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
    
    // Static pages
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'weekly' },
      { url: '/Services', priority: '0.9', changefreq: 'monthly' },
      { url: '/About', priority: '0.8', changefreq: 'monthly' },
      { url: '/Contact', priority: '0.9', changefreq: 'monthly' },
      { url: '/Blog', priority: '0.8', changefreq: 'daily' },
    ];

    // Blog posts
    const blogPostPages = blogPosts.map(post => ({
      url: `/BlogPost?slug=${post.slug}`,
      priority: '0.7',
      changefreq: 'monthly',
      lastmod: post.updated_date || post.created_date
    }));

    const allPages = [...staticPages, ...blogPostPages];

    // Generate XML sitemap
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
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Plan du site XML</h1>
          <p className="text-slate-600 mb-6">
            Sitemap XML pour optimiser l'indexation de votre site par les moteurs de recherche.
            Copiez le contenu ci-dessous et créez un fichier sitemap.xml à la racine de votre domaine.
          </p>
          
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Pages incluses :</h2>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Page d'accueil</li>
                <li>✓ Page Services</li>
                <li>✓ Page À Propos</li>
                <li>✓ Page Contact</li>
                <li>✓ Page Blog</li>
                <li>✓ {blogPosts.length} articles de blog</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-8 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">sitemap.xml</h2>
            <button
              onClick={() => {
                navigator.clipboard.writeText(sitemap);
                alert('Sitemap copié dans le presse-papiers !');
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Copier le XML
            </button>
          </div>
          <pre className="text-emerald-400 text-xs overflow-x-auto">
            <code>{sitemap}</code>
          </pre>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-3">📋 Instructions :</h3>
          <ol className="space-y-2 text-sm text-blue-800 list-decimal list-inside">
            <li>Cliquez sur "Copier le XML" ci-dessus</li>
            <li>Créez un fichier nommé <code className="bg-blue-100 px-2 py-1 rounded">sitemap.xml</code> à la racine de votre site</li>
            <li>Collez le contenu XML dans ce fichier</li>
            <li>Soumettez l'URL du sitemap à Google Search Console et Bing Webmaster Tools</li>
            <li>URL du sitemap : <code className="bg-blue-100 px-2 py-1 rounded">{window.location.origin}/sitemap.xml</code></li>
          </ol>
        </div>

        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-semibold text-amber-900 mb-3">💡 Conseils SEO supplémentaires :</h3>
          <ul className="space-y-2 text-sm text-amber-800 list-disc list-inside">
            <li>Créez un fichier <code className="bg-amber-100 px-2 py-1 rounded">robots.txt</code> pour guider les moteurs de recherche</li>
            <li>Ajoutez votre site à Google Search Console pour suivre les performances</li>
            <li>Optimisez la vitesse de chargement de vos pages</li>
            <li>Assurez-vous que toutes les images ont des attributs alt descriptifs</li>
            <li>Créez des liens internes entre vos pages</li>
            <li>Publiez régulièrement du contenu de qualité sur votre blog</li>
          </ul>
        </div>
      </div>
    </div>
  );
}