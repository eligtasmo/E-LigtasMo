<?php
require_once __DIR__ . '/cors.php';
header('Content-Type: application/json');

$lat = isset($_GET['lat']) ? floatval($_GET['lat']) : null;
$lon = isset($_GET['lon']) ? floatval($_GET['lon']) : null;
if ($lat === null || $lon === null) {
  http_response_code(400);
  echo json_encode(['success' => false, 'message' => 'Missing lat or lon']);
  exit;
}

$url = 'https://api.open-meteo.com/v1/forecast?latitude=' . $lat . '&longitude=' . $lon . '&current_weather=true&hourly=precipitation,wind_speed_10m,temperature_2m';

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (!$response || $status < 200 || $status >= 300) {
  http_response_code(502);
  echo json_encode(['success' => false, 'message' => 'Weather provider unavailable', 'status' => $status]);
  exit;
}

$data = json_decode($response, true);
if (!is_array($data)) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => 'Invalid weather response']);
  exit;
}

$current = isset($data['current_weather']) ? $data['current_weather'] : [];
$summary = [
  'temperature' => isset($current['temperature']) ? $current['temperature'] : null,
  'windspeed' => isset($current['windspeed']) ? $current['windspeed'] : null,
  'winddirection' => isset($current['winddirection']) ? $current['winddirection'] : null,
  'weathercode' => isset($current['weathercode']) ? $current['weathercode'] : null,
  'time' => isset($current['time']) ? $current['time'] : null,
];

echo json_encode(['success' => true, 'weather' => $summary]);
?>
