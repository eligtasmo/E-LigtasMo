<?php
// CORS headers to allow cross-origin requests
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, OPTIONS");
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
    
    // Get query parameters
    $status = $_GET['status'] ?? null;
    $limit = $_GET['limit'] ?? 100;
    
    // Build SQL query
    $sql = "SELECT * FROM incidents";
    $params = [];
    
    if ($status) {
        $sql .= " WHERE LOWER(status) = LOWER(:status)";
        $params[':status'] = $status;
    }
    
    $sql .= " ORDER BY created_at DESC LIMIT " . intval($limit);
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    $incidents = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'incidents' => $incidents,
        'count' => count($incidents)
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?> 