<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

try {
    // 1. Fetch current contact to check ownership
    $stmt = $pdo->prepare('SELECT user_id, created_brgy FROM emergency_contacts WHERE id = ?');
    $stmt->execute([$data['id']]);
    $contact = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$contact) {
        http_response_code(404);
        echo json_encode(['error' => 'Contact not found.']);
        exit;
    }

    $session = check_session();
    if (!$session) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required.']);
        exit;
    }

    $can_update = false;
    if ($contact['user_id']) {
        // Private contact: Only owner can update
        if (intval($session['id']) === intval($contact['user_id'])) {
            $can_update = true;
        }
    } else {
        // Global/Brgy contact: Check permissions
        if ($session['role'] === 'admin') {
            $can_update = true;
        } else if ($session['role'] === 'brgy' && $contact['created_brgy'] === $session['brgy_name']) {
            $can_update = true;
        }
    }

    if (!$can_update) {
        http_response_code(403);
        echo json_encode(['error' => 'You do not have permission to update this contact.']);
        exit;
    }

    // 2. Build dynamic update query based on provided fields
    $fields = [];
    $values = [];
    $allowed = ['name', 'category', 'number', 'description', 'type', 'priority'];
    foreach ($allowed as $key) {
        if (array_key_exists($key, $data)) {
            $fields[] = "$key = ?";
            $values[] = $data[$key];
        }
    }
    if (empty($fields)) {
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit;
    }
    $values[] = $data['id'];
    $sql = 'UPDATE emergency_contacts SET ' . implode(', ', $fields) . ', updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);

    $stmt = $pdo->prepare('SELECT id, user_id, name, category, number, description, type, priority, created_by, created_brgy, created_at, updated_at FROM emergency_contacts WHERE id = ?');
    $stmt->execute([$data['id']]);
    $contact = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode($contact);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}