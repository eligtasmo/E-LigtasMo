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
    $reporter = trim((string)($input['reporter_name'] ?? $input['reporter'] ?? $input['reported_by'] ?? 'Command'));
    $user_id = (int)($input['user_id'] ?? 0);
    
    $lat = (float)($input['lat'] ?? $input['latitude'] ?? 0);
    $lng = (float)($input['lng'] ?? $input['longitude'] ?? 0);
    
    $areaGeojson = normalize_geometry($input['area_geojson'] ?? null);
    $bbox = calculate_bbox($areaGeojson);
    
    $allowed_modes = '';
    if (isset($input['allowedVehicles'])) {
        $allowed_modes = is_array($input['allowedVehicles']) ? json_encode(array_values($input['allowedVehicles'])) : (string)$input['allowedVehicles'];
    }

    // ── Handle Media Uploads (Optimized) ──
    $media_paths = [];
    $primary_path = null;
    $medias_array = isset($input['medias']) && is_array($input['medias']) ? $input['medias'] : [];

    if (!empty($medias_array)) {
        $upload_dir = __DIR__ . '/../uploads/reports/';
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }

        foreach (array_slice($medias_array, 0, 3) as $mstr) {
            // Only accept valid image data URIs
            if (preg_match('/^data:image\/(png|jpg|jpeg|webp);base64,/', $mstr, $match)) {
                $ext = strtolower($match[1]);
                $blob = base64_decode(substr($mstr, strpos($mstr, ',') + 1));
                if ($blob) {
                    $filename = 'hazard_' . time() . '_' . uniqid() . '.' . $ext;
                    if (file_put_contents($upload_dir . $filename, $blob)) {
                        $path = 'uploads/reports/' . $filename;
                        $media_paths[] = $path;
                        if (!$primary_path) $primary_path = $path;
                    }
                }
            }
        }
    }

    $cols = [
        'user_id', 'type', 'latitude', 'longitude', 'severity', 'description', 'barangay', 
        'location_text', 'area_geojson', 'bbox_north', 'bbox_south', 'bbox_east', 'bbox_west', 
        'is_passable', 'allowed_modes', 'status', 'created_at', 'reporter_name',
        'image_path', 'media_path', 'media_paths', 'photo_url'
    ];
    $placeholders = array_fill(0, count($cols), '?');
    $vals = [
        $user_id, $type, $lat, $lng, $severity, $description, $barangay,
        $address, $areaGeojson, 
        $bbox ? $bbox['north'] : null, $bbox ? $bbox['south'] : null, 
        $bbox ? $bbox['east'] : null, $bbox ? $bbox['west'] : null,
        normalize_is_passable($input['is_passable'] ?? 0),
        $allowed_modes,
        ($input['status'] ?? 'Active'),
        date('Y-m-d H:i:s'),
        $reporter,
        $primary_path,
        $primary_path,
        json_encode($media_paths),
        $primary_path
    ];

    $sql = "INSERT INTO incident_reports (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $placeholders) . ")";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($vals);

    $report_id = $pdo->lastInsertId();

    // ── Tactical Notifications ──
    try {
        require_once 'lib/notification-helper.php';
        $notifTitle = "Tactical Alert: $type";
        $notifMsg = "A $type has been reported in Brgy. $barangay. Severity: $severity.";
        
        // Notify Admins & Coordinator
        NotificationHelper::notify($pdo, $notifTitle, $notifMsg, 'admins', null, 'info', 'report_update', $user_id, ['report_id' => $report_id]);
        NotificationHelper::notify($pdo, $notifTitle, $notifMsg, 'barangay', $barangay, 'info', 'report_update', $user_id, ['report_id' => $report_id]);
    } catch (Exception $ne) {}

    echo json_encode(['success' => true, 'id' => $report_id]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
