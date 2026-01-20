import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const response = await fetch(
            "https://api.airtable.com/v0/appL7jbLQnqVyg8kC/Avis%20Site%20Web",
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
        const testimonials = result.records.map(record => ({
            id: record.id,
            author_name: record.fields.author_name || "",
            restaurant_name: record.fields.restaurant_name || "",
            location: record.fields.location || "",
            content: record.fields.content || "",
            rating: record.fields.rating || 5,
            is_featured: record.fields.is_featured || false,
            created_date: record.createdTime
        }));

        return Response.json(testimonials);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});