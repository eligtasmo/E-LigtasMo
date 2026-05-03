<?php
// CORS for credentialed requests from the Vite dev server
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if ($origin) {
    header("Access-Control-Allow-Origin: " . $origin);
    header("Access-Control-Allow-Credentials: true");
    header("Vary: Origin");
} else {
    header("Access-Control-Allow-Origin: http://localhost");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

function extract_geojson_coords($geom, &$pairs) {
    if (!is_array($geom)) return;
    if (isset($geom['type']) && isset($geom['coordinates'])) {
        $coords = $geom['coordinates'];
    } elseif (isset($geom['geometry']) && is_array($geom['geometry'])) {
        $coords = $geom['geometry']['coordinates'] ?? null;
    } else {
        $coords = $geom;
    }
    if (is_array($coords) && count($coords) > 0) {
        $first = $coords[0];
        if (is_array($first) && count($first) >= 2 && is_numeric($first[0]) && is_numeric($first[1])) {
            $pairs[] = [ (float)$first[0], (float)$first[1] ];
            for ($i = 1; $i < count($coords); $i++) {
                $c = $coords[$i];
                if (is_array($c) && count($c) >= 2 && is_numeric($c[0]) && is_numeric($c[1])) {
                    $pairs[] = [ (float)$c[0], (float)$c[1] ];
                }
            }
        } else {
            foreach ($coords as $child) {
                extract_geojson_coords($child, $pairs);
            }
        }
    }
}

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input']);
    exit;
}

$user_id = $data['user_id'] ?? null;
$latitude = $data['latitude'];
$longitude = $data['longitude'];
$sevRaw = strtolower(trim((string)($data['severity'] ?? 'Moderate')));
if ($sevRaw === 'critical') $severity = 'Critical';
elseif ($sevRaw === 'high') $severity = 'High';
elseif ($sevRaw === 'medium' || $sevRaw === 'moderate') $severity = 'Moderate';
elseif ($sevRaw === 'low') $severity = 'Low';
else $severity = 'Moderate';
$description = $data['description'] ?? '';
$image_base64 = $data['image'] ?? null;
$video_base64 = $data['video'] ?? null;
$media_base64 = $data['media'] ?? null;
$medias_array = isset($data['medias']) && is_array($data['medias']) ? $data['medias'] : [];
$barangay = $data['barangay'] ?? null;
$reporter_name = $data['reporter_name'] ?? null;
$reporter_contact = $data['reporter_contact'] ?? null;
$reporter_email = $data['reporter_email'] ?? null;
$role = $data['role'] ?? 'resident';
$location_text = $data['location_text'] ?? null;

$wantsArea = isset($data['area_geojson']) || isset($data['area']);
$areaGeojson = null;
$bbox = null;
if ($wantsArea) {
    $rawArea = $data['area_geojson'] ?? $data['area'];
    if (is_string($rawArea)) {
        $decoded = json_decode($rawArea, true);
        if (is_array($decoded)) $rawArea = $decoded;
    }
    if (!is_array($rawArea)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid area_geojson']);
        exit;
    }
    $coordsPairs = [];
    extract_geojson_coords($rawArea, $coordsPairs);
    if (count($coordsPairs) === 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid area_geojson coordinates']);
        exit;
    }
    $minLng = $coordsPairs[0][0];
    $maxLng = $coordsPairs[0][0];
    $minLat = $coordsPairs[0][1];
    $maxLat = $coordsPairs[0][1];
    foreach ($coordsPairs as $p) {
        $minLng = min($minLng, $p[0]);
        $maxLng = max($maxLng, $p[0]);
        $minLat = min($minLat, $p[1]);
        $maxLat = max($maxLat, $p[1]);
    }
    $bbox = ['north' => $maxLat, 'south' => $minLat, 'east' => $maxLng, 'west' => $minLng];
    $areaGeojson = json_encode($rawArea);

    if ((!isset($latitude) || !is_numeric($latitude) || (float)$latitude == 0.0) || (!isset($longitude) || !is_numeric($longitude) || (float)$longitude == 0.0)) {
        $latitude = ($bbox['north'] + $bbox['south']) / 2.0;
        $longitude = ($bbox['east'] + $bbox['west']) / 2.0;
    }
}

// Ensure location_text column exists
try {
    $check = $pdo->query("SHOW COLUMNS FROM incident_reports LIKE 'location_text'");
    if ($check->rowCount() == 0) {
        $pdo->exec("ALTER TABLE incident_reports ADD COLUMN location_text VARCHAR(255) NULL");
    }
} catch (Exception $e) {}

