<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

$data = json_decode(file_get_contents('php://input'), true);

$user_id = isset($data['user_id']) ? intval($data['user_id']) : null;

// Permission check
if ($user_id) {
    // For private contacts, user must be logged in as themselves
    $session = check_session();
    if (!$session || intval($session['id']) !== $user_id) {
        http_response_code(403);
        echo json_encode(['error' => 'Permission denied. You can only manage your own contacts.']);
        exit;
    }
} else {
    // For global/brgy contacts, require manage permission
    require_permission('contacts.manage');
}

if (!$data || !isset($data['category']) || !isset($data['number'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields: category and number.']);
    exit;
}

try {
    ensure_contacts_table($pdo);
    $stmt = $pdo->prepare('INSERT INTO emergency_contacts (user_id, name, category, number, description, type, priority, created_by, created_brgy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $user_id,
        $data['name'] ?? null,
        $data['category'],
        $data['number'],
        $data['description'] ?? null,
        $data['type'] ?? null,
        $data['priority'] ?? null,
        $data['created_by'] ?? null,
        $data['created_brgy'] ?? null
    ]);
    $id = $pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT id, user_id, name, category, number, description, type, priority, created_by, created_brgy, created_at, updated_at FROM emergency_contacts WHERE id = ?');
    $stmt->execute([$id]);
    $contact = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode($contact);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}