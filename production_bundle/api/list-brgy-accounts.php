<?php
error_reporting(0);
ini_set('display_errors', 0);
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';

require_once 'rbac.php';
// session_start is handled by rbac.php if needed
require_permission('users.view');

$userRole = $_SESSION['role'] ?? null;
$userBrgy = $_SESSION['brgy_name'] ?? null;

try {
  $sql = "SELECT 
    b.id AS barangay_id,
    b.name AS barangay_name,
    b.lat AS lat,
    b.lng AS lng,
    b.address AS address,
    b.contact AS contact,
    u.id AS user_id,
    u.username AS username,
    u.email AS email,
    u.role AS role,
    u.status AS status
  FROM barangays b
  LEFT JOIN users u ON u.brgy_name = b.name AND u.role = 'brgy'";
  
  $params = [];
  if ($userRole === 'brgy') {
      $sql .= " WHERE b.name = ?";
      $params[] = $userBrgy;
  }
  
  $sql .= " ORDER BY b.name ASC";

  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);


  echo json_encode([
    'success' => true,
    'barangays' => $rows,
    'count' => count($rows),
  ]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'message' => $e->getMessage(),
  ]);
}
