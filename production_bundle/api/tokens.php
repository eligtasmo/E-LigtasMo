<?php
require_once "cors.php";
function b64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
function b64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}
function jwt_secret() {
    require_once __DIR__ . '/env_helper.php';
    $s = $_ENV['ELIGTASMO_JWT_SECRET'] ?? ($_SERVER['ELIGTASMO_JWT_SECRET'] ?? getenv('ELIGTASMO_JWT_SECRET'));
    return $s ? $s : 'change_me_to_something_secure';
}
function jwt_encode($payload, $ttlSeconds = 3600) {
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $now = time();
    $payload['iat'] = $now;
    $payload['exp'] = $now + $ttlSeconds;
    $segments = [
        b64url_encode(json_encode($header)),
        b64url_encode(json_encode($payload)),
    ];
    $signing_input = implode('.', $segments);
    $signature = hash_hmac('sha256', $signing_input, jwt_secret(), true);
    $segments[] = b64url_encode($signature);
    return implode('.', $segments);
}
function jwt_decode($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) { return null; }
    list($h64, $p64, $s64) = $parts;
    $signing_input = $h64 . '.' . $p64;
    $expected = b64url_encode(hash_hmac('sha256', $signing_input, jwt_secret(), true));
    if (!hash_equals($expected, $s64)) { return null; }
    $payload = json_decode(b64url_decode($p64), true);
    if (!is_array($payload)) { return null; }
    if (isset($payload['exp']) && time() >= (int)$payload['exp']) { return null; }
    return $payload;
}
?>
