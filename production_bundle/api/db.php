<?php
require_once __DIR__ . '/env_helper.php';

$host = $_ENV['DB_HOST'] ?? 'localhost';
$db   = $_ENV['DB_NAME'] ?? 'u238547610_eligtasmo';
$user = $_ENV['DB_USER'] ?? 'u238547610_admin';
$pass = $_ENV['DB_PASS'] ?? '@Eligtasmo29';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

// Enforce tactical timezone
date_default_timezone_set('Asia/Manila');

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    // Sync DB session time with tactical timezone
    $pdo->exec("SET time_zone = '+08:00'");
} catch (PDOException $e) {
    http_response_code(200);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
} 