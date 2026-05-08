<?php
error_reporting(0);
ini_set('display_errors', 0);
require_once "cors.php";
require_once __DIR__ . '/tokens.php';

function get_current_user_data() {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $auth = $headers['Authorization'] ?? ($headers['authorization'] ?? '');
    
    if (stripos($auth, 'Bearer ') === 0) {
        $token = substr($auth, 7);
        $payload = jwt_decode($token);
        if ($payload) {
            return [
                'id' => $payload['sub'] ?? null,
                'user_id' => $payload['sub'] ?? null,
                'role' => strtolower($payload['role'] ?? 'resident'),
                'brgy_name' => $payload['brgy_name'] ?? null,
                'username' => $payload['username'] ?? null,
                'full_name' => $payload['full_name'] ?? null
            ];
        }
    }
    
    if (isset($_SESSION['user_id'])) {
        return [
            'id' => $_SESSION['user_id'],
            'user_id' => $_SESSION['user_id'],
            'role' => strtolower($_SESSION['role'] ?? 'resident'),
            'brgy_name' => $_SESSION['brgy_name'] ?? null,
            'username' => $_SESSION['username'] ?? null,
            'full_name' => $_SESSION['full_name'] ?? null
        ];
    }
    
    return null;
}

function check_session() {
    return get_current_user_data();
}

function has_permission_for_role($role, $permission) {
    $map = [
        'admin' => [
            'users.view','users.manage','logs.export',
            'incident.create','incident.view',
            'dispatch.manage','sop.view','sop.update','sop.complete','activity.log',
            'hazard.manage','shelter.manage','alerts.manage','contacts.manage','routes.suggest','routes.view','invites.manage'
        ],
        'mmdrmo' => [
            'users.view',
            'incident.create','incident.view',
            'dispatch.manage','sop.view','sop.update','sop.complete','activity.log',
            'routes.view'
        ],
        'brgy_chair' => [
            'users.view','users.manage',
            'incident.create','incident.view',
            'dispatch.manage','sop.view','sop.update','sop.complete','activity.log',
            'contacts.manage',
            'routes.view','invites.manage'
        ],
        'brgy' => [
            'users.view','users.manage',
            'incident.create','incident.view',
            'dispatch.manage','sop.view','sop.update','activity.log','alerts.manage',
            'contacts.manage',
            'routes.view'
        ],
        'responder' => [
            'incident.view','sop.view','activity.log','routes.view'
        ],
        'resident' => [
            'incident.view','routes.view'
        ],
        'guest' => [
            'routes.view', 'incident.view'
        ]
    ];
    $role = $role ?? 'guest';
    $perms = $map[$role] ?? $map['guest'];
    return in_array($permission, $perms, true);
}

function require_permission($permission) {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $auth = $headers['Authorization'] ?? ($headers['authorization'] ?? '');
    $role = null;
    if (stripos($auth, 'Bearer ') === 0) {
        $token = substr($auth, 7);
        $payload = jwt_decode($token);
        if ($payload && isset($payload['role'])) {
            $role = strtolower($payload['role']);
        }
    }
    if ($role === null) {
        $role = $_SESSION['role'] ?? ($_SERVER['HTTP_X_ROLE'] ?? ($_GET['role'] ?? 'guest'));
        $role = strtolower($role);
    }
    if (!has_permission_for_role($role, $permission)) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Forbidden: insufficient permissions for ' . ($role ?: 'unknown')]);
        exit;
    }
}

function checkRole($allowedRoles) {
    $role = $_SESSION['role'] ?? ($_SERVER['HTTP_X_ROLE'] ?? ($_GET['role'] ?? 'guest'));
    $role = strtolower($role);
    
    $allowed = array_map('strtolower', $allowedRoles);
    if (!in_array($role, $allowed)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized role: ' . ($role ?: 'unknown')]);
        exit;
    }
}
?>
