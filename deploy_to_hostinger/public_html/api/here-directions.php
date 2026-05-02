<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';

// ── Configuration & Input ──────────────────────────────────────────────────
function loadEnv($path) {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) continue;
        list($name, $value) = explode('=', $line, 2);
        putenv(trim($name) . '=' . trim($value));
    }
}
loadEnv(__DIR__ . '/../.env');

file_put_contents(__DIR__ . '/here_debug.log', "--- REQ: " . date('Y-m-d H:i:s') . " ---\n", FILE_APPEND);

$HERE_API_KEY = getenv('HERE_API_KEY') ?: getenv('EXPO_PUBLIC_HERE_API_KEY');
if (!$HERE_API_KEY) {
    // Return error if key is missing
    echo json_encode(['success' => false, 'error' => 'HERE_API_KEY missing in .env']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$start = $input['coordinates'][0] ?? null;
$end   = $input['coordinates'][1] ?? null;

$debugInput = "[INPUT] START: " . json_encode($start) . " | END: " . json_encode($end) . "\n";
file_put_contents(__DIR__ . '/here_debug.log', $debugInput, FILE_APPEND);

if (!$start || !$end) {
    echo json_encode(['success' => false, 'error' => 'Incomplete mission coordinates']);
    exit;
}

$profile = $input['profile'] ?? 'driving-car';
$avoidZones = $input['avoid_zones'] ?? [];

// ── HERE Parameter Mapping ──────────────────────────────────────────────────
$transportMode = match ($profile) {
    'walking', 'foot-walking' => 'pedestrian',
    'cycling' => 'bicycle',
    'driving-hgv' => 'truck',
    'motorcycle' => 'scooter',
    default => 'car'
};

// Convert GeoJSON Avoid Zones to HERE Bounding Boxes (HERE v8 style)
$areas = [];
foreach ($avoidZones as $zone) {
    // Only avoid zones that are explicitly NOT passable
    if (isset($zone['properties']['is_passable']) && $zone['properties']['is_passable'] === true) {
        continue;
    }
    
    $geom = $zone['geometry'] ?? $zone;
    $coords = $geom['coordinates'] ?? [];
    if ($geom['type'] === 'Polygon' && !empty($coords[0])) {
        $ring = $coords[0];
        $lats = array_column($ring, 1);
        $lngs = array_column($ring, 0);
        $minLat = min($lats); $maxLat = max($lats);
        $minLng = min($lngs); $maxLng = max($lngs);
        // HERE v8 avoid[areas] format: bbox:south,west,north,east (minLat,minLng,maxLat,maxLng)
        $areas[] = "bbox:{$minLat},{$minLng},{$maxLat},{$maxLng}";
    }
}
$avoidParams = !empty($areas) ? "&avoid[areas]=" . implode(";", $areas) : "";

// ── HERE API Request (Ultimate Hybrid Protocol) ──────────────────────────────
$baseUrl = "https://router.hereapi.com/v8/routes";

// Core Routing Parameters (URL)
$queryParams = [
    "origin" => "{$start[1]},{$start[0]}",
    "destination" => "{$end[1]},{$end[0]}",
    "transportMode" => $transportMode,
    "routingMode" => "fast",
    "alternatives" => 6,
    "return" => "polyline,summary,actions,instructions",
    "apiKey" => $HERE_API_KEY
];
$url = $baseUrl . "?" . http_build_query($queryParams);

// Tactical Avoidance (JSON Body)
$avoidAreas = [];
foreach ($avoidZones as $zone) {
    // Only avoid zones that are explicitly NOT passable
    $props = $zone['properties'] ?? [];
    if (isset($props['is_passable']) && $props['is_passable'] === true) {
        continue;
    }

    $geom = $zone['geometry'] ?? $zone;
    $coords = $geom['coordinates'] ?? [];
    if ($geom['type'] === 'Polygon' && !empty($coords[0])) {
        $ring = $coords[0];
        $lats = array_column($ring, 1);
        $lngs = array_column($ring, 0);
        $avoidAreas[] = [
            "type" => "boundingBox",
            "south" => (float)min($lats),
            "west" => (float)min($lngs),
            "north" => (float)max($lats),
            "east" => (float)max($lngs)
        ];
    }
}

$postBody = [];
if (!empty($avoidAreas)) {
    $postBody["avoid"] = ["areas" => $avoidAreas];
}

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postBody));
$res = curl_exec($ch);
$info = curl_getinfo($ch);

$data = json_decode($res, true);
$debug = "--- ULTIMATE-HYBRID REQ: " . date('H:i:s') . " ---\n[URL]: $url\n[BODY]: " . json_encode($postBody) . "\n[HERE] STATUS: " . $info['http_code'] . "\n[HERE] RESPONSE: $res\n\n";
file_put_contents(__DIR__ . '/here_debug.log', $debug, FILE_APPEND);

if ($info['http_code'] !== 200) {
    echo json_encode(['success' => false, 'error' => "HERE API Error: " . $res]);
    exit;
}

// ── Flexible Translation to Mission Standard ────────────────────────────────
$finalRoutes = [];
if (!empty($data['routes'])) {
    foreach ($data['routes'] as $idx => $r) {
        $section = $r['sections'][0] ?? null;
        if (!$section) continue;

        $rawPoly = $section['polyline'] ?? '';
        
        $finalRoutes[] = [
            'type' => 'Feature',
            'properties' => [
                'provider' => 'here',
                'strategy' => $idx === 0 ? 'Fastest' : 'Alternative',
                'intersects' => false,
                'summary' => [
                    'distance' => $section['summary']['length'] ?? 0,
                    'duration' => $section['summary']['duration'] ?? 0
                ],
                'segments' => [[
                    'distance' => $section['summary']['length'] ?? 0,
                    'duration' => $section['summary']['duration'] ?? 0,
                    'steps' => array_map(function($a) {
                        return [
                            'instruction' => $a['instruction'] ?? '',
                            'distance' => $a['length'] ?? 0,
                            'duration' => $a['duration'] ?? 0
                        ];
                    }, $section['actions'] ?? [])
                ]]
            ],
            'geometry' => [
                'type' => 'LineString',
                'coordinates' => [] // Decoded in JS
            ],
            'raw_polyline' => $rawPoly
        ];
    }
}

echo json_encode([
    'success' => true,
    'features' => $finalRoutes,
    'metadata' => ['provider' => 'here']
]);
