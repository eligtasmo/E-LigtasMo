<?php
header('Content-Type: application/json');
require_once 'db.php'; // expects $pdo as PDO instance

try {
    $stmt = $pdo->query('SELECT * FROM shelters ORDER BY id DESC');
    $shelters = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($shelters);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
} 