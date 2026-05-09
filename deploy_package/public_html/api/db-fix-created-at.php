<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';

try {
    echo "Diagnostic: Checking 'users' table structure...\n";
    
    // Check for created_at column
    $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'created_at'");
    $exists = ($stmt && $stmt->rowCount() > 0);
    
    if (!$exists) {
        echo "Action: Attempting to add 'created_at' column...\n";
        $pdo->exec("ALTER TABLE users ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
        echo "Success: 'created_at' column added successfully.\n";
    } else {
        echo "Status: 'created_at' column already exists.\n";
    }
    
    echo "\nVerification: Current columns in 'users':\n";
    $cols = $pdo->query("SHOW COLUMNS FROM users");
    while ($row = $cols->fetch(PDO::FETCH_ASSOC)) {
        echo "- " . $row['Field'] . " (" . $row['Type'] . ")\n";
    }

} catch (Exception $e) {
    http_response_code(500);
    echo "CRITICAL ERROR: " . $e->getMessage() . "\n";
}
?>
