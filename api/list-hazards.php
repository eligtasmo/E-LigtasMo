<?php
header('Content-Type: application/json');
require_once 'db.php';

try {
    $stmt = $pdo->query('SELECT * FROM hazards ORDER BY created_at DESC');
    $hazards = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($hazards);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
} 