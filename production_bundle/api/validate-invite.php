<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

$token = $_GET['token'] ?? '';

if (empty($token)) {
    echo json_encode(['success' => false, 'message' => 'Missing token.']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT * FROM registration_invites WHERE token = ? AND used_at IS NULL AND expires_at > NOW()");
    $stmt->execute([$token]);
    $invite = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$invite) {
        echo json_encode(['success' => false, 'message' => 'Invalid, used, or expired invite link.']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'invite' => [
            'first_name' => $invite['first_name'],
            'last_name' => $invite['last_name'],
            'email' => $invite['email'],
            'contact_number' => $invite['contact_number'],
            'brgy_name' => $invite['brgy_name'],
            'role' => $invite['role']
        ]
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Validation error: ' . $e->getMessage()]);
}
