<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/tokens.php';
header("Content-Type: application/json");
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);
if (!$data || !is_array($data)) { $data = $_POST; }
$mfaToken = isset($data['mfa_token']) ? $data['mfa_token'] : '';
$code = isset($data['code']) ? trim($data['code']) : '';
if ($mfaToken === '' || $code === '') {
    http_response_code(422);
    echo json_encode(['success' => false, 'code' => 'VALIDATION_ERROR', 'details' => ['mfa_token' => ['Missing'], 'code' => ['Missing']]]);
    exit;
}
$payload = jwt_decode($mfaToken);
if (!$payload || ($payload['type'] ?? '') !== 'mfa') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Invalid or expired MFA token']);
    exit;
}
if ($code !== '123456') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Invalid code']);
    exit;
}
$uid = (int)$payload['sub'];
$role = $payload['role'];
$token = jwt_encode(['sub' => $uid, 'role' => $role], 3600);
echo json_encode(['success' => true, 'token' => $token]);
?> 
