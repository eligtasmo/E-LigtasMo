<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';

// Ensure emergency_contacts table exists
function ensure_contacts_table($pdo) {
    $sql = "CREATE TABLE IF NOT EXISTS emergency_contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        number VARCHAR(50) NOT NULL,
        description VARCHAR(255) NULL,
        type VARCHAR(50) NULL,
        priority VARCHAR(20) NULL,
        created_by VARCHAR(100) NULL,
        created_brgy VARCHAR(100) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    $pdo->exec($sql);
}

try {
    ensure_contacts_table($pdo);
    
    $brgy = isset($_GET['brgy']) ? trim($_GET['brgy']) : null;
    $sql = 'SELECT id, category, number, description, type, priority, created_by, created_brgy, created_at, updated_at FROM emergency_contacts';
    $params = [];

    if ($brgy) {
        $sql .= ' WHERE created_brgy IS NULL OR created_brgy = ?';
        $params[] = $brgy;
    }

    $sql .= ' ORDER BY CASE WHEN created_brgy IS NULL THEN 0 ELSE 1 END, id DESC';
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $contacts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($contacts);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}