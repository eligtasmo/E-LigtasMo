<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');
require_once 'db.php';

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !isset($data['drive_id']) || !isset($data['amount'])) {
        throw new Exception('Invalid donation data');
    }
    
    $drive_id = $data['drive_id'];
    $user_id = isset($data['user_id']) ? $data['user_id'] : null;
    $amount = $data['amount'];
    $payment_method = isset($data['payment_method']) ? $data['payment_method'] : 'Other';
    $message = isset($data['message']) ? $data['message'] : '';
    
    $pdo->beginTransaction();
    
    // 1. Record the donation
    $stmt = $pdo->prepare("INSERT INTO donations (drive_id, user_id, amount, payment_method, message) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$drive_id, $user_id, $amount, $payment_method, $message]);
    
    // 2. Update the drive's current amount
    $stmt = $pdo->prepare("UPDATE donation_drives SET current_amount = current_amount + ? WHERE id = ?");
    $stmt->execute([$amount, $drive_id]);
    
    $pdo->commit();
    
    echo json_encode(['success' => true, 'message' => 'Donation submitted successfully']);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
