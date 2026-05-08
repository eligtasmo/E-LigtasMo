<?php
require_once 'cors.php';
header("Content-Type: application/json");

// Use shared database connection
require_once 'db.php';

try {
    $stmt = $pdo->query("SELECT id, name, lat, lng, address, contact, type, added_by, added_at, updated_by, updated_at FROM barangays ORDER BY name ASC");
    $barangays = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode([
        'success' => true,
        'barangays' => $barangays,
        'brgys' => $barangays, // Compatibility alias
        'count' => count($barangays)
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>