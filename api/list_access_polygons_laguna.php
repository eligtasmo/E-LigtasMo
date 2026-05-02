<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
header("Content-Type: application/json");
$resp = ["success" => true, "items" => []];
try { $pdo->query('SELECT 1'); } catch (Exception $e) { echo json_encode(["success" => false, "message" => "Database connection failed"]); exit; }
try {
  $tblExists = $pdo->query("SHOW TABLES LIKE 'access_polygons'")->rowCount() > 0;
  if (!$tblExists) { echo json_encode($resp); exit; }
  $stmt = $pdo->prepare("SELECT id, name, label, city, province, ST_AsText(geom) as wkt FROM access_polygons WHERE LOWER(province)=? ORDER BY id DESC");
  $stmt->execute(['laguna']);
  $resp['items'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
  echo json_encode($resp);
} catch (Exception $e) {
  echo json_encode(["success" => false, "message" => "Failed to list access polygons"]);
}
?> 
