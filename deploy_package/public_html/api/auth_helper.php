<?php
require_once __DIR__ . '/tokens.php';

function get_current_user_data() {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $auth = $headers['Authorization'] ?? ($headers['authorization'] ?? '');
    
    if (stripos($auth, 'Bearer ') === 0) {
        $token = substr($auth, 7);
        $payload = jwt_decode($token);
        if ($payload) {
            return [
                'user_id' => $payload['sub'] ?? null,
                'role' => strtolower($payload['role'] ?? 'resident'),
                'brgy_name' => $payload['brgy_name'] ?? null,
                'username' => $payload['username'] ?? null,
                'full_name' => $payload['full_name'] ?? null
            ];
        }
    }
    
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    
    if (isset($_SESSION['user_id'])) {
        return [
            'user_id' => $_SESSION['user_id'],
            'role' => strtolower($_SESSION['role'] ?? 'resident'),
            'brgy_name' => $_SESSION['brgy_name'] ?? null,
            'username' => $_SESSION['username'] ?? null,
            'full_name' => $_SESSION['full_name'] ?? null
        ];
    }
    
    return null;
}
?>
