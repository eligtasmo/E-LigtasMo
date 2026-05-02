<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

header('Content-Type: application/json');
require_once 'db.php';

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception("Invalid JSON input");
    }
    
    // Validate required fields
    $required_fields = ['path', 'description', 'reportedBy', 'reportedAt', 'type'];
    foreach ($required_fields as $field) {
        if (!isset($input[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }
    
    // Validate path is an array
    if (!is_array($input['path'])) {
        throw new Exception("Path must be an array of coordinates");
    }
    
    // Validate type
    $valid_types = ['flood', 'accident', 'landslide', 'fire', 'other'];
    if (!in_array($input['type'], $valid_types)) {
        throw new Exception("Invalid type. Must be one of: " . implode(', ', $valid_types));
    }
    
    // Prepare SQL statement
    $sql = "INSERT INTO danger_zones (path, description, reported_by, reported_at, type, status) 
            VALUES (:path, :description, :reported_by, :reported_at, :type, 'active')";
    
    $stmt = $pdo->prepare($sql);
    
    // Execute with parameters
    $result = $stmt->execute([
        ':path' => json_encode($input['path']),
        ':description' => $input['description'],
        ':reported_by' => $input['reportedBy'],
        ':reported_at' => $input['reportedAt'],
        ':type' => $input['type']
    ]);
    
    if ($result) {
        $dangerZoneId = $pdo->lastInsertId();
        
        // Fetch the created danger zone
        $stmt = $pdo->prepare("SELECT * FROM danger_zones WHERE id = :id");
        $stmt->execute([':id' => $dangerZoneId]);
        $dangerZone = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Parse JSON path
        if (isset($dangerZone['path'])) {
            $dangerZone['path'] = json_decode($dangerZone['path'], true);
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Danger zone created successfully',
            'id' => $dangerZoneId,
            'dangerZone' => $dangerZone
        ]);
    } else {
        throw new Exception("Failed to insert danger zone");
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>