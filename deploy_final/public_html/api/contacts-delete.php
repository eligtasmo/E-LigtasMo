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
            echo json_encode(['error' => 'You do not have permission to delete this contact. Only global or your own barangay contacts can be managed.']);
            exit;
        }
    }

    $stmt = $pdo->prepare('DELETE FROM emergency_contacts WHERE id = ?');
    $stmt->execute([$data['id']]);
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}