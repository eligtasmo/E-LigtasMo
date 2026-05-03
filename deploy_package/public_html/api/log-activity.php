<?php
require_once 'cors.php';
header('Content-Type: application/json');
header('Allow: GET, POST, OPTIONS');
require_once 'db.php';
require_once 'rbac.php';
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
  $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

  if ($method === 'GET') {
    // Only restrict listing logs to authorized roles
    require_permission('activity.log');
    $pdo->exec("CREATE TABLE IF NOT EXISTS system_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      username VARCHAR(255),
      user_role VARCHAR(50),
      action_type VARCHAR(100) NOT NULL,
      action_description TEXT NOT NULL,
      resource_type VARCHAR(100),
      resource_id VARCHAR(255),
      ip_address VARCHAR(45),
      user_agent TEXT,
      status VARCHAR(50) DEFAULT 'success',
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_action_type (action_type),
      INDEX idx_created_at (created_at),
      INDEX idx_user_role (user_role),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $action_type = isset($_GET['action_type']) ? trim($_GET['action_type']) : '';
    $user_role = isset($_GET['user_role']) ? trim($_GET['user_role']) : '';
    $status = isset($_GET['status']) ? trim($_GET['status']) : '';
    $date_from = isset($_GET['date_from']) ? trim($_GET['date_from']) : '';
    $date_to = isset($_GET['date_to']) ? trim($_GET['date_to']) : '';
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? max(1, min(200, intval($_GET['limit']))) : 50;
    $offset = ($page - 1) * $limit;

    $where = [];
    $params = [];
    if ($action_type !== '') { $where[] = "action_type = :action_type"; $params[':action_type'] = $action_type; }
    if ($user_role !== '') { $where[] = "LOWER(user_role) = LOWER(:user_role)"; $params[':user_role'] = $user_role; }
    if ($status !== '') { $where[] = "status = :status"; $params[':status'] = $status; }
    if ($date_from !== '') { $where[] = "created_at >= :date_from"; $params[':date_from'] = $date_from . ' 00:00:00'; }
    if ($date_to !== '') { $where[] = "created_at <= :date_to"; $params[':date_to'] = $date_to . ' 23:59:59'; }

    $whereClause = !empty($where) ? (' WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM system_logs" . $whereClause);
    $countStmt->execute($params);
    $totalRecords = (int)$countStmt->fetchColumn();

    $sql = "SELECT * FROM system_logs" . $whereClause . " ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
    $stmt = $pdo->prepare($sql);
    foreach ($params as $k => $v) { $stmt->bindValue($k, $v); }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
      'success' => true,
      'logs' => $logs,
      'pagination' => [
        'current_page' => $page,
        'total_records' => $totalRecords,
        'total_pages' => ($limit > 0 ? (int)ceil($totalRecords / $limit) : 0),
        'limit' => $limit,
      ],
    ]);
    exit;
  }

  $data = json_decode(file_get_contents('php://input'), true);
  if (!is_array($data)) { $data = []; }

  // Branch 1: Generic system activity logs (from frontend logger.ts)
  if (isset($data['action_type']) && isset($data['action_description'])) {
    // Ensure table exists
    $pdo->exec("CREATE TABLE IF NOT EXISTS system_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      username VARCHAR(255),
      user_role VARCHAR(50),
      action_type VARCHAR(100) NOT NULL,
      action_description TEXT NOT NULL,
      resource_type VARCHAR(100),
      resource_id VARCHAR(255),
      ip_address VARCHAR(45),
      user_agent TEXT,
      status VARCHAR(50) DEFAULT 'success',
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_action_type (action_type),
      INDEX idx_created_at (created_at),
      INDEX idx_user_role (user_role),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $user_id = current_user_id_from_context();
    $username = isset($_SESSION['username']) ? (string)$_SESSION['username'] : null;
    $user_role = isset($_SESSION['role']) ? (string)$_SESSION['role'] : (isset($_SERVER['HTTP_X_ROLE']) ? (string)$_SERVER['HTTP_X_ROLE'] : 'guest');
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';

    $stmt = $pdo->prepare('INSERT INTO system_logs (user_id, username, user_role, action_type, action_description, resource_type, resource_id, ip_address, user_agent, status, error_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
      $user_id,
      $username,
      $user_role,
      trim((string)$data['action_type']),
      trim((string)$data['action_description']),
      isset($data['resource_type']) ? (string)$data['resource_type'] : null,
      isset($data['resource_id']) ? (string)$data['resource_id'] : null,
      $ip,
      $ua,
      isset($data['status']) ? (string)$data['status'] : 'success',
      isset($data['error_message']) ? (string)$data['error_message'] : null,
    ]);

    echo json_encode(['success' => true]);
    exit;
  }

  // Branch 2: SOP run activity logs (dispatch/response tracking)
  $sop_run_id = isset($data['sop_run_id']) ? intval($data['sop_run_id']) : 0;
  $action = isset($data['action']) ? trim($data['action']) : '';
  $details = isset($data['details']) ? $data['details'] : [];
  if ($sop_run_id <= 0 || $action === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing sop_run_id or action']);
    exit;
  }

  $pdo->exec("CREATE TABLE IF NOT EXISTS sop_run_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sop_run_id INT NOT NULL,
    action VARCHAR(64) NOT NULL,
    details JSON NULL,
    user_id INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_run (sop_run_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

  $user_id = current_user_id_from_context();
  $stmt = $pdo->prepare('INSERT INTO sop_run_activity (sop_run_id, action, details, user_id) VALUES (?, ?, ?, ?)');
  $stmt->execute([$sop_run_id, $action, json_encode($details), $user_id]);

  echo json_encode(['success' => true]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
