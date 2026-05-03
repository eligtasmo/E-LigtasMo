<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
header('Content-Type: application/json');
session_start();

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !is_array($input)) {
        http_response_code(200);
        echo json_encode(['success' => false, 'message' => 'Invalid request payload']);
        exit;
    }

    $email = strtolower(trim((string)($input['email'] ?? '')));
    $code = trim((string)($input['code'] ?? ''));
    $newPassword = trim((string)($input['new_password'] ?? ''));
    $confirmPassword = trim((string)($input['confirm_password'] ?? ''));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $code === '' || $newPassword === '' || $confirmPassword === '') {
        http_response_code(200);
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        exit;
    }

    if (!isset($_SESSION['email_verification'][$email])) {
        http_response_code(200);
        echo json_encode(['success' => false, 'message' => 'No verified reset request found for this email']);
        exit;
    }

    $verification = $_SESSION['email_verification'][$email];
    if (time() > ($verification['expires'] ?? 0)) {
        unset($_SESSION['email_verification'][$email]);
        http_response_code(200);
        echo json_encode(['success' => false, 'message' => 'Verification code expired']);
        exit;
    }

    if (($verification['code'] ?? '') !== $code || ($verification['verified'] ?? false) !== true) {
        http_response_code(200);
        echo json_encode(['success' => false, 'message' => 'Phone verification is incomplete']);
        exit;
    }

    if ($newPassword !== $confirmPassword) {
        http_response_code(200);
        echo json_encode(['success' => false, 'message' => 'Passwords do not match']);
        exit;
    }

    $pwdErrors = [];
    if (strlen($newPassword) < 10) { $pwdErrors[] = 'Password must be at least 10 characters'; }
    if (!preg_match('/[A-Z]/', $newPassword)) { $pwdErrors[] = 'Include at least one uppercase letter'; }
    if (!preg_match('/[a-z]/', $newPassword)) { $pwdErrors[] = 'Include at least one lowercase letter'; }
    if (!preg_match('/\d/', $newPassword)) { $pwdErrors[] = 'Include at least one digit'; }
    if (!preg_match('/[^a-zA-Z0-9]/', $newPassword)) { $pwdErrors[] = 'Include at least one special character'; }
    if (!empty($pwdErrors)) {
        http_response_code(200);
        echo json_encode(['success' => false, 'message' => 'Password does not meet requirements', 'details' => ['password' => $pwdErrors]]);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        http_response_code(200);
        echo json_encode(['success' => false, 'message' => 'Account not found']);
        exit;
    }

    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    $update = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
    $update->execute([$hashedPassword, $user['id']]);

    unset($_SESSION['email_verification'][$email]);

    echo json_encode(['success' => true, 'message' => 'Password reset successfully']);
} catch (Exception $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'message' => 'Unable to reset password right now']);
}
?>
