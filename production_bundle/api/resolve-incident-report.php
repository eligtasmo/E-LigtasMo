<?php
require_once "cors.php";

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

    // 3. Automated Notifications
    $stmtGet = $pdo->prepare("SELECT id, barangay, type, user_id FROM incident_reports WHERE id = ?");
    $stmtGet->execute([$id]);
    $report = $stmtGet->fetch(PDO::FETCH_ASSOC);

    if ($report) {
        require_once 'lib/notification-helper.php';
        
        $title = "Mission Complete";
        $message = "Your incident report (ID: $id) has been marked as RESOLVED. Thank you for your intelligence contribution.";
        $genMsg = "The " . strtolower($report['type'] ?? 'incident') . " in Brgy. " . ($report['barangay'] ?? 'your area') . " has been resolved.";

        // Notify Everyone in Brgy (Resolved Status)
        NotificationHelper::notify($pdo, "Incident Resolved", $genMsg, 'residents', $report['barangay'], 'success', 'report_update', null, ['report_id' => $id]);

        // Notify Reporter specifically + Brgy/Admin update
        NotificationHelper::notifyReportUpdate($pdo, $report, $title, $message, 'success');
    }

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>