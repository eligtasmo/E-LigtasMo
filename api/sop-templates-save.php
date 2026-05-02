<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

require_permission('incident.create');
if (session_status() !== PHP_SESSION_ACTIVE) { session_start(); }

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
  $title = isset($data['title']) ? trim($data['title']) : '';
  $category = isset($data['category']) ? trim($data['category']) : null;
  $priority = isset($data['priority']) ? trim($data['priority']) : null;
  $steps = isset($data['steps']) ? $data['steps'] : null;

  if ($sop_id === '' || $title === '' || !is_array($steps)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid payload']);
    exit;
  }

  $jsonSteps = json_encode($steps);
  $stmt = $pdo->prepare('INSERT INTO sop_templates (sop_id, title, category, priority, steps) VALUES (?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE title = VALUES(title), category = VALUES(category), priority = VALUES(priority), steps = VALUES(steps)');
  $stmt->execute([$sop_id, $title, $category, $priority, $jsonSteps]);

  echo json_encode(['success' => true]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
