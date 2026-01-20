import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const response = await fetch(
            "https://api.airtable.com/v0/appL7jbLQnqVyg8kC/BlogPost?view=Grid%20view",
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${Deno.env.get("AIRTABLE_TOKEN")}`,
                    "Content-Type": "application/json"
                }
            }
        );

        if (!response.ok) {
            const errorDetails = await response.json();
            return Response.json({ error: `Airtable API error: ${response.status}`, details: errorDetails }, { status: 500 });
        }

        const result = await response.json();
        
        // Transform Airtable records to match the app's format
        const posts = result.records.map(record => ({
            id: record.id,
            title: record.fields.title || "",
            slug: record.fields.slug || "",
            excerpt: record.fields.excerpt || "",
            content: record.fields.content || "",
            featured_image: record.fields.featured_image || "",
            category: record.fields.category || "",
            tags: record.fields.tags || [],
            published: record.fields.published !== false,
            seo_title: record.fields.seo_title || "",
            seo_description: record.fields.seo_description || "",
            reading_time: record.fields.reading_time || 5,
            created_date: record.createdTime
        }));

        return Response.json(posts);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});