<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
require_once 'db.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['id'], $data['name'], $data['number'], $data['category'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid data provided']);
    exit;
}

try {
    $stmt = $pdo->prepare("UPDATE emergency_hotlines SET name = ?, number = ?, category = ?, icon = ? WHERE id = ?");
    $stmt->execute([
        $data['name'],
        $data['number'],
        $data['category'],
        $data['icon'] ?? 'Phone',
        $data['id']
    ]);
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
