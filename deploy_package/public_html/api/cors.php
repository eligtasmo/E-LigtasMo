<?php
/**
 * Universal Tactical CORS Authority v2.1
 * Ensures borderless connectivity across all devices and origins.
 * Now manages secure session lifecycle for cross-origin environments.
 */

// 1. Detect and Validate Origin
$origin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? null;
// Explicitly trust primary mission domains
$allowedOrigins = [
    'https://eligtasmo.site',
    'https://www.eligtasmo.site',
    'http://localhost:5173',
    'http://localhost:3000'
];

if ($origin) {
    // Strip trailing slash if any
    $origin = rtrim($origin, '/');
    // If it's a subpath of eligtasmo.site, allow it
    if (strpos($origin, 'eligtasmo.site') !== false) {
        header("Access-Control-Allow-Origin: $origin");
    } else if (in_array($origin, $allowedOrigins)) {
        header("Access-Control-Allow-Origin: $origin");
    } else {
        // Fallback to primary domain for safety
        header("Access-Control-Allow-Origin: https://eligtasmo.site");
    }
} else {
    header("Access-Control-Allow-Origin: https://eligtasmo.site");
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Token, X-Role, X-User-ID, Accept, Origin, Cookie");
header("Access-Control-Expose-Headers: Content-Length, X-JSON, Set-Cookie");
header("Access-Control-Max-Age: 86400");
header('Access-Control-Allow-Credentials: true');

// 3. Secure Session Bootstrapping
if (session_status() !== PHP_SESSION_ACTIVE) {
    $isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => $isSecure,
        'httponly' => true,
        'samesite' => $isSecure ? 'None' : 'Lax',
    ]);
    session_start();
}

// 4. Standardize Response Format
header("Content-Type: application/json; charset=UTF-8");

// 5. Conclusive Preflight Handshake
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// 6. Security & Stability: Disable error output to prevent JSON corruption
error_reporting(0);
ini_set('display_errors', 0);
?>
