<?php
require_once "cors.php";
header('Content-Type: application/json');
require_once 'db.php';

try {
    // 1. Fetch Categories
    $catStmt = $pdo->query("SELECT name FROM emergency_categories ORDER BY name ASC");
    $categories = $catStmt->fetchAll(PDO::FETCH_COLUMN);

    // 2. Fetch Hotlines (Global + specific brgy if requested)
    $brgy = isset($_GET['brgy']) ? $_GET['brgy'] : null;
    $sql = "SELECT * FROM emergency_hotlines WHERE brgy_name IS NULL";
    $params = [];
    
    if ($brgy) {
        $sql .= " OR brgy_name = ?";
        $params[] = $brgy;
    }
    
    $sql .= " ORDER BY category ASC, name ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $hotlines = $stmt->fetchAll();

    echo json_encode([
        'success' => true, 
        'data' => $hotlines,
        'categories' => $categories
    ]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
