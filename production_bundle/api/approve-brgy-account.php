<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

require_permission('users.manage');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$userId = $input['user_id'] ?? null;
$action = $input['action'] ?? null; // 'approve' or 'reject'

if (!$userId || !in_array($action, ['approve', 'reject'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid parameters']);
    exit;
}

try {
    $status = ($action === 'approve') ? 'active' : 'rejected';
    
    $stmt = $pdo->prepare("UPDATE users SET status = ? WHERE id = ? AND role = 'brgy'");
    $stmt->execute([$status, $userId]);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => "Account {$action}d successfully"]);
    } else {
        // Check if user exists but was not updated (e.g. already in that status or not brgy)
        $check = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role = 'brgy'");
        $check->execute([$userId]);
        if ($check->rowCount() === 0) {
             echo json_encode(['success' => false, 'message' => 'User not found or not a barangay account']);
        } else {
             echo json_encode(['success' => true, 'message' => "Account already {$action}d"]);
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>