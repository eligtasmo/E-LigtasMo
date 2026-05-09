<?php
require_once 'api/db.php';

try {
    // Check if created_at exists in users
    $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'created_at'");
    if ($stmt->rowCount() === 0) {
        echo "Adding created_at to users table...\n";
        $pdo->exec("ALTER TABLE users ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
        echo "Done.\n";
    } else {
        echo "created_at already exists in users table.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
