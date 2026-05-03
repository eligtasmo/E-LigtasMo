<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

require_permission('incident.create');

try {
  $pdo->exec("CREATE TABLE IF NOT EXISTS sop_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sop_id VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(64) NULL,
    priority ENUM('high','medium') NULL,
    steps JSON NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

  $data = json_decode(file_get_contents('php://input'), true);
  $sop_id = isset($data['sop_id']) ? trim($data['sop_id']) : '';
  if ($sop_id === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing sop_id']);
    exit;
  }

  $stmt = $pdo->prepare('DELETE FROM sop_templates WHERE sop_id = ?');
  $stmt->execute([$sop_id]);

  echo json_encode(['success' => true]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
