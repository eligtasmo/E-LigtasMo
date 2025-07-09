<?php
header('Content-Type: application/json');
require_once 'db.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing hazard id.']);
    exit;
}

try {
    $stmt = $pdo->prepare('UPDATE hazards SET type=?, description=?, lat=?, lng=?, barangay=?, reported_by=?, status=? WHERE id=?');
    $stmt->execute([
        $data['type'],
        $data['description'] ?? null,
        $data['lat'] ?? null,
        $data['lng'] ?? null,
        $data['barangay'] ?? null,
        $data['reported_by'] ?? null,
        $data['status'] ?? 'active',
        $data['id']
    ]);
    $stmt = $pdo->prepare('SELECT * FROM hazards WHERE id = ?');
    $stmt->execute([$data['id']]);
    $hazard = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode($hazard);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
} 