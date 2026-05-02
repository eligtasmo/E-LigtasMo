<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once 'db.php';

try {
    if (!isset($_GET['id'])) {
        throw new Exception('Drive ID is required');
    }
    
    $id = $_GET['id'];
    $stmt = $pdo->prepare("SELECT * FROM donation_drives WHERE id = ?");
    $stmt->execute([$id]);
    $drive = $stmt->fetch();
    
    if (!$drive) {
        throw new Exception('Donation drive not found');
    }

    // Process percentage and relative time
    $drive['percentage'] = $drive['target_amount'] > 0 ? ($drive['current_amount'] / $drive['target_amount']) * 100 : 0;
    
    $endDate = new DateTime($drive['end_date']);
    $now = new DateTime();
    $interval = $now->diff($endDate);
    $drive['days_left'] = $now > $endDate ? 0 : $interval->days;
    
    // Fetch recent donations for this drive
    $stmt = $pdo->prepare("SELECT d.*, u.full_name as donor_name 
                          FROM donations d 
                          LEFT JOIN users u ON d.user_id = u.id 
                          WHERE d.drive_id = ? 
                          ORDER BY d.created_at DESC 
                          LIMIT 10");
    $stmt->execute([$id]);
    $drive['recent_donations'] = $stmt->fetchAll();

    echo json_encode(['success' => true, 'drive' => $drive]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
