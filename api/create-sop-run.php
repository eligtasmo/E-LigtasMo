<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

require_permission('dispatch.manage');
if (session_status() !== PHP_SESSION_ACTIVE) { session_start(); }

function current_user_id_from_context() {
  $headers = function_exists('getallheaders') ? getallheaders() : [];
  $auth = $headers['Authorization'] ?? ($headers['authorization'] ?? '');
  if (stripos($auth, 'Bearer ') === 0) {
    $token = substr($auth, 7);
    $payload = jwt_decode($token);
    if ($payload && isset($payload['sub'])) {
      return (int)$payload['sub'];
    }
  }
  if (isset($_SESSION['user_id'])) {
    return (int)$_SESSION['user_id'];
  }
  return null;
}

try {
  $data = json_decode(file_get_contents('php://input'), true);
  function gen_code($len = 7) {
    $min = (int)str_pad('1', $len, '0');
    $max = (int)str_pad('', $len, '9');
    return strval(random_int($min, $max));
  }

  $incident_id = isset($data['incident_id']) ? intval($data['incident_id']) : 0;
  $sop_id = isset($data['sop_id']) ? trim($data['sop_id']) : 'emergency-calls';

  // Ensure incidents table has incident_code, and create a placeholder if none provided
  $pdo->exec("CREATE TABLE IF NOT EXISTS incidents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(64) NULL,
    address TEXT NULL,
    datetime DATETIME NULL,
    description TEXT NULL,
    severity VARCHAR(32) NULL,
    reporter VARCHAR(128) NULL,
    contact VARCHAR(64) NULL,
    status VARCHAR(32) NULL DEFAULT 'Pending',
    incident_code VARCHAR(12) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code (incident_code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

  // Ensure column exists if table is already present
  try { $pdo->exec("ALTER TABLE incidents ADD COLUMN incident_code VARCHAR(12) NULL"); } catch (Exception $e) { /* ignore */ }

  if ($incident_id <= 0) {
    $code = gen_code(7);
    // Ensure uniqueness
    $tries = 0; while ($tries < 5) { $check = $pdo->prepare('SELECT COUNT(*) FROM incidents WHERE incident_code = ?'); $check->execute([$code]); if ((int)$check->fetchColumn() === 0) break; $code = gen_code(7); $tries++; }
    $stmtInc = $pdo->prepare('INSERT INTO incidents (type, address, datetime, description, severity, reporter, contact, status, incident_code) VALUES (?,?,?,?,?,?,?,?,?)');
    $stmtInc->execute(['Emergency Call', '', date('Y-m-d H:i:s'), '', 'N/A', 'System', '', 'Pending', $code]);
    $incident_id = (int)$pdo->lastInsertId();
  } else {
    // Backfill incident_code if missing on existing incident
    try {
      $stmtChk = $pdo->prepare('SELECT incident_code FROM incidents WHERE id = ?');
      $stmtChk->execute([$incident_id]);
      $row = $stmtChk->fetch(PDO::FETCH_ASSOC);
      if ($row && (empty($row['incident_code']) || $row['incident_code'] === null)) {
        $code = gen_code(7);
        $tries = 0; while ($tries < 5) { $check = $pdo->prepare('SELECT COUNT(*) FROM incidents WHERE incident_code = ?'); $check->execute([$code]); if ((int)$check->fetchColumn() === 0) break; $code = gen_code(7); $tries++; }
        $upd = $pdo->prepare('UPDATE incidents SET incident_code = ? WHERE id = ?');
        $upd->execute([$code, $incident_id]);
      }
    } catch (Exception $e) { /* ignore */ }
  }

  // Ensure table exists (idempotent)
  $pdo->exec("CREATE TABLE IF NOT EXISTS sop_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    sop_id VARCHAR(64) NOT NULL,
    step_state JSON NULL,
    notes TEXT NULL,
    status ENUM('in_progress','completed','overridden','archived') NOT NULL DEFAULT 'in_progress',
    status_label VARCHAR(32) NULL,
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
    destination_lat DECIMAL(10, 8) NULL,
    destination_lng DECIMAL(11, 8) NULL,
    last_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_incident (incident_id),
    INDEX idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
  // Ensure unique index on run_code
  // Ensure archived status exists on older tables
  try { $pdo->exec("ALTER TABLE sop_runs MODIFY status ENUM('in_progress','completed','overridden','archived') NOT NULL DEFAULT 'in_progress'"); } catch (Exception $e) { /* ignore */ }
  try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN status_label VARCHAR(32) NULL"); } catch (Exception $e) { /* ignore */ }
  // Ensure columns exist when upgrading older tables
  try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN team_assigned VARCHAR(128) NULL"); } catch (Exception $e) { /* ignore */ }
  try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN dispatched_at DATETIME NULL"); } catch (Exception $e) { /* ignore */ }
  try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN ppe_checklist JSON NULL"); } catch (Exception $e) { /* ignore */ }
  try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN equipment_used JSON NULL"); } catch (Exception $e) { /* ignore */ }
  try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN agencies_tagged JSON NULL"); } catch (Exception $e) { /* ignore */ }
  try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN health_coordination JSON NULL"); } catch (Exception $e) { /* ignore */ }
  try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN run_code VARCHAR(12) NULL"); } catch (Exception $e) { /* ignore */ }
  try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN destination_lat DECIMAL(10, 8) NULL"); } catch (Exception $e) { /* ignore */ }
  try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN destination_lng DECIMAL(11, 8) NULL"); } catch (Exception $e) { /* ignore */ }

  $started_by = current_user_id_from_context();
  $stmt = $pdo->prepare('INSERT INTO sop_runs (incident_id, sop_id, step_state, notes, status, status_label, started_by, team_assigned, dispatched_at, ppe_checklist, equipment_used, agencies_tagged, health_coordination, run_code, destination_lat, destination_lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  $emptyState = json_encode(new stdClass());
  $notes = isset($data['notes']) ? $data['notes'] : '';
  $incomingLabel = isset($data['status']) ? trim($data['status']) : null;
  $allowedLabels = ['Received','Dispatched','Responding','Arrived','Completed','Archived'];
  $status_label = (isset($incomingLabel) && in_array($incomingLabel, $allowedLabels, true)) ? $incomingLabel : null;
  $status = ($status_label === 'Completed') ? 'completed' : (($status_label === 'Archived') ? 'archived' : 'in_progress');
  $team_assigned = isset($data['team_assigned']) ? trim($data['team_assigned']) : null;
  $dispatched_at = isset($data['dispatched_at']) ? $data['dispatched_at'] : null;
  $ppe_checklist = isset($data['ppe_required']) ? json_encode($data['ppe_required']) : null;
  $equipment_used = isset($data['equipment_planned']) ? json_encode($data['equipment_planned']) : null;
  $agencies_tagged = isset($data['agencies_tagged']) ? json_encode($data['agencies_tagged']) : null;
  $health_coordination = isset($data['health_coordination']) ? json_encode($data['health_coordination']) : null;
  $run_code = null;
  $dest_lat = isset($data['destination_lat']) ? $data['destination_lat'] : null;
  $dest_lng = isset($data['destination_lng']) ? $data['destination_lng'] : null;
  $stmt->execute([$incident_id, $sop_id, $emptyState, $notes, $status, $status_label, $started_by, $team_assigned, $dispatched_at, $ppe_checklist, $equipment_used, $agencies_tagged, $health_coordination, $run_code, $dest_lat, $dest_lng]);
  $sop_run_id = intval($pdo->lastInsertId());

  echo json_encode(['success' => true, 'sop_run_id' => $sop_run_id, 'sop_id' => $sop_id, 'incident_id' => $incident_id, 'run_code' => $run_code]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
