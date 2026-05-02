<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'auth_helper.php';

$user = get_current_user_data();
if (!$user || !in_array($user['role'], ['admin', 'brgy', 'mmdrmo', 'brgy_chair'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized access.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing shelter id.']);
    exit;
}

try {
    // Fetch existing shelter to check ownership
    $stmt = $pdo->prepare('SELECT created_brgy FROM shelters WHERE id = ?');
    $stmt->execute([$data['id']]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existing) {
        http_response_code(404);
        echo json_encode(['error' => 'Shelter not found.']);
        exit;
    }

    // Access control: Admin can delete anything. Brgy can only delete their own.
    if ($user['role'] !== 'admin' && $user['brgy_name'] !== $existing['created_brgy']) {
        http_response_code(403);
        echo json_encode(['error' => 'You are only authorized to delete shelters in your own barangay.']);
        exit;
    }

    $stmt = $pdo->prepare('DELETE FROM shelters WHERE id = ?');
    $stmt->execute([$data['id']]);
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}