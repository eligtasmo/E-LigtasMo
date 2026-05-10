require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
// session_boot removed as session_start is handled by cors.php
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ERROR | E_PARSE);

header("Content-Type: application/json");

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);
if (!$data || !is_array($data)) {
    $data = $_POST;
}

$data['username'] = isset($data['username']) ? trim($data['username']) : '';
$data['password'] = isset($data['password']) ? trim($data['password']) : '';
$data['full_name'] = isset($data['full_name']) ? trim($data['full_name']) : '';
$data['contact_number'] = isset($data['contact_number']) ? trim($data['contact_number']) : '';
$emailRaw = isset($data['email']) ? trim($data['email']) : '';
// Normalize placeholder tokens like 'N/A' to empty strings
$naTokens = ['n/a','na','N/A','NA','none','None','null','Null','undefined','Undefined'];
$normalize = function($v) use ($naTokens) {
    $t = trim((string)$v);
    foreach ($naTokens as $tok) {
        if (strcasecmp($t, $tok) === 0) return '';
    }
    return $t;
};
$data['username'] = $normalize($data['username']);
$data['password'] = $normalize($data['password']);
$data['full_name'] = $normalize($data['full_name']);
$data['contact_number'] = $normalize($data['contact_number']);
$data['gender'] = isset($data['gender']) ? $normalize($data['gender']) : '';
$emailRaw = $normalize($emailRaw);

// Validate & Standardize Phone Number (Fixed 09 format, 11 digits)
$rawPhone = $normalize($data['contact_number']);
$cleanPhone = preg_replace('/[^0-9]/', '', $rawPhone);
if (strlen($cleanPhone) !== 11 || substr($cleanPhone, 0, 2) !== '09') {
    http_response_code(200);
    echo json_encode(['success' => false, 'code' => 'VALIDATION_ERROR', 'message' => 'Please enter a valid 11-digit phone number starting with 09.']);
    exit;
}
$data['contact_number'] = $cleanPhone;
if (!filter_var($emailRaw, FILTER_VALIDATE_EMAIL)) {
    http_response_code(200);
    echo json_encode(['success' => false, 'code' => 'VALIDATION_ERROR', 'details' => ['email' => ['Invalid email']]]);
    exit;
}
$data['email'] = strtolower($emailRaw);

$role = isset($data['role']) && $data['role'] === 'brgy' ? 'brgy' : 'resident';

$errors = [];
$common_required = ['username', 'password', 'full_name', 'email', 'contact_number'];
foreach ($common_required as $field) {
    if (empty($data[$field])) {
        $errors[$field] = ['Missing field'];
    }
}
if (!empty($errors)) {
    http_response_code(200);
    echo json_encode(['success' => false, 'code' => 'VALIDATION_ERROR', 'message' => 'Please fill in all required fields.', 'details' => $errors]);
    exit;
}

$data['brgy_name'] = isset($data['brgy_name']) ? trim($data['brgy_name']) : '';
$data['city'] = isset($data['city']) ? trim($data['city']) : '';
$data['province'] = isset($data['province']) ? trim($data['province']) : '';
// Password policy
$pwd = $data['password'];
$pwdErrors = [];
if (strlen($pwd) < 10) { $pwdErrors[] = 'Password must be at least 10 characters'; }
if (!preg_match('/[A-Z]/', $pwd)) { $pwdErrors[] = 'Include at least one uppercase letter'; }
if (!preg_match('/[a-z]/', $pwd)) { $pwdErrors[] = 'Include at least one lowercase letter'; }
if (!preg_match('/\\d/', $pwd)) { $pwdErrors[] = 'Include at least one digit'; }
if (!preg_match('/[^a-zA-Z0-9]/', $pwd)) { $pwdErrors[] = 'Include at least one special character'; }
$commonBad = ['password','123456','qwerty','111111','123123','letmein','iloveyou'];
if (in_array(strtolower($pwd), $commonBad, true)) { $pwdErrors[] = 'Password is too common'; }
if (!empty($pwdErrors)) {
    http_response_code(200);
    echo json_encode(['success' => false, 'code' => 'VALIDATION_ERROR', 'message' => 'Password does not meet requirements.', 'details' => ['password' => $pwdErrors]]);
    exit;
}

