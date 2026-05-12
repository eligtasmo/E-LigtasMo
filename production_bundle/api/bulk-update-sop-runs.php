<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

// Only dispatch managers can bulk update
require_permission('dispatch.manage');

try {
  $data = json_decode(file_get_contents('php://input'), true);
  $ids = isset($data['run_ids']) && is_array($data['run_ids']) ? array_filter(array_map('intval', $data['run_ids'])) : [];
  $status = isset($data['status']) ? $data['status'] : null;
  $status_label = isset($data['status_label']) ? trim($data['status_label']) : null;
  $allowedLabels = ['Received','Dispatched','Responding','Arrived','Completed','Archived'];
  if (!$ids) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid payload: missing ids']);
    exit;
  }
  if ($status && !in_array($status, ['in_progress','completed','overridden','archived'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid payload: bad status']);
    exit;
  }
  if ($status_label && !in_array($status_label, $allowedLabels, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid payload: bad status_label']);
    exit;
  }

  $placeholders = implode(',', array_fill(0, count($ids), '?'));
  // Ensure status_label column exists if we will set it
  if ($status_label) { try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN status_label VARCHAR(32) NULL"); } catch (Exception $e) { /* ignore */ } }

  // Determine base status if not provided but label is provided
  $baseStatus = $status;
  if (!$baseStatus && $status_label) {
    $baseStatus = ($status_label === 'Completed') ? 'completed' : (($status_label === 'Archived') ? 'archived' : 'in_progress');
  }
  $setParts = ['status = ?','last_updated_at = CURRENT_TIMESTAMP'];
  $params = [$baseStatus];
  if ($baseStatus === 'completed') { $setParts[] = 'completed_at = CURRENT_TIMESTAMP'; }
  if ($status_label) { $setParts[] = 'status_label = ?'; $params[] = $status_label; }
  $stmt = $pdo->prepare("UPDATE sop_runs SET " . implode(', ', $setParts) . " WHERE id IN ($placeholders)");
  $params = array_merge($params, $ids);
  $stmt->execute($params);

  echo json_encode(['success' => true, 'updated' => count($ids)]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
