<?php
require_once __DIR__ . '/cors.php';
header('Content-Type: application/json');

$lat = isset($_GET['lat']) ? (float)$_GET['lat'] : null;
$lng = isset($_GET['lng']) ? (float)$_GET['lng'] : null;
$profile = isset($_GET['profile']) ? (string)$_GET['profile'] : 'driving-car';

if ($lat === null || $lng === null || !is_finite($lat) || !is_finite($lng)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'lat and lng are required']);
    exit;
}

$osrmBase = "https://router.project-osrm.org/nearest/v1/";
$osrmProfile = 'driving';

if (stripos($profile, 'foot') !== false || stripos($profile, 'walk') !== false) {
    $osrmProfile = 'foot';
    $osrmBase = "https://routing.openstreetmap.de/routed-foot/nearest/v1/";
} elseif (stripos($profile, 'cycle') !== false || stripos($profile, 'bike') !== false) {
    $osrmProfile = 'bicycle';
    $osrmBase = "https://routing.openstreetmap.de/routed-bike/nearest/v1/";
}

$url = "{$osrmBase}{$osrmProfile}/{$lng},{$lat}?number=1";
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$resp = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($resp === false || $status < 200 || $status >= 300) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'OSRM nearest failed']);
    exit;
}

$json = json_decode($resp, true);
if (!is_array($json) || !isset($json['waypoints'][0]['location'])) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'Invalid OSRM nearest response']);
    exit;
}

$loc = $json['waypoints'][0]['location'];
echo json_encode([
    'success' => true,
    'lng' => (float)$loc[0],
    'lat' => (float)$loc[1],
]);
?>
