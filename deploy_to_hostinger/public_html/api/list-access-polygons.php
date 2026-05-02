<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';

try {
    // Ensure table exists
    $pdo->exec("CREATE TABLE IF NOT EXISTS access_polygons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NULL,
        barangay VARCHAR(255) NULL,
        polygon TEXT NULL,
        allowed_vehicles TEXT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        created_by VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $status = $_GET['status'] ?? null; // e.g., 'active' or 'inactive'
    $barangay = $_GET['barangay'] ?? null;

    $sql = "SELECT * FROM access_polygons";
    $where = [];
    $params = [];

    if ($status) {
        $where[] = "LOWER(status) = LOWER(:status)";
        $params[':status'] = $status;
    }
    if ($barangay) {
        $where[] = "LOWER(barangay) = LOWER(:barangay)";
        $params[':barangay'] = $barangay;
    }
    if (!empty($where)) {
        $sql .= " WHERE " . implode(' AND ', $where);
    }
    // Order by id to avoid relying on potentially missing created_at
    $sql .= " ORDER BY id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $polygons = [];
    foreach ($rows as $row) {
        // Decode JSON fields safely
        $polygon = [];
        if (isset($row['polygon'])) {
            $decoded = json_decode($row['polygon'], true);
            if (is_array($decoded)) { $polygon = $decoded; }
        }

        $allowedVehicles = [];
        if (isset($row['allowed_vehicles'])) {
            $decoded = json_decode($row['allowed_vehicles'], true);
            if (is_array($decoded)) { $allowedVehicles = $decoded; }
        }

        $polygons[] = [
            'id' => isset($row['id']) ? (int)$row['id'] : null,
            'name' => $row['name'] ?? null,
            'barangay' => $row['barangay'] ?? null,
            'polygon' => $polygon,
            'allowedVehicles' => $allowedVehicles,
            'status' => $row['status'] ?? 'active',
        ];
    }

    echo json_encode(['success' => true, 'polygons' => $polygons]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>