<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';
require_once 'sms_helper.php';
require_once 'push_helper.php';

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
    audience ENUM('all','residents','barangay','brgy_specific') NOT NULL DEFAULT 'all',
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
  try { $pdo->exec("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS sms_sent INT DEFAULT 0"); } catch(Exception $e){}
  try { $pdo->exec("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS sms_message TEXT NULL"); } catch(Exception $e){}
}

try {
  ensure_announcements_table($pdo);
  $data = json_decode(file_get_contents('php://input'), true);
  $title = isset($data['title']) ? trim($data['title']) : '';
  $message = isset($data['message']) ? trim($data['message']) : '';
  $sms_message_raw = isset($data['smsMessage']) ? trim($data['smsMessage']) : null;
  $type = isset($data['type']) ? trim($data['type']) : 'info';
  $audience = isset($data['audience']) ? trim($data['audience']) : 'all';
  $brgy_name = isset($data['brgy_name']) ? trim($data['brgy_name']) : null;
  $category = isset($data['category']) ? trim($data['category']) : 'general';
  $external_link = isset($data['external_link']) ? trim($data['external_link']) : null;
  $is_urgent = isset($data['is_urgent']) ? (int)$data['is_urgent'] : 0;
  $also_send_sms = isset($data['also_send_sms']) ? (bool)$data['also_send_sms'] : false;
  $send_push = isset($data['sendPush']) ? (bool)$data['sendPush'] : false;
  $created_by = current_user_id_from_context();

  if ($title === '' || $message === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing title or message']);
    exit;
  }
  
  // Insert into announcements
  $stmt = $pdo->prepare('INSERT INTO announcements (title, message, type, audience, brgy_name, category, external_link, is_urgent, created_by, sms_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  $stmt->execute([$title, $message, $type, $audience, $brgy_name, $category, $external_link, $is_urgent, $created_by, $sms_message_raw]);
  $ann_id = intval($pdo->lastInsertId());

  // Dual-insert into notifications for mobile app history
  $notif_stmt = $pdo->prepare('INSERT INTO notifications (title, message, type, audience, brgy_name, category, external_link, is_urgent, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  $notif_stmt->execute([$title, $message, $type, $audience, $brgy_name, $category, $external_link, $is_urgent, $created_by]);

  $sms_count = 0;
  $push_count = 0;

  // Audience filtering logic
  $audience_filters = "1=1";
  $audience_params = [];

  if ($audience === 'residents') {
      $audience_filters .= " AND role = 'resident'";
  } elseif ($audience === 'barangay') {
      $audience_filters .= " AND role IN ('brgy', 'brgy_chair')";
  } elseif ($audience === 'brgy_specific') {
      if ($brgy_name) {
          $audience_filters .= " AND brgy_name = ?";
          $audience_params[] = $brgy_name;
      }
  }

  // Handle SMS
  if ($also_send_sms) {
      $smsStmt = $pdo->prepare("SELECT contact_number FROM users WHERE contact_number IS NOT NULL AND contact_number != '' AND $audience_filters");
      $smsStmt->execute($audience_params);
      $numbers = $smsStmt->fetchAll(PDO::FETCH_COLUMN);

      if (!empty($numbers)) {
          $sms_msg = $sms_message_raw ?: "[$category] $title: $message";
          $numbers = array_unique(array_filter($numbers));
          $sms_res = SMSService::send($numbers, $sms_msg);
          if ($sms_res['success']) {
              $sms_count = count($numbers);
              $upd = $pdo->prepare("UPDATE announcements SET sms_sent = ? WHERE id = ?");
              $upd->execute([$sms_count, $ann_id]);
          }
      }
  }

  // Handle Push Notifications
  if ($send_push) {
      $pushStmt = $pdo->prepare("SELECT push_token FROM users WHERE push_token IS NOT NULL AND push_token != '' AND $audience_filters");
      $pushStmt->execute($audience_params);
      $tokens = $pushStmt->fetchAll(PDO::FETCH_COLUMN);

      if (!empty($tokens)) {
          $tokens = array_unique(array_filter($tokens));
          $push_res = PushService::send($tokens, $title, $message, ['id' => $ann_id, 'type' => 'announcement']);
          if ($push_res['success']) {
              $push_count = count($tokens);
          }
      }
  }

  echo json_encode([
      'success' => true, 
      'id' => $ann_id, 
      'sms_sent' => $sms_count, 
      'push_sent' => $push_count
  ]);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
