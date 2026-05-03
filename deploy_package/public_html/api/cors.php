<?php
// Universal Tactical CORS Policy
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: false");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Max-Age: 86400");

// Standardize JSON response header
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>