// If location_text is not provided, try to fetch it from Nominatim (Server-side Fallback)
if (!$location_text && $latitude && $longitude) {
    try {
        $url = "https://nominatim.openstreetmap.org/reverse?format=json&lat={$latitude}&lon={$longitude}&zoom=18&addressdetails=1";
        $opts = [
            "http" => [
                "header" => "User-Agent: Eligtasmo/1.0 (internal-test)\r\n"
            ]
        ];
        $context = stream_context_create($opts);
        $json = @file_get_contents($url, false, $context);
        if ($json) {
            $geo = json_decode($json, true);
            if (isset($geo['display_name'])) {
                $location_text = $geo['display_name'];
                // Truncate if too long
                if (strlen($location_text) > 250) {
                    $location_text = substr($location_text, 0, 247) . '...';
                }
            }
        }
    } catch (Exception $e) {
        // Ignore geocoding errors
    }
}

// --- AUTO-DETECT BARANGAY LOGIC ---
try {
    // Fetch all known barangays
    $stmt = $pdo->query("SELECT name, lat, lng FROM barangays");
    $all_barangays = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($all_barangays) {
        $input_barangay = trim((string)$barangay);
        $canonical_barangay = null;
        $nearest_barangay_name = null;
        $min_distance = 999999;

        // Haversine formula
        function haversineDistance($lat1, $lon1, $lat2, $lon2) {
            $earthRadius = 6371; // km
            $dLat = deg2rad($lat2 - $lat1);
            $dLon = deg2rad($lon2 - $lon1);
            $a = sin($dLat/2) * sin($dLat/2) +
                 cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
                 sin($dLon/2) * sin($dLon/2);
            $c = 2 * atan2(sqrt($a), sqrt(1-$a));
            return $earthRadius * $c;
        }

        foreach ($all_barangays as $b) {
            // 1. Exact Name Match (Case Insensitive)
            if (strcasecmp($b['name'], $input_barangay) === 0) {
                $canonical_barangay = $b['name'];
            }

            // 2. Distance Check
            if ($latitude && $longitude && $b['lat'] && $b['lng']) {
                $dist = haversineDistance($latitude, $longitude, $b['lat'], $b['lng']);
                if ($dist < $min_distance) {
                    $min_distance = $dist;
                    $nearest_barangay_name = $b['name'];
                }
            }
        }

        // Logic to assign barangay
        if ($canonical_barangay) {
            $barangay = $canonical_barangay; // Use the correct spelling
        } elseif ($nearest_barangay_name && $min_distance < 10) { 
            // If no name match (or empty), but we found a nearest barangay within 10km, use it.
            // 10km is generous but ensures assignment.
            $barangay = $nearest_barangay_name;
        }
    }
} catch (Exception $e) {
    // Fallback to whatever was provided if DB fails
}
// ----------------------------------

// Handle Image Upload (Simplified: Save to server if provided)
$image_path = null;
$video_path = null;
$media_path = null;
$media_paths = [];

if ($media_base64) {
    if (preg_match('/^data:(image|video)\/(\w+);base64,/', $media_base64, $mtype)) {
        $data_blob = substr($media_base64, strpos($media_base64, ',') + 1);
        $kind = strtolower($mtype[1]);
        $ext = strtolower($mtype[2]);
        $data_blob = base64_decode($data_blob);
        if ($data_blob !== false) {
            $filename = 'report_' . time() . '_' . uniqid() . '.' . $ext;
            $filepath = __DIR__ . '/../uploads/reports/' . $filename;
            if (!is_dir(__DIR__ . '/../uploads/reports')) {
                mkdir(__DIR__ . '/../uploads/reports', 0777, true);
            }
            file_put_contents($filepath, $data_blob);
            $media_path = 'uploads/reports/' . $filename;
            if ($kind === 'image') $image_path = $media_path;
            if ($kind === 'video') $video_path = $media_path;
        }
    }
}

// Handle multiple images (up to 3)
if (!empty($medias_array)) {
    try {
        $count = 0;
        foreach ($medias_array as $mstr) {
            if ($count >= 3) break;
            if (preg_match('/^data:image\/(\w+);base64,/', $mstr, $type)) {
                $blob = substr($mstr, strpos($mstr, ',') + 1);
                $ext = strtolower($type[1]);
                if (in_array($ext, ['jpg','jpeg','png','gif'])) {
                    $data_blob = base64_decode($blob);
                    if ($data_blob !== false) {
                        $filename = 'report_' . time() . '_' . uniqid() . '.' . $ext;
                        $filepath = __DIR__ . '/../uploads/reports/' . $filename;
                        if (!is_dir(__DIR__ . '/../uploads/reports')) {
                            mkdir(__DIR__ . '/../uploads/reports', 0777, true);
                        }
                        file_put_contents($filepath, $data_blob);
                        $path = 'uploads/reports/' . $filename;
                        $media_paths[] = $path;
                        $count++;
                        // set primary media_path to the first one if not already set
                        if (!$media_path) $media_path = $path;
                        if (!$image_path) $image_path = $path;
                    }
                }
            }
        }
    } catch (Exception $e) { /* ignore */ }
}

