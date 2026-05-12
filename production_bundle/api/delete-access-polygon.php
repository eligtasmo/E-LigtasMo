<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';

try {
    $id = null;
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $id = $_GET['id'] ?? null;
    } else {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $input['id'] ?? null;
    }

    if (!$id) { throw new Exception('Missing id'); }

    $stmt = $pdo->prepare('DELETE FROM access_polygons WHERE id = ?');
    $stmt->execute([$id]);
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>