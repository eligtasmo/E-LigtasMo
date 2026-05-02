<?php
$envAllowed = getenv('ALLOWED_ORIGINS');
$allowed = [
    'http://localhost:8082',
    'http://localhost:19000',
    'http://localhost:19006',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'http://localhost:5178',
    'http://localhost:5179',
    'http://localhost:3000',
    'capacitor://localhost',
    'http://localhost',
    'https://eligtasmo.site',
    'https://www.eligtasmo.site',
    'https://e-ligtas-mo.vercel.app',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Credentials: true");
header("Vary: Origin");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Max-Age: 86400");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>
