<?php
/**
 * E-LigtasMo Session Bootstrap
 * Ensures secure session handling across different environments.
 */
if (session_status() === PHP_SESSION_NONE) {
    $isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    
    // Set session cookie parameters for security
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '', // Standard: current domain
        'secure' => $isSecure,
        'httponly' => true,
        'samesite' => $isSecure ? 'None' : 'Lax',
    ]);
    
    session_start();
}
