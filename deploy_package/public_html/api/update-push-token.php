<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

// Ensure column exists
try {
    $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token VARCHAR(255) NULL");
} catch(Exception $e) {}

if (session_status() !== PHP_SESSION_ACTIVE) { session_start(); }

// Helper to get user ID from token or session
function get_auth_user_id() {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $auth = $headers['Authorization'] ?? ($headers['authorization'] ?? '');
    if (stripos($auth, 'Bearer ') === 0) {
        $token = substr($auth, 7);
        $payload = jwt_decode($token);
        if ($payload && isset($payload['sub'])) return (int)$payload['sub'];
    }
    return $_SESSION['user_id'] ?? null;
}

$user_id = get_auth_user_id();

if (!$user_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$push_token = $data['push_token'] ?? null;

if (!$push_token) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing push_token']);
    exit;
}

try {
    $stmt = $pdo->prepare("UPDATE users SET push_token = ? WHERE id = ?");
    $stmt->execute([$push_token, $user_id]);
    echo json_encode(['success' => true, 'message' => 'Push token updated']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
