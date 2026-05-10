<?php
require_once "sms_helper.php";
header('Content-Type: application/json');

$token = getenv('PHILSMS_API_TOKEN') ?: ($_ENV['PHILSMS_API_TOKEN'] ?? ($_SERVER['PHILSMS_API_TOKEN'] ?? null));

if (!$token) {
    echo json_encode(['error' => 'Token not found']);
    exit;
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://dashboard.philsms.com/api/v3/balance');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $token,
    'Accept: application/json'
]);

$output = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo json_encode([
    'http_code' => $httpCode,
    'response' => json_decode($output, true),
    'raw' => $output
], JSON_PRETTY_PRINT);
