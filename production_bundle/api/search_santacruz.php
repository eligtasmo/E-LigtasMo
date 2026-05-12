<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
header("Content-Type: application/json");
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);
if (!$data || !is_array($data)) { $data = $_GET; }
$q = isset($data['q']) ? trim($data['q']) : '';
$type = isset($data['type']) ? strtolower(trim($data['type'])) : 'users';
$limit = isset($data['limit']) ? max(1, (int)$data['limit']) : 20;
$offset = isset($data['offset']) ? max(0, (int)$data['offset']) : 0;
$resp = ['success' => true, 'items' => []];
try { $pdo->query('SELECT 1'); } catch (Exception $e) { echo json_encode(['success' => false, 'message' => 'Database connection failed']); exit; }
if ($q === '') { echo json_encode($resp); exit; }
$pattern = '%' . $q . '%';
$city = 'santa cruz';
$province = 'laguna';
try {
    if ($type === 'users') {
        $sql = "SELECT id, username, full_name, brgy_name, city, province, email, contact_number FROM users WHERE LOWER(city)=? AND LOWER(province)=? AND (username LIKE ? OR full_name LIKE ? OR email LIKE ? OR contact_number LIKE ? OR brgy_name LIKE ?) ORDER BY full_name LIMIT :limit OFFSET :offset";
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(1, $city, PDO::PARAM_STR);
        $stmt->bindValue(2, $province, PDO::PARAM_STR);
        $stmt->bindValue(3, $pattern, PDO::PARAM_STR);
        $stmt->bindValue(4, $pattern, PDO::PARAM_STR);
        $stmt->bindValue(5, $pattern, PDO::PARAM_STR);
        $stmt->bindValue(6, $pattern, PDO::PARAM_STR);
        $stmt->bindValue(7, $pattern, PDO::PARAM_STR);
        $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
        $stmt->execute();
        $resp['items'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } elseif ($type === 'shelters') {
        $sql = "SELECT id, name, location, city, province FROM shelters WHERE LOWER(city)=? AND LOWER(province)=? AND (name LIKE ? OR location LIKE ?) ORDER BY name LIMIT :limit OFFSET :offset";
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(1, $city, PDO::PARAM_STR);
        $stmt->bindValue(2, $province, PDO::PARAM_STR);
        $stmt->bindValue(3, $pattern, PDO::PARAM_STR);
        $stmt->bindValue(4, $pattern, PDO::PARAM_STR);
        $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
        $stmt->execute();
        $resp['items'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
        $resp['items'] = [];
    }
    echo json_encode($resp);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Search failed']);
}
?> 
