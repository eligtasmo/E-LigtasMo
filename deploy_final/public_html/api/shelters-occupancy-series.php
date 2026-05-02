<?php
// Returns a time-series of shelter occupancy and capacity based on snapshots
header('Content-Type: application/json');
require_once 'db.php';

try {
    $hours = isset($_GET['hours']) ? max(1, min(168, intval($_GET['hours']))) : 24; // up to 7 days

    // Fetch recent snapshots within the requested window
    $seriesSql = "SELECT snapshot_at, total_occupancy, total_capacity, available_capacity, utilization_pct
                  FROM shelter_occupancy_snapshots
                  WHERE snapshot_at >= (NOW() - INTERVAL :hrs HOUR)
                  ORDER BY snapshot_at ASC";
    $seriesStmt = $pdo->prepare($seriesSql);
    $seriesStmt->bindValue(':hrs', $hours, PDO::PARAM_INT);
    $seriesStmt->execute();
    $rows = $seriesStmt->fetchAll(PDO::FETCH_ASSOC);

    // If no snapshots yet, return a single point from current totals
    if (!$rows || count($rows) === 0) {
        $totalsSql = "SELECT COALESCE(SUM(occupancy),0) AS total_occupancy,
                             COALESCE(SUM(capacity),0) AS total_capacity
                       FROM shelters";
        $totalsStmt = $pdo->prepare($totalsSql);
        $totalsStmt->execute();
        $totals = $totalsStmt->fetch(PDO::FETCH_ASSOC);
        $occ = (int)($totals['total_occupancy'] ?? 0);
        $cap = (int)($totals['total_capacity'] ?? 0);
        $avail = max($cap - $occ, 0);
        $util = $cap > 0 ? round(($occ / $cap) * 100, 3) : 0.0;

        $rows = [[
            'snapshot_at' => date('Y-m-d H:00:00'),
            'total_occupancy' => $occ,
            'total_capacity' => $cap,
            'available_capacity' => $avail,
            'utilization_pct' => $util,
        ]];
    }

    $labels = [];
    $occupancy = [];
    $capacity = [];
    $available = [];
    $utilization = [];

    foreach ($rows as $r) {
        $labels[] = date('c', strtotime($r['snapshot_at']));
        $occupancy[] = (int)$r['total_occupancy'];
        $capacity[] = (int)$r['total_capacity'];
        $available[] = (int)$r['available_capacity'];
        $utilization[] = (float)$r['utilization_pct'];
    }

    echo json_encode([
        'success' => true,
        'window_hours' => $hours,
        'labels' => $labels,
        'series' => [
            'occupancy' => $occupancy,
            'capacity' => $capacity,
            'available' => $available,
            'utilization_pct' => $utilization,
        ],
        'generated_at' => date('c'),
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>