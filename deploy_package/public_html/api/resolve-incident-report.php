<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

$input = json_decode(file_get_contents("php://input"), true);
if (!$input || !isset($input['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid input']);
    exit;
}

$id = intval($input['id']);
$resolved_by = $input['resolved_by'] ?? 'Admin';

// Ensure resolved columns exist
try {
    $checkCols = $pdo->prepare("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'incident_reports'");
    $checkCols->execute();
    $existing = array_map(function($r){ return $r['COLUMN_NAME']; }, $checkCols->fetchAll(PDO::FETCH_ASSOC));
    $alter = [];
    if (!in_array('resolved_by', $existing)) $alter[] = "ADD COLUMN resolved_by varchar(150) NULL";
    if (!in_array('resolved_at', $existing)) $alter[] = "ADD COLUMN resolved_at datetime NULL";
    foreach ($alter as $ddl) { $pdo->exec("ALTER TABLE incident_reports $ddl"); }
} catch (Exception $e) { /* ignore */ }

try {
    // 1. Get report details first
    $stmtGet = $pdo->prepare("SELECT barangay, description FROM incident_reports WHERE id = ?");
    $stmtGet->execute([$id]);
    $report = $stmtGet->fetch(PDO::FETCH_ASSOC);

    // 2. Update status
    $stmt = $pdo->prepare("UPDATE incident_reports SET status = 'Resolved', resolved_by = ?, resolved_at = NOW() WHERE id = ?");
    $stmt->execute([$resolved_by, $id]);

    // 3. Create Notification
    if ($report) {
        $notifTitle = "Flood Report Resolved";
        $notifMsg = "The flood report in " . ($report['barangay'] ?? 'your area') . " has been marked as resolved.";
        $notifType = "success";
        $notifAudience = "residents"; // Notify residents
        
        $sqlNotif = "INSERT INTO notifications (title, message, type, audience, brgy_name, created_at) VALUES (?, ?, ?, ?, ?, NOW())";
        $stmtNotif = $pdo->prepare($sqlNotif);
        $stmtNotif->execute([$notifTitle, $notifMsg, $notifType, $notifAudience, $report['barangay']]);
    }

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>