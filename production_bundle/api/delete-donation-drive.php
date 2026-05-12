<?php
require_once "cors.php";
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

try {
    // Only admins can delete donation drives
    checkRole(['Admin']);
    
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['id'])) throw new Exception('No ID provided');
    
    $id = $data['id'];
    
    $stmt = $pdo->prepare("DELETE FROM donation_drives WHERE id = ?");
    $stmt->execute([$id]);
    
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
