const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const AIRTABLE_TOKEN = import.meta.env.VITE_AIRTABLE_TOKEN;
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

const headers = {
  'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
  'Content-Type': 'application/json'
};

export async function getBlogPosts() {
  const response = await fetch(
    `${AIRTABLE_API_URL}/BlogPost?view=Grid%20view`,
    { method: 'GET', headers }
  );

  if (!response.ok) {
    throw new Error(`Airtable API error: ${response.status}`);
  }

  const result = await response.json();

  return result.records.map(record => ({
    id: record.id,
    title: record.fields.title || '',
    slug: record.fields.slug || '',
    excerpt: record.fields.excerpt || '',
    content: record.fields.content || '',
    featured_image: record.fields.featured_image || '',
    category: record.fields.category || '',
    tags: record.fields.tags
      ? (typeof record.fields.tags === 'string'
          ? record.fields.tags.split(',').map(t => t.trim())
          : record.fields.tags)
      : [],
    published: record.fields.published !== false,
    seo_title: record.fields.seo_title || '',
    seo_description: record.fields.seo_description || '',
    reading_time: record.fields.reading_time || 5,
    created_date: record.createdTime,
    updated_date: record.fields.updated_date || record.createdTime
  }));
}

export async function getTestimonials() {
  const response = await fetch(
    `${AIRTABLE_API_URL}/Testimonials`,
    { method: 'GET', headers }
  );

  if (!response.ok) {
    throw new Error(`Airtable API error: ${response.status}`);
  }

  const result = await response.json();

  return result.records.map(record => ({
    id: record.id,
    author_name: record.fields.author_name || '',
    restaurant_name: record.fields.restaurant_name || '',
    location: record.fields.location || '',
    content: record.fields.content || '',
    rating: record.fields.rating || 5,
    is_featured: record.fields.is_featured || false,
    created_date: record.createdTime
  }));
}

export async function submitContactForm(data) {
  const mapServiceType = (value) => {
    const mapping = {
      'urgence_ddpp': 'Sos DDPP',
      'audit_hygiene': 'Audit Hygiène',
      'accompagnement_administratif': 'Accompagnement Administratif',
      'autre': 'Autre demande'
    };
    return mapping[value] || value;
  };

  const mapUrgency = (value) => {
    const mapping = {
      'urgent': 'Urgent (contrôle en cours)',
      'normal': 'Normal',
      'information': 'Simple renseignement'
    };
    return mapping[value] || value;
  };

  const formatPhone = (phoneNumber) => {
    if (!phoneNumber) return '';
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
          'Nom du client': data.contact_name || '',
          'Adresse Mail': data.email || '',
          'Numéro de téléphone (contact)': formatPhone(data.phone),
          'Raison de la prise de contact': mapServiceType(data.service_type),
          'Message': data.message || '',
          'Urgence': mapUrgency(data.urgency),
          'Demande spécifique': data.restaurant_name || ''
        }
      }
    ],
    typecast: true
  };

  const response = await fetch(
    `${AIRTABLE_API_URL}/Base%20de%20donn%C3%A9e%20client`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(airtableData)
    }
  );

  if (!response.ok) {
    const errorDetails = await response.json();
    throw new Error(`Airtable API error: ${response.status} - ${JSON.stringify(errorDetails)}`);
  }

  return response.json();
}
