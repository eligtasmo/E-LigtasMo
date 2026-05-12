<?php
require_once 'cors.php';
header("Content-Type: application/json");
require_once 'db.php';

try {
    // Consolidated version: pulling from unified incident_reports table
    $status = $_GET['status'] ?? null;
    $barangay = $_GET['barangay'] ?? null;
    $limit = intval($_GET['limit'] ?? 100);
    $idParam = $_GET['incident_id'] ?? ($_GET['id'] ?? null);

    $sql = "SELECT id, type, latitude as lat, longitude as lng, severity, status, description, 
                   created_at, barangay, reporter_name as reporter, location_text, 
                   area_geojson, image_path, media_path as media, media_paths, photo_url, is_passable
            FROM incident_reports";
    
    $wheres = [];
    $params = [];

    $allowed = ['ACTIVE', 'APPROVED', 'VERIFIED', 'RESOLVED'];
    if ($status && strtolower($status) !== 'all') {
        $wheres[] = "LOWER(status) = LOWER(:status)";
        $params[':status'] = $status;
    } else {
        $wheres[] = "LOWER(status) IN ('" . implode("','", array_map('strtolower', $allowed)) . "')";
    }

    if ($barangay) {
        $wheres[] = "LOWER(barangay) = LOWER(:barangay)";
        $params[':barangay'] = $barangay;
    }
    if ($idParam !== null && $idParam !== '') {
        $wheres[] = "id = :id";
        $params[':id'] = (int)$idParam;
    }

    if (!empty($wheres)) {
        $sql .= " WHERE " . implode(" AND ", $wheres);
    }
    
    $sql .= " ORDER BY created_at DESC LIMIT $limit";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Compatibility formatting
    foreach ($data as &$item) {
        $item['lat'] = (float)$item['lat'];
        $item['lng'] = (float)$item['lng'];
    }

    echo json_encode([
        'success' => true,
        'incidents' => $data,
        'count' => count($data)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
