<?php
require_once 'cors.php';
header("Content-Type: application/json");
require_once 'rbac.php';
session_start();

// Ensure user has permission to manage users (Admin)
require_permission('users.manage');

$data = json_decode(file_get_contents("php://input"), true);

// Validate required fields
if (!isset($data['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'User ID is required']);
    exit;
}

$user_id = (int)$data['user_id'];

// Connect to DB
$host = "localhost";
$dbuser = "root";
$dbpass = "";
$dbname = "eligtasmo";
$conn = new mysqli($host, $dbuser, $dbpass, $dbname);

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

// Check if email is taken by another user (if email is being updated)
if (isset($data['email']) && !empty($data['email'])) {
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
    $stmt->bind_param("si", $data['email'], $user_id);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'Email is already taken by another user']);
        exit;
    }
    $stmt->close();
}

// Build Update Query dynamically
$fields = [];
$types = "";
$params = [];

if (isset($data['full_name'])) { $fields[] = "full_name=?"; $types .= "s"; $params[] = $data['full_name']; }
if (isset($data['email'])) { $fields[] = "email=?"; $types .= "s"; $params[] = $data['email']; }
if (isset($data['contact_number'])) { $fields[] = "contact_number=?"; $types .= "s"; $params[] = $data['contact_number']; }
if (isset($data['brgy_name'])) { $fields[] = "brgy_name=?"; $types .= "s"; $params[] = $data['brgy_name']; }
if (isset($data['city'])) { $fields[] = "city=?"; $types .= "s"; $params[] = $data['city']; }
if (isset($data['province'])) { $fields[] = "province=?"; $types .= "s"; $params[] = $data['province']; }
if (isset($data['role'])) { $fields[] = "role=?"; $types .= "s"; $params[] = $data['role']; }
if (isset($data['status'])) { $fields[] = "status=?"; $types .= "s"; $params[] = $data['status']; }

if (empty($fields)) {
    echo json_encode(['success' => false, 'message' => 'No fields to update']);
    exit;
}

$sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id=?";
$types .= "i";
$params[] = $user_id;

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'User updated successfully']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to update user']);
}

$stmt->close();
$conn->close();
?>
