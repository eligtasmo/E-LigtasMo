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

// Load .env from the secure 'core' folder (outside public_html)
loadEnv(__DIR__ . '/../../core/.env');

// Fallback to local if core doesn't exist (for development)
if (!isset($_ENV['DB_NAME'])) {
    loadEnv(__DIR__ . '/../.env');
}
