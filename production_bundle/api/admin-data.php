<?php
require_once 'cors.php';
require_once 'db.php';
require_once 'rbac.php';

// Ensure session is started properly
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Check permissions
require_permission('users.view');

header('Content-Type: application/json');

try {
    // 1. User Stats
    $userStats = [
        'total' => 0,
        'active' => 0,
        'pending' => 0
    ];
    $stmt = $pdo->query("SELECT COUNT(*) as count, status FROM users GROUP BY status");
    while ($row = $stmt->fetch()) {
        $status = strtolower($row['status']);
        $count = (int)$row['count'];
        $userStats['total'] += $count;
        if ($status === 'active' || $status === 'approved') $userStats['active'] += $count;
        if ($status === 'pending') $userStats['pending'] += $count;
    }

    // 2. Incident Stats (Today)
    $today = date('Y-m-d');
    $incidentStats = [
        'total_today' => 0,
        'open' => 0,
        'pending_verification' => 0
    ];
    
    // Total today
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM incident_reports WHERE DATE(created_at) = ?");
    $stmt->execute([$today]);
    $incidentStats['total_today'] = (int)$stmt->fetchColumn();

    // Active/Open (Verified)
    $stmt = $pdo->query("SELECT COUNT(*) FROM incident_reports WHERE status IN ('Verified', 'Approved', 'Active')");
    $incidentStats['open'] = (int)$stmt->fetchColumn();

    // Pending Verification
    $stmt = $pdo->query("SELECT COUNT(*) FROM incident_reports WHERE status = 'Pending'");
    $incidentStats['pending_verification'] = (int)$stmt->fetchColumn();

    // 3. Team Stats
    $teamStats = [
        'available' => 0,
        'busy' => 0
    ];
    // This assumes logic from list-teams.php where availability is determined dynamically
    // For simplicity, we'll just check if they have active runs if possible, or just mock it slightly
    // Or better, just count total teams for now.
    $stmt = $pdo->query("SELECT COUNT(*) FROM teams");
    $teamStats['total'] = (int)$stmt->fetchColumn();


    echo json_encode([
        'success' => true,
        'data' => [
            'users' => $userStats,
            'incidents' => $incidentStats,
            'teams' => $teamStats
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>