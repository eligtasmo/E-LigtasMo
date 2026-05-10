<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';

// Ensure emergency_contacts table exists
function ensure_contacts_table($pdo) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS emergency_contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        name VARCHAR(100) NULL,
        category VARCHAR(100) NOT NULL,
        number VARCHAR(50) NOT NULL,
        description VARCHAR(255) NULL,
        type VARCHAR(50) NULL,
        priority VARCHAR(20) NULL,
        created_by VARCHAR(100) NULL,
        created_brgy VARCHAR(100) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Robust column sync
    $cols = [
        'user_id' => "INT NULL AFTER id",
        'created_brgy' => "VARCHAR(100) NULL AFTER created_by"
    ];
    foreach ($cols as $name => $def) {
        $stmt = $pdo->query("SHOW COLUMNS FROM emergency_contacts LIKE '$name'");
        if ($stmt && $stmt->rowCount() === 0) {
            $pdo->exec("ALTER TABLE emergency_contacts ADD COLUMN $name $def");
        }
    }
}

try {
    @ensure_contacts_table($pdo);
    
    $brgy = isset($_GET['brgy']) ? trim($_GET['brgy']) : null;
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
    
    $sql = 'SELECT id, user_id, name, category, number, description, type, priority, created_by, created_brgy, created_at, updated_at FROM emergency_contacts';
    $params = [];
    $where = [];

    // Global contacts (user_id IS NULL AND created_brgy IS NULL)
    // OR Brgy contacts (user_id IS NULL AND created_brgy = ?)
    // OR Private contacts (user_id = ?)
    
    if ($user_id) {
        if ($brgy) {
            $where[] = '(user_id = ? OR (user_id IS NULL AND (created_brgy IS NULL OR created_brgy = ?)))';
            $params[] = $user_id;
            $params[] = $brgy;
        } else {
            $where[] = '(user_id = ? OR user_id IS NULL)';
            $params[] = $user_id;
        }
    } else if ($brgy) {
        $where[] = '(user_id IS NULL AND (created_brgy IS NULL OR created_brgy = ?))';
        $params[] = $brgy;
    } else {
        $where[] = 'user_id IS NULL';
    }

    if (!empty($where)) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $sql .= ' ORDER BY user_id DESC, CASE WHEN created_brgy IS NULL THEN 0 ELSE 1 END, id DESC';
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $contacts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($contacts);
} catch (\Throwable $e) {
    http_response_code(200);
    echo json_encode([]);
}
?>