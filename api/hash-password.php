<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}
session_start();
echo "Admin hash: " . password_hash("admin", PASSWORD_DEFAULT) . "\n";
echo "Brgy hash: " . password_hash("brgy", PASSWORD_DEFAULT) . "\n";
?>
