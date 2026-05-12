<?php
require_once __DIR__ . '/cors.php';
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/rbac.php';
require_once __DIR__ . '/sms_helper.php';
require_once __DIR__ . '/push_helper.php';

// Check permission — require_permission will exit if unauthorized
require_permission('alerts.manage');

if (session_status() !== PHP_SESSION_ACTIVE) {
  session_start();
}

function current_user_id_from_context()
{
  $headers = function_exists('getallheaders') ? getallheaders() : [];
  $auth = $headers['Authorization'] ?? ($headers['authorization'] ?? '');
  if (stripos($auth, 'Bearer ') === 0) {
    $token = substr($auth, 7);
    if (function_exists('jwt_decode')) {
        $payload = jwt_decode($token);
        if ($payload && isset($payload['sub'])) {
            return (int) $payload['sub'];
        }
    }
  }
  if (isset($_SESSION['user_id'])) {
    return (int) $_SESSION['user_id'];
  }
  return null;
}

try {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw, true);
  if (!$data || !is_array($data)) {
      $data = $_POST;
  }

  $title = isset($data['title']) ? trim((string)$data['title']) : '';
  $message = isset($data['message']) ? trim((string)$data['message']) : '';
  $sms_message_raw = isset($data['smsMessage']) ? trim((string)$data['smsMessage']) : null;
  $type = isset($data['type']) ? trim((string)$data['type']) : 'info';
  $audience = isset($data['audience']) ? trim((string)$data['audience']) : 'all';
  $brgy_name = isset($data['brgy_name']) ? trim((string)$data['brgy_name']) : null;
  $category = isset($data['category']) ? trim((string)$data['category']) : 'general';
  $external_link = isset($data['external_link']) ? trim((string)$data['external_link']) : null;
  $is_urgent = isset($data['is_urgent']) ? (int) $data['is_urgent'] : 0;
  $also_send_sms = isset($data['also_send_sms']) ? (bool) $data['also_send_sms'] : false;
  $send_push = isset($data['sendPush']) ? (bool) $data['sendPush'] : false;
  $created_by = current_user_id_from_context();

  if ($title === '' || $message === '') {
    // Return 200 with success:false to allow frontend to show error instead of "Network Error"
    echo json_encode(['success' => false, 'message' => 'Missing title or message']);
    exit;
  }

  // Insert into announcements
  $stmt = $pdo->prepare('INSERT INTO announcements (title, message, type, audience, brgy_name, category, external_link, is_urgent, created_by, sms_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  $stmt->execute([$title, $message, $type, $audience, $brgy_name, $category, $external_link, $is_urgent, $created_by, $sms_message_raw]);
  $ann_id = intval($pdo->lastInsertId());

  // Dual-insert into notifications
  $notif_stmt = $pdo->prepare('INSERT INTO notifications (title, message, type, audience, brgy_name, category, external_link, is_urgent, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  $notif_stmt->execute([$title, $message, $type, $audience, $brgy_name, $category, $external_link, $is_urgent, $created_by]);

  $sms_count = 0;
  $push_count = 0;

  // Filtering for SMS/Push
  $wheres = ["1=1"];
  $params = [];
  if ($brgy_name && $brgy_name !== 'Global' && $brgy_name !== 'Select Barangay') {
    $wheres[] = "brgy_name = ?";
    $params[] = $brgy_name;
  }
  if ($audience === 'residents') {
    $wheres[] = "role = 'resident'";
  } elseif ($audience === 'barangay') {
    $wheres[] = "role IN ('brgy', 'brgy_chair', 'coordinator')";
  }
  $filter_sql = implode(" AND ", $wheres);

  // Handle SMS
  if ($also_send_sms) {
    $smsStmt = $pdo->prepare("SELECT contact_number FROM users WHERE contact_number IS NOT NULL AND contact_number != '' AND $filter_sql");
    $smsStmt->execute($params);
    $numbers = $smsStmt->fetchAll(PDO::FETCH_COLUMN);
    if (!empty($numbers)) {
      $sms_msg = $sms_message_raw ?: "[$category] $title: $message";
      $numbers = array_unique(array_filter($numbers));
      $sms_res = SMSService::send($numbers, $sms_msg);
      if ($sms_res['success']) $sms_count = count($numbers);
    }
  }

  // Handle Push
  if ($send_push) {
    $pushStmt = $pdo->prepare("SELECT push_token FROM users WHERE push_token IS NOT NULL AND push_token != '' AND $filter_sql");
    $pushStmt->execute($params);
    $tokens = $pushStmt->fetchAll(PDO::FETCH_COLUMN);
    if (!empty($tokens)) {
      $tokens = array_unique(array_filter($tokens));
      $push_res = PushService::send($tokens, $title, $message, ['id' => $ann_id, 'type' => 'announcement']);
      if ($push_res['success']) $push_count = count($tokens);
    }
  }

  echo json_encode([
    'success' => true,
    'id' => $ann_id,
    'sms_sent' => $sms_count,
    'push_sent' => $push_count
  ]);

} catch (Exception $e) {
  echo json_encode(['success' => false, 'message' => 'Broadcast failed: ' . $e->getMessage()]);
}
?>