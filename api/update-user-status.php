<?php
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (
    $origin === 'http://localhost:5173' ||
    preg_match('/^http:\/\/192\.168\.[0-9]+\.[0-9]+:5173$/', $origin)
) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 86400");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

header("Content-Type: application/json");
session_start();

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$user_id = $data['user_id'] ?? null;
$status = $data['status'] ?? null;

if (!$user_id || !in_array($status, ['approved', 'rejected'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid input']);
    exit;
}

$host = "localhost";
$dbuser = "root";
$dbpass = "";
$dbname = "eligtasmo";
$conn = new mysqli($host, $dbuser, $dbpass, $dbname);

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$stmt = $conn->prepare("UPDATE users SET status = ? WHERE id = ?");
$stmt->bind_param("si", $status, $user_id);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'User status updated']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to update user status']);
}
$stmt->close();
$conn->close();
?> 