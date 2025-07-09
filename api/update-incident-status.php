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
    if (!$input || !isset($input['id']) || !isset($input['status'])) {
        throw new Exception("Missing id or status");
    }

    $fields = [
        'status' => $input['status'],
        'reviewed_at' => date('Y-m-d H:i:s'),
    ];
    if (isset($input['rejectionReason'])) {
        $fields['rejection_reason'] = $input['rejectionReason'];
    }

    $set = [];
    foreach ($fields as $key => $val) {
        $set[] = "$key = :$key";
    }
    $setStr = implode(', ', $set);

    $stmt = $pdo->prepare("UPDATE incidents SET $setStr WHERE id = :id");
    $fields['id'] = $input['id'];
    $stmt->execute($fields);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?> 