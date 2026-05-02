<?php
/**
 * Attempting connection with EXACT db.php parameters from CLI
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

$host = 'localhost';
$db   = 'eligtasmo';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";

try {
    echo "Connecting to $dsn as $user...\n";
    $pdo = new PDO($dsn, $user, $pass);
    echo "SUCCESS: Connected!\n";
    
    // Perform cleanup directly
    echo "Resetting users table...\n";
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("TRUNCATE TABLE users;");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    
    $accounts = [
        ['admin', '$2y$10$1Sqv75F2WaUpBQdUJ7vTI.T8giW3D6gfJS9rEO5uIljtSlzkUorJa', 'System Administrator', 'admin'],
        ['brgy', '$2y$10$2vz/wX.P1K6RL1qAh28rgeJcNsdHziamwIHodSlQwT3SH1EKVz6ey', 'Barangay Official', 'brgy'],
        ['resident', '$2y$10$0L/fsqUlshYzynQBa7i3X.llF1tATorAj8QQBAPOQc9j8UwE5VR4G', 'Resident User', 'resident'],
        ['coordinator', '$2y$10$znCT.xDXv5q1qQtOfBIzw.KEfsDW3YEUHbqv/QkFCwctEf/Gsa1Xq', 'Emergency Coordinator', 'coordinator']
    ];
    
    $stmt = $pdo->prepare("INSERT INTO users (username, password, full_name, role, status, brgy_name) VALUES (?, ?, ?, ?, 'approved', ?)");
    foreach ($accounts as $acc) {
        $brgy = ($acc[0] == 'brgy' || $acc[0] == 'resident') ? 'Santisima Cruz' : 'All';
        $stmt->execute([$acc[0], $acc[1], $acc[2], $acc[3], $brgy]);
        echo "Created account: {$acc[0]}\n";
    }
    
    echo "Deduplicating other tables...\n";
    $pdo->exec("DELETE t1 FROM shelters t1 INNER JOIN shelters t2 WHERE t1.id > t2.id AND t1.name = t2.name");
    $pdo->exec("DELETE t1 FROM social_posts t1 INNER JOIN social_posts t2 WHERE t1.id > t2.id AND t1.content = t2.content");
    
    echo "CLEANUP COMPLETE!\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
