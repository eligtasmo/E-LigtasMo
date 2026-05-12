<?php
require_once 'cors.php';
header("Content-Type: application/json");
require_once 'db.php';
require_once 'rbac.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Require manage permission
require_permission('users.manage');

$data = json_decode(file_get_contents("php://input"), true);
$target_user_id = $data['user_id'] ?? null;
$new_status = $data['status'] ?? null;

if (!$target_user_id || !in_array($new_status, ['approved', 'rejected'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid input']);
    exit;
}

$currentUserRole = $_SESSION['role'] ?? null;
$currentUserBrgy = $_SESSION['brgy_name'] ?? null;
$isBrgyOfficial = in_array($currentUserRole, ['brgy', 'brgy_chair']);

try {
    // If not admin, we must check if the target user belongs to the same barangay
    if ($isBrgyOfficial) {
        $stmt = $pdo->prepare("SELECT brgy_name, role FROM users WHERE id = ?");
        $stmt->execute([$target_user_id]);
        $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$targetUser) {
            echo json_encode(['success' => false, 'message' => 'User not found']);
            exit;
        }

        // Officials can only manage residents of their own barangay
        if ($targetUser['brgy_name'] !== $currentUserBrgy || $targetUser['role'] !== 'resident') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Forbidden: You can only manage residents of your own barangay.']);
            exit;
        }
    }

    // Update status. If 'approved', we might want to set it to 'active' or keep 'approved'. 
    // Given the previous code used 'approved', let's stick to it unless specified.
    $stmt = $pdo->prepare("UPDATE users SET status = ? WHERE id = ?");
    $ok = $stmt->execute([$new_status, $target_user_id]);

    if ($ok) {
        echo json_encode(['success' => true, 'message' => 'User status updated to ' . $new_status]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update user status']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
 