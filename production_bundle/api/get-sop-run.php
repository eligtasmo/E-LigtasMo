<?php
/**
 * Optimized SOP Run Retrieval API
 */
require_once 'cors.php';
require_once 'db.php';
require_once 'rbac.php';

header('Content-Type: application/json');
require_permission('dispatch.manage');

try {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if ($id <= 0) throw new Exception("Invalid SOP run ID");

    $stmt = $pdo->prepare("SELECT s.*, i.type as incident_type, i.location_text as incident_location 
                           FROM sop_runs s 
                           LEFT JOIN incident_reports i ON s.incident_id = i.id 
                           WHERE s.id = ?");
    $stmt->execute([$id]);
    $run = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$run) throw new Exception("SOP run not found");

    // Decode JSON fields
    $run['step_state'] = json_decode($run['step_state'] ?? '{}', true);
    $run['ppe_checklist'] = json_decode($run['ppe_checklist'] ?? '[]', true);
    $run['equipment_used'] = json_decode($run['equipment_used'] ?? '[]', true);
    $run['agencies_tagged'] = json_decode($run['agencies_tagged'] ?? '[]', true);
    $run['health_coordination'] = json_decode($run['health_coordination'] ?? '{}', true);

    echo json_encode([
        'success' => true,
        'data' => $run
    ]);

} catch (Exception $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
