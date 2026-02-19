<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/config.php';
setCorsHeaders();

$result = airtableRequest('AvisSiteWeb');

if ($result['status'] !== 200) {
    http_response_code($result['status']);
    echo json_encode(['error' => 'Erreur API Airtable', 'details' => $result]);
    exit();
}

$records = $result['data']['records'] ?? [];
$testimonials = [];

foreach ($records as $record) {
    $fields = $record['fields'] ?? [];

    $testimonials[] = [
        'id' => $record['id'],
        'author_name' => $fields['author_name'] ?? '',
        'restaurant_name' => $fields['restaurant_name'] ?? '',
        'location' => $fields['location'] ?? '',
        'content' => $fields['content'] ?? '',
        'rating' => $fields['rating'] ?? 5,
        'is_featured' => $fields['is_featured'] ?? false,
        'created_date' => $record['createdTime'] ?? ''
    ];
}

echo json_encode($testimonials);
