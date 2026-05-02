<?php
// Inserts a snapshot of current shelter occupancy/capacity into shelter_occupancy_snapshots
header('Content-Type: application/json');
require_once 'db.php';

try {
    // Compute current totals from shelters table
    $totalsSql = "SELECT COALESCE(SUM(occupancy),0) AS total_occupancy,
                         COALESCE(SUM(capacity),0) AS total_capacity
                  FROM shelters";
    $totalsStmt = $pdo->prepare($totalsSql);
    $totalsStmt->execute();
    $totals = $totalsStmt->fetch(PDO::FETCH_ASSOC);

    $totalOccupancy = (int)($totals['total_occupancy'] ?? 0);
    $totalCapacity = (int)($totals['total_capacity'] ?? 0);
    $available = max($totalCapacity - $totalOccupancy, 0);
    $utilization = $totalCapacity > 0 ? round(($totalOccupancy / $totalCapacity) * 100, 3) : 0.0;

    // Insert snapshot
    $insertSql = "INSERT INTO shelter_occupancy_snapshots (snapshot_at, total_occupancy, total_capacity, available_capacity, utilization_pct, source, created_by, created_brgy)
                  VALUES (NOW(), :occ, :cap, :avail, :util, :source, :created_by, :created_brgy)";
    $insertStmt = $pdo->prepare($insertSql);
    $source = isset($_POST['source']) ? $_POST['source'] : 'manual';
    $createdBy = isset($_POST['created_by']) ? $_POST['created_by'] : null;
    $createdBrgy = isset($_POST['created_brgy']) ? $_POST['created_brgy'] : null;
    $insertStmt->execute([
        ':occ' => $totalOccupancy,
        ':cap' => $totalCapacity,
        ':avail' => $available,
        ':util' => $utilization,
        ':source' => $source,
        ':created_by' => $createdBy,
        ':created_brgy' => $createdBrgy,
    ]);

    echo json_encode([
        'success' => true,
        'snapshot_id' => $pdo->lastInsertId(),
        'snapshot' => [
            'snapshot_at' => date('c'),
            'total_occupancy' => $totalOccupancy,
            'total_capacity' => $totalCapacity,
            'available_capacity' => $available,
            'utilization_pct' => $utilization,
            'source' => $source,
        ],
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>