if (!$media_path && $image_base64) {
    // Check if image data contains the prefix and strip it
    if (preg_match('/^data:image\/(\w+);base64,/', $image_base64, $type)) {
        $data_image = substr($image_base64, strpos($image_base64, ',') + 1);
        $type = strtolower($type[1]); // jpg, png, gif

        if (!in_array($type, [ 'jpg', 'jpeg', 'gif', 'png' ])) {
            // Invalid type
        } else {
            $data_image = base64_decode($data_image);
            if ($data_image !== false) {
                $filename = 'report_' . time() . '_' . uniqid() . '.' . $type;
                $filepath = __DIR__ . '/../uploads/reports/' . $filename;
                
                if (!is_dir(__DIR__ . '/../uploads/reports')) {
                    mkdir(__DIR__ . '/../uploads/reports', 0777, true);
                }

                file_put_contents($filepath, $data_image);
                $image_path = 'uploads/reports/' . $filename;
                $media_path = $image_path;
            }
        }
    }
}

// Ensure video_path column exists
try {
    $checkVideoCol = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'incident_reports' AND COLUMN_NAME = 'video_path'");
    $checkVideoCol->execute();
    $hasVideoCol = (int)$checkVideoCol->fetchColumn();
    if ($hasVideoCol === 0) {
        $pdo->exec("ALTER TABLE incident_reports ADD COLUMN video_path varchar(255) NULL AFTER image_path");
    }
} catch (Exception $e) { /* ignore */ }

// Handle Video Upload (if provided as base64 data URI)
if (!$media_path && $video_base64) {
    if (preg_match('/^data:video\/(\w+);base64,/', $video_base64, $vtype)) {
        $data_video = substr($video_base64, strpos($video_base64, ',') + 1);
        $vtype = strtolower($vtype[1]); // mp4, webm, mov
        if (!in_array($vtype, ['mp4','webm','mov'])) {
            // invalid type
        } else {
            $data_video = base64_decode($data_video);
            if ($data_video !== false) {
                $vfilename = 'report_' . time() . '_' . uniqid() . '.' . $vtype;
                $vfilepath = __DIR__ . '/../uploads/reports/' . $vfilename;
                if (!is_dir(__DIR__ . '/../uploads/reports')) {
                    mkdir(__DIR__ . '/../uploads/reports', 0777, true);
                }
                file_put_contents($vfilepath, $data_video);
                $video_path = 'uploads/reports/' . $vfilename;
                $media_path = $video_path;
            }
        }
    }
}

// Ensure additional columns exist and drop AI columns no longer used
try {
    $checkCols = $pdo->prepare("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'incident_reports'");
    $checkCols->execute();
    $existing = array_map(function($r){ return $r['COLUMN_NAME']; }, $checkCols->fetchAll(PDO::FETCH_ASSOC));
    $alter = [];
    if (!in_array('barangay', $existing)) $alter[] = "ADD COLUMN barangay varchar(100) NULL AFTER user_id";
    if (!in_array('reporter_name', $existing)) $alter[] = "ADD COLUMN reporter_name varchar(150) NULL AFTER description";
    if (!in_array('reporter_contact', $existing)) $alter[] = "ADD COLUMN reporter_contact varchar(100) NULL AFTER reporter_name";
    if (!in_array('reporter_email', $existing)) $alter[] = "ADD COLUMN reporter_email varchar(150) NULL AFTER reporter_contact";
    if (!in_array('approved_by', $existing)) $alter[] = "ADD COLUMN approved_by varchar(150) NULL AFTER description";
    if (!in_array('approved_at', $existing)) $alter[] = "ADD COLUMN approved_at datetime NULL AFTER approved_by";
    if (!in_array('rejected_by', $existing)) $alter[] = "ADD COLUMN rejected_by varchar(150) NULL AFTER approved_at";
    if (!in_array('rejected_at', $existing)) $alter[] = "ADD COLUMN rejected_at datetime NULL AFTER rejected_by";
    if (!in_array('media_path', $existing)) $alter[] = "ADD COLUMN media_path varchar(255) NULL AFTER video_path";
    if (!in_array('media_paths', $existing)) $alter[] = "ADD COLUMN media_paths text NULL AFTER media_path";
    if ($wantsArea) {
        if (!in_array('area_geojson', $existing)) $alter[] = "ADD COLUMN area_geojson LONGTEXT NULL AFTER location_text";
        if (!in_array('bbox_north', $existing)) $alter[] = "ADD COLUMN bbox_north DOUBLE NULL AFTER area_geojson";
        if (!in_array('bbox_south', $existing)) $alter[] = "ADD COLUMN bbox_south DOUBLE NULL AFTER bbox_north";
        if (!in_array('bbox_east', $existing)) $alter[] = "ADD COLUMN bbox_east DOUBLE NULL AFTER bbox_south";
        if (!in_array('bbox_west', $existing)) $alter[] = "ADD COLUMN bbox_west DOUBLE NULL AFTER bbox_east";
    }
    foreach ($alter as $ddl) { $pdo->exec("ALTER TABLE incident_reports $ddl"); }
    // Drop AI-related columns if present
    if (in_array('confidence_score', $existing)) { $pdo->exec("ALTER TABLE incident_reports DROP COLUMN confidence_score"); }
    if (in_array('ai_analysis_result', $existing)) { $pdo->exec("ALTER TABLE incident_reports DROP COLUMN ai_analysis_result"); }
} catch (Exception $e) { /* ignore */ }

