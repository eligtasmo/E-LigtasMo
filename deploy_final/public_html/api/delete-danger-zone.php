<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

header('Content-Type: application/json');
require_once 'db.php';

try {
    // Get the danger zone ID from URL parameter or JSON input
    $dangerZoneId = null;
    
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        // For DELETE requests, get ID from URL parameter
        $dangerZoneId = $_GET['id'] ?? null;
    } else {
        // For POST requests, get ID from JSON input
        $input = json_decode(file_get_contents('php://input'), true);
        $dangerZoneId = $input['id'] ?? null;
    }
    
    if (!$dangerZoneId) {
        throw new Exception("Danger zone ID is required");
    }
    
    // Check if danger zone exists
    $stmt = $pdo->prepare("SELECT id FROM danger_zones WHERE id = :id");
    $stmt->execute([':id' => $dangerZoneId]);
    
    if (!$stmt->fetch()) {
        throw new Exception("Danger zone not found");
    }
    
    // Delete the danger zone
    $stmt = $pdo->prepare("DELETE FROM danger_zones WHERE id = :id");
    $result = $stmt->execute([':id' => $dangerZoneId]);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'Danger zone deleted successfully'
        ]);
    } else {
        throw new Exception("Failed to delete danger zone");
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>