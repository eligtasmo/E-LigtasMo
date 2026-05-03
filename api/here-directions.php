<?php
error_reporting(0);
ini_set('display_errors', 0);
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';

// ── Configuration & Input ──────────────────────────────────────────────────
// loadEnv is already called in env_helper.php via db.php
// loadEnv(__DIR__ . '/../.env'); // Redundant fallback

try {
    file_put_contents(__DIR__ . '/here_debug.log', "--- REQ: " . date('Y-m-d H:i:s') . " ---\n", FILE_APPEND);

    $HERE_API_KEY = getenv('HERE_API_KEY') ?: getenv('EXPO_PUBLIC_HERE_API_KEY');
    if (!$HERE_API_KEY) {
        throw new Exception('HERE_API_KEY missing in .env');
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $start = $input['coordinates'][0] ?? null;
    $end   = $input['coordinates'][1] ?? null;

    $debugInput = "[INPUT] START: " . json_encode($start) . " | END: " . json_encode($end) . "\n";
    file_put_contents(__DIR__ . '/here_debug.log', $debugInput, FILE_APPEND);

    if (!$start || !$end) {
        throw new Exception('Incomplete mission coordinates');
    }

    $profile = $input['profile'] ?? 'driving-car';
    $avoidZones = $input['avoid_zones'] ?? [];

    // ── HERE Parameter Mapping ──────────────────────────────────────────────────
    // Tactical Profile Resolution (PHP 7.4+ Compatible)
    $transportMode = 'car';
    switch ($profile) {
        case 'walking':
        case 'foot-walking':
        case 'on_foot':
            $transportMode = 'pedestrian';
            break;
        case 'cycling':
        case 'cycling-regular':
            $transportMode = 'bicycle';
            break;
        case 'truck':
        case 'driving-hgv':
            $transportMode = 'truck';
            break;
        default:
            $transportMode = 'car';
            break;
    }

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

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        throw new Exception("HERE API Error: HTTP {$httpCode}");
    }

    $data = json_decode($response, true);
    if (!isset($data['routes']) || empty($data['routes'])) {
        throw new Exception("No tactical routes found in sector.");
    }

    // ── Strategic Route Parsing ──────────────────────────────────────────────────
    $finalRoutes = [];
    foreach ($data['routes'] as $idx => $route) {
        if (count($finalRoutes) >= 3) break;
        
        $section = $route['sections'][0] ?? null;
        if (!$section) continue;

        $rawPoly = $section['polyline'] ?? '';
        
        $finalRoutes[] = [
            'type' => 'Feature',
            'properties' => [
                'provider' => 'here',
                'strategy' => "here_alt_{$idx}",
                'intersects' => !empty($areas),
                'hard_block' => false,
                'hazard_dist' => 0,
                'summary' => [
                    'distance' => $section['summary']['length'] ?? 0,
                    'duration' => $section['summary']['duration'] ?? 0,
                    'steps' => array_map(function($a) {
                        return [
                            'instruction' => $a['instruction'] ?? '',
                            'distance' => $a['length'] ?? 0,
                            'duration' => $a['duration'] ?? 0
                        ];
                    }, $section['actions'] ?? [])
                ]
            ],
            'geometry' => [
                'type' => 'LineString',
                'coordinates' => [] // Decoded in JS
            ],
            'raw_polyline' => $rawPoly
        ];
    }

    echo json_encode([
        'success' => true,
        'features' => $finalRoutes,
        'metadata' => ['provider' => 'here']
    ]);

} catch (Throwable $e) {
    file_put_contents(__DIR__ . '/here_debug.log', "[FATAL ERROR] " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine() . "\n", FILE_APPEND);
    http_response_code(200);
    echo json_encode([
        'success' => false, 
        'error' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ]);
}
