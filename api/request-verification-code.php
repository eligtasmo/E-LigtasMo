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

    try {
        file_put_contents('auth_debug.log', date('Y-m-d H:i:s') . " - Attempting to ensure table exists for $email\n", FILE_APPEND);
        // Ensure table exists
        $pdo->exec("CREATE TABLE IF NOT EXISTS verification_codes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            code VARCHAR(10) NOT NULL,
            purpose VARCHAR(50) DEFAULT 'signup',
            expires_at INT NOT NULL,
            verified TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX (email),
            INDEX (code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
        file_put_contents('auth_debug.log', date('Y-m-d H:i:s') . " - Table check/creation complete\n", FILE_APPEND);
    } catch (PDOException $dbErr) {
        file_put_contents('auth_debug.log', date('Y-m-d H:i:s') . " - Table creation error: " . $dbErr->getMessage() . "\n", FILE_APPEND);
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
    $expiresAt = time() + (5 * 60); // 5 minutes

    try {
        file_put_contents('auth_debug.log', date('Y-m-d H:i:s') . " - Saving code $code to DB for $email\n", FILE_APPEND);
        // Save to DB (Primary)
        $stmt = $pdo->prepare("DELETE FROM verification_codes WHERE email = ?");
        $stmt->execute([$email]);
        
        $stmt = $pdo->prepare("INSERT INTO verification_codes (email, code, purpose, expires_at) VALUES (?, ?, ?, ?)");
        $stmt->execute([$email, $code, $purpose, $expiresAt]);
        file_put_contents('auth_debug.log', date('Y-m-d H:i:s') . " - DB Save successful\n", FILE_APPEND);
    } catch (PDOException $e) {
        file_put_contents('auth_debug.log', date('Y-m-d H:i:s') . " - DB Save error: " . $e->getMessage() . "\n", FILE_APPEND);
        http_response_code(200);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
        exit;
    }

    // Save to Session (Backup)
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
      http_response_code(200);
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
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => 'Process error: ' . $e->getMessage()]);
}
?>
