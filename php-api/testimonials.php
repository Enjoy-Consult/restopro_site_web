<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once __DIR__ . '/securite.php';
require_once __DIR__ . '/config.php';
setCorsHeaders();

$result = airtableRequest('AvisSiteWeb');

if ($result['status'] !== 200) {
    error_log('testimonials.php Airtable error: ' . json_encode($result));
    http_response_code(502);
    echo json_encode(['error' => 'Service indisponible']);
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
