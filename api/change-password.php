<?php
require_once "cors.php";
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

header("Content-Type: application/json");
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

// Validate required fields
if (!isset($data['current_password']) || !isset($data['new_password']) || !isset($data['confirm_password'])) {
    echo json_encode(['success' => false, 'message' => 'All password fields are required']);
    exit;
}

// Validate password length
if (strlen($data['new_password']) < 6) {
    echo json_encode(['success' => false, 'message' => 'New password must be at least 6 characters long']);
    exit;
}

// Check if new password matches confirmation
if ($data['new_password'] !== $data['confirm_password']) {
    echo json_encode(['success' => false, 'message' => 'New password and confirmation do not match']);
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

$user_id = $_SESSION['user_id'];

// Get current password hash
$stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();
$stmt->close();

if (!$user) {
    echo json_encode(['success' => false, 'message' => 'User not found']);
    $conn->close();
    exit;
}

// Verify current password
if (!password_verify($data['current_password'], $user['password'])) {
    echo json_encode(['success' => false, 'message' => 'Current password is incorrect']);
    $conn->close();
    exit;
}

// Hash new password
$new_password_hash = password_hash($data['new_password'], PASSWORD_DEFAULT);

// Update password
$stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
$stmt->bind_param("si", $new_password_hash, $user_id);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Password changed successfully']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to change password']);
}

$stmt->close();
$conn->close();
?> 