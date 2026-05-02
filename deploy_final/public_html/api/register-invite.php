<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/session_boot.php';
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ERROR | E_PARSE);

header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);
if (!$data || !is_array($data)) {
    $data = $_POST;
}

$invite_code = isset($data['invite_code']) ? trim($data['invite_code']) : '';
if (empty($invite_code)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invite code is required']);
    exit;
}

// Verify Invite Code
try {
    $stmt = $pdo->prepare("SELECT * FROM invites WHERE code = ? AND used_at IS NULL AND expires_at > NOW()");
    $stmt->execute([$invite_code]);
    $invite = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$invite) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid or expired invite code']);
        exit;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error']);
    exit;
}

$role = $invite['role'] ?: 'brgy';

// Proceed with Registration Logic (similar to register.php)
$data['username'] = isset($data['username']) ? trim($data['username']) : '';
$data['password'] = isset($data['password']) ? trim($data['password']) : '';
$data['full_name'] = isset($data['full_name']) ? trim($data['full_name']) : '';
$data['contact_number'] = isset($data['contact_number']) ? trim($data['contact_number']) : '';
$emailRaw = isset($data['email']) ? trim($data['email']) : '';

// Validation
if (empty($data['username']) || empty($data['password']) || empty($data['full_name'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit;
}

// Check if user exists
$stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
$stmt->execute([$data['username'], $data['email']]);
if ($stmt->fetch()) {
    echo json_encode(['success' => false, 'message' => 'Username or email already exists']);
    exit;
}

// Create User
$hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
$status = 'active'; // Officials are active immediately if they have a code? Or 'pending'? Let's say active for now as the code acts as verification.

try {
    $pdo->beginTransaction();

    // Insert User
    $stmt = $pdo->prepare("INSERT INTO users (username, password, full_name, brgy_name, city, province, email, contact_number, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $ok = $stmt->execute([
        $data['username'],
        $hashedPassword,
        $data['full_name'],
        $data['brgy_name'] ?? '',
        $data['city'] ?? '',
        $data['province'] ?? '',
        $data['email'] ?? '',
        $data['contact_number'],
        $role,
        $status
    ]);

    if ($ok) {
        // Mark invite as used
        $userId = $pdo->lastInsertId();
        $updateInvite = $pdo->prepare("UPDATE invites SET used_at = NOW(), used_by = ? WHERE id = ?");
        $updateInvite->execute([$userId, $invite['id']]);

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Official registration successful!', 'role' => $role]);
    } else {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Registration failed.']);
    }
} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()]);
}
?>
