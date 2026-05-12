<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';

$north = isset($_GET['north']) ? (float)$_GET['north'] : 14.40;
$south = isset($_GET['south']) ? (float)$_GET['south'] : 14.10;
$east  = isset($_GET['east'])  ? (float)$_GET['east']  : 121.60;
$west  = isset($_GET['west'])  ? (float)$_GET['west']  : 121.25;

try {
    // 1. Fetch from the unified incident_reports table
    $sql = "SELECT id, type, latitude as lat, longitude as lng, severity, status, 
                   location_text as address, description, reporter_name as reporter,
                   is_passable, area_geojson, allowed_modes, created_at,
                   image_path, media_path, media_paths, photo_url
            FROM incident_reports
            WHERE LOWER(status) IN ('active', 'approved', 'verified')
              AND (
                  (bbox_north >= :south1 AND bbox_south <= :north1 AND bbox_east >= :west1 AND bbox_west <= :east1)
                  OR 
                  (latitude BETWEEN :south2 AND :north2 AND longitude BETWEEN :west2 AND :east2)
              )
            ORDER BY created_at DESC LIMIT 2000";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':north1' => $north, ':south1' => $south, ':east1' => $east, ':west1' => $west,
        ':north2' => $north, ':south2' => $south, ':east2' => $east, ':west2' => $west
    ]);
    
    $raw = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $processed = array_map(function($r) {
        $r['lat'] = (float)$r['lat'];
        $r['lng'] = (float)$r['lng'];
        $r['is_passable'] = (int)$r['is_passable'];
        
        if ($r['area_geojson']) {
            $decoded = json_decode($r['area_geojson'], true);
            if (is_array($decoded)) $r['area_geojson'] = $decoded;
        }
        
        $modes = $r['allowed_modes'];
        if (is_string($modes) && $modes !== '') {
            $decoded = json_decode($modes, true);
            if (is_array($decoded)) $r['allowed_modes'] = $decoded;
        } else {
            $r['allowed_modes'] = [];
        }
        
        return $r;
    }, $raw);

    echo json_encode([
        'success' => true,
        'bbox' => ['north' => $north, 'south' => $south, 'east' => $east, 'west' => $west],
        'reports' => $processed,
        'hazards' => [] // Kept for legacy frontend compatibility, but all data is in 'reports'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
