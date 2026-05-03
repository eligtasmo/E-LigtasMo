<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/session_boot.php';
header('Content-Type: application/json');

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !is_array($input)) {
        $input = $_POST;
    }

    $email = strtolower(trim((string)($input['email'] ?? '')));
    $purpose = isset($input['purpose']) ? strtolower(trim((string)$input['purpose'])) : 'signup';

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(200);
        echo json_encode(['success' => false, 'error' => 'Invalid email address']);
        exit;
    }

    if ($purpose === 'reset') {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
            http_response_code(200);
            echo json_encode(['success' => false, 'error' => 'No account found for this email address']);
            exit;
        }
    } else if ($purpose === 'signup') {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        if ($stmt->fetch(PDO::FETCH_ASSOC)) {
            http_response_code(200);
            echo json_encode(['success' => false, 'error' => 'This email is already registered. Please sign in instead.']);
            exit;
        }
    }

    $code = strval(random_int(100000, 999999));
    $expiresAt = time() + (5 * 60);

    if (!isset($_SESSION['email_verification'])) {
        $_SESSION['email_verification'] = [];
    }

    $_SESSION['email_verification'][$email] = [
        'code' => $code,
        'expires' => $expiresAt,
        'attempts' => 0,
        'verified' => false,
        'purpose' => $purpose,
    ];

    $subject = 'E-LigtasMo Verification Code';
    $message = "Hello,\n\nYour E-LigtasMo verification code is: {$code}\n\nThis code will expire in 5 minutes.\n\nIf you did not request this, you can ignore this message.";

    require_once __DIR__ . '/mail_helper.php';
    $mailResult = sendMail($email, $subject, $message);

    if (!$mailResult['sent']) {
      http_response_code(500);
      echo json_encode([
          'success' => false,
          'error' => 'Unable to send verification email: ' . $mailResult['error'],
          'purpose' => $purpose,
      ]);
      exit;
    }

    echo json_encode([
        'success' => true,
        'sent' => true,
        'channel' => 'email',
        'purpose' => $purpose,
        'expires_in_sec' => 300,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Unable to process verification request']);
}
?>
