<?php
// CORS headers to allow cross-origin requests
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Max-Age: 86400"); // 24 hours

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Set content type
header("Content-Type: application/json");

// Database configuration
$host = "localhost";
$dbname = "eligtasmo";
$username = "root";
$password = "";

try {
    // Create database connection
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception("Invalid JSON input");
    }
    
    // Validate required fields
    $required_fields = ['type', 'lat', 'lng', 'address', 'datetime', 'description', 'severity', 'reporter', 'contact'];
    foreach ($required_fields as $field) {
        if (empty($input[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }
    
    // Prepare SQL statement
    $sql = "INSERT INTO incidents (type, lat, lng, address, datetime, description, severity, photo_url, reporter, contact, email, nearest_shelter, status, created_at) 
            VALUES (:type, :lat, :lng, :address, :datetime, :description, :severity, :photo_url, :reporter, :contact, :email, :nearest_shelter, :status, NOW())";
    
    $stmt = $pdo->prepare($sql);
    
    // Execute with parameters
    $result = $stmt->execute([
        ':type' => $input['type'],
        ':lat' => $input['lat'],
        ':lng' => $input['lng'],
        ':address' => $input['address'],
        ':datetime' => $input['datetime'],
        ':description' => $input['description'],
        ':severity' => $input['severity'],
        ':photo_url' => $input['photoUrl'] ?? '',
        ':reporter' => $input['reporter'],
        ':contact' => $input['contact'],
        ':email' => $input['email'] ?? '',
        ':nearest_shelter' => $input['nearestShelter'] ?? '',
        ':status' => 'Pending'
    ]);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'Incident reported successfully',
            'id' => $pdo->lastInsertId()
        ]);
    } else {
        throw new Exception("Failed to insert incident");
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?> 