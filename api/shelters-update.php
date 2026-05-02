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

if (!$data || !isset($data['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing shelter id.']);
    exit;
}

try {
    // Fetch existing shelter to check ownership
    $stmt = $pdo->prepare('SELECT created_brgy FROM shelters WHERE id = ?');
    $stmt->execute([$data['id']]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existing) {
        http_response_code(404);
        echo json_encode(['error' => 'Shelter not found.']);
        exit;
    }

    // Access control: Admin can edit anything. Brgy can only edit their own.
    if ($user['role'] !== 'admin' && $user['brgy_name'] !== $existing['created_brgy']) {
        http_response_code(403);
        echo json_encode(['error' => 'You are only authorized to manage shelters in your own barangay.']);
        exit;
    }

    // Check if photos column exists
    $check = $pdo->query("SHOW COLUMNS FROM shelters LIKE 'photos'");
    if ($check->rowCount() == 0) {
        $pdo->exec("ALTER TABLE shelters ADD COLUMN photos TEXT NULL");
    }

    $photos_json = null;
    if (isset($data['photos']) && is_array($data['photos'])) {
        $saved_paths = [];
        $count = 0;
        foreach ($data['photos'] as $item) {
            if ($count >= 3) break;
            // If already a path (not base64)
            if (strpos($item, 'data:image') === false) {
                $saved_paths[] = $item;
                $count++;
                continue;
            }
            // If base64
            if (preg_match('/^data:image\/(\w+);base64,/', $item, $m)) {
                $ext = $m[1];
                $bin = base64_decode(substr($item, strpos($item, ',') + 1));
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

    $stmt = $pdo->prepare('UPDATE shelters SET name=?, lat=?, lng=?, capacity=?, occupancy=?, status=?, contact_person=?, contact_number=?, address=?, category=?, photos=?, updated_by=?, updated_brgy=?, updated_at=NOW() WHERE id=?');
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
        $user['brgy_name'],
        $data['id']
    ]);
    
    $stmt = $pdo->prepare('SELECT * FROM shelters WHERE id = ?');
    $stmt->execute([$data['id']]);
    $shelter = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode($shelter);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}