<?php
/**
 * Optimized SOP Run Creation API
 * Unified to use incident_reports table
 */
require_once 'cors.php';
require_once 'db.php';
require_once 'rbac.php';

header('Content-Type: application/json');

// Check permissions
require_permission('dispatch.manage');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) throw new Exception("Invalid input");

    $incident_id = isset($data['incident_id']) ? intval($data['incident_id']) : 0;
    $sop_id = isset($data['sop_id']) ? trim($data['sop_id']) : 'emergency-calls';
    $currentUser = get_current_user_data();
    $user_id = $currentUser['id'] ?? null;

    // 1. Verify/Create Incident Placeholder if needed
    if ($incident_id <= 0) {
        $stmtInc = $pdo->prepare('INSERT INTO incident_reports (type, status, reporter_name, description, created_at) VALUES (?, ?, ?, ?, NOW())');
        $stmtInc->execute(['Emergency Call', 'Pending', 'System', 'Automated SOP Placeholder']);
        $incident_id = (int)$pdo->lastInsertId();
    }

    // 2. Create SOP Run
    $sql = "INSERT INTO sop_runs (
        incident_id, sop_id, step_state, notes, status, status_label, 
        started_by, team_assigned, dispatched_at, ppe_checklist, 
        equipment_used, agencies_tagged, health_coordination, 
        destination_lat, destination_lng, started_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";

    $stmt = $pdo->prepare($sql);
    
    $notes = $data['notes'] ?? '';
    $incomingLabel = trim($data['status'] ?? 'Received');
    $allowedLabels = ['Received','Dispatched','Responding','Arrived','Completed','Archived'];
    $status_label = in_array($incomingLabel, $allowedLabels, true) ? $incomingLabel : 'Received';
    $status = ($status_label === 'Completed') ? 'completed' : (($status_label === 'Archived') ? 'archived' : 'in_progress');

    $stmt->execute([
        $incident_id, 
        $sop_id, 
        json_encode(new stdClass()), 
        $notes, 
        $status, 
        $status_label, 
        $user_id, 
        $data['team_assigned'] ?? null, 
        $data['dispatched_at'] ?? null, 
        isset($data['ppe_required']) ? json_encode($data['ppe_required']) : null, 
        isset($data['equipment_planned']) ? json_encode($data['equipment_planned']) : null, 
        isset($data['agencies_tagged']) ? json_encode($data['agencies_tagged']) : null, 
        isset($data['health_coordination']) ? json_encode($data['health_coordination']) : null, 
        $data['destination_lat'] ?? null, 
        $data['destination_lng'] ?? null
    ]);

    $sop_run_id = (int)$pdo->lastInsertId();

    echo json_encode([
        'success' => true, 
        'sop_run_id' => $sop_run_id, 
        'sop_id' => $sop_id, 
        'incident_id' => $incident_id
    ]);

} catch (Exception $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
