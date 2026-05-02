<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'lib/tactical-helpers.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON input']);
    exit;
}

try {
    $type = trim((string)($input['type'] ?? 'Incident'));
    $severity = trim((string)($input['severity'] ?? 'Moderate'));
    $description = trim((string)($input['description'] ?? ''));
    $barangay = trim((string)($input['barangay'] ?? ''));
    $address = trim((string)($input['address'] ?? $input['location'] ?? ''));
    $reporter = trim((string)($input['reporter'] ?? $input['reported_by'] ?? ''));
    
    $lat = (float)($input['lat'] ?? $input['latitude'] ?? 0);
    $lng = (float)($input['lng'] ?? $input['longitude'] ?? 0);
    
    $areaGeojson = normalize_geometry($input['area_geojson'] ?? null);
    $bbox = calculate_bbox($areaGeojson);
    
    $allowed_modes = '';
    if (isset($input['allowedVehicles'])) {
        $allowed_modes = is_array($input['allowedVehicles']) ? json_encode(array_values($input['allowedVehicles'])) : (string)$input['allowedVehicles'];
    }

    $cols = [
        'type', 'latitude', 'longitude', 'severity', 'description', 'barangay', 
        'location_text', 'area_geojson', 'bbox_north', 'bbox_south', 'bbox_east', 'bbox_west', 
        'is_passable', 'allowed_modes', 'status', 'created_at', 'reporter_name'
    ];
    $placeholders = array_fill(0, count($cols), '?');
    $vals = [
        $type, $lat, $lng, $severity, $description, $barangay,
        $address, $areaGeojson, 
        $bbox ? $bbox['north'] : null, $bbox ? $bbox['south'] : null, 
        $bbox ? $bbox['east'] : null, $bbox ? $bbox['west'] : null,
        normalize_is_passable($input['is_passable'] ?? 0),
        $allowed_modes,
        ($input['status'] ?? 'Active'),
        date('Y-m-d H:i:s'),
        $reporter
    ];

    $sql = "INSERT INTO incident_reports (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $placeholders) . ")";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($vals);

    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
