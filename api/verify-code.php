<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
header('Content-Type: application/json');

try {
    // Safety check — ensures $pdo is valid before proceeding
    if (!isset($pdo) || !($pdo instanceof PDO)) {
        echo json_encode(['success' => false, 'error' => 'DB_NOT_INITIALIZED']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !is_array($input)) {
        $input = $_POST;
    }

    $email = strtolower(trim((string)($input['email'] ?? '')));
    $code = trim((string)($input['code'] ?? ''));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $code === '') {
        echo json_encode(['success' => false, 'error' => 'Missing email or code']);
        exit;
    }

    // Auto-create table if missing on production
    $pdo->exec("CREATE TABLE IF NOT EXISTS verification_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(10) NOT NULL,
        purpose VARCHAR(50) DEFAULT 'signup',
        expires_at INT NOT NULL,
        verified TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $stmt = $pdo->prepare("SELECT * FROM verification_codes WHERE email = ? ORDER BY id DESC LIMIT 1");
    $stmt->execute([$email]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$record) {
        echo json_encode(['success' => false, 'error' => 'No verification request found for this email']);
        exit;
    }

    if ((int)($record['verified'] ?? 0) === 1) {
        echo json_encode(['success' => true, 'verified' => true, 'purpose' => $record['purpose'] ?? 'signup']);
        exit;
    }

    if (time() > (int)($record['expires_at'] ?? 0)) {
        $pdo->prepare("DELETE FROM verification_codes WHERE email = ?")->execute([$email]);
        echo json_encode(['success' => false, 'error' => 'Verification code expired']);
        exit;
    }

    $actualCode = (string)($record['code'] ?? '');
    $submittedCode = (string)$code;

    if ($submittedCode !== $actualCode) {
        echo json_encode(['success' => false, 'error' => 'Invalid code']);
        exit;
    }

    $pdo->prepare("UPDATE verification_codes SET verified = 1 WHERE email = ?")->execute([$email]);

    echo json_encode([
        'success' => true,
        'verified' => true,
        'purpose' => $record['purpose'] ?? 'signup',
    ]);
} catch (Throwable $e) {
    echo json_encode([
        'success' => false,
        'error' => 'EXCEPTION: ' . $e->getMessage(),
        'at_line' => $e->getLine(),
        'in_file' => basename($e->getFile()),
    ]);
}
?>
