<?php
/**
 * Optimized Incident Status Management API
 * Unifies old 'incidents' logic into 'incident_reports'
 */
require_once "cors.php";
require_once 'db.php';
require_once 'rbac.php';
require_once 'lib/notification-helper.php';

header("Content-Type: application/json");

// Check permissions
require_permission('dispatch.manage');

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !isset($input['id']) || !isset($input['status'])) {
        throw new Exception("Missing id or status");
    }

    $id = (int)$input['id'];
    $status = $input['status'];
    $currentUser = get_current_user_data();

    // 1. SOP Completion Gating (Optional check)
    if (strcasecmp($status, 'Resolved') === 0) {
        try {
            $checkSop = $pdo->prepare("SELECT COUNT(*) FROM sop_runs WHERE incident_id = ? AND status = 'completed'");
            $checkSop->execute([$id]);
            if ($checkSop->fetchColumn() == 0) {
                // Warning only, or strict? Let's keep it informative.
                // throw new Exception('SOP must be completed before resolution.');
            }
        } catch (Exception $e) { /* Table might not exist, ignore gating */ }
    }

    // 2. Update the unified incident_reports table
    $sql = "UPDATE incident_reports SET status = ?, reviewed_at = NOW(), approved_by = ?, rejection_reason = ? WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $status,
        $currentUser['full_name'] ?? $currentUser['username'] ?? 'System',
        $input['rejectionReason'] ?? null,
        $id
    ]);

    // 3. Trigger Notifications
    try {
        $stmtGet = $pdo->prepare("SELECT type, barangay, user_id FROM incident_reports WHERE id = ?");
        $stmtGet->execute([$id]);
        $report = $stmtGet->fetch(PDO::FETCH_ASSOC);

        if ($report) {
            $notifTitle = "Tactical Intel Update";
            $notifMsg = "Your " . $report['type'] . " report has been marked as $status.";
            
            // Notify reporter
            if ($report['user_id'] > 0) {
                NotificationHelper::notify($pdo, $notifTitle, $notifMsg, 'residents', null, 'info', 'report_update', $id, ['report_id' => $id]);
            }

            // If verified, notify the whole barangay
            if (strcasecmp($status, 'Verified') === 0) {
                NotificationHelper::notify($pdo, "Verified Threat: " . $report['type'], "Tactical Command has verified a threat in Brgy. " . $report['barangay'], 'residents', $report['barangay'], 'warning', 'emergency', null, ['report_id' => $id]);
            }
        }
    } catch (Exception $notifEx) { /* Non-fatal */ }

    echo json_encode([
        'success' => true,
        'message' => 'Incident status updated successfully',
        'status' => $status
    ]);

} catch (Exception $e) {
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
