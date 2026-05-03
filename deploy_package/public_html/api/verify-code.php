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

    if (!isset($_SESSION['email_verification'][$email])) {
        http_response_code(200);
        echo json_encode(['success' => false, 'error' => 'No verification request found for this email']);
        exit;
    }

    $record = $_SESSION['email_verification'][$email];
    if (($record['verified'] ?? false) === true) {
        echo json_encode(['success' => true, 'verified' => true, 'purpose' => $record['purpose'] ?? 'signup']);
        exit;
    }

    if (time() > ($record['expires'] ?? 0)) {
        unset($_SESSION['email_verification'][$email]);
        http_response_code(200);
        echo json_encode(['success' => false, 'error' => 'Verification code expired']);
        exit;
    }

    $_SESSION['email_verification'][$email]['attempts'] = ($record['attempts'] ?? 0) + 1;
    if ($code !== ($record['code'] ?? '')) {
        http_response_code(200);
        echo json_encode(['success' => false, 'error' => 'Invalid code']);
        exit;
    }

    $_SESSION['email_verification'][$email]['verified'] = true;

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
