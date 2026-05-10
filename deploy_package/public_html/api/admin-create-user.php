<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

// Require management permission
require_permission('users.manage');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$username = trim($input['username'] ?? '');
$password = trim($input['password'] ?? '');
$full_name = trim($input['full_name'] ?? '');
$email = trim($input['email'] ?? '');
$contact_number = trim($input['contact_number'] ?? '');
$brgy_name = trim($input['brgy_name'] ?? '');
$role = $input['role'] ?? 'brgy';
$status = 'active'; // Admin created accounts are active by default

if (!$username || !$password || !$full_name || !$email || !$contact_number) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'All fields are required']);
    exit;
}

// Validate email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid email format']);
    exit;
}

// Validate & Standardize Phone Number (Fixed 09 format, 11 digits)
$cleanPhone = preg_replace('/[^0-9]/', '', $contact_number);
if (strlen($cleanPhone) !== 11 || substr($cleanPhone, 0, 2) !== '09') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please enter a valid 11-digit phone number starting with 09']);
    exit;
}
$contact_number = $cleanPhone;

try {
    // Check if user already exists (Check username, email, AND phone)
    $check = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ? OR contact_number = ?");
    $check->execute([$username, $email, $contact_number]);
    if ($check->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Username, Email, or Phone Number already exists']);
        exit;
    }

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    $stmt = $pdo->prepare("INSERT INTO users (username, password, full_name, brgy_name, email, contact_number, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())");
    $ok = $stmt->execute([
        $username,
        $hashedPassword,
        $full_name,
        $brgy_name,
        $email,
        $contact_number,
        $role,
        $status
    ]);

    if ($ok) {
        echo json_encode(['success' => true, 'message' => 'User account created successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to create user account']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
