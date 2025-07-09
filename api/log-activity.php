<?php
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $allowed_origins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://192.168.1.2:5173', // Add more if needed
    ];
    if (in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
        header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    }
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header("Content-Type: application/json");
session_start();

// Function to log activity
function logActivity($action_type, $action_description, $resource_type = null, $resource_id = null, $status = 'success', $error_message = null) {
    $host = "localhost";
    $dbuser = "root";
    $dbpass = "";
    $dbname = "eligtasmo";
    
    try {
        $conn = new mysqli($host, $dbuser, $dbpass, $dbname);
        
        if ($conn->connect_error) {
            error_log("Database connection failed: " . $conn->connect_error);
            return false;
        }
        
        // Get user info from session
        $user_id = $_SESSION['user_id'] ?? null;
        $username = $_SESSION['username'] ?? null;
        $user_role = $_SESSION['role'] ?? null;
        
        // Get client info
        $ip_address = $_SERVER['REMOTE_ADDR'] ?? null;
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? null;
        
        $stmt = $conn->prepare("INSERT INTO system_logs (user_id, username, user_role, action_type, action_description, resource_type, resource_id, ip_address, user_agent, status, error_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $stmt->bind_param("issssssssss", 
            $user_id,
            $username,
            $user_role,
            $action_type,
            $action_description,
            $resource_type,
            $resource_id,
            $ip_address,
            $user_agent,
            $status,
            $error_message
        );
        
        $result = $stmt->execute();
        $stmt->close();
        $conn->close();
        
        return $result;
    } catch (Exception $e) {
        error_log("Error logging activity: " . $e->getMessage());
        return false;
    }
}

// Handle POST requests to log activity
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $action_type = $data['action_type'] ?? '';
    $action_description = $data['action_description'] ?? '';
    $resource_type = $data['resource_type'] ?? null;
    $resource_id = $data['resource_id'] ?? null;
    $status = $data['status'] ?? 'success';
    $error_message = $data['error_message'] ?? null;
    
    if (empty($action_type) || empty($action_description)) {
        echo json_encode(['success' => false, 'message' => 'Action type and description are required']);
        exit;
    }
    
    $result = logActivity($action_type, $action_description, $resource_type, $resource_id, $status, $error_message);
    
    if ($result) {
        echo json_encode(['success' => true, 'message' => 'Activity logged successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to log activity']);
    }
    exit;
}

// Handle GET requests to retrieve logs (for admin only)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }
    
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
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = ($page - 1) * $limit;
        
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
        
        // Get total count
        $count_query = "SELECT COUNT(*) as total FROM system_logs $where_clause";
        $count_stmt = $conn->prepare($count_query);
        
        if (!empty($params)) {
            $count_stmt->bind_param($types, ...$params);
        }
        
        $count_stmt->execute();
        $count_result = $count_stmt->get_result();
        $total_records = $count_result->fetch_assoc()['total'];
        $count_stmt->close();
        
        // Get logs
        $query = "SELECT * FROM system_logs $where_clause ORDER BY created_at DESC LIMIT ? OFFSET ?";
        $stmt = $conn->prepare($query);
        
        $params[] = $limit;
        $params[] = $offset;
        $types .= 'ii';
        
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $logs = [];
        while ($row = $result->fetch_assoc()) {
            $logs[] = $row;
        }
        
        $stmt->close();
        $conn->close();
        
        echo json_encode([
            'success' => true,
            'logs' => $logs,
            'pagination' => [
                'current_page' => $page,
                'total_records' => $total_records,
                'total_pages' => ceil($total_records / $limit),
                'limit' => $limit
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error retrieving logs: ' . $e->getMessage()]);
    }
    exit;
}
?> 