<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

// Only admin/brgy can delete users
require_permission('users.manage');

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['user_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing user_id.']);
    exit;
}

try {
    $userId = intval($data['user_id']);
    $session = check_session();
    
    if (!$session) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Unauthorized.']);
        exit;
    }

    // Check if target user exists
    $stmt = $pdo->prepare('SELECT id, username, role, brgy_name FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$targetUser) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found.']);
        exit;
    }

    // Barangay officials can only delete residents of their own barangay
    if ($session['role'] === 'brgy') {
        if ($targetUser['role'] !== 'resident' || $targetUser['brgy_name'] !== $session['brgy_name']) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'You can only delete residents of your own barangay.']);
            exit;
        }
    }

    // Admins can delete anyone except other admins (unless they are super admin or similar, keeping it simple for now)
    if ($session['role'] === 'admin') {
        // Just prevent self-deletion for safety
        if (intval($targetUser['id']) === intval($session['id'])) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'You cannot delete your own account from this panel.']);
            exit;
        }
    }

    // Proceed with deletion
    $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$userId]);

    echo json_encode(['success' => true, 'message' => 'User deleted successfully.']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
