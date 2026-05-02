<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/rbac.php';
header("Content-Type: application/json");
require_permission('invites.manage');
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);
if (!$data || !is_array($data)) { $data = $_POST; }
$role = 'brgy';
$hours = isset($data['expires_hours']) ? max(1, (int)$data['expires_hours']) : 168;
$code = bin2hex(random_bytes(6));
$pdo->exec("CREATE TABLE IF NOT EXISTS invites (id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(64) UNIQUE, role VARCHAR(16), created_by VARCHAR(64), created_at DATETIME, expires_at DATETIME, used_at DATETIME NULL, used_by INT NULL)");
$created_by = $_SESSION['role'] ?? 'admin';
$now = date('Y-m-d H:i:s');
$expires = date('Y-m-d H:i:s', time() + $hours * 3600);
$stmt = $pdo->prepare("INSERT INTO invites (code, role, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?)");
$ok = $stmt->execute([$code, $role, $created_by, $now, $expires]);
if ($ok) {
    echo json_encode(['success' => true, 'code' => $code, 'role' => $role, 'expires_at' => $expires]);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to create invite']);
}
?> 
