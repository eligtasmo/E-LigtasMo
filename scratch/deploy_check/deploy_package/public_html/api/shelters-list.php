<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';

try {
    $stmt = $pdo->query('SELECT * FROM shelters ORDER BY id DESC');
    $shelters = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Decode photos JSON for frontend
    foreach ($shelters as &$s) {
        if (isset($s['photos']) && $s['photos']) {
            $s['photos'] = json_decode($s['photos'], true);
        } else {
            $s['photos'] = [];
        }
    }
    
    echo json_encode($shelters);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}