<?php
// Avoid printing PHP warnings/notices to JSON responses
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ERROR | E_PARSE);

// Include common CORS configuration
require_once 'cors.php';
require_once 'db.php';
require_once 'tokens.php';
require_once 'session_boot.php';
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);
if (!$data || !is_array($data)) {
    // Fallback to form-encoded POST
    $data = $_POST;
}
$username = isset($data['username']) ? trim($data['username']) : '';
$password = isset($data['password']) ? trim($data['password']) : '';

// Validate input
if ($username === '' || $password === '') {
    http_response_code(200);
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
    exit();
}

$now = time();
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$limDir = __DIR__ . '/tmp';
if (!is_dir($limDir)) { @mkdir($limDir, 0777, true); }
$limFile = $limDir . '/rate_' . preg_replace('/[^a-zA-Z0-9_.-]/', '_', $ip) . '.json';
$attempts = [];
if (file_exists($limFile)) {
    $raw = file_get_contents($limFile);
    $attempts = json_decode($raw, true) ?: [];
}
$attempts = array_values(array_filter($attempts, function ($t) use ($now) { return ($now - (int)$t) < 300; }));
if (count($attempts) >= 5) {
    header('Retry-After: 300');
    http_response_code(200);
    echo json_encode(["success" => false, "message" => "Too many login attempts. Try again later."]);
    exit();
}

$connError = null;
try {
    $pdo->query('SELECT 1');
} catch (Exception $e) {
    $connError = $e->getMessage();
}
if ($connError !== null) {
    http_response_code(200);
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

// Find user by username (include preferred_vehicle when available)
$hasPreferred = false;
try {
    $colCheck = $pdo->query("SHOW COLUMNS FROM users LIKE 'preferred_vehicle'");
    $hasPreferred = $colCheck && $colCheck->rowCount() > 0;
} catch (Exception $e) { $hasPreferred = false; }

$hasStatus = false;
try {
    $colStatus = $pdo->query("SHOW COLUMNS FROM users LIKE 'status'");
    $hasStatus = $colStatus && $colStatus->rowCount() > 0;
} catch (Exception $e) { $hasStatus = false; }

$hasEmailVerified = false;

// Check if input is email or username
$isEmail = filter_var($username, FILTER_VALIDATE_EMAIL);

$selectSql = "SELECT id, password, role, full_name, brgy_name, contact_number, email, city, province, gender, "
  . ($hasStatus ? "status" : "'active' AS status")
  . ($hasPreferred ? ", preferred_vehicle" : ", NULL AS preferred_vehicle")
  . " FROM users WHERE " . ($isEmail ? "email = ?" : "username = ?");

try {
    $stmt = $pdo->prepare($selectSql);
    $stmt->execute([$username]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    http_response_code(200);
    echo json_encode(["success" => false, "message" => "Query execution failed"]);
    exit();
}

if ($row) {
    $id = (int)$row['id'];
    $hashedPassword = $row['password'];
    $role = $row['role'];
    $full_name = $row['full_name'];
    $brgy_name = $row['brgy_name'];
    $contact_number = $row['contact_number'];
    $email = $row['email'];
    $city = $row['city'] ?? 'Santa Cruz';
    $province = $row['province'] ?? 'Laguna';
    $gender = $row['gender'] ?? '';
    $status = $row['status'];
    $preferred_vehicle = $row['preferred_vehicle'];

    if (password_verify($password, $hashedPassword)) {
        $roleLower = strtolower((string)$role);
        $valid = ['admin','brgy','resident'];
        if (!in_array($roleLower, $valid, true)) {
            $roleLower = 'resident';
            $role = 'resident';
        }
        $statusLower = strtolower((string)$status);
        
        // Check for pending/rejected status
        if ($hasStatus) {
            // Only check pending status for non-residents (e.g. brgy)
            // Residents should be allowed to login even if pending (or it implies auto-approval)
            if ($statusLower === 'pending' && $roleLower !== 'resident') {
                http_response_code(200);
                echo json_encode(["success" => false, "message" => "Your account is pending approval by the administrator."]);
                exit();
            }
            if ($statusLower === 'rejected') {
                http_response_code(200);
                echo json_encode(["success" => false, "message" => "Your account has been rejected."]);
                exit();
            }
        }

        if ($roleLower === 'resident' && $hasStatus && $statusLower === 'pending_email') {
            http_response_code(200);
            echo json_encode(["success" => false, "code" => "EMAIL_NOT_VERIFIED", "message" => "Please verify your email before signing in."]);
        } else {
            $_SESSION['user_id'] = $id;
            $_SESSION['role'] = $roleLower;
            $_SESSION['brgy_name'] = $brgy_name;
            $token = jwt_encode(['sub' => $id, 'role' => $roleLower, 'brgy_name' => $brgy_name], 3600);
            echo json_encode([
                "success" => true,
                "message" => "Login successful",
                "token" => $token,
                "id" => $id,
                "username" => $username,
                "role" => $role,
                "full_name" => $full_name,
                "brgy_name" => $brgy_name,
                "contact_number" => $contact_number,
                "email" => $email,
                "city" => $city,
                "province" => $province,
                "gender" => $gender,
                "lat" => isset($row['lat']) ? $row['lat'] : null,
                "lng" => isset($row['lng']) ? $row['lng'] : null,
                "preferred_vehicle" => $preferred_vehicle
            ]);
        }
    } else {
        $attempts[] = $now;
        @file_put_contents($limFile, json_encode($attempts));
        http_response_code(200);
        echo json_encode(["success" => false, "message" => "Incorrect password"]);
    }
} else {
    $attempts[] = $now;
    @file_put_contents($limFile, json_encode($attempts));
    http_response_code(200);
    echo json_encode(["success" => false, "message" => "Invalid username"]);
}
?>
