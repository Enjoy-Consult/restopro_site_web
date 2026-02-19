<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';

// Test de connexion Airtable
$url = AIRTABLE_API_URL . '/Testimonials?maxRecords=1';

$headers = [
    'Authorization: Bearer ' . AIRTABLE_TOKEN,
    'Content-Type: application/json'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_VERBOSE, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
$curlInfo = curl_getinfo($ch);
curl_close($ch);

$result = [
    'test_time' => date('Y-m-d H:i:s'),
    'curl_error' => $curlError ?: null,
    'http_code' => $httpCode,
    'url_tested' => $url,
    'response' => $response ? json_decode($response, true) : null,
    'curl_info' => [
        'total_time' => $curlInfo['total_time'],
        'namelookup_time' => $curlInfo['namelookup_time'],
        'connect_time' => $curlInfo['connect_time']
    ]
];

if ($httpCode !== 200) {
    http_response_code(500);
}

echo json_encode($result, JSON_PRETTY_PRINT);
