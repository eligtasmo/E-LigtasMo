<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

try {
    if (!isset($pdo) || !($pdo instanceof PDO)) {
        echo json_encode(['success' => false, 'error' => 'DB_NOT_INITIALIZED']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !is_array($input)) {
        $input = $_POST;
    }

    $email = strtolower(trim((string) ($input['email'] ?? '')));
    $code = trim((string) ($input['code'] ?? ''));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $code === '') {
        echo json_encode(['success' => false, 'error' => 'Missing email or code']);
        exit;
    }

    // Check most recent code
    $stmt = $pdo->prepare("SELECT * FROM verification_codes WHERE email = ? ORDER BY id DESC LIMIT 1");
    $stmt->execute([$email]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$record) {
        echo json_encode(['success' => false, 'error' => 'No verification request found for this email']);
        exit;
    }

    if (time() > (int) ($record['expires_at'] ?? 0)) {
        echo json_encode(['success' => false, 'error' => 'Verification code expired']);
        exit;
    }

    if ((string)$code !== (string)$record['code']) {
        echo json_encode(['success' => false, 'error' => 'Invalid code']);
        exit;
    }

    // Mark as verified in DB for the specific record
    $pdo->prepare("UPDATE verification_codes SET verified = 1 WHERE id = ?")->execute([$record['id']]);

    echo json_encode([
        'success' => true,
        'verified' => true,
        'purpose' => $record['purpose'] ?? 'signup',
    ]);
} catch (Throwable $e) {
    echo json_encode([
        'success' => false,
        'error' => 'System error occurred during verification',
        'debug' => $e->getMessage()
    ]);
}
?>