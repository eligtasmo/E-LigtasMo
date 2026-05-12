<?php
/**
 * Optimized SOP Run List API
 */
require_once 'cors.php';
require_once 'db.php';
require_once 'rbac.php';

header('Content-Type: application/json');
require_permission('dispatch.manage');

try {
    $incident_id = isset($_GET['incident_id']) ? intval($_GET['incident_id']) : null;
    $status = $_GET['status'] ?? null;

    $sql = "SELECT s.*, i.type as incident_type, i.location_text as incident_location 
            FROM sop_runs s 
            LEFT JOIN incident_reports i ON s.incident_id = i.id 
            WHERE 1=1";
    $params = [];

    if ($incident_id) {
        $sql .= " AND s.incident_id = ?";
        $params[] = $incident_id;
    }
    if ($status) {
        $sql .= " AND s.status = ?";
        $params[] = $status;
    }

    $sql .= " ORDER BY s.started_at DESC LIMIT 500";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $runs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $runs
    ]);

} catch (Exception $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
