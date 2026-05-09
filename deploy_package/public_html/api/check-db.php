<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

try {
    $stmt = $pdo->query("SHOW TABLES LIKE 'verification_codes'");
    $exists = $stmt->fetch();
    
    if ($exists) {
        $countStmt = $pdo->query("SELECT COUNT(*) as total FROM verification_codes");
        $count = $countStmt->fetch();
        echo json_encode([
            'success' => true, 
            'table_exists' => true,
            'record_count' => $count['total']
        ]);
    } else {
        echo json_encode([
            'success' => true, 
            'table_exists' => false
        ]);
    }
} catch (PDOException $e) {
    echo json_encode([
        'success' => false, 
        'error' => $e->getMessage()
    ]);
}
?>
