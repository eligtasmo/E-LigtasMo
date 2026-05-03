<?php
require_once 'db.php';

header('Content-Type: application/json');
echo json_encode([
    'status' => 'success',
    'message' => 'Connected successfully to the live Hostinger database!',
    'db_name' => $_ENV['DB_NAME'] ?? 'Unknown'
]);
?>
