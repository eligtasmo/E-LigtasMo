<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'lib/tactical-helpers.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing record id.']);
    exit;
}

try {
    $updateFields = [];
    $updateValues = [];
    
    // Map both hazard and incident report style fields to the unified table
    $fieldMapping = [
        'type' => 'type',
        'description' => 'description',
        'lat' => 'latitude',
        'latitude' => 'latitude',
        'lng' => 'longitude',
        'longitude' => 'longitude',
        'location' => 'barangay',
        'barangay' => 'barangay',
        'address' => 'location_text',
        'location_text' => 'location_text',
        'severity' => 'severity',
        'area_geojson' => 'area_geojson',
        'reporter' => 'reporter_name',
        'reported_by' => 'reporter_name',
        'is_passable' => 'is_passable',
        'status' => 'status'
    ];
    
    $areaGeo = null;
    foreach ($fieldMapping as $frontendField => $dbField) {
        if (!isset($data[$frontendField])) continue;
        
        $val = $data[$frontendField];
        if ($frontendField === 'area_geojson') {
            $areaGeo = normalize_geometry($val);
            if ($areaGeo) {
                $updateFields[] = "$dbField = ?";
                $updateValues[] = $areaGeo;
            }
            continue;
        }
        if ($dbField === 'is_passable') {
            $val = normalize_is_passable($val);
        }
        // Avoid duplicate updates for same DB field
        if (in_array("$dbField = ?", $updateFields)) continue;

        $updateFields[] = "$dbField = ?";
        $updateValues[] = $val;
    }

    if ($areaGeo) {
        $bbox = calculate_bbox($areaGeo);
        if ($bbox) {
            $updateFields[] = "bbox_north = ?"; $updateValues[] = $bbox['north'];
            $updateFields[] = "bbox_south = ?"; $updateValues[] = $bbox['south'];
            $updateFields[] = "bbox_east = ?";  $updateValues[] = $bbox['east'];
            $updateFields[] = "bbox_west = ?";  $updateValues[] = $bbox['west'];
        }
    }

    if (isset($data['allowedVehicles'])) {
        $allowed = $data['allowedVehicles'];
        $json = is_array($allowed) ? json_encode(array_values($allowed)) : $allowed;
        $updateFields[] = "allowed_modes = ?";
        $updateValues[] = $json;
    }

    if (empty($updateFields)) {
        echo json_encode(['error' => 'No fields to update']);
        exit;
    }
    
    $updateValues[] = $data['id'];
    $sql = "UPDATE incident_reports SET " . implode(', ', $updateFields) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($updateValues);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
