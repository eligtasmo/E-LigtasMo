<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/session_boot.php';

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
        // Ensure table exists with correct schema
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
    } catch (PDOException $dbErr) {
        // If it's just a "table already exists" error or similar, we might be fine, 
        // but let's report it if it's something else.
        if (strpos($dbErr->getMessage(), 'already exists') === false) {
             echo json_encode(['success' => false, 'error' => 'Table setup failed: ' . $dbErr->getMessage()]);
             exit;
        }
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

    $subject = 'Verify your E-LigtasMo Account';
    $message = "
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0F172A; color: #F8FAFC; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 40px; }
            .card { background-color: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 40px; text-align: center; }
            .logo { width: 80px; height: 80px; margin-bottom: 20px; }
            h1 { font-size: 24px; font-weight: 700; color: #FFFFFF; margin-bottom: 10px; }
            p { font-size: 16px; color: #94A3B8; line-height: 1.6; margin-bottom: 30px; }
            .otp-container { background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 20px; margin-bottom: 30px; }
            .otp-code { font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #FFFFFF; }
            .footer { text-align: center; font-size: 12px; color: #64748B; margin-top: 40px; }
            .expiry { color: #F43F5E; font-weight: 600; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <img src='https://api.eligtasmo.site/assets/eligtasmo_logo.png' alt='E-LigtasMo' class='logo'>
            </div>
            <div class='card'>
                <h1>Verification Code</h1>
                <p>Please enter the following 6-digit code in the E-LigtasMo app to verify your account.</p>
                
                <div class='otp-container'>
                    <div class='otp-code'>{$code}</div>
                </div>

                <p>This code will expire in <span class='expiry'>5 minutes</span>.</p>
                <p style='font-size: 14px; opacity: 0.7;'>If you did not request this, you can safely ignore this email.</p>
            </div>
            <div class='footer'>
                &copy; " . date('Y') . " E-LigtasMo. All rights reserved.
            </div>
        </div>
    </body>
    </html>";

    require_once __DIR__ . '/mail_helper.php';
    $mailResult = sendMail($email, $subject, $message, true);

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
