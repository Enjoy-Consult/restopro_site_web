<?php
define('AIRTABLE_BASE_ID', 'TON_BASE_ID_ICI');
define('AIRTABLE_TOKEN', 'TON_TOKEN_ICI');
define('AIRTABLE_API_URL', 'https://api.airtable.com/v0/' . AIRTABLE_BASE_ID);

define('ALLOWED_ORIGINS', [
    'https://restoclair.fr',
    'https://www.restoclair.fr',
    'http://localhost:5173',
    'http://localhost:3000'
]);

function setCorsHeaders() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (in_array($origin, ALLOWED_ORIGINS)) {
        header("Access-Control-Allow-Origin: $origin");
    }

    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Content-Type: application/json; charset=utf-8");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

function airtableRequest($endpoint, $method = 'GET', $data = null) {
    $url = AIRTABLE_API_URL . '/' . $endpoint;

    $headers = [
        'Authorization: Bearer ' . AIRTABLE_TOKEN,
        'Content-Type: application/json'
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return ['error' => $error, 'status' => 500];
    }

    return ['data' => json_decode($response, true), 'status' => $httpCode];
}
