<?php
require_once "env_helper.php";
header('Content-Type: application/json');

$token = getenv('PHILSMS_API_TOKEN') ?: ($_ENV['PHILSMS_API_TOKEN'] ?? ($_SERVER['PHILSMS_API_TOKEN'] ?? null));

echo json_encode([
    'token_found' => !empty($token),
    'token_length' => $token ? strlen($token) : 0,
    'token_prefix' => $token ? substr($token, 0, 4) : 'N/A',
    'env_vars' => array_keys($_ENV),
    'server_vars' => array_keys($_SERVER)
], JSON_PRETTY_PRINT);
