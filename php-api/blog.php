<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once __DIR__ . '/securite.php';
// Configuration hors du dossier publié si disponible (partage NAS restoclair-prive), sinon repli local.
$restoclairConfig = '/volume1/restoclair-prive/config.php';
require_once (@is_readable($restoclairConfig) ? $restoclairConfig : __DIR__ . '/config.php');
setCorsHeaders();

$result = airtableRequest('BlogPost?view=Grid%20view');

if ($result['status'] !== 200) {
    error_log('blog.php Airtable error: ' . json_encode($result));
    http_response_code(502);
    echo json_encode(['error' => 'Service indisponible']);
    exit();
}

$records = $result['data']['records'] ?? [];
$posts = [];

foreach ($records as $record) {
    $fields = $record['fields'] ?? [];
    $tags = $fields['tags'] ?? [];

    if (is_string($tags)) {
        $tags = array_map('trim', explode(',', $tags));
    }

    $posts[] = [
        'id' => $record['id'],
        'title' => $fields['title'] ?? '',
        'slug' => $fields['slug'] ?? '',
        'excerpt' => $fields['excerpt'] ?? '',
        'content' => $fields['content'] ?? '',
        'featured_image' => $fields['featured_image'] ?? '',
        'category' => $fields['category'] ?? '',
        'tags' => $tags,
        'published' => ($fields['published'] ?? true) !== false,
        'seo_title' => $fields['seo_title'] ?? '',
        'seo_description' => $fields['seo_description'] ?? '',
        'reading_time' => $fields['reading_time'] ?? 5,
        'created_date' => $record['createdTime'] ?? '',
        'updated_date' => $fields['updated_date'] ?? $record['createdTime'] ?? ''
    ];
}

echo json_encode($posts);
