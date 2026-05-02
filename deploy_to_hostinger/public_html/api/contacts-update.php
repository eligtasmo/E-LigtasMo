<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

// Only admin/brgy should manage contacts
require_permission('contacts.manage');

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing contact id.']);
    exit;
}

try {
    // Ownership check for non-admins
    if ($_SESSION['role'] !== 'admin') {
        $stmt = $pdo->prepare('SELECT created_brgy FROM emergency_contacts WHERE id = ?');
        $stmt->execute([$data['id']]);
        $contact = $stmt->fetch();
        
        if (!$contact) {
            http_response_code(404);
            echo json_encode(['error' => 'Contact not found.']);
            exit;
        }

        if ($contact['created_brgy'] !== $_SESSION['brgy_name']) {
            http_response_code(403);
            echo json_encode(['error' => 'You do not have permission to update this contact.']);
            exit;
        }
    }

    // Build dynamic update query based on provided fields
    $fields = [];
    $values = [];
    $allowed = ['category', 'number', 'description', 'type', 'priority'];
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

    $stmt = $pdo->prepare('SELECT id, category, number, description, type, priority, created_by, created_brgy, created_at, updated_at FROM emergency_contacts WHERE id = ?');
    $stmt->execute([$data['id']]);
    $contact = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode($contact);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}