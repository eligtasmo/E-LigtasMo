<?php
require_once 'cors.php';
require_once 'db.php';
require_once 'lib/tactical-helpers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);

    if (!$data || !is_array($data)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid input payload']);
        exit;
    }

    $user_id = isset($data['user_id']) ? (int)$data['user_id'] : 0;
    $latitude = isset($data['latitude']) ? (float)$data['latitude'] : 0;
    $longitude = isset($data['longitude']) ? (float)$data['longitude'] : 0;
    $type = isset($data['type']) ? trim((string)$data['type']) : 'Incident';
    $severity = isset($data['severity']) ? trim((string)$data['severity']) : 'Moderate';
    $description = isset($data['description']) ? trim((string)$data['description']) : '';
    $barangay = isset($data['barangay']) ? trim((string)$data['barangay']) : '';
    $reporter_name = isset($data['reporter_name']) ? trim((string)$data['reporter_name']) : 'Mobile User';
    $location_text = isset($data['location_text']) ? trim((string)$data['location_text']) : '';
    $role = isset($data['role']) ? strtolower(trim((string)$data['role'])) : 'resident';
    $is_passable = normalize_is_passable($data['is_passable'] ?? 1);
    $allowed_modes = isset($data['allowedVehicles']) ? (is_array($data['allowedVehicles']) ? json_encode(array_values($data['allowedVehicles'])) : (string)$data['allowedVehicles']) : null;

    // Handle Media Uploads (Optimized)
    $media_paths = [];
    $primary_path = null;
    $medias_array = isset($data['medias']) && is_array($data['medias']) ? $data['medias'] : [];

    if (!empty($medias_array)) {
        $upload_dir = __DIR__ . '/../uploads/reports/';
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }

        foreach (array_slice($medias_array, 0, 3) as $mstr) {
            if (preg_match('/^data:image\/(\w+);base64,/', $mstr, $match)) {
                $ext = strtolower($match[1]);
                $blob = base64_decode(substr($mstr, strpos($mstr, ',') + 1));
                if ($blob) {
                    $filename = 'report_' . time() . '_' . uniqid() . '.' . $ext;
                    if (file_put_contents($upload_dir . $filename, $blob)) {
                        $path = 'uploads/reports/' . $filename;
                        $media_paths[] = $path;
                        if (!$primary_path) $primary_path = $path;
                    }
                }
            }
        }
    }

    // Geometry Handling
    $areaGeojson = normalize_geometry($data['area_geojson'] ?? null);
    $bbox = calculate_bbox($areaGeojson);
    $wantsArea = !empty($areaGeojson);

    // Initial Status
    $isPrivileged = in_array($role, ['brgy','admin','brgy_chair','coordinator']);
    $initial_status = $isPrivileged ? 'Verified' : 'Pending';
    $approvedBy = $isPrivileged ? $reporter_name : null;
    $approvedAt = $isPrivileged ? date('Y-m-d H:i:s') : null;

    $sql = "INSERT INTO incident_reports (
        user_id, type, barangay, latitude, longitude, severity, description,
        image_path, media_path, media_paths, photo_url,
        reporter_name, reporter_contact, reporter_email,
        status, approved_by, approved_at, location_text, is_passable, allowed_modes,
        area_geojson, bbox_north, bbox_south, bbox_east, bbox_west
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $user_id, $type, $barangay, $latitude, $longitude, $severity, $description,
        $primary_path, $primary_path, json_encode($media_paths), $primary_path,
        $reporter_name, $data['reporter_contact'] ?? '', $data['reporter_email'] ?? '',
        $initial_status, $approvedBy, $approvedAt, $location_text, $is_passable, $allowed_modes,
        $areaGeojson, 
        $bbox['north'] ?? null, $bbox['south'] ?? null, $bbox['east'] ?? null, $bbox['west'] ?? null
    ]);

    $report_id = $pdo->lastInsertId();

    // Global & Targeted Notifications
    require_once 'lib/notification-helper.php';
    
    $notifTitle = ($initial_status === 'Verified' ? "Tactical Alert: $type" : "New Intelligence Report: $type");
    $notifMsg = ($initial_status === 'Verified' ? "A verified $type has been reported in Brgy. $barangay. Severity: $severity." : "A new $type report is pending verification in Brgy. $barangay.");

    // 1. Notify Residents of the Barangay if Verified
    if ($initial_status === 'Verified') {
        NotificationHelper::notify($pdo, $notifTitle, $notifMsg, 'residents', $barangay, 'warning', 'emergency', $user_id, ['report_id' => $report_id]);
    }

    // 2. Notify Brgy Officials of the Barangay
    NotificationHelper::notify($pdo, $notifTitle, $notifMsg, 'barangay', $barangay, 'info', 'report_update', $user_id, ['report_id' => $report_id]);

    // 3. Notify All Admins
    NotificationHelper::notify($pdo, $notifTitle, $notifMsg, 'admins', null, 'info', 'report_update', $user_id, ['report_id' => $report_id]);

    echo json_encode([
        'success' => true,
        'message' => 'Intelligence report archived successfully',
        'report_id' => $report_id
    ]);

} catch (Exception $e) {
    http_response_code(200); // Prevent Network Error on client
    echo json_encode([
        'success' => false,
        'error' => 'Database Sync Failed: ' . $e->getMessage()
    ]);
}
?>
