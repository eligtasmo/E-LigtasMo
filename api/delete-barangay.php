<?php
require_once 'cors.php';
header("Content-Type: application/json");
require_once 'db.php';
require_once 'auth_helper.php';

$user = get_current_user_data();
if (!$user || !in_array($user['role'], ['admin', 'mmdrmo'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Only Admin or MDRRMO can delete barangay records.']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !isset($input['id'])) {
        throw new Exception("Missing barangay id.");
    }

    $stmt = $pdo->prepare("DELETE FROM barangays WHERE id = ?");
    $stmt->execute([$input['id']]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
