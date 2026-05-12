<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

require_permission('incident.view');

try {
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
    last_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
  // Ensure columns exist when table predates these fields
  try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN team_assigned VARCHAR(128) NULL"); } catch (Exception $e) { /* ignore */ }
  try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN dispatched_at DATETIME NULL"); } catch (Exception $e) { /* ignore */ }
  try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN ppe_checklist JSON NULL"); } catch (Exception $e) { /* ignore */ }
  try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN equipment_used JSON NULL"); } catch (Exception $e) { /* ignore */ }
  try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN agencies_tagged JSON NULL"); } catch (Exception $e) { /* ignore */ }
  try { $pdo->exec("ALTER TABLE sop_runs ADD COLUMN health_coordination JSON NULL"); } catch (Exception $e) { /* ignore */ }

  // Optional curated teams table
  $pdo->exec("CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    unit VARCHAR(64) NULL,
    contact VARCHAR(64) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

  $stmtTeams = $pdo->query('SELECT name, unit, contact FROM teams ORDER BY name ASC');
  $teamsRows = $stmtTeams->fetchAll(PDO::FETCH_ASSOC);

  if (count($teamsRows) === 0) {
    // Fallback to aggregating from sop_runs
    $stmt = $pdo->query("SELECT team_assigned AS name,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS active_runs,
      COUNT(*) AS total_runs
      FROM sop_runs
      WHERE team_assigned IS NOT NULL AND team_assigned <> ''
      GROUP BY team_assigned
      ORDER BY name ASC");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $teams = array_map(function($r) {
      $status = ((int)$r['active_runs'] > 0) ? 'busy' : 'available';
      return [
        'name' => $r['name'],
        'unit' => null,
        'contact' => null,
        'active_runs' => (int)$r['active_runs'],
        'total_runs' => (int)$r['total_runs'],
        'status' => $status
      ];
    }, $rows);
  } else {
    // Compute availability versus active sop_runs
    $teams = [];
    foreach ($teamsRows as $tr) {
      $q = $pdo->prepare("SELECT SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS active_runs, COUNT(*) AS total_runs FROM sop_runs WHERE team_assigned = ?");
      $q->execute([$tr['name']]);
      $agg = $q->fetch(PDO::FETCH_ASSOC);
      $active = (int)($agg['active_runs'] ?? 0);
      $total = (int)($agg['total_runs'] ?? 0);
      $teams[] = [
        'name' => $tr['name'],
        'unit' => $tr['unit'],
        'contact' => $tr['contact'],
        'active_runs' => $active,
        'total_runs' => $total,
        'status' => $active > 0 ? 'busy' : 'available',
      ];
    }
  }

  echo json_encode(['success' => true, 'teams' => $teams]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
