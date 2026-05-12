<?php
/**
 * Universal Tactical CORS Authority v2.1
 * Ensures borderless connectivity across all devices and origins.
 * Now manages secure session lifecycle for cross-origin environments.
 */

// 1. Detect and Validate Origin (Dynamically echo to allow Credentials)
$origin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? null;
if (!$origin || $origin === '*') {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
    $origin = "$protocol://" . ($_SERVER['HTTP_HOST'] ?? 'api.eligtasmo.site');
} else {
    // Strip path from referer if needed
    if (strpos($origin, 'http') === 0 && strpos($origin, '://') !== false) {
        $parts = parse_url($origin);
        $origin = ($parts['scheme'] ?? 'https') . '://' . ($parts['host'] ?? 'api.eligtasmo.site');
        if (isset($parts['port'])) $origin .= ':' . $parts['port'];
    }
}

// 2. Broadcast Absolute CORS Policy
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Token, X-Role, X-User-ID, Accept, Origin, Cookie");
header("Access-Control-Expose-Headers: Content-Length, X-JSON, Set-Cookie");
header("Access-Control-Max-Age: 86400");
header('Access-Control-Allow-Credentials: true');


// 3. Secure Session Bootstrapping
require_once __DIR__ . '/session_boot.php';

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