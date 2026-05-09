<?php
require_once "cors.php";
/**
 * Simple .env parser for PHP
 */
function loadEnv($path) {
    if (!file_exists($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }

        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);

        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

// Load .env from various secure locations
$envPaths = [
    __DIR__ . '/../../core/.env',  // Standard: sibling to public_html
    __DIR__ . '/../core/.env',     // Variation: inside parent folder
    __DIR__ . '/core/.env',        // Variation: local core folder
    __DIR__ . '/../.env'           // Local fallback
];

foreach ($envPaths as $path) {
    if (file_exists($path)) {
        loadEnv($path);
    }
}

// Final check to ensure mission-critical data is present
if (!isset($_ENV['DB_NAME']) && file_exists(__DIR__ . '/.env')) {
    loadEnv(__DIR__ . '/.env');
}
