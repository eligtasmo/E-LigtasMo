<?php
require_once "cors.php";
// CORS for credentialed requests from the Vite dev server
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if ($origin) {
    header("Vary: Origin");
} else {
}
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input']);
    exit;
}

$id = $data['id'];
$user_id = $data['user_id'] ?? null; // Optional verification if needed

try {
    // 1. Verify report exists and is Pending
    $stmt = $pdo->prepare("SELECT status, image_path, video_path, media_path FROM incident_reports WHERE id = ?");
    $stmt->execute([$id]);
    $report = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$report) {
        http_response_code(404);
        echo json_encode(['error' => 'Report not found']);
        exit;
    }

    $allowedStatus = ['Pending', 'Approved', 'Verified', 'Active'];
    if (!in_array($report['status'], $allowedStatus)) {
        http_response_code(403);
        echo json_encode(['error' => 'Only pending, approved, or active reports can be edited']);
        exit;
    }

    // 2. Prepare update fields
    $updates = [];
    $params = [];

    require_once 'lib/tactical-helpers.php';

    if (isset($data['description'])) {
        $updates[] = "description = ?";
        $params[] = $data['description'];
    }
    if (isset($data['severity'])) {
        $updates[] = "severity = ?";
        $params[] = $data['severity'];
    }
    if (isset($data['latitude'])) {
        $updates[] = "latitude = ?";
        $params[] = $data['latitude'];
    }
    if (isset($data['longitude'])) {
        $updates[] = "longitude = ?";
        $params[] = $data['longitude'];
    }
    if (isset($data['barangay'])) {
        $updates[] = "barangay = ?";
        $params[] = $data['barangay'];
    }
    if (isset($data['location_text'])) {
        $updates[] = "location_text = ?";
        $params[] = $data['location_text'];
    }
    if (isset($data['is_passable'])) {
        $updates[] = "is_passable = ?";
        $params[] = normalize_is_passable($data['is_passable']);
    }
    if (isset($data['type'])) {
        $updates[] = "type = ?";
        $params[] = $data['type'];
    }
    if (isset($data['area_geojson'])) {
        $areaGeo = normalize_geometry($data['area_geojson']);
        if ($areaGeo) {
            $updates[] = "area_geojson = ?";
            $params[] = $areaGeo;
            $bbox = calculate_bbox($areaGeo);
            if ($bbox) {
                $updates[] = "bbox_north = ?"; $params[] = $bbox['north'];
                $updates[] = "bbox_south = ?"; $params[] = $bbox['south'];
                $updates[] = "bbox_east = ?";  $params[] = $bbox['east'];
                $updates[] = "bbox_west = ?";  $params[] = $bbox['west'];
            }
        }
    }

    // Handle Media Update
    $image_path = $report['image_path'];
    $video_path = $report['video_path'];
    $media_path = $report['media_path'];
    $media_updated = false;

    // Helper for media upload (simplified from submit script)
    $media_base64 = $data['media'] ?? null;
    $image_base64 = $data['image'] ?? null;
    
    // Logic: if media is sent, it replaces existing media.
    // If we want to support deleting media, we might need a flag. 
    // For now, assume if new media is sent, we update.

    $new_media_path = null;

    if ($media_base64) {
         if (preg_match('/^data:(image|video)\/(\w+);base64,/', $media_base64, $mtype)) {
            $kind = $mtype[1];
            $ext = strtolower($mtype[2]);
            $data_blob = substr($media_base64, strpos($media_base64, ',') + 1);
            $data_blob = base64_decode($data_blob);
            
            if ($data_blob !== false) {
                $filename = 'report_' . time() . '_' . uniqid() . '.' . $ext;
                $filepath = __DIR__ . '/../uploads/reports/' . $filename;
                if (!is_dir(__DIR__ . '/../uploads/reports')) {
                    mkdir(__DIR__ . '/../uploads/reports', 0777, true);
                }
                file_put_contents($filepath, $data_blob);
                $new_media_path = 'uploads/reports/' . $filename;
                
                // Update paths
                $updates[] = "media_path = ?";
                $params[] = $new_media_path;
                
                if ($kind === 'image') {
                    $updates[] = "image_path = ?";
                    $params[] = $new_media_path;
                    // Clear video path if switching to image? Or keep it? 
                    // Usually we might want to clear the other type if they are mutually exclusive in UI.
                    // But submit script keeps them separate. Let's just update the specific one.
                    // Actually, let's look at submit script: "if ($kind === 'image') $image_path = $media_path;"
                } else if ($kind === 'video') {
                     $updates[] = "video_path = ?";
                     $params[] = $new_media_path;
                }
                $media_updated = true;
            }
         }
    } else if ($image_base64) {
        // Fallback for just image
         if (preg_match('/^data:image\/(\w+);base64,/', $image_base64, $type)) {
            $data_image = substr($image_base64, strpos($image_base64, ',') + 1);
            $type = strtolower($type[1]);
            $data_image = base64_decode($data_image);
            if ($data_image !== false) {
                $filename = 'report_' . time() . '_' . uniqid() . '.' . $type;
                $filepath = __DIR__ . '/uploads/' . $filename;
                if (!is_dir(__DIR__ . '/uploads')) {
                    mkdir(__DIR__ . '/uploads', 0777, true);
                }
                file_put_contents($filepath, $data_image);
                $new_media_path = 'api/uploads/' . $filename;
                
                $updates[] = "image_path = ?";
                $params[] = $new_media_path;
                $updates[] = "media_path = ?";
                $params[] = $new_media_path;
                $media_updated = true;
            }
         }
    }

    if (empty($updates)) {
        echo json_encode(['success' => true, 'message' => 'No changes made']);
        exit;
    }

    $params[] = $id;
    $sql = "UPDATE incident_reports SET " . implode(", ", $updates) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    echo json_encode(['success' => true, 'message' => 'Report updated successfully']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>