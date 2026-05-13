<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

// Admin/brgy/resident can view incidents, but restrict to incident.view
require_permission('incident.view');

try {
  $sop_run_id = isset($_GET['sop_run_id']) ? intval($_GET['sop_run_id']) : 0;
  if ($sop_run_id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing sop_run_id']);
    exit;
  }
  $stmt = $pdo->prepare('SELECT * FROM sop_runs WHERE id = ?');
  $stmt->execute([$sop_run_id]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$row) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'SOP run not found']);
    exit;
  }
  echo json_encode(['success' => true, 'sop_run' => $row]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
