<?php
require_once "cors.php";
header('Content-Type: application/json');
require_once 'db.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['name'], $data['number'], $data['category'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid data provided']);
    exit;
}

try {
    $stmt = $pdo->prepare("INSERT INTO emergency_hotlines (name, number, category, icon) VALUES (?, ?, ?, ?)");
    $stmt->execute([
        $data['name'],
        $data['number'],
        $data['category'],
        $data['icon'] ?? 'Phone'
    ]);
    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
