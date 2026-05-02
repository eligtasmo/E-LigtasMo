<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'rbac.php';
session_start();
require_permission('logs.export');

$host = "localhost";
$dbuser = "root";
$dbpass = "";
$dbname = "eligtasmo";

try {
    $conn = new mysqli($host, $dbuser, $dbpass, $dbname);
    
    if ($conn->connect_error) {
        echo json_encode(['success' => false, 'message' => 'Database connection failed']);
        exit;
    }
    
    // Get query parameters
    $action_type = $_GET['action_type'] ?? '';
    $user_role = $_GET['user_role'] ?? '';
    $status = $_GET['status'] ?? '';
    $date_from = $_GET['date_from'] ?? '';
    $date_to = $_GET['date_to'] ?? '';
    
    // Build WHERE clause
    $where_conditions = [];
    $params = [];
    $types = '';
    
    if (!empty($action_type)) {
        $where_conditions[] = "action_type = ?";
        $params[] = $action_type;
        $types .= 's';
    }
    
    if (!empty($user_role)) {
        $where_conditions[] = "user_role = ?";
        $params[] = $user_role;
        $types .= 's';
    }
    
    if (!empty($status)) {
        $where_conditions[] = "status = ?";
        $params[] = $status;
        $types .= 's';
    }
    
    if (!empty($date_from)) {
        $where_conditions[] = "created_at >= ?";
        $params[] = $date_from . ' 00:00:00';
        $types .= 's';
    }
    
    if (!empty($date_to)) {
        $where_conditions[] = "created_at <= ?";
        $params[] = $date_to . ' 23:59:59';
        $types .= 's';
    }
    
    $where_clause = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';
    
    // Get logs
    $query = "SELECT * FROM system_logs $where_clause ORDER BY created_at DESC";
    $stmt = $conn->prepare($query);
    
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    // Set headers for CSV download
    $filename = 'system_logs_' . date('Y-m-d_H-i-s') . '.csv';
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    // Create CSV file
    $output = fopen('php://output', 'w');
    
    // Add CSV headers
    fputcsv($output, [
        'ID',
        'User ID',
        'Username',
        'User Role',
        'Action Type',
        'Action Description',
        'Resource Type',
        'Resource ID',
        'IP Address',
        'User Agent',
        'Status',
        'Error Message',
        'Created At'
    ]);
    
    // Add data rows
    while ($row = $result->fetch_assoc()) {
        fputcsv($output, [
            $row['id'],
            $row['user_id'],
            $row['username'],
            $row['user_role'],
            $row['action_type'],
            $row['action_description'],
            $row['resource_type'],
            $row['resource_id'],
            $row['ip_address'],
            $row['user_agent'],
            $row['status'],
            $row['error_message'],
            $row['created_at']
        ]);
    }
    
    fclose($output);
    $stmt->close();
    $conn->close();
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error exporting logs: ' . $e->getMessage()]);
}
?>