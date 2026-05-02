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
    
    // Create notification for the reporter
    $notif_sql = "
        INSERT INTO notifications (title, message, type, audience, brgy_name, created_at, user_id)
        SELECT 
            'Flood Report Rejected',
            CONCAT('Your flood report (ID: ', id, ') has been rejected. Reason: Not verified/Duplicate/False Report.'),
            'error',
            'residents',
            barangay,
            NOW(),
            user_id
        FROM incident_reports 
        WHERE id = ?
    ";
    $notif_stmt = $pdo->prepare($notif_sql);
    $notif_stmt->execute([$id]);

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
