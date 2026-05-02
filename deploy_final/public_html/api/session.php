<?php
// Use shared CORS config to support localhost dev ports
require_once 'cors.php';
require_once 'db.php';
require_once 'tokens.php';
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}
header('Content-Type: application/json');
if (true) {
    $connError = null;
    try {
        $pdo->query('SELECT 1');
    } catch (Exception $e) {
        $connError = $e->getMessage();
    }
if ($connError !== null) {
        echo json_encode(['authenticated' => false]);
        exit;
    }
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $auth = $headers['Authorization'] ?? ($headers['authorization'] ?? '');
    $payload = null;
    $user_id = null;
    if (stripos($auth, 'Bearer ') === 0) {
        $payload = jwt_decode(substr($auth, 7));
        if ($payload) {
            $user_id = (int)$payload['sub'];
        }
    }
    if (!$user_id && isset($_SESSION['user_id'])) {
        $user_id = (int)$_SESSION['user_id'];
    }
    if (!$user_id) {
        echo json_encode(['authenticated' => false]);
        exit;
    }

    $hasPref = false;
    try { $res = $pdo->query("SHOW COLUMNS FROM users LIKE 'preferred_vehicle'"); $hasPref = $res && $res->rowCount() > 0; } catch (Exception $e) { $hasPref = false; }

    if ($hasPref) {
        $stmt = $pdo->prepare("SELECT username, email, full_name, brgy_name, city, province, contact_number, preferred_vehicle FROM users WHERE id = ?");
        $stmt->execute([$user_id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $username = $row['username'] ?? null;
        $email = $row['email'] ?? null;
        $full_name = $row['full_name'] ?? null;
        $brgy_name = $row['brgy_name'] ?? null;
        $city = $row['city'] ?? null;
        $province = $row['province'] ?? null;
        $contact_number = $row['contact_number'] ?? null;
        $preferred_vehicle = $row['preferred_vehicle'] ?? null;
    } else {
        $stmt = $pdo->prepare("SELECT username, email, full_name, brgy_name, city, province, contact_number FROM users WHERE id = ?");
        $stmt->execute([$user_id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $username = $row['username'] ?? null;
        $email = $row['email'] ?? null;
        $full_name = $row['full_name'] ?? null;
        $brgy_name = $row['brgy_name'] ?? null;
        $city = $row['city'] ?? null;
        $province = $row['province'] ?? null;
        $contact_number = $row['contact_number'] ?? null;
        $preferred_vehicle = null;
    }

    $roleOut = ($payload['role'] ?? ($_SESSION['role'] ?? null));
    $roleOut = strtolower((string)$roleOut);
    $valid = ['admin','brgy','resident'];
    if (!in_array($roleOut, $valid, true)) { $roleOut = 'resident'; }
    echo json_encode([
        'authenticated' => true,
        'user_id' => $user_id,
        'role' => $roleOut,
        'username' => $username,
        'email' => $email,
        'full_name' => $full_name,
        'brgy_name' => $brgy_name,
        'city' => $city,
        'province' => $province,
        'contact_number' => $contact_number,
        'preferred_vehicle' => $preferred_vehicle,
        'lat' => $lat,
        'lng' => $lng
    ]);
}
?>
