<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'auth_helper.php';

try {
    $user = get_current_user_data();
    // Allow guests to view shelters
    $role = $user ? strtolower($user['role']) : 'guest';
    $userBrgy = $user['brgy_name'] ?? null;
    $username = $user['username'] ?? null;
    $fullName = $user['full_name'] ?? null;


    $query = "SELECT * FROM shelters";
    $params = [];

    if ($role === 'brgy' || $role === 'brgy_chair') {
        $query .= " WHERE (LOWER(TRIM(created_brgy)) = LOWER(TRIM(?)) OR LOWER(TRIM(created_by)) = LOWER(TRIM(?)) OR LOWER(TRIM(created_by)) = LOWER(TRIM(?)))";
        $params[] = $userBrgy ?: '';
        $params[] = $username ?: '';
        $params[] = $fullName ?: '';
    } elseif ($role === 'admin' || $role === 'mmdrmo') {
        if (isset($_GET['barangay']) && $_GET['barangay'] !== '') {
            $query .= " WHERE LOWER(TRIM(created_brgy)) = LOWER(TRIM(?))";
            $params[] = $_GET['barangay'];
        }
    }

    $query .= " ORDER BY id DESC";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $shelters = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Decode photos JSON for frontend
    foreach ($shelters as &$s) {
        if (isset($s['photos']) && $s['photos']) {
            $s['photos'] = json_decode($s['photos'], true);
        } else {
            $s['photos'] = [];
        }
    }
    
    echo json_encode($shelters);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}