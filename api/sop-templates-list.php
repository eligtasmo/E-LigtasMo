<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

require_permission('incident.view');

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

  $stmt = $pdo->query('SELECT id, sop_id, title, category, priority, steps, updated_at FROM sop_templates ORDER BY title ASC');
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  echo json_encode($rows);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
?>
