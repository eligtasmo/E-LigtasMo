<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

// Viewing attachments should be allowed for sop.view
require_permission('sop.view');

$runId = isset($_GET['sop_run_id']) ? intval($_GET['sop_run_id']) : 0;
if ($runId <= 0) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Missing or invalid sop_run_id']);
  exit;
}

try {
  $stmt = $pdo->prepare('SELECT id, sop_run_id, filename, url, mime, size, created_at FROM health_attachments WHERE sop_run_id = ? ORDER BY id DESC');
  $stmt->execute([$runId]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  echo json_encode(['success' => true, 'attachments' => $rows]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

