<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

// Only users who can update SOP runs may upload attachments
require_permission('sop.update');

// Validate run id
$runId = isset($_POST['sop_run_id']) ? intval($_POST['sop_run_id']) : 0;
if ($runId <= 0) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Missing or invalid sop_run_id']);
  exit;
}

// Ensure table exists
try {
  $pdo->exec("CREATE TABLE IF NOT EXISTS health_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sop_run_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    mime VARCHAR(100) NOT NULL,
    size INT NOT NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_run (sop_run_id),
    INDEX idx_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
} catch (Exception $e) { /* ignore */ }

// Ensure upload directory exists
$uploadDir = __DIR__ . '/../uploads/health/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$allowedTypes = ['image/jpeg','image/png','image/gif','image/webp'];
$saved = [];

if (!isset($_FILES['attachments'])) {
  echo json_encode(['success' => true, 'attachments' => []]);
  exit;
}

$files = $_FILES['attachments'];
$count = is_array($files['name']) ? count($files['name']) : 0;
for ($i = 0; $i < $count; $i++) {
  $name = $files['name'][$i];
  $type = $files['type'][$i];
  $tmp  = $files['tmp_name'][$i];
  $size = intval($files['size'][$i]);
  $err  = intval($files['error'][$i]);

  if ($err !== UPLOAD_ERR_OK) { continue; }
  if (!in_array($type, $allowedTypes, true)) { continue; }
  if (!is_uploaded_file($tmp)) { continue; }

  // Sanitize and create unique filename
  $ext = pathinfo($name, PATHINFO_EXTENSION);
  $base = preg_replace('/[^a-zA-Z0-9_-]/','_', pathinfo($name, PATHINFO_FILENAME));
  $uniq = $base . '_' . uniqid('', true) . '.' . $ext;
  $target = $uploadDir . '/' . $uniq;

  if (move_uploaded_file($tmp, $target)) {
    $publicUrl = 'uploads/health/' . $uniq;
    try {
      $stmt = $pdo->prepare('INSERT INTO health_attachments (sop_run_id, filename, url, mime, size, created_by) VALUES (?, ?, ?, ?, ?, ?)');
      $createdBy = isset($_SESSION['username']) ? $_SESSION['username'] : null;
      $stmt->execute([$runId, $name, $publicUrl, $type, $size, $createdBy]);
      $id = intval($pdo->lastInsertId());
      $saved[] = [
        'id' => $id,
        'sop_run_id' => $runId,
        'filename' => $name,
        'url' => $publicUrl,
        'mime' => $type,
        'size' => $size,
      ];
    } catch (Exception $e) {
      // Rollback file on DB error
      @unlink($target);
    }
  }
}

// Return all attachments for this run
try {
  $stmt = $pdo->prepare('SELECT id, sop_run_id, filename, url, mime, size, created_at FROM health_attachments WHERE sop_run_id = ? ORDER BY id DESC');
  $stmt->execute([$runId]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  echo json_encode(['success' => true, 'attachments' => $rows]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
