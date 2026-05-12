<?php
require_once "cors.php";
header('Content-Type: application/json');
require_once 'db.php';

try {
    $category = isset($_GET['category']) ? $_GET['category'] : 'All';
    $status = isset($_GET['status']) ? $_GET['status'] : 'Active';
    
    $query = "SELECT * FROM donation_drives WHERE 1=1";
    $params = [];
    
    if ($category !== 'All') {
        $query .= " AND category = ?";
        $params[] = $category;
    }
    
    if ($status !== 'Any') {
        $query .= " AND status = ?";
        $params[] = $status;
    }
    
    $query .= " ORDER BY urgent DESC, created_at DESC";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $drives = $stmt->fetchAll();
    
    // Process percentage and relative time
    foreach ($drives as &$drive) {
        $drive['percentage'] = $drive['target_amount'] > 0 ? ($drive['current_amount'] / $drive['target_amount']) * 100 : 0;
        
        // Calculate days remaining
        $endDate = new DateTime($drive['end_date']);
        $now = new DateTime();
        $interval = $now->diff($endDate);
        if ($now > $endDate) {
            $drive['days_left'] = 0;
            $drive['time_label'] = 'Ended';
        } else {
            $drive['days_left'] = $interval->days;
            if ($interval->days < 1) {
                $drive['time_label'] = 'at ' . $endDate->format('H:i');
            } else {
                $drive['time_label'] = $interval->days . ' days left';
            }
        }
    }

    echo json_encode(['success' => true, 'drives' => $drives]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
