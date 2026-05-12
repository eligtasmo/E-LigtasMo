<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

require_permission('alerts.manage');
if (session_status() !== PHP_SESSION_ACTIVE) { session_start(); }

function ensure_announcements_table($pdo) {
  $sql = "CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info','warning','success','error') NOT NULL DEFAULT 'info',
    audience ENUM('all','residents','barangay') NOT NULL DEFAULT 'all',
    brgy_name VARCHAR(100) NULL,
    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audience (audience),
    INDEX idx_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
  $pdo->exec($sql);
}

try {
  ensure_announcements_table($pdo);
  $data = json_decode(file_get_contents('php://input'), true);
  $id = isset($data['id']) ? intval($data['id']) : 0;
  $title = isset($data['title']) ? trim($data['title']) : '';
  $message = isset($data['message']) ? trim($data['message']) : '';
  $type = isset($data['type']) ? trim($data['type']) : 'info';
  if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing announcement id']);
    exit;
  }
  if ($title === '' || $message === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing title or message']);
    exit;
  }
  if (!in_array($type, ['info','warning','success','error'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid type']);
    exit;
  }

  $stmt = $pdo->prepare('UPDATE announcements SET title = ?, message = ?, type = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?');
  $stmt->execute([$title, $message, $type, $id]);
  echo json_encode(['success' => true]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
