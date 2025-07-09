<?php
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (
    $origin === 'http://localhost:5173' ||
    preg_match('/^http:\/\/192\.168\.[0-9]+\.[0-9]+:5173$/', $origin)
) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 86400");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}
session_start();
header('Content-Type: application/json');
error_log('Session ID: ' . session_id());
error_log('Session Data: ' . print_r($_SESSION, true));
if (isset($_SESSION['user_id'])) {
    // Fetch all needed fields from the database
    $host = "localhost";
    $dbuser = "root";
    $dbpass = "";
    $dbname = "eligtasmo";
    $conn = new mysqli($host, $dbuser, $dbpass, $dbname);
    $user_id = $_SESSION['user_id'];
    $stmt = $conn->prepare("SELECT username, email, full_name, brgy_name, city, province, contact_number FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $stmt->bind_result($username, $email, $full_name, $brgy_name, $city, $province, $contact_number);
    $stmt->fetch();
    $stmt->close();
    $conn->close();

    echo json_encode([
        'authenticated' => true,
        'user_id' => $user_id,
        'role' => $_SESSION['role'] ?? null,
        'username' => $username,
        'email' => $email,
        'full_name' => $full_name,
        'brgy_name' => $brgy_name,
        'city' => $city,
        'province' => $province,
        'contact_number' => $contact_number
    ]);
} else {
    echo json_encode(['authenticated' => false]);
}
?> 