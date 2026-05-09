<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'auth_helper.php';

$user = get_current_user_data();
if (!$user || !in_array($user['role'], ['admin', 'brgy', 'mmdrmo', 'brgy_chair'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized access.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['name'], $data['lat'], $data['lng'], $data['capacity'], $data['occupancy'], $data['status'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields.']);
    exit;
}

try {
    // Check if photos column exists, if not add it
    $check = $pdo->query("SHOW COLUMNS FROM shelters LIKE 'photos'");
    if ($check->rowCount() == 0) {
        $pdo->exec("ALTER TABLE shelters ADD COLUMN photos TEXT NULL");
    }

    $photos_json = null;
    if (isset($data['photos']) && is_array($data['photos'])) {
        $saved_paths = [];
        $count = 0;
        foreach ($data['photos'] as $base64) {
            if ($count >= 3) break;
            if (preg_match('/^data:image\/(\w+);base64,/', $base64, $m)) {
                $ext = $m[1];
                $bin = base64_decode(substr($base64, strpos($base64, ',') + 1));
                $filename = 'shelter_' . time() . '_' . uniqid() . '.' . $ext;
                $filepath = __DIR__ . '/../uploads/shelters/' . $filename;
                if (!is_dir(__DIR__ . '/../uploads/shelters')) {
                    mkdir(__DIR__ . '/../uploads/shelters', 0777, true);
                }
                file_put_contents($filepath, $bin);
                $saved_paths[] = 'uploads/shelters/' . $filename;
                $count++;
            }
        }
        $photos_json = json_encode($saved_paths);
    }

    $stmt = $pdo->prepare('INSERT INTO shelters (name, lat, lng, capacity, occupancy, status, contact_person, contact_number, address, category, photos, created_by, created_brgy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $data['name'],
        $data['lat'],
        $data['lng'],
        $data['capacity'],
        $data['occupancy'],
        $data['status'],
        $data['contact_person'] ?? null,
        $data['contact_number'] ?? null,
        $data['address'] ?? null,
        $data['category'] ?? null,
        $photos_json,
        $user['full_name'] ?? $user['username'],
        $user['brgy_name']
    ]);
    $id = $pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM shelters WHERE id = ?');
    $stmt->execute([$id]);
    $shelter = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode($shelter);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}