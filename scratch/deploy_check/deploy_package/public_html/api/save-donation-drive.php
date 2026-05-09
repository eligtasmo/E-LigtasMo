<?php
require_once "cors.php";
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

try {
    // Only admins or coordinators can manage donation drives
    checkRole(['Admin', 'Coordinator']);
    
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) throw new Exception('No data provided');
    
    $id = isset($data['id']) ? $data['id'] : null;
    $title = $data['title'];
    $description = $data['description'];
    $target_amount = $data['target_amount'];
    $category = isset($data['category']) ? $data['category'] : 'General';
    $location = isset($data['location']) ? $data['location'] : '';
    $latitude = isset($data['latitude']) ? $data['latitude'] : null;
    $longitude = isset($data['longitude']) ? $data['longitude'] : null;
    $image_url = isset($data['image_url']) ? $data['image_url'] : '';
    $urgent = isset($data['urgent']) ? 1 : 0;
    $status = isset($data['status']) ? $data['status'] : 'Active';
    $end_date = isset($data['end_date']) ? $data['end_date'] : null;
    
    if ($id) {
        // Update existing
        $stmt = $pdo->prepare("UPDATE donation_drives SET 
            title = ?, description = ?, target_amount = ?, category = ?, 
            location = ?, latitude = ?, longitude = ?, image_url = ?, 
            urgent = ?, status = ?, end_date = ? 
            WHERE id = ?");
        $stmt->execute([
            $title, $description, $target_amount, $category, 
            $location, $latitude, $longitude, $image_url, 
            $urgent, $status, $end_date, $id
        ]);
    } else {
        // Create new
        $stmt = $pdo->prepare("INSERT INTO donation_drives 
            (title, description, target_amount, category, location, latitude, longitude, image_url, urgent, status, end_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $title, $description, $target_amount, $category, 
            $location, $latitude, $longitude, $image_url, 
            $urgent, $status, $end_date
        ]);
        $id = $pdo->lastInsertId();
    }

    echo json_encode(['success' => true, 'id' => $id]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