$connError = null;
try {
    $pdo->query('SELECT 1');
} catch (Exception $e) {
    $connError = $e->getMessage();
}
if ($connError !== null) {
    http_response_code(200);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

try {
    // Check for existing users more specifically to provide better feedback
    $checks = [
        'username' => $data['username'],
        'email' => $data['email'],
        'contact_number' => $data['contact_number']
    ];

    foreach ($checks as $field => $value) {
        if (!empty($value)) {
            $stmt = $pdo->prepare("SELECT id, role FROM users WHERE $field = ? LIMIT 1");
            $stmt->execute([$value]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existing) {
                $roleLabel = ($existing['role'] === 'resident') ? 'Resident' : 'Official/Admin';
                http_response_code(200);
                echo json_encode([
                    'success' => false, 
                    'code' => 'ALREADY_EXISTS',
                    'message' => 'Account already exists', 
                    'details' => "The " . str_replace('_', ' ', $field) . " you entered is already registered to an existing $roleLabel account."
                ]);
                exit;
            }
        }
    }
} catch (Exception $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'message' => 'Validation failed: ' . $e->getMessage()]);
    exit;
}

$hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
$status = ($role === 'brgy') ? 'pending' : 'approved';

try {
    // Check if table has lat/lng columns, if not add them
    $colCheck = $pdo->query("SHOW COLUMNS FROM users LIKE 'lat'");
    if ($colCheck->rowCount() == 0) {
        $pdo->exec("ALTER TABLE users ADD COLUMN lat DECIMAL(10, 8) NULL, ADD COLUMN lng DECIMAL(11, 8) NULL");
    }

    // Check for gender column
    $genCheck = $pdo->query("SHOW COLUMNS FROM users LIKE 'gender'");
    if ($genCheck->rowCount() == 0) {
        $pdo->exec("ALTER TABLE users ADD COLUMN gender VARCHAR(20) NULL AFTER contact_number");
    }

    // Check for created_at column
    $createdCheck = $pdo->query("SHOW COLUMNS FROM users LIKE 'created_at'");
    if ($createdCheck->rowCount() == 0) {
        $pdo->exec("ALTER TABLE users ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
    }

    $stmt = $pdo->prepare("INSERT INTO users (username, password, full_name, brgy_name, city, province, email, contact_number, gender, role, status, lat, lng, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
    $ok = $stmt->execute([
        $data['username'],
        $hashedPassword,
        $data['full_name'],
        $data['brgy_name'],
        $data['city'],
        $data['province'],
        $data['email'],
        $data['contact_number'],
        $data['gender'],
        $role,
        $status,
        isset($data['lat']) ? $data['lat'] : null,
        isset($data['lng']) ? $data['lng'] : null
    ]);
    
    // Also update or insert into barangays table if role is brgy
    if ($ok && $role === 'brgy' && isset($data['lat']) && isset($data['lng'])) {
        try {
            // Check if barangay already exists
            $checkBrgy = $pdo->prepare("SELECT id FROM barangays WHERE name = ?");
            $checkBrgy->execute([$data['brgy_name']]);
            $existingBrgy = $checkBrgy->fetch(PDO::FETCH_ASSOC);
            
            if ($existingBrgy) {
                // Update existing
                $updateBrgy = $pdo->prepare("UPDATE barangays SET lat = ?, lng = ?, address = ?, contact = ?, added_by = ? WHERE id = ?");
                $updateBrgy->execute([
                    $data['lat'],
                    $data['lng'],
                    $data['brgy_name'] . ', ' . $data['city'],
                    $data['contact_number'],
                    $data['username'],
                    $existingBrgy['id']
                ]);
            } else {
                // Insert new
                $insertBrgy = $pdo->prepare("INSERT INTO barangays (name, lat, lng, address, contact, type, added_by) VALUES (?, ?, ?, ?, ?, 'Hall', ?)");
                $insertBrgy->execute([
                    $data['brgy_name'],
                    $data['lat'],
                    $data['lng'],
                    $data['brgy_name'] . ', ' . $data['city'],
                    $data['contact_number'],
                    $data['username']
                ]);
            }
        } catch (Exception $e) {
            // Silently fail for barangays table update as user registration is primary
        }
    }

    if ($ok) {
        if ($role === 'brgy') {
            echo json_encode(['success' => true, 'message' => 'Registration successful! Your account is pending approval by the administrator.', 'role' => $role]);
        } else {
            echo json_encode(['success' => true, 'message' => 'Registration successful! You can now sign in.', 'role' => $role]);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Registration failed.']);
    }
} catch (\Throwable $e) {
    echo json_encode(['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()]);
}
?> 
