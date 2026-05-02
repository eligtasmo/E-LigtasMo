<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

require_permission('alerts.manage');
if (session_status() !== PHP_SESSION_ACTIVE) { session_start(); }

try {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = isset($data['id']) ? intval($data['id']) : 0;

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing announcement id']);
        exit;
    }

    $stmt = $pdo->prepare('DELETE FROM announcements WHERE id = ?');
    $stmt->execute([$id]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Announcement deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Announcement not found or already deleted']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
