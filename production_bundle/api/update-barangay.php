<?php
require_once 'cors.php';
header("Content-Type: application/json");
require_once 'db.php';
require_once 'auth_helper.php';

$user = get_current_user_data();
if (!$user || !in_array($user['role'], ['admin', 'brgy', 'mmdrmo', 'brgy_chair'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized access.']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !isset($input['id'])) {
        throw new Exception("Missing barangay id.");
    }

    // Fetch existing barangay
    $stmt = $pdo->prepare('SELECT name FROM barangays WHERE id = ?');
    $stmt->execute([$input['id']]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Barangay not found.']);
        exit;
    }

    // Access control: Admin can edit any. Brgy can only edit their own.
    if ($user['role'] !== 'admin' && $user['brgy_name'] !== $existing['name']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'You are only authorized to update your own barangay information.']);
        exit;
    }

    $sql = "UPDATE barangays SET name = :name, lat = :lat, lng = :lng, address = :address, contact = :contact, type = :type, updated_by = :updated_by, updated_at = NOW() WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':name' => $input['name'],
        ':lat' => $input['lat'],
        ':lng' => $input['lng'],
        ':address' => $input['address'] ?? 'Santa Cruz, Laguna',
        ':contact' => $input['contact'] ?? '',
        ':type' => $input['type'] ?? 'Hall',
        ':updated_by' => $user['full_name'] ?? $user['username'],
        ':id' => $input['id']
    ]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
