<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

// Only admin/brgy should manage contacts
require_permission('contacts.manage');

// Ensure emergency_contacts table exists
function ensure_contacts_table($pdo) {
    $sql = "CREATE TABLE IF NOT EXISTS emergency_contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        number VARCHAR(50) NOT NULL,
        description VARCHAR(255) NULL,
        type VARCHAR(50) NULL,
        priority VARCHAR(20) NULL,
        created_by VARCHAR(100) NULL,
        created_brgy VARCHAR(100) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    $pdo->exec($sql);
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['category']) || !isset($data['number'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields: category and number.']);
    exit;
}

try {
    ensure_contacts_table($pdo);
    $stmt = $pdo->prepare('INSERT INTO emergency_contacts (category, number, description, type, priority, created_by, created_brgy) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $data['category'],
        $data['number'],
        $data['description'] ?? null,
        $data['type'] ?? null,
        $data['priority'] ?? null,
        $data['created_by'] ?? null,
        $data['created_brgy'] ?? null
    ]);
    $id = $pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT id, category, number, description, type, priority, created_by, created_brgy, created_at, updated_at FROM emergency_contacts WHERE id = ?');
    $stmt->execute([$id]);
    $contact = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode($contact);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}