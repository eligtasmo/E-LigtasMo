<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/rbac.php';
header("Content-Type: application/json");
require_permission('invites.manage');
$pdo->exec("CREATE TABLE IF NOT EXISTS invites (id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(64) UNIQUE, role VARCHAR(16), created_by VARCHAR(64), created_at DATETIME, expires_at DATETIME, used_at DATETIME NULL, used_by INT NULL)");
$stmt = $pdo->query("SELECT id, code, role, created_by, created_at, expires_at, used_at, used_by FROM invites ORDER BY created_at DESC");
$items = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode(['success' => true, 'items' => $items]);
?> 
