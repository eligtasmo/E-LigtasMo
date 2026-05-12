<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';

try {
    $exists = $pdo->query("SHOW TABLES LIKE 'safe_routes'")->fetch(PDO::FETCH_ASSOC);
    if (!$exists) {
        echo json_encode(['routes' => []]);
        exit;
    }

    $stmt = $pdo->query("SELECT * FROM safe_routes ORDER BY created_at DESC LIMIT 500");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) {
        if (isset($r['geojson']) && is_string($r['geojson']) && $r['geojson'] !== '') {
            $decoded = json_decode($r['geojson'], true);
            if (is_array($decoded)) $r['geojson'] = $decoded;
        }
    }
    echo json_encode(['routes' => $rows]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['routes' => [], 'error' => $e->getMessage()]);
}
?>
