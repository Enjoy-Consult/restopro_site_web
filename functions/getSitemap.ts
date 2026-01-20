import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Récupérer tous les articles de blog publiés
        const response = await fetch(
            "https://api.airtable.com/v0/appL7jbLQnqVyg8kC/BlogPost?filterByFormula={published}=TRUE()",
            {
                headers: {
                    "Authorization": `Bearer ${Deno.env.get("AIRTABLE_TOKEN")}`,
                    "Content-Type": "application/json"
                }
            }
        );

        if (!response.ok) {
            return Response.json({ error: `Airtable API error: ${response.status}` }, { status: 500 });
        }

        const data = await response.json();
        const posts = data.records.map(record => ({
            slug: record.fields.slug,
            updated_date: record.fields.updated_date || record.fields.created_date
        }));

        // URL de base du site
        const baseUrl = "https://restoclair.base44.app";
        
        // Générer le sitemap XML
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Pages principales -->
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/#/Services</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/#/Blog</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/#/About</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/#/Contact</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- Articles de blog -->
${posts.map(post => `  <url>
    <loc>${baseUrl}/#/BlogPost?slug=${encodeURIComponent(post.slug)}</loc>
    <lastmod>${post.updated_date ? new Date(post.updated_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n')}
</urlset>`;

        return new Response(sitemap, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, max-age=3600'
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});