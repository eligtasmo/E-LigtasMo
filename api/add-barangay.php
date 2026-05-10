<?php
require_once 'cors.php';
header("Content-Type: application/json");
require_once 'db.php';
require_once 'auth_helper.php';

$user = get_current_user_data();
if (!$user || !in_array($user['role'], ['admin', 'mmdrmo', 'brgy', 'brgy_chair'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Insufficient permissions to register assets.']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !isset($input['name']) || !isset($input['lat']) || !isset($input['lng'])) {
        throw new Exception("Missing required fields");
    }
    
    $sql = "INSERT INTO barangays (name, lat, lng, address, contact, type, added_by, added_at) VALUES (:name, :lat, :lng, :address, :contact, :type, :added_by, NOW())";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':name' => $input['name'],
        ':lat' => $input['lat'],
        ':lng' => $input['lng'],
        ':address' => $input['address'] ?? 'Santa Cruz, Laguna',
        ':contact' => $input['contact'] ?? '',
        ':type' => $input['type'] ?? 'Hall',
        ':added_by' => $user['full_name'] ?? $user['username'],
    ]);
    $barangayId = $pdo->lastInsertId();

    $brgyName = trim($input['name']);
    if ($brgyName !== '') {
        $slug = strtolower(preg_replace('/[^a-z0-9]+/', '', $brgyName));
        if ($slug === '') {
            $slug = 'barangay' . (int)$barangayId;
        }
        $username = 'brgy_' . $slug;
        $email = $username . '@example.com';
        $contact = isset($input['contact']) ? (string)$input['contact'] : '';

        try {
            $checkStmt = $pdo->prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR (brgy_name = ? AND role = 'brgy')");
            $checkStmt->execute([$username, $brgyName]);
            $exists = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$exists) {
                $password = password_hash('Password123!', PASSWORD_DEFAULT);
                $fullName = 'Barangay ' . $brgyName . ' Account';
                $insertUser = $pdo->prepare("INSERT INTO users (username, password, full_name, brgy_name, city, province, email, contact_number, role, status) VALUES (?, ?, ?, ?, '', '', ?, ?, 'brgy', 'active')");
                $insertUser->execute([$username, $password, $fullName, $brgyName, $email, $contact]);
            }
        } catch (Exception $e) {
        }
    }

    echo json_encode(['success' => true, 'id' => $barangayId]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
