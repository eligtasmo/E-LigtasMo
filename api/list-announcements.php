<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

// Viewing announcements allowed for incident.view (resident/brgy/admin all have this)
function ensure_announcements_table($pdo) {
  $sql = "CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info','warning','success','error') NOT NULL DEFAULT 'info',
    audience ENUM('all','residents','barangay') NOT NULL DEFAULT 'all',
    category VARCHAR(50) DEFAULT 'general',
    external_link TEXT NULL,
    is_urgent TINYINT(1) DEFAULT 0,
    brgy_name VARCHAR(100) NULL,
    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audience (audience),
    INDEX idx_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
  $pdo->exec($sql);
  
  // Robustly check and add missing columns
  $cols = [
    'category' => "VARCHAR(50) DEFAULT 'general' AFTER audience",
    'external_link' => "TEXT NULL AFTER category",
    'is_urgent' => "TINYINT(1) DEFAULT 0 AFTER external_link"
  ];
  
  foreach ($cols as $name => $def) {
    $stmt = $pdo->query("SHOW COLUMNS FROM announcements LIKE '$name'");
    if ($stmt && $stmt->rowCount() === 0) {
      $pdo->exec("ALTER TABLE announcements ADD COLUMN $name $def");
    }
  }
}

try {
  // Authorization layer
  require_permission('incident.view');
  
  ensure_announcements_table($pdo);

  $audience = isset($_GET['audience']) ? trim($_GET['audience']) : '';
  $brgy = isset($_GET['brgy']) ? trim($_GET['brgy']) : '';
  $limit = isset($_GET['limit']) ? max(1, min(1000, intval($_GET['limit']))) : 20;

  // Audience normalization for legacy clients
  if ($audience === 'brgy') $audience = 'barangay';

  $where = [];
  $params = [];
  
  if ($audience === 'residents') {
    $where[] = "(audience = 'all' OR audience = 'residents')";
  } elseif ($audience === 'barangay') {
    $where[] = "(audience = 'all' OR audience = 'barangay')";
  } elseif ($audience === 'all' || $audience === '') {
    // Global view - no audience filter
  } else {
    echo json_encode(['success' => true, 'announcements' => []]);
    exit;
  }
  
  if ($brgy !== '') {
    $where[] = '(brgy_name = ? OR brgy_name IS NULL)';
    $params[] = $brgy;
  }
  
  $sql = 'SELECT * FROM announcements'; // Use * to avoid column-specific crashes during schema sync
  if (!empty($where)) { $sql .= ' WHERE ' . implode(' AND ', $where); }
  $sql .= ' ORDER BY created_at DESC LIMIT ' . intval($limit);

  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  echo json_encode(['success' => true, 'announcements' => $rows]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode([
    'success' => false, 
    'message' => 'Tactical API Failure: ' . $e->getMessage(),
    'code' => $e->getCode()
  ]);
}
?>
