<?php
require_once 'cors.php';
require_once 'db.php';

/**
 * Tactical Database Cleanup Utility
 * Wipes legacy data to prepare for a fresh, live-synchronized experience.
 */

try {
    // 1. Wipe Notifications
    $pdo->exec("TRUNCATE TABLE notifications");
    
    // 2. Wipe Incident Reports (Disasters)
    $pdo->exec("TRUNCATE TABLE incident_reports");
    
    // 3. Wipe Social Posts (News/Pulse)
    $pdo->exec("TRUNCATE TABLE social_posts");

    echo json_encode([
        'status' => 'success',
        'message' => 'Database cleaned successfully. Notifications, Incident Reports, and Social Posts have been reset.',
        'next_steps' => 'Run social-pulse.php to populate fresh news from PAGASA and PHIVOLCS.'
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Cleanup failed: ' . $e->getMessage()
    ]);
}
?>
