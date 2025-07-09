<?php
header('Content-Type: application/json');
require_once 'db.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['type'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields.']);
    exit;
}

try {
    $stmt = $pdo->prepare('INSERT INTO hazards (type, description, lat, lng, barangay, reported_by, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $data['type'],
        $data['description'] ?? null,
        $data['lat'] ?? null,
        $data['lng'] ?? null,
        $data['barangay'] ?? null,
        $data['reported_by'] ?? null,
        $data['status'] ?? 'active'
    ]);
    $id = $pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM hazards WHERE id = ?');
    $stmt->execute([$id]);
    $hazard = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode($hazard);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
} 