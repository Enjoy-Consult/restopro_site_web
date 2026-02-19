<?php
header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo json_encode([
    'php_version' => phpversion(),
    'curl_enabled' => function_exists('curl_version'),
    'curl_version' => function_exists('curl_version') ? curl_version() : null,
    'allow_url_fopen' => ini_get('allow_url_fopen'),
    'current_dir' => __DIR__,
    'config_exists' => file_exists(__DIR__ . '/config.php'),
    'test_time' => date('Y-m-d H:i:s')
], JSON_PRETTY_PRINT);
