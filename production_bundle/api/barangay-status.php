<?php
require_once 'cors.php';
header("Content-Type: application/json; charset=UTF-8");

require_once 'db.php';
require_once 'auth_helper.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $barangay = isset($_GET['barangay']) ? $_GET['barangay'] : null;
    
    if ($barangay) {
        $stmt = $pdo->prepare("SELECT * FROM barangay_status WHERE barangay_name = ?");
        $stmt->execute([$barangay]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
    } else {
        $stmt = $pdo->query("SELECT * FROM barangay_status ORDER BY barangay_name ASC");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    echo json_encode(['status' => 'success', 'data' => $data]);
}
elseif ($method === 'POST') {
    $user = get_current_user_data();
    if (!$user || !in_array($user['role'], ['admin', 'brgy', 'mmdrmo', 'brgy_chair'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Unauthorized access.']);
        exit;
    }

    $input = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($input['barangay_name']) || !isset($input['status_level'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing fields']);
        exit;
    }

    // Ensure updated_by column exists
    $check = $pdo->query("SHOW COLUMNS FROM barangay_status LIKE 'updated_by'");
    if ($check->rowCount() == 0) {
        $pdo->exec("ALTER TABLE barangay_status ADD COLUMN updated_by VARCHAR(255) NULL");
    }
    
    // Access Control: Brgy officials can only update their own barangay
    if ($user['role'] !== 'admin' && $user['role'] !== 'mmdrmo' && $user['brgy_name'] !== $input['barangay_name']) {
        http_response_code(403);
        echo json_encode(['error' => 'Unauthorized to update other barangays.']);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE barangay_status SET status_level = ?, message = ?, flood_depth_cm = ?, updated_at = NOW(), updated_by = ? WHERE barangay_name = ?");
    $res = $stmt->execute([
        $input['status_level'],
        $input['message'] ?? '',
        $input['flood_depth_cm'] ?? 0,
        $user['full_name'] ?? $user['username'],
        $input['barangay_name']
    ]);
    
    if ($res) {
        // Insert notification for residents
        try {
            $title = "Barangay Update: " . $input['barangay_name'];
            $msg = "Status: " . ucfirst($input['status_level']);
            if (!empty($input['message'])) {
                $msg .= ". " . $input['message'];
            }
            if (!empty($input['flood_depth_cm']) && $input['flood_depth_cm'] > 0) {
                $msg .= ". Flood Depth: " . $input['flood_depth_cm'] . "cm";
            }
            
            $type = ($input['status_level'] == 'critical' || $input['status_level'] == 'warning') ? 'warning' : 'info';
            
            // Ensure table exists (simple check)
            $pdo->exec("CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type ENUM('info','warning','success','error') NOT NULL DEFAULT 'info',
                audience ENUM('all','residents','barangay') NOT NULL DEFAULT 'all',
                brgy_name VARCHAR(100) NULL,
                created_by INT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_audience (audience),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $notifStmt = $pdo->prepare("INSERT INTO notifications (title, message, type, audience, brgy_name, created_at) VALUES (?, ?, ?, 'residents', ?, NOW())");
            $notifStmt->execute([$title, $msg, $type, $input['barangay_name']]);
        } catch (Exception $e) {
            // Ignore notification errors to not fail the status update
        }

        echo json_encode(['status' => 'success', 'message' => 'Status updated']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update']);
    }
}
?>