try {
    // Initial status and auto-approval metadata for barangay/admin submitters
    $isPrivileged = in_array(strtolower($role), ['brgy','admin']);
    $initial_status = $isPrivileged ? 'Verified' : 'Pending';
    $approvedBy = $isPrivileged ? ($reporter_name ?: ("Barangay " . ($barangay ?: ''))) : null;
    $approvedAt = $isPrivileged ? date('Y-m-d H:i:s') : null;

    require_once 'lib/tactical-helpers.php';
    $areaGeojson = normalize_geometry($data['area_geojson'] ?? null);
    $bbox = calculate_bbox($areaGeojson);
    $wantsArea = !empty($areaGeojson);

    $cols = [
        'user_id', 'type', 'barangay', 'latitude', 'longitude', 'severity', 'description',
        'image_path', 'video_path', 'media_path', 'media_paths',
        'reporter_name', 'reporter_contact', 'reporter_email',
        'status', 'approved_by', 'approved_at', 'location_text', 'is_passable', 'allowed_modes'
    ];
    $placeholders = array_fill(0, count($cols), '?');
    $vals = [
        $user_id, ($data['type'] ?? 'Incident'), $barangay, $latitude, $longitude, $severity, $description,
        $image_path, $video_path, $media_path, (empty($media_paths) ? null : json_encode($media_paths)),
        $reporter_name, $reporter_contact, $reporter_email,
        $initial_status, $approvedBy, $approvedAt, $location_text,
        normalize_is_passable($data['is_passable'] ?? null),
        isset($data['allowedVehicles']) ? (is_array($data['allowedVehicles']) ? json_encode(array_values($data['allowedVehicles'])) : (string)$data['allowedVehicles']) : null
    ];
    if ($wantsArea && $bbox) {
        $cols[] = 'area_geojson';
        $placeholders[] = '?';
        $vals[] = $areaGeojson;
        $cols[] = 'bbox_north';
        $placeholders[] = '?';
        $vals[] = $bbox['north'];
        $cols[] = 'bbox_south';
        $placeholders[] = '?';
        $vals[] = $bbox['south'];
        $cols[] = 'bbox_east';
        $placeholders[] = '?';
        $vals[] = $bbox['east'];
        $cols[] = 'bbox_west';
        $placeholders[] = '?';
        $vals[] = $bbox['west'];
    }
    $stmt = $pdo->prepare("INSERT INTO incident_reports (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $placeholders) . ")");
    $stmt->execute($vals);
    
    $report_id = $pdo->lastInsertId();

    // Notification Logic for Auto-Verified Reports (Brgy/Admin)
    if ($initial_status === 'Verified') {
        $typeLabel = $data['type'] ?? 'Incident';
        $notifTitle = "New $typeLabel Alert";
        $notifMsg = "Barangay " . ($barangay ?: 'Official') . " has posted a $typeLabel report. Severity: $severity.";
        $notifType = "warning";
        $notifAudience = "residents"; 
        
        $sqlNotif = "INSERT INTO notifications (title, message, type, audience, brgy_name, created_at) VALUES (?, ?, ?, ?, ?, NOW())";
        $stmtNotif = $pdo->prepare($sqlNotif);
        $stmtNotif->execute([$notifTitle, $notifMsg, $notifType, $notifAudience, $barangay]);
    }

    echo json_encode([
        'success' => true, 
        'message' => 'Report submitted successfully', 
        'report_id' => $report_id
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
