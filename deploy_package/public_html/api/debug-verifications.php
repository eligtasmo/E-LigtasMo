<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

try {
    // Attempt to manually create it one last time just to be sure
    $pdo->exec("CREATE TABLE IF NOT EXISTS verification_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(10) NOT NULL,
        purpose VARCHAR(50) DEFAULT 'signup',
        expires_at INT NOT NULL,
        verified TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (email),
        INDEX (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $stmt = $pdo->query("SELECT * FROM verification_codes ORDER BY created_at DESC LIMIT 10");
    $records = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true, 
        'message' => 'Table exists',
        'database' => $db,
        'table' => 'verification_codes',
        'recent_records' => $records
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false, 
        'error' => $e->getMessage()
    ]);
}
?>
