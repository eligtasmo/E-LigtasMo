<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}
session_start();
file_put_contents(__DIR__ . '/logout_debug.txt', "Session before: " . print_r($_SESSION, true) . "\n", FILE_APPEND);
session_unset();
session_destroy();
file_put_contents(__DIR__ . '/logout_debug.txt', "Session after: " . print_r($_SESSION, true) . "\n", FILE_APPEND);
file_put_contents(__DIR__ . '/logout_debug.txt', "Cookies: " . print_r($_COOKIE, true) . "\n", FILE_APPEND);
echo json_encode(['success' => true]);
?> 