<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) { throw new Exception("Invalid JSON input"); }

    // Required fields
    $required = ['polygon', 'allowedVehicles'];
    foreach ($required as $f) {
        if (!isset($input[$f])) { throw new Exception("Missing required field: $f"); }
    }

    if (!is_array($input['polygon']) || count($input['polygon']) < 3) {
        throw new Exception("Polygon must have at least 3 points");
    }
    if (!is_array($input['allowedVehicles'])) {
        throw new Exception("allowedVehicles must be an array");
    }

    $sql = "INSERT INTO access_polygons (name, barangay, polygon, allowed_vehicles, status, created_by) 
            VALUES (:name, :barangay, :polygon, :allowed_vehicles, :status, :created_by)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':name' => $input['name'] ?? null,
        ':barangay' => $input['barangay'] ?? null,
        ':polygon' => json_encode($input['polygon']),
        ':allowed_vehicles' => json_encode($input['allowedVehicles']),
        ':status' => $input['status'] ?? 'active',
        ':created_by' => $input['createdBy'] ?? null,
    ]);

    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>