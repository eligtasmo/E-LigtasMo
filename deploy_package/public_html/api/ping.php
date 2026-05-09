<?php
require_once "db.php"; // This tests the DB connection and loads env via env_helper

$status = [
    "mission_time" => date('Y-m-d H:i:s'),
    "database" => "CONNECTED",
    "environment" => "LOADED",
    "mapbox_token" => isset($_ENV['EXPO_PUBLIC_MAPBOX_TOKEN']) ? "PRESENT (" . substr($_ENV['EXPO_PUBLIC_MAPBOX_TOKEN'], 0, 8) . "...)" : "MISSING",
    "server_ip" => $_SERVER['SERVER_ADDR'] ?? 'Unknown',
    "host" => $_SERVER['HTTP_HOST'] ?? 'Unknown',
    "remote_ip" => $_SERVER['REMOTE_ADDR'] ?? 'Unknown'
];

header('Content-Type: application/json');
echo json_encode($status, JSON_PRETTY_PRINT);
