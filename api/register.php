<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$raw = file_get_contents("php://input");
file_put_contents('debug_raw.txt', $raw);
$data = json_decode($raw, true);
file_put_contents('debug_register.txt', print_r($data, true));

header("Content-Type: application/json");
session_start();

$required = ['username', 'password', 'full_name', 'brgy_name', 'city', 'province', 'email', 'contact_number'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        echo json_encode(['success' => false, 'message' => "Missing field: $field"]);
        exit;
    }
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

// Check if username or email already exists
$stmt = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
$stmt->bind_param("ss", $data['username'], $data['email']);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows > 0) {
    echo json_encode(['success' => false, 'message' => 'Username or email already exists']);
    exit;
}
$stmt->close();

$hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
$role = 'brgy';
$status = 'pending';

$stmt = $conn->prepare("INSERT INTO users (username, password, full_name, brgy_name, city, province, email, contact_number, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param(
    "ssssssssss",
    $data['username'],
    $hashedPassword,
    $data['full_name'],
    $data['brgy_name'],
    $data['city'],
    $data['province'],
    $data['email'],
    $data['contact_number'],
    $role,
    $status
);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Registration successful! Awaiting admin approval.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Registration failed.']);
}
$stmt->close();
$conn->close();
?> 