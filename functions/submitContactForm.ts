import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { restaurant_name, contact_name, email, phone, service_type, urgency, message } = await req.json();

        // Mapping des valeurs pour Airtable
        const mapServiceType = (value) => {
            const mapping = {
                "urgence_ddpp": "Sos DDPP",
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

        // Formatage de la date au format AAAA-MM-JJ (ISO pour Airtable)
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateFormatted = `${year}-${month}-${day}`;

        // Formatage du numéro de téléphone au format (+33)
        const formatPhone = (phoneNumber) => {
            if (!phoneNumber) return "";
            let cleaned = phoneNumber.replace(/\s/g, '').replace(/\./g, '').replace(/-/g, '');
            if (cleaned.startsWith('0')) {
                cleaned = '(+33) ' + cleaned.substring(1).replace(/(.{2})/g, '$1 ').trim();
            }
            return cleaned;
        };

        const airtableData = {
            records: [
                {
                    fields: {
                        "Nom du client": contact_name || "",
                        "Date de la prise de contact": dateFormatted,
                        "Adresse Mail": email || "",
                        "Numéro de téléphone (contact)": formatPhone(phone),
                        "Raison de la prise de contact": mapServiceType(service_type),
                        "Message": message || "",
                        "Urgence": mapUrgency(urgency),
                        "Demande spécifique": restaurant_name || ""
                    }
                }
            ],
            typecast: true
        };

        const response = await fetch(
            "https://api.airtable.com/v0/appL7jbLQnqVyg8kC/Base%20de%20donn%C3%A9e%20client",
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