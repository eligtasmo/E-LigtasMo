<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';
require_once 'sms_helper.php';

require_permission('alerts.manage');
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
  
  // Add missing columns if they don't exist
  try { $pdo->exec("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general'"); } catch(Exception $e){}
  try { $pdo->exec("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS external_link TEXT NULL"); } catch(Exception $e){}
  try { $pdo->exec("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_urgent TINYINT(1) DEFAULT 0"); } catch(Exception $e){}
}

try {
  ensure_announcements_table($pdo);
  $data = json_decode(file_get_contents('php://input'), true);
  $title = isset($data['title']) ? trim($data['title']) : '';
  $message = isset($data['message']) ? trim($data['message']) : '';
  $type = isset($data['type']) ? trim($data['type']) : 'info';
  $audience = isset($data['audience']) ? trim($data['audience']) : 'all';
  $brgy_name = isset($data['brgy_name']) ? trim($data['brgy_name']) : null;
  $category = isset($data['category']) ? trim($data['category']) : 'general';
  $external_link = isset($data['external_link']) ? trim($data['external_link']) : null;
  $is_urgent = isset($data['is_urgent']) ? (int)$data['is_urgent'] : 0;
  $also_send_sms = isset($data['also_send_sms']) ? (bool)$data['also_send_sms'] : false;
  $created_by = current_user_id_from_context();

  if ($title === '' || $message === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing title or message']);
    exit;
  }
  
  $stmt = $pdo->prepare('INSERT INTO announcements (title, message, type, audience, brgy_name, category, external_link, is_urgent, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  $stmt->execute([$title, $message, $type, $audience, $brgy_name, $category, $external_link, $is_urgent, $created_by]);
  $id = intval($pdo->lastInsertId());

  $sms_count = 0;
  if ($also_send_sms) {
    $numbers = [];
    $sms_msg = "[$type] $title: $message";
    if (strlen($sms_msg) > 160) $sms_msg = substr($sms_msg, 0, 157) . "...";

    if ($audience === 'all') {
        $nStmt = $pdo->query("SELECT contact_number FROM users WHERE contact_number IS NOT NULL AND contact_number != ''");
        $numbers = $nStmt->fetchAll(PDO::FETCH_COLUMN);
    } elseif ($audience === 'barangay' && $brgy_name) {
        $nStmt = $pdo->prepare("SELECT contact_number FROM users WHERE brgy_name = ? AND contact_number IS NOT NULL AND contact_number != ''");
        $nStmt->execute([$brgy_name]);
        $numbers = $nStmt->fetchAll(PDO::FETCH_COLUMN);
    }

    if (!empty($numbers)) {
        $sms_res = SMSService::send($numbers, $sms_msg);
        if ($sms_res['success']) $sms_count = count($numbers);
    }
  }

  echo json_encode(['success' => true, 'id' => $id, 'sms_sent' => $sms_count]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
