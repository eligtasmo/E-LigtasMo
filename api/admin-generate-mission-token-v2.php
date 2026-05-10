<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/rbac.php';

// Only admins can create invites
require_permission('users.manage');

$raw = file_get_contents("php://input");
$data = json_decode($raw, true) ?? [];

try {
    // Ensure table exists and has correct nullability
    $pdo->exec("CREATE TABLE IF NOT EXISTS registration_invites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(100) UNIQUE NOT NULL,
        first_name VARCHAR(100) NULL,
        last_name VARCHAR(100) NULL,
        email VARCHAR(255) NULL,
        contact_number VARCHAR(20) NULL,
        brgy_name VARCHAR(100) NULL,
        role VARCHAR(20) DEFAULT 'brgy',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        used_at DATETIME DEFAULT NULL
    )");

    // Relax constraints for existing tables
    $pdo->exec("ALTER TABLE registration_invites MODIFY first_name VARCHAR(100) NULL");
    $pdo->exec("ALTER TABLE registration_invites MODIFY last_name VARCHAR(100) NULL");
    $pdo->exec("ALTER TABLE registration_invites MODIFY brgy_name VARCHAR(100) NULL");

    $token = bin2hex(random_bytes(16)); // Secure 32-char token
    $expires_at = date('Y-m-d H:i:s', strtotime('+24 hours'));

    $stmt = $pdo->prepare("INSERT INTO registration_invites (token, first_name, last_name, email, contact_number, brgy_name, role, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $token,
        $data['first_name'] ?? null,
        $data['last_name'] ?? null,
        $data['email'] ?? null,
        $data['contact_number'] ?? null,
        $data['brgy_name'] ?? null,
        $data['role'] ?? 'brgy',
        $expires_at
    ]);

    // Construct the invite link pointing to the frontend domain (hardcoded to eligtasmo.site)
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
    $invite_link = "$protocol://eligtasmo.site/auth/register-official?token=$token";

    echo json_encode([
        'success' => true,
        'token' => $token,
        'invite_link' => $invite_link,
        'version' => '2.2',
        'message' => 'Invite link generated successfully.'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to create invite: ' . $e->getMessage()]);
}
