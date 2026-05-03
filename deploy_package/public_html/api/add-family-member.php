<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once 'db.php';

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !isset($data['group_id']) || !isset($data['name'])) {
        throw new Exception('Invalid member data');
    }
    
    $group_id = $data['group_id'];
    $name = $data['name'];
    $relationship = isset($data['relationship']) ? $data['relationship'] : '';
    $contact = isset($data['contact_number']) ? $data['contact_number'] : '';
    $profile_image = isset($data['profile_image']) ? $data['profile_image'] : 'https://i.pravatar.cc/150?u=' . urlencode($name);
    
    $stmt = $pdo->prepare("INSERT INTO family_members (group_id, name, relationship, contact_number, profile_image) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$group_id, $name, $relationship, $contact, $profile_image]);
    
    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
