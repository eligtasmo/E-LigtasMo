<?php
// api/update-preferred-vehicle.php
require_once 'cors.php';
header("Access-Control-Max-Age: 86400");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// Read JSON body
$input = json_decode(file_get_contents('php://input'), true);
$preferred = isset($input['preferred_vehicle']) ? trim($input['preferred_vehicle']) : '';

if ($preferred === '' || strlen($preferred) > 64 || !preg_match('/^[a-z0-9][a-z0-9_-]{0,63}$/i', $preferred)) {
    echo json_encode(['success' => false, 'message' => 'Invalid vehicle mode']);
    exit;
}

// DB connection
$host = "localhost";
$dbuser = "root";
$dbpass = "";
$dbname = "eligtasmo";
$conn = new mysqli($host, $dbuser, $dbpass, $dbname);
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

// Ensure column exists
$hasColumn = false;
try {
    $res = $conn->query("SHOW COLUMNS FROM users LIKE 'preferred_vehicle'");
    $hasColumn = $res && $res->num_rows > 0;
} catch (Exception $e) {
    $hasColumn = false;
}
if (!$hasColumn) {
    // Add column preferred_vehicle if missing
    try {
        $conn->query("ALTER TABLE users ADD COLUMN preferred_vehicle VARCHAR(64) NULL AFTER contact_number");
    } catch (Exception $e) {
        // Ignore if cannot alter table here
    }
}

// Update current user's preferred vehicle
$user_id = $_SESSION['user_id'];
$stmt = $conn->prepare("UPDATE users SET preferred_vehicle = ? WHERE id = ?");
if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Failed to prepare update']);
    $conn->close();
    exit;
}
$stmt->bind_param("si", $preferred, $user_id);
$ok = $stmt->execute();
$stmt->close();
$conn->close();

if ($ok) {
    echo json_encode(['success' => true, 'preferred_vehicle' => $preferred]);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to save preferred vehicle']);
}
?>
