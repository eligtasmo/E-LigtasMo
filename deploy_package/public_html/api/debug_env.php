<?php
require_once 'env_helper.php';
header('Content-Type: application/json');

$debug = [
    'core_path' => realpath(__DIR__ . '/../../core/.env'),
    'local_path' => realpath(__DIR__ . '/../.env'),
    'MAPBOX_TOKEN_SET' => !empty(getenv('EXPO_PUBLIC_MAPBOX_TOKEN')) || !empty(getenv('MAPBOX_ACCESS_TOKEN')) || !empty(getenv('VITE_MAPBOX_ACCESS_TOKEN')),
    'DB_NAME_SET' => !empty($_ENV['DB_NAME']),
    'PHP_VERSION' => phpversion(),
];

echo json_encode($debug, JSON_PRETTY_PRINT);
