<?php
/**
 * Optimized Incident Reporting API
 * Handles both point and area reports with unified storage
 */
require_once 'cors.php';
require_once 'db.php';
require_once 'rbac.php';
require_once 'lib/tactical-helpers.php';
require_once 'lib/notification-helper.php';

header("Content-Type: application/json");

// Ensure session is active
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

try {
    $raw = file_get_contents("php://input");
    $input = json_decode($raw, true);

    if (!$input || !is_array($input)) {
        throw new Exception("Invalid JSON input");
    }

    // Required Fields Validation
    $required = ['type', 'description', 'reporter'];
    foreach ($required as $f) {
        if (empty($input[$f])) throw new Exception("Missing required field: $f");
    }

    // Coordinate Normalization (Prioritize Pinpoint for Residents)
    $lat = isset($input['lat']) ? (float)$input['lat'] : (isset($input['latitude']) ? (float)$input['latitude'] : 0);
    $lng = isset($input['lng']) ? (float)$input['lng'] : (isset($input['longitude']) ? (float)$input['longitude'] : 0);
    
    // Geometry Handling (Radius/Polygon for Admin/Brgy)
    $areaGeojson = normalize_geometry($input['area_geojson'] ?? null);
    $bbox = calculate_bbox($areaGeojson);
    
    // If we have an area but no point, derive point from bbox center
    if ($lat == 0 && $lng == 0 && !empty($areaGeojson)) {
        if ($bbox) {
            $lat = ($bbox['north'] + $bbox['south']) / 2;
            $lng = ($bbox['east'] + $bbox['west']) / 2;
        }
    }

    if ($lat == 0 && $lng == 0 && empty($areaGeojson)) {
        throw new Exception("Location data is required (Coordinates or Area)");
    }
    
    // Auth & Permissions
    $currentUser = get_current_user_data();
    $user_id = $currentUser['id'] ?? ($input['user_id'] ?? 0);
    $role = $currentUser['role'] ?? 'guest';
    $isPrivileged = in_array($role, ['admin', 'brgy', 'brgy_chair', 'mmdrmo']);
    
    // Status Logic
    $status = $isPrivileged ? 'Verified' : 'Pending';
    if (isset($input['status']) && $input['status'] === 'Verified' && $isPrivileged) {
        $status = 'Verified';
    }

    // DB Preparation
    $sql = "INSERT INTO incident_reports (
        user_id, type, barangay, latitude, longitude, severity, description,
        reporter_name, reporter_contact, reporter_email,
        status, approved_by, approved_at, location_text, is_passable, allowed_modes,
        area_geojson, bbox_north, bbox_south, bbox_east, bbox_west,
        photo_url, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $user_id,
        $input['type'],
        $input['barangay'] ?? ($currentUser['brgy_name'] ?? ''),
        $lat,
        $lng,
        $input['severity'] ?? 'Moderate',
        $input['description'],
        $input['reporter'],
        $input['contact'] ?? '',
        $input['email'] ?? '',
        $status,
        $isPrivileged ? ($currentUser['full_name'] ?? 'System') : null,
        $isPrivileged ? date('Y-m-d H:i:s') : null,
        $input['address'] ?? ($input['location_text'] ?? ''),
        normalize_is_passable($input['is_passable'] ?? 1),
        isset($input['allowed_vehicles']) ? (is_array($input['allowed_vehicles']) ? json_encode($input['allowed_vehicles']) : $input['allowed_vehicles']) : null,
        $areaGeojson,
        $bbox['north'] ?? null, $bbox['south'] ?? null, $bbox['east'] ?? null, $bbox['west'] ?? null,
        $input['photo_url'] ?? ($input['photoUrl'] ?? null)
    ]);

    $report_id = $pdo->lastInsertId();

    // Trigger Notifications
    try {
        $notifTitle = ($status === 'Verified' ? "Tactical Alert: " . $input['type'] : "New Report: " . $input['type']);
        $brgy = $input['barangay'] ?? ($currentUser['brgy_name'] ?? 'Santa Cruz');
        $notifMsg = "Location: $brgy. Severity: " . ($input['severity'] ?? 'Moderate');

        if ($status === 'Verified') {
            NotificationHelper::notify($pdo, $notifTitle, $notifMsg, 'residents', $brgy, 'warning', 'emergency', $user_id, ['report_id' => $report_id]);
        }
        NotificationHelper::notify($pdo, $notifTitle, $notifMsg, 'barangay', $brgy, 'info', 'report_update', $user_id, ['report_id' => $report_id]);
        NotificationHelper::notify($pdo, $notifTitle, $notifMsg, 'admins', null, 'info', 'report_update', $user_id, ['report_id' => $report_id]);
    } catch (Exception $notifErr) {
        // Silently fail notification errors to ensure reporting success returns 200
    }

    echo json_encode([
        'success' => true,
        'message' => 'Report archived successfully',
        'report_id' => $report_id,
        'status' => $status
    ]);

} catch (Exception $e) {
    http_response_code(200); // Return 200 to allow client to show custom error instead of "Network Error"
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
