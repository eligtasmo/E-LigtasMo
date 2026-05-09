<?php require_once 'cors.php'; ?><?php
header('Content-Type: application/json');

require_once 'db.php';

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !isset($data['member_id']) || !isset($data['status'])) {
        throw new Exception('Invalid status update data');
    }
    
    $member_id = $data['member_id'];
    $status = $data['status'];
    $lat = isset($data['latitude']) ? $data['latitude'] : null;
    $lon = isset($data['longitude']) ? $data['longitude'] : null;
    
    $query = "UPDATE family_members SET status = ?, last_checkin = NOW()";
    $params = [$status];
    
    if ($lat && $lon) {
        $query .= ", latitude = ?, longitude = ?";
        $params[] = $lat;
        $params[] = $lon;
    }
    
    $query .= " WHERE id = ?";
    $params[] = $member_id;
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    
    echo json_encode(['success' => true, 'message' => 'Status updated successfully']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
