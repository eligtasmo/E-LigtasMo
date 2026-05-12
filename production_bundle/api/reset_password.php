<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
header('Content-Type: application/json');

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

    // Secure DB Check (Bypasses session issues on Hostinger)
    $stmt = $pdo->prepare("SELECT * FROM verification_codes WHERE email = ? AND purpose = 'reset' AND verified = 1 ORDER BY id DESC LIMIT 1");
    $stmt->execute([$email]);
    $verification = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$verification) {
        http_response_code(200);
        echo json_encode(['success' => false, 'message' => 'No verified reset request found for this email']);
        exit;
    }

    if (time() > (int)($verification['expires_at'] ?? 0)) {
        http_response_code(200);
        echo json_encode(['success' => false, 'message' => 'Verification code expired']);
        exit;
    }

    if ($newPassword !== $confirmPassword) {
        http_response_code(200);
        echo json_encode(['success' => false, 'message' => 'Passwords do not match']);
        exit;
    }

    // Optimized User-Friendly Password Policy (Matches register.php)
    $pwdErrors = [];
    if (strlen($newPassword) < 8) { 
        $pwdErrors[] = 'Password must be at least 8 characters'; 
    }
    if (!preg_match('/[A-Za-z]/', $newPassword) || !preg_match('/\d/', $newPassword)) {
        $pwdErrors[] = 'Password must contain both letters and numbers';
    }

    if (!empty($pwdErrors)) {
        http_response_code(200);
        echo json_encode(['success' => false, 'message' => 'Password does not meet requirements.', 'details' => ['password' => $pwdErrors]]);
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

    // Cleanup
    $pdo->prepare("DELETE FROM verification_codes WHERE email = ?")->execute([$email]);

    echo json_encode(['success' => true, 'message' => 'Password reset successfully']);
} catch (Exception $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'message' => 'Unable to reset password right now: ' . $e->getMessage()]);
}
?>
