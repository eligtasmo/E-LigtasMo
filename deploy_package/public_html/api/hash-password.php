<?php
require_once "cors.php";
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}
session_start();
echo "Admin hash: " . password_hash("admin", PASSWORD_DEFAULT) . "\n";
echo "Brgy hash: " . password_hash("brgy", PASSWORD_DEFAULT) . "\n";
?>
