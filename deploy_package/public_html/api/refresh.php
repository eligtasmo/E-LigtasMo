<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/tokens.php';
header('Content-Type: application/json');
$headers = function_exists('getallheaders') ? getallheaders() : [];
$auth = $headers['Authorization'] ?? ($headers['authorization'] ?? '');
if (!(stripos($auth, 'Bearer ') === 0)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}
$payload = jwt_decode(substr($auth, 7));
if (!$payload || !isset($payload['sub']) || !isset($payload['role'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}
$token = jwt_encode(['sub' => (int)$payload['sub'], 'role' => $payload['role']], 3600);
echo json_encode(['success' => true, 'token' => $token]);
?> 
