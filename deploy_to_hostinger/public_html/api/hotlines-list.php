<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
require_once 'db.php';

try {
    $stmt = $pdo->query("SELECT * FROM emergency_hotlines ORDER BY category ASC, name ASC");
    $hotlines = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $hotlines]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
