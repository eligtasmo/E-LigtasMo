<?php
require_once 'cors.php';
header("Content-Type: application/json");
require_once 'db.php';

/**
 * Unified Incidents API (Consolidated)
 * Now pulls everything from incident_reports table.
 */

try {
    $barangay = $_GET['barangay'] ?? null;
    $status = $_GET['status'] ?? null;
    $limit = intval($_GET['limit'] ?? 100);

    $sql = "SELECT id, type, latitude as lat, longitude as lng, severity, status, description, 
                   created_at as time, barangay, reporter_name as reporter, location_text, 
                   area_geojson, media_path as media, media_paths, photo_url, allowed_modes,
                   'incident_reports' as source_table 
            FROM incident_reports 
            WHERE 1=1";
            
    $params = [];
    if ($barangay) { $sql .= " AND LOWER(barangay) = LOWER(?)"; $params[] = $barangay; }
    if ($status) { 
        $sql .= " AND LOWER(status) = LOWER(?)"; 
        $params[] = $status; 
    } else {
        $sql .= " AND LOWER(status) NOT IN ('resolved', 'rejected')";
    }
    
    $sql .= " ORDER BY created_at DESC LIMIT $limit";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $all = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($all as &$item) {
        $urls = [];
        if (!empty($item['media_paths'])) {
            $decoded = json_decode($item['media_paths'], true);
            if (is_array($decoded)) $urls = array_merge($urls, $decoded);
        }
        if (!empty($item['media'])) $urls[] = $item['media'];
        if (!empty($item['photo_url'])) $urls[] = $item['photo_url'];
        
        $item['media_urls'] = array_unique(array_filter($urls));
    }

    echo json_encode([
        'success' => true,
        'count' => count($all),
        'data' => $all
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
