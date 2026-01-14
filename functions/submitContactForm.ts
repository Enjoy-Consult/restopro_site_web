import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { restaurant_name, contact_name, email, phone, service_type, urgency, message } = await req.json();

        // Mapping des valeurs pour Airtable
        const mapServiceType = (value) => {
            const mapping = {
                "urgence_ddpp": "Urgence DDPP",
                "audit_hygiene": "Audit Hygiène",
                "accompagnement_administratif": "Accompagnement Administratif",
                "autre": "Autre demande"
            };
            return mapping[value] || value;
        };

        const mapUrgency = (value) => {
            const mapping = {
                "urgent": "Urgent (contrôle en cours)",
                "normal": "Normal",
                "information": "Simple renseignement"
            };
            return mapping[value] || value;
        };

        const airtableData = {
            records: [
                {
                    fields: {
                        "Nom de l'établissement": restaurant_name,
                        "Prénom du client": contact_name,
                        "Adresse Mail": email,
                        "Numéro de téléphone (contact)": phone,
                        "Raison de la prise de contact": mapServiceType(service_type),
                        "Urgence": mapUrgency(urgency),
                        "Message": message || ""
                    }
                }
            ],
            typecast: true
        };

        const response = await fetch(
            "https://api.airtable.com/v0/appL7jbLQnqVyg8kC/Base%20Stockage%20contact",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${Deno.env.get("AIRTABLE_TOKEN")}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(airtableData)
            }
        );

        if (!response.ok) {
            const errorDetails = await response.json();
            return Response.json({ error: `Airtable API error: ${response.status}`, details: errorDetails }, { status: 500 });
        }

        const result = await response.json();
        return Response.json(result);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});