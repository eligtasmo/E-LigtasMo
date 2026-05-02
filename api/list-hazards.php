<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';

try {
    // Consolidated version: pulling from unified incident_reports table
    $sql = "SELECT id, type, latitude as lat, longitude as lng, severity, status, 
                   location_text as address, description, reporter_name as reporter,
                   is_passable, area_geojson, allowed_modes, created_at, barangay
            FROM incident_reports
            WHERE type = 'Hazard' OR status = 'Active'
            ORDER BY created_at DESC LIMIT 1000";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $raw = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $processed = array_map(function($r) {
        $r['lat'] = (float)$r['lat'];
        $r['lng'] = (float)$r['lng'];
        if ($r['area_geojson']) {
            $decoded = json_decode($r['area_geojson'], true);
            if (is_array($decoded)) $r['area_geojson'] = $decoded;
        }
        if ($r['allowed_modes']) {
            $decoded = json_decode($r['allowed_modes'], true);
            if (is_array($decoded)) $r['allowed_modes'] = $decoded;
        } else {
            $r['allowed_modes'] = [];
        }
        return $r;
    }, $raw);

    echo json_encode([
        'success' => true,
        'hazards' => $processed
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
