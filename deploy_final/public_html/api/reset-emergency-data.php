<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'rbac.php';

require_permission('hazard.manage');

try {
    $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
    $pdo->exec('TRUNCATE TABLE incidents');
    $pdo->exec('TRUNCATE TABLE danger_zones');
    $pdo->exec('TRUNCATE TABLE hazards');
    $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>