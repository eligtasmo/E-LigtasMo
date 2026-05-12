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
$rejected_by = $input['rejected_by'] ?? 'Barangay';

// Ensure approval/rejection columns exist
try {
    $checkCols = $pdo->prepare("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'incident_reports'");
    $checkCols->execute();
    $existing = array_map(function($r){ return $r['COLUMN_NAME']; }, $checkCols->fetchAll(PDO::FETCH_ASSOC));
    $alter = [];
    if (!in_array('approved_by', $existing)) $alter[] = "ADD COLUMN approved_by varchar(150) NULL";
    if (!in_array('approved_at', $existing)) $alter[] = "ADD COLUMN approved_at datetime NULL";
    if (!in_array('rejected_by', $existing)) $alter[] = "ADD COLUMN rejected_by varchar(150) NULL";
    if (!in_array('rejected_at', $existing)) $alter[] = "ADD COLUMN rejected_at datetime NULL";
    foreach ($alter as $ddl) { $pdo->exec("ALTER TABLE incident_reports $ddl"); }
} catch (Exception $e) { /* ignore */ }

try {
    $stmt = $pdo->prepare("UPDATE incident_reports SET status = 'Rejected', rejected_by = ?, rejected_at = NOW() WHERE id = ?");
    $stmt->execute([$rejected_by, $id]);
    
    // 3. Automated Notifications
    $stmtGet = $pdo->prepare("SELECT id, barangay, type, user_id FROM incident_reports WHERE id = ?");
    $stmtGet->execute([$id]);
    $report = $stmtGet->fetch(PDO::FETCH_ASSOC);

    if ($report) {
        require_once 'lib/notification-helper.php';
        
        $title = "Report Rejected";
        $message = "Your incident report (ID: $id) has been rejected as unverified or duplicate.";
        $genMsg = "A " . strtolower($report['type'] ?? 'incident') . " report in Brgy. " . ($report['barangay'] ?? 'your area') . " has been cleared/rejected.";

        // Notify Everyone in Brgy (Cleared Status)
        NotificationHelper::notify($pdo, "Intelligence Cleared", $genMsg, 'residents', $report['barangay'], 'info', 'report_update', null, ['report_id' => $id]);

        // Notify Reporter specifically + Brgy/Admin update
        NotificationHelper::notifyReportUpdate($pdo, $report, $title, $message, 'error');
    }

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
