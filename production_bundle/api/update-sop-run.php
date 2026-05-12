<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';
date_default_timezone_set('Asia/Manila');

require_permission('dispatch.manage');
if (session_status() !== PHP_SESSION_ACTIVE) { session_start(); }

function current_user_id_from_context() {
  $headers = function_exists('getallheaders') ? getallheaders() : [];
  $auth = $headers['Authorization'] ?? ($headers['authorization'] ?? '');
  if (stripos($auth, 'Bearer ') === 0) {
    $token = substr($auth, 7);
    $payload = jwt_decode($token);
    if ($payload && isset($payload['sub'])) {
      return (int)$payload['sub'];
    }
  }
  if (isset($_SESSION['user_id'])) {
    return (int)$_SESSION['user_id'];
  }
  return null;
}

try {
  $data = json_decode(file_get_contents('php://input'), true);
  $sop_run_id = isset($data['sop_run_id']) ? intval($data['sop_run_id']) : 0;
  if ($sop_run_id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing sop_run_id']);
    exit;
  }

  // Build dynamic update
  $fields = [];
  $params = [];

  if (isset($data['step_state'])) {
    $fields[] = 'step_state = ?';
    $params[] = json_encode($data['step_state']);
  }
  if (isset($data['notes'])) {
    $fields[] = 'notes = ?';
    $params[] = $data['notes'];
  }
  if (isset($data['team_assigned'])) {
    $fields[] = 'team_assigned = ?';
    $params[] = $data['team_assigned'];
  }
  if (isset($data['dispatched_at'])) {
    $fields[] = 'dispatched_at = ?';
    $params[] = $data['dispatched_at'];
  }
  if (isset($data['ppe_checklist'])) {
    $fields[] = 'ppe_checklist = ?';
    $params[] = json_encode($data['ppe_checklist']);
  }
  if (isset($data['equipment_used'])) {
    $fields[] = 'equipment_used = ?';
    $params[] = json_encode($data['equipment_used']);
  }
  if (isset($data['agencies_tagged'])) {
    $fields[] = 'agencies_tagged = ?';
    $params[] = json_encode($data['agencies_tagged']);
  }
  if (isset($data['health_coordination'])) {
    $fields[] = 'health_coordination = ?';
    $params[] = json_encode($data['health_coordination']);
  }
  if (isset($data['status'])) {
    $status = $data['status'];
    if (!in_array($status, ['in_progress', 'completed', 'overridden', 'archived'], true)) {
      http_response_code(400);
      echo json_encode(['success' => false, 'message' => 'Invalid status']);
      exit;
    }
    $fields[] = 'status = ?';
    $params[] = $status;
    $touchAudit = true;
    if ($status === 'completed') {
      $fields[] = 'completed_at = ?';
      $params[] = date('Y-m-d H:i:s');
    }
    if ($status === 'overridden') {
      $fields[] = 'overridden_by = ?';
      $params[] = current_user_id_from_context();
      if (isset($data['overridden_reason'])) {
        $fields[] = 'overridden_reason = ?';
        $params[] = $data['overridden_reason'];
      }
    }
  }

  // Allow granular status label persistence (Received/Dispatched/Responding/Arrived/Completed/Archived)
  if (isset($data['status_label'])) {
    $label = trim($data['status_label']);
    $allowedLabels = ['Received','Dispatched','Responding','Arrived','Completed','Archived'];
    if (!in_array($label, $allowedLabels, true)) {
      http_response_code(400);
      echo json_encode(['success' => false, 'message' => 'Invalid status_label']);
      exit;
    }
    try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN status_label VARCHAR(32) NULL"); } catch (Exception $e) { /* ignore */ }
    $fields[] = 'status_label = ?';
    $params[] = $label;
    $touchAudit = true;
    // If caller didn't set base status, derive it from the label
    if (!isset($data['status'])) {
      $derived = ($label === 'Completed') ? 'completed' : (($label === 'Archived') ? 'archived' : 'in_progress');
      $fields[] = 'status = ?';
      $params[] = $derived;
      if ($derived === 'completed') {
        $fields[] = 'completed_at = ?';
        $params[] = date('Y-m-d H:i:s');
      }
    }
  }

  if (isset($data['destination_lat'])) {
    $fields[] = 'destination_lat = ?';
    $params[] = $data['destination_lat'];
  }
  if (isset($data['destination_lng'])) {
    $fields[] = 'destination_lng = ?';
    $params[] = $data['destination_lng'];
  }

  if (empty($fields)) {
    echo json_encode(['success' => false, 'message' => 'No fields to update']);
    exit;
  }

  // Add audit trail if status or status_label changed
  if (!isset($touchAudit)) { $touchAudit = false; }
  if ($touchAudit) {
    try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN status_updated_by INT NULL"); } catch (Exception $e) { /* ignore */ }
    try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN status_updated_at DATETIME NULL"); } catch (Exception $e) { /* ignore */ }
    $fields[] = 'status_updated_by = ?';
    $params[] = current_user_id_from_context();
    $fields[] = 'status_updated_at = ?';
    $params[] = date('Y-m-d H:i:s');
  }

  $sql = 'UPDATE sop_runs SET ' . implode(', ', $fields) . ' WHERE id = ?';
  $params[] = $sop_run_id;
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);

  // Return updated record
  $stmt = $pdo->prepare('SELECT * FROM sop_runs WHERE id = ?');
  $stmt->execute([$sop_run_id]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  echo json_encode(['success' => true, 'sop_run' => $row]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
