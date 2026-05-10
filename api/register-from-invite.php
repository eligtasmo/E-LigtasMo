<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!$data || empty($data['token']) || empty($data['username']) || empty($data['password'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing token, username, or password.']);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1. Validate invite again
    $stmt = $pdo->prepare("SELECT * FROM registration_invites WHERE token = ? AND used_at IS NULL AND expires_at > NOW() FOR UPDATE");
    $stmt->execute([$data['token']]);
    $invite = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$invite) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Invalid or expired invite.']);
        exit;
    }

    $check = $pdo->prepare("SELECT id, role FROM users WHERE username = ? OR email = ? OR contact_number = ?");
    $check->execute([$data['username'], $data['email'] ?? '', $data['contact_number'] ?? '']);
    if ($existing = $check->fetch(PDO::FETCH_ASSOC)) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Username, email, or contact number is already registered.']);
        exit;
    }

    $contact = $invite['contact_number'] ?? ($data['contact_number'] ?? '');
    $cleanPhone = preg_replace('/[^0-9]/', '', $contact);
    if (strlen($cleanPhone) !== 11 || substr($cleanPhone, 0, 2) !== '09') {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Please enter a valid 11-digit phone number starting with 09.']);
        exit;
    }
    $contact = $cleanPhone;

    // 3. Resolve identity and jurisdiction
    $firstName = $invite['first_name'] ?? ($data['first_name'] ?? '');
    $lastName = $invite['last_name'] ?? ($data['last_name'] ?? '');
    $email = $invite['email'] ?? ($data['email'] ?? '');
    $contact = $invite['contact_number'] ?? ($data['contact_number'] ?? '');
    $brgyName = $invite['brgy_name'] ?? ($data['brgy_name'] ?? '');

    if (empty($firstName) || empty($lastName) || empty($brgyName)) {
        $pdo->rollBack();
        echo json_encode([
            'success' => false, 
            'version' => '2.2',
            'message' => 'Deployment failure: Missing mission credentials (First Name, Last Name, or Barangay).'
        ]);
        exit;
    }

    if (!preg_match('/^[A-Za-z\s]+$/', $firstName) || (!empty($lastName) && !preg_match('/^[A-Za-z\s]+$/', $lastName))) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Name must only contain letters and spaces.']);
        exit;
    }

    $fullName = trim("$firstName $lastName");
    $hashed = password_hash($data['password'], PASSWORD_DEFAULT);
    
    $stmt = $pdo->prepare("INSERT INTO users (username, password, full_name, brgy_name, email, contact_number, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', NOW())");
    $stmt->execute([
        $data['username'],
        $hashed,
        $fullName,
        $brgyName,
        $email,
        $contact,
        $invite['role'],
    ]);

    // 4. Mark invite as used
    $stmt = $pdo->prepare("UPDATE registration_invites SET used_at = NOW() WHERE id = ?");
    $stmt->execute([$invite['id']]);

    $pdo->commit();
    echo json_encode([
        'success' => true, 
        'version' => '2.3',
        'message' => 'Mission account active! You can now sign in with your credentials.'
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()]);
}
