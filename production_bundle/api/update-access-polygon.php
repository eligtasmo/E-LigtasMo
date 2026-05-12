<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !isset($data['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing id']);
    exit;
}

try {
    $updateFields = [];
    $updateValues = [];

    $fieldMap = [
        'name' => 'name',
        'barangay' => 'barangay',
        'polygon' => 'polygon',
        'allowedVehicles' => 'allowed_vehicles',
        'status' => 'status',
    ];

    foreach ($fieldMap as $frontend => $dbField) {
        if (isset($data[$frontend])) {
            $updateFields[] = "$dbField = ?";
            $val = $dbField === 'polygon' || $dbField === 'allowed_vehicles' ? json_encode($data[$frontend]) : $data[$frontend];
            $updateValues[] = $val;
        }
    }

    if (empty($updateFields)) {
        http_response_code(400);
        echo json_encode(['error' => 'No valid fields to update']);
        exit;
    }

    $updateFields[] = "updated_at = CURRENT_TIMESTAMP";
    $updateValues[] = $data['id'];

    $sql = "UPDATE access_polygons SET " . implode(', ', $updateFields) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($updateValues);

    $stmt = $pdo->prepare('SELECT * FROM access_polygons WHERE id = ?');
    $stmt->execute([$data['id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        $row['polygon'] = isset($row['polygon']) ? json_decode($row['polygon'], true) : null;
        $row['allowedVehicles'] = isset($row['allowed_vehicles']) ? json_decode($row['allowed_vehicles'], true) : [];
        unset($row['allowed_vehicles']);
    }

    echo json_encode($row);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>