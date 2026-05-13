<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

// View permission is sufficient to list SOP runs for an incident
require_permission('incident.view');

try {
  $incident_id = isset($_GET['incident_id']) ? intval($_GET['incident_id']) : 0;
  $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 100;

  // Ensure table exists (in case this is first call)
  $pdo->exec("CREATE TABLE IF NOT EXISTS sop_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    sop_id VARCHAR(64) NOT NULL,
    step_state JSON NULL,
    notes TEXT NULL,
    status ENUM('in_progress','completed','overridden') NOT NULL DEFAULT 'in_progress',
    started_by INT NULL,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    overridden_by INT NULL,
    overridden_reason TEXT NULL,
    team_assigned VARCHAR(128) NULL,
    dispatched_at DATETIME NULL,
    ppe_checklist JSON NULL,
    equipment_used JSON NULL,
    agencies_tagged JSON NULL,
    health_coordination JSON NULL,
    run_code VARCHAR(12) NULL,
    last_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_incident (incident_id),
    INDEX idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

  try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN run_code VARCHAR(12) NULL"); } catch (Exception $e) { /* column may already exist */ }
  try { $pdo->exec("ALTER TABLE sop_runs ADD UNIQUE INDEX uniq_run_code (run_code)"); } catch (Exception $e) { /* index may already exist */ }

  $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
  $page_size = isset($_GET['page_size']) ? max(1, min(200, intval($_GET['page_size']))) : 20;
  $offset = ($page - 1) * $page_size;

  if ($incident_id > 0) {
    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM sop_runs WHERE incident_id = ?');
    $countStmt->execute([$incident_id]);
    $total = (int)$countStmt->fetchColumn();
    // Deprecated: run_code auto-fill removed; we rely on incident_id and run id
    $stmt = $pdo->prepare('SELECT sr.*, i.id AS incident_code FROM sop_runs sr LEFT JOIN incidents i ON i.id = sr.incident_id WHERE sr.incident_id = ? ORDER BY sr.started_at DESC LIMIT ? OFFSET ?');
    $stmt->execute([$incident_id, $page_size, $offset]);
  } else {
    $countStmt = $pdo->query('SELECT COUNT(*) FROM sop_runs');
    $total = (int)$countStmt->fetchColumn();
    // Deprecated: run_code auto-fill removed; we rely on incident_id and run id
    $stmt = $pdo->prepare('SELECT sr.*, i.id AS incident_code FROM sop_runs sr LEFT JOIN incidents i ON i.id = sr.incident_id ORDER BY sr.started_at DESC LIMIT ? OFFSET ?');
    $stmt->execute([$page_size, $offset]);
  }
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  echo json_encode(['success' => true, 'sop_runs' => $rows, 'paging' => [ 'page' => $page, 'page_size' => $page_size, 'total' => $total ]]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
