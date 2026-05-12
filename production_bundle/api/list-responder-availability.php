<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

require_permission('incident.view');

try {
  $pdo->exec("CREATE TABLE IF NOT EXISTS sop_run_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sop_run_id INT NOT NULL,
    action VARCHAR(64) NOT NULL,
    details JSON NULL,
    user_id INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_run (sop_run_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

  // Optional curated responders
  $pdo->exec("CREATE TABLE IF NOT EXISTS responders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    team VARCHAR(128) NULL,
    contact VARCHAR(64) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

  $stmtBase = $pdo->query('SELECT name, team, contact FROM responders ORDER BY name ASC');
  $baseRows = $stmtBase->fetchAll(PDO::FETCH_ASSOC);

  // Overlay with latest availability from activity logs
  $stmt = $pdo->query("SELECT id, action, details, created_at FROM sop_run_activity WHERE action LIKE 'responder_%' ORDER BY created_at ASC");
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $latest = [];
  foreach ($rows as $row) {
    $details = [];
    if (!empty($row['details'])) {
      $decoded = json_decode($row['details'], true);
      if (is_array($decoded)) { $details = $decoded; }
    }
    $name = isset($details['user']) ? trim($details['user']) : '';
    if ($name === '') { continue; }
    $latest[$name] = [
      'name' => $name,
      'last_action' => $row['action'],
      'last_seen' => $row['created_at']
    ];
  }

  $responders = [];
  if (count($baseRows) > 0) {
    foreach ($baseRows as $r) {
      $overlay = $latest[$r['name']] ?? null;
      $status = ($overlay && $overlay['last_action'] === 'responder_login') ? 'available' : 'unavailable';
      $responders[] = [
        'name' => $r['name'],
        'team' => $r['team'],
        'contact' => $r['contact'],
        'status' => $status,
        'last_seen' => $overlay ? $overlay['last_seen'] : null
      ];
    }
  } else {
    // Only activity-derived responders
    $responders = array_values(array_map(function($r) {
      $status = ($r['last_action'] === 'responder_login') ? 'available' : 'unavailable';
      return [
        'name' => $r['name'],
        'status' => $status,
        'last_seen' => $r['last_seen']
      ];
    }, $latest));
  }

  echo json_encode(['success' => true, 'responders' => $responders]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
