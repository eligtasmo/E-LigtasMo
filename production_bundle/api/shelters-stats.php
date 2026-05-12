<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';

// Helper to safely divide
function safe_div($num, $den) {
    if ($den == 0 || $den === null) return 0;
    return $num / $den;
}

try {
    // Aggregate totals
    $totalsStmt = $pdo->query('SELECT COUNT(*) AS total_shelters, COALESCE(SUM(occupancy),0) AS total_occupied, COALESCE(SUM(capacity),0) AS total_capacity FROM shelters');
    $totals = $totalsStmt->fetch(PDO::FETCH_ASSOC);

    $totalShelters = (int)($totals['total_shelters'] ?? 0);
    $totalOccupied = (int)($totals['total_occupied'] ?? 0);
    $totalCapacity = (int)($totals['total_capacity'] ?? 0);

    // Status counts
    $statusStmt = $pdo->query('SELECT status, COUNT(*) AS cnt FROM shelters GROUP BY status');
    $statusRows = $statusStmt->fetchAll(PDO::FETCH_ASSOC);
    $statusMap = [
        'operational' => 0,
        'maintenance' => 0,
        'offline' => 0,
    ];
    foreach ($statusRows as $row) {
        $status = strtolower($row['status']);
        $cnt = (int)$row['cnt'];
        if ($status === 'operational' || $status === 'available') {
            $statusMap['operational'] += $cnt;
        } elseif ($status === 'maintenance') {
            $statusMap['maintenance'] += $cnt;
        } elseif ($status === 'offline') {
            $statusMap['offline'] += $cnt;
        } else {
            // Unknown statuses treated as operational by default
            $statusMap['operational'] += $cnt;
        }
    }

    // Near capacity count
    $nearStmt = $pdo->query('SELECT COUNT(*) AS near_cap FROM shelters WHERE capacity > 0 AND (occupancy / capacity) >= 0.85');
    $nearRow = $nearStmt->fetch(PDO::FETCH_ASSOC);
    $nearCapacity = (int)($nearRow['near_cap'] ?? 0);

    // Reserve beds (available capacity)
    $reserveStmt = $pdo->query('SELECT COALESCE(SUM(GREATEST(capacity - occupancy, 0)), 0) AS reserve_beds FROM shelters');
    $reserveRow = $reserveStmt->fetch(PDO::FETCH_ASSOC);
    $reserveBeds = (int)($reserveRow['reserve_beds'] ?? 0);

    // Utilization and available capacity %
    $utilizationPct = round(safe_div($totalOccupied, $totalCapacity) * 100, 1);
    $availableCapacityPct = round(safe_div(max($totalCapacity - $totalOccupied, 0), $totalCapacity) * 100, 1);

    echo json_encode([
        'metrics' => [
            'totalShelters' => $totalShelters,
            'currentOccupancy' => $totalOccupied,
            'capacityUtilizationPct' => $utilizationPct,
            // Response rate not tracked; return null so UI can hide/compute later
            'responseRatePct' => null,
            'availableCapacityPct' => $availableCapacityPct,
            'nearCapacityCount' => $nearCapacity,
            'reserveBeds' => $reserveBeds,
            'totalCapacity' => $totalCapacity,
        ],
        'status' => $statusMap,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}