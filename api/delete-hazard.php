<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing id.']);
    exit;
}

try {
    // In the consolidated system, we just delete from incident_reports
    $stmt = $pdo->prepare("DELETE FROM incident_reports WHERE id = ?");
    $stmt->execute([$data['id']]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
