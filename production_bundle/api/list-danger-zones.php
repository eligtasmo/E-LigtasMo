<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';

try {
    $exists = $pdo->query("SHOW TABLES LIKE 'danger_zones'")->fetch(PDO::FETCH_ASSOC);
    if (!$exists) {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS danger_zones (
                id INT AUTO_INCREMENT PRIMARY KEY,
                path LONGTEXT NOT NULL,
                description TEXT,
                reported_by VARCHAR(255),
                reported_at DATETIME,
                type VARCHAR(50) DEFAULT 'road_hazard',
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
        echo json_encode([]);
        exit;
    }
    $stmt = $pdo->query('SELECT * FROM danger_zones WHERE status = "active" ORDER BY created_at DESC');
    $dangerZones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Parse JSON path for each danger zone
    foreach ($dangerZones as &$zone) {
        if (isset($zone['path'])) {
            $zone['path'] = json_decode($zone['path'], true);
        }
    }
    
    echo json_encode($dangerZones);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
