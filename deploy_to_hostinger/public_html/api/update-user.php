<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

header("Content-Type: application/json");
require_once 'cors.php';
require_once 'db.php';
require_once 'tokens.php';
require_once 'session_boot.php';

// Debug Logging
function log_debug($message) {
    $logFile = __DIR__ . '/debug_update_profile.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

log_debug("--- New Request ---");

// Check if user is logged in
$user_id = null;
if (isset($_SESSION['user_id'])) {
    $user_id = $_SESSION['user_id'];
    log_debug("User ID from Session: $user_id");
} else {
    // Check Authorization header
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        $payload = jwt_decode($token);
        if ($payload && isset($payload['sub'])) {
            $user_id = $payload['sub'];
            log_debug("User ID from Token: $user_id");
        } else {
            log_debug("Invalid or expired token payload");
        }
    } else {
        log_debug("No Authorization header found");
    }
}

if (!$user_id) {
    log_debug("Unauthorized access attempt");
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$raw_input = file_get_contents("php://input");
log_debug("Raw Input: $raw_input");
$data = json_decode($raw_input, true);

// Validate required fields
// We can make some fields optional if we want partial updates, but let's stick to required for now
// or maybe check what's provided.
// The mobile app sends: username, full_name, email, contact_number, brgy_name, city, province, gender

$required_fields = ['username', 'full_name', 'email', 'contact_number', 'brgy_name', 'city', 'province', 'gender'];
foreach ($required_fields as $field) {
    if (!isset($data[$field]) || empty(trim($data[$field]))) {
        echo json_encode(['success' => false, 'message' => "Field '$field' is required"]);
        exit;
    }
}

// Validate & Standardize Phone Number (Fixed 09 format, 11 digits)
$rawPhone = trim($data['contact_number']);
$cleanPhone = preg_replace('/[^0-9]/', '', $rawPhone);
if (strlen($cleanPhone) !== 11 || substr($cleanPhone, 0, 2) !== '09') {
    echo json_encode(['success' => false, 'message' => 'Please enter a valid 11-digit phone number starting with 09.']);
    exit;
}
$data['contact_number'] = $cleanPhone;

// Validate email format
if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Invalid email format']);
    exit;
}

// Check if email is already taken by another user
// Using $pdo from db.php
$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
$stmt->execute([$data['email'], $user_id]);
if ($stmt->fetch()) {
    log_debug("Email already taken: " . $data['email']);
    echo json_encode(['success' => false, 'message' => 'Email is already taken by another user']);
    exit;
}

// Check if username is already taken by another user
$stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
$stmt->execute([$data['username'], $user_id]);
if ($stmt->fetch()) {
    log_debug("Username already taken: " . $data['username']);
    echo json_encode(['success' => false, 'message' => 'Username is already taken by another user']);
    exit;
}

// Check if phone number is already taken by another user
$stmt = $pdo->prepare("SELECT id FROM users WHERE contact_number = ? AND id != ?");
$stmt->execute([$data['contact_number'], $user_id]);
if ($stmt->fetch()) {
    log_debug("Phone number already taken: " . $data['contact_number']);
    echo json_encode(['success' => false, 'message' => 'Phone number is already registered to another account']);
    exit;
}

// Update user information
try {
    $stmt = $pdo->prepare("UPDATE users SET username = ?, full_name = ?, email = ?, contact_number = ?, brgy_name = ?, city = ?, province = ?, gender = ? WHERE id = ?");
    $result = $stmt->execute([
        $data['username'],
        $data['full_name'],
        $data['email'],
        $data['contact_number'],
        $data['brgy_name'],
        $data['city'],
        $data['province'],
        $data['gender'],
        $user_id
    ]);
    
    if ($result) {
        log_debug("Update successful for User ID $user_id");
        // Fetch updated user data to return
        $stmt = $pdo->prepare("SELECT id, username, role, full_name, brgy_name, contact_number, email, city, province, gender, preferred_vehicle FROM users WHERE id = ?");
        $stmt->execute([$user_id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'message' => 'Profile updated successfully', 'user' => $user]);
    } else {
        log_debug("Update returned false");
        echo json_encode(['success' => false, 'message' => 'Failed to update profile']);
    }
} catch (PDOException $e) {
    log_debug("Database Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
}
?> 