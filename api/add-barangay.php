<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Max-Age: 86400");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
header("Content-Type: application/json");

$host = "localhost";
$dbname = "eligtasmo";
$username = "root";
$password = "";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !isset($input['name']) || !isset($input['lat']) || !isset($input['lng']) || !isset($input['address'])) {
        throw new Exception("Missing required fields");
    }
    $sql = "INSERT INTO barangays (name, lat, lng, address, contact, type, added_by, added_at) VALUES (:name, :lat, :lng, :address, :contact, :type, :added_by, NOW())";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':name' => $input['name'],
        ':lat' => $input['lat'],
        ':lng' => $input['lng'],
        ':address' => $input['address'],
        ':contact' => $input['contact'] ?? '',
        ':type' => $input['type'] ?? 'Hall',
        ':added_by' => $input['added_by'] ?? '',
    ]);
    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?> 