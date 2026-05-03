<?php
require_once 'cors.php';
header("Content-Type: application/json");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
require_once 'db.php';
require_once 'rbac.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Require view permission at minimum
require_permission('users.view');

$userRole = $_SESSION['role'] ?? null;
$userBrgy = $_SESSION['brgy_name'] ?? null;

// Normalize roles - treat brgy_chair as brgy for filtering purposes
$isBrgyOfficial = in_array($userRole, ['brgy', 'brgy_chair']);

// Get filters from request
$status = $_GET['status'] ?? null;
$brgyFilter = $_GET['brgy'] ?? null;

// Enforcement logic
if ($isBrgyOfficial) {
    // Barangay officials are strictly locked to their own barangay
    $brgyFilter = $userBrgy;
}

$query = "SELECT id, username, full_name, brgy_name, city, province, email, contact_number, role, status FROM users WHERE 1=1";
$params = [];

if ($status) {
    $query .= " AND status = ?";
    $params[] = $status;
}

if ($brgyFilter) {
    $query .= " AND brgy_name = ?";
    $params[] = $brgyFilter;
}

// If it's a brgy official, strictly show only residents to fulfill the "specific resident accounts" requirement
if ($isBrgyOfficial) {
    $query .= " AND role = 'resident'";
}

try {
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'users' => $users]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>