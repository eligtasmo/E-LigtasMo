<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/session_boot.php';
header('Content-Type: application/json');

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !is_array($input)) {
        $input = $_POST;
    }

    $email = strtolower(trim((string)($input['email'] ?? '')));
    $code = trim((string)($input['code'] ?? ''));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $code === '') {
        http_response_code(200);
        echo json_encode(['success' => false, 'error' => 'Missing email or code']);
        exit;
    }

    // Check DB first (More reliable for mobile)
    $stmt = $pdo->prepare("SELECT * FROM verification_codes WHERE email = ? ORDER BY id DESC LIMIT 1");
    $stmt->execute([$email]);
    $dbRecord = $stmt->fetch(PDO::FETCH_ASSOC);

    // Backup: Check Session
    $sessionRecord = $_SESSION['email_verification'][$email] ?? null;

    $record = $dbRecord ?: $sessionRecord;

    if (!$record) {
        http_response_code(200);
        echo json_encode(['success' => false, 'error' => 'No verification request found for this email']);
        exit;
    }

    if (($record['verified'] ?? false) == 1 || ($record['verified'] ?? false) === true) {
        echo json_encode(['success' => true, 'verified' => true, 'purpose' => $record['purpose'] ?? 'signup']);
        exit;
    }

    if (time() > ($record['expires_at'] ?? $record['expires'] ?? 0)) {
        if ($dbRecord) {
            $stmt = $pdo->prepare("DELETE FROM verification_codes WHERE email = ?");
            $stmt->execute([$email]);
        }
        unset($_SESSION['email_verification'][$email]);
        http_response_code(200);
        echo json_encode(['success' => false, 'error' => 'Verification code expired']);
        exit;
    }

    $actualCode = $record['code'] ?? '';
    if ($code !== $actualCode) {
        http_response_code(200);
        echo json_encode(['success' => false, 'error' => 'Invalid code']);
        exit;
    }

    // Mark as verified in DB
    $stmt = $pdo->prepare("UPDATE verification_codes SET verified = 1 WHERE email = ?");
    $stmt->execute([$email]);

    // Mark as verified in Session
    if (isset($_SESSION['email_verification'][$email])) {
        $_SESSION['email_verification'][$email]['verified'] = true;
    }

    echo json_encode([
        'success' => true,
        'verified' => true,
        'purpose' => $record['purpose'] ?? 'signup',
    ]);
} catch (Exception $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => 'Unable to verify code']);
}
?>
