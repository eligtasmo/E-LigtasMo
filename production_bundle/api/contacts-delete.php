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

    $can_delete = false;
    if ($contact['user_id']) {
        // Private contact: Only owner can delete
        if (intval($session['id']) === intval($contact['user_id'])) {
            $can_delete = true;
        }
    } else {
        // Global/Brgy contact: Check permissions
        if ($session['role'] === 'admin') {
            $can_delete = true;
        } else if ($session['role'] === 'brgy' && $contact['created_brgy'] === $session['brgy_name']) {
            $can_delete = true;
        }
    }

    if (!$can_delete) {
        http_response_code(403);
        echo json_encode(['error' => 'You do not have permission to delete this contact.']);
        exit;
    }

    $stmt = $pdo->prepare('DELETE FROM emergency_contacts WHERE id = ?');
    $stmt->execute([$data['id']]);
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}