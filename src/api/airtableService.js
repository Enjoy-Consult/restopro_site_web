const API_BASE_URL = 'https://restoclair.fr/api';

export async function getBlogPosts() {
  const response = await fetch(`${API_BASE_URL}/blog.php`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function getTestimonials() {
  const response = await fetch(`${API_BASE_URL}/avis.php`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function submitContactForm(data) {
  const response = await fetch(`${API_BASE_URL}/contact.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorDetails = await response.json();
    throw new Error(`API error: ${response.status} - ${JSON.stringify(errorDetails)}`);
  }

  return response.json();
}
