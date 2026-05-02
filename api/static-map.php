<?php
// Simple proxy to fetch a static map image from OpenStreetMap and return as a data URL
// Input (POST JSON): { center_lat, center_lng, zoom, width, height }
// Output (JSON): { data_url: "data:image/png;base64,..." }

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');

try {
    $raw = file_get_contents('php://input');
    $payload = json_decode($raw, true);
    if (!$payload) {
        throw new Exception('Invalid JSON');
    }

    $lat = isset($payload['center_lat']) ? floatval($payload['center_lat']) : null;
    $lng = isset($payload['center_lng']) ? floatval($payload['center_lng']) : null;
    $zoom = isset($payload['zoom']) ? intval($payload['zoom']) : 14;
    $width = isset($payload['width']) ? intval($payload['width']) : 520;
    $height = isset($payload['height']) ? intval($payload['height']) : 320;

    if ($lat === null || $lng === null) {
        throw new Exception('Missing center_lat/center_lng');
    }

    // Clamp values to reasonable ranges
    $zoom = max(3, min($zoom, 17));
    $width = max(64, min($width, 2048));
    $height = max(64, min($height, 2048));

    // Build staticmap URL (OpenStreetMap static maps)
    $url = sprintf(
        'https://staticmap.openstreetmap.de/staticmap.php?center=%f,%f&zoom=%d&size=%dx%d&maptype=mapnik',
        $lat,
        $lng,
        $zoom,
        $width,
        $height
    );

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $imageData = curl_exec($ch);
    if ($imageData === false) {
        throw new Exception('Failed to fetch static map: ' . curl_error($ch));
    }
    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($statusCode < 200 || $statusCode >= 300) {
        throw new Exception('Static map HTTP error: ' . $statusCode);
    }

    $base64 = base64_encode($imageData);
    $dataUrl = 'data:image/png;base64,' . $base64;

    echo json_encode(['data_url' => $dataUrl]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}