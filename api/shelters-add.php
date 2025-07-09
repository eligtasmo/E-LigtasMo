<?php
header('Content-Type: application/json');
require_once 'db.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['name'], $data['lat'], $data['lng'], $data['capacity'], $data['occupancy'], $data['status'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields.']);
    exit;
}

try {
    $stmt = $pdo->prepare('INSERT INTO shelters (name, lat, lng, capacity, occupancy, status, contact_person, contact_number, address, category, photo, created_by, created_brgy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $data['name'],
        $data['lat'],
        $data['lng'],
        $data['capacity'],
        $data['occupancy'],
        $data['status'],
        $data['contact_person'] ?? null,
        $data['contact_number'] ?? null,
        $data['address'] ?? null,
        $data['category'] ?? null,
        $data['photo'] ?? null,
        $data['created_by'] ?? null,
        $data['created_brgy'] ?? null
    ]);
    $id = $pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM shelters WHERE id = ?');
    $stmt->execute([$id]);
    $shelter = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode($shelter);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
} 