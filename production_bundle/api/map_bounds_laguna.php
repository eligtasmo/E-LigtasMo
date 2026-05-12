<?php
require_once __DIR__ . '/cors.php';
header("Content-Type: application/json");
echo json_encode([
  "province" => "Laguna",
  "center" => ["lat" => 14.17, "lon" => 121.35],
  "bounds" => [
    "minLat" => 13.90,
    "minLon" => 121.10,
    "maxLat" => 14.45,
    "maxLon" => 121.70
  ],
  "restrict_panning" => true
]);
?> 
