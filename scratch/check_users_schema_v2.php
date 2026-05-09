<?php
$host = '127.0.0.1';
$db   = 'u238547610_eligtasmo';
$user = 'u238547610_admin';
$pass = '@Eligtasmo29';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    
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
