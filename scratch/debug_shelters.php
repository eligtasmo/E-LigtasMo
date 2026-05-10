<?php
require_once 'api/db.php';
require_once 'api/auth_helper.php';

echo "SHELTERS TABLE DEBUG:\n";
try {
    $stmt = $pdo->query("SELECT id, name, created_brgy, created_by FROM shelters LIMIT 10");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($rows);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\nCURRENT USER DATA (if session exists):\n";
session_start();
print_r($_SESSION);
?>
