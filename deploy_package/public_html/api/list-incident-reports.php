<?php
// CORS alignment for credentialed requests
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if ($origin) {
    header("Access-Control-Allow-Origin: " . $origin);
    header("Access-Control-Allow-Credentials: true");
    header("Vary: Origin");
} else {
    header("Access-Control-Allow-Origin: http://localhost");
}
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

$barangay = isset($_GET['barangay']) ? trim($_GET['barangay']) : null;
$status = isset($_GET['status']) ? trim($_GET['status']) : null;
$id = isset($_GET['id']) ? trim($_GET['id']) : null;
$days = isset($_GET['days']) ? intval($_GET['days']) : null;
$all_time = isset($_GET['all_time']) && $_GET['all_time'] === 'true';
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;

try {
    $hasArea = $pdo->query("SHOW COLUMNS FROM incident_reports LIKE 'area_geojson'")->fetch(PDO::FETCH_ASSOC);
    // Only fetch reports from the last 24 hours to keep it relevant
    $sql = "
        SELECT fr.id, fr.user_id, fr.type, fr.latitude, fr.longitude, fr.severity, fr.status, fr.description, fr.created_at,
               fr.barangay, fr.reporter_name, fr.reporter_contact, fr.reporter_email, fr.media_path, fr.media_paths,
               fr.approved_by, fr.approved_at, fr.rejected_by, fr.rejected_at, fr.resolved_by, fr.resolved_at, fr.location_text,
               CASE 
                   WHEN u.role IS NOT NULL THEN u.role 
                   WHEN fr.user_id = 0 AND fr.status = 'Verified' AND fr.approved_at IS NOT NULL THEN 'brgy'
                   ELSE 'resident' 
               END as reporter_role
        FROM incident_reports fr
        LEFT JOIN users u ON fr.user_id = u.id
        WHERE 1=1
    ";
    if ($hasArea) {
        $sql = str_replace("fr.location_text,", "fr.location_text, fr.area_geojson,", $sql);
    }
    $params = [];
    if (!$id && !$all_time) {
        if ($days) {
            $sql .= " AND fr.created_at >= NOW() - INTERVAL ? DAY";
            $params[] = $days;
        } else {
            // Default visibility logic
            if ($status === 'Verified') {
                // Show last 7 days for verified reports
                $sql .= " AND fr.created_at >= NOW() - INTERVAL 7 DAY";
            } elseif ($status === 'Resolved') {
                 // Show last 7 days for resolved reports
                $sql .= " AND fr.created_at >= NOW() - INTERVAL 7 DAY";
            } elseif ($status) {
                // Specific status other than Verified/Resolved -> 24 hours
                $sql .= " AND fr.created_at >= NOW() - INTERVAL 24 HOUR";
            } else {
                // No status filter (Fetch All)
                // Verified/Resolved: 30 days, Others: 24 hours
                $sql .= " AND (
                    (fr.status IN ('Verified', 'Resolved') AND fr.created_at >= NOW() - INTERVAL 30 DAY)
                    OR
                    (fr.status NOT IN ('Verified', 'Resolved') AND fr.created_at >= NOW() - INTERVAL 24 HOUR)
                )";
            }
        }
    }
    if ($id) {
        $sql .= " AND fr.id = ?";
        $params[] = $id;
    }
    if ($barangay) {
        $sql .= " AND fr.barangay LIKE ?";
        $params[] = "%$barangay%";
    }
    if ($status) {
        $sql .= " AND fr.status = ?";
        $params[] = $status;
    }
    if ($user_id) {
        $sql .= " AND fr.user_id = ?";
        $params[] = $user_id;
    }
    
    // Sort by newest first
    $sql .= " ORDER BY fr.created_at DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    $reports = $stmt->fetchAll();
    
    // Transform for frontend
    $output = array_map(function($r) use ($hasArea) {
        $out = [
            'id' => $r['id'],
            'user_id' => $r['user_id'],
            'type' => $r['type'] ?? 'Incident',
            'lat' => (float)$r['latitude'],
            'lng' => (float)$r['longitude'],
            'severity' => $r['severity'],
            'status' => $r['status'],
            'description' => $r['description'],
            'time' => $r['created_at'] ?? date('Y-m-d H:i:s'),
            'barangay' => $r['barangay'] ?? null,
            'reporter_name' => $r['reporter_name'] ?? null,
            'reporter_contact' => $r['reporter_contact'] ?? null,
            'reporter_email' => $r['reporter_email'] ?? null,
            'media_path' => $r['media_path'] ?? null,
            'media_paths' => isset($r['media_paths']) && $r['media_paths'] ? json_decode($r['media_paths'], true) : [],
            'approved_by' => $r['approved_by'] ?? null,
            'approved_at' => $r['approved_at'] ?? null,
            'rejected_by' => $r['rejected_by'] ?? null,
            'rejected_at' => $r['rejected_at'] ?? null,
            'resolved_by' => $r['resolved_by'] ?? null,
            'resolved_at' => $r['resolved_at'] ?? null,
            'location_text' => $r['location_text'] ?? null,
            'reporter_role' => $r['reporter_role'] ?? 'resident'
        ];
        if ($hasArea && isset($r['area_geojson']) && $r['area_geojson']) {
            $decoded = json_decode($r['area_geojson'], true);
            if (is_array($decoded)) $out['area_geojson'] = $decoded;
        }
        return $out;
    }, $reports);

    echo json_encode($output);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
