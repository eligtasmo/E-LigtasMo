<?php
// Proxy endpoint to call OpenRouteService Directions API server-side to avoid CORS
require_once __DIR__ . '/cors.php';

header('Content-Type: application/json');

// Read JSON body
$raw = file_get_contents('php://input');
$input = json_decode($raw, true);

if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON body']);
    exit;
}

// Validate and sanitize inputs
$profile = isset($input['profile']) ? preg_replace('/[^a-z\-]/', '', $input['profile']) : 'driving-car';
$coordinates = $input['coordinates'] ?? null;

if (!is_array($coordinates) || count($coordinates) < 2) {
    http_response_code(400);
    echo json_encode(['error' => 'coordinates must include at least start and end [lng,lat] pairs']);
    exit;
}

// Build body to forward to ORS; pass through selected optional keys
$forwardBody = [
    'coordinates' => $coordinates,
];

$optionalKeys = ['instructions', 'continue_straight', 'geometry_simplify', 'radiuses', 'options', 'alternative_routes', 'geometry_format', 'units', 'preference'];
foreach ($optionalKeys as $key) {
    if (array_key_exists($key, $input)) {
        $forwardBody[$key] = $input[$key];
    }
}

// Helper to convert OSRM maneuver to a human-readable instruction
function osrm_build_instruction($maneuver) {
    $type = isset($maneuver['type']) ? $maneuver['type'] : '';
    $modifier = isset($maneuver['modifier']) ? $maneuver['modifier'] : '';
    switch ($type) {
        case 'depart':
            return 'Head';
        case 'arrive':
            return 'Arrive at destination';
        case 'turn':
            if ($modifier === 'left' || $modifier === 'sharp left') return 'Turn left';
            if ($modifier === 'right' || $modifier === 'sharp right') return 'Turn right';
            if ($modifier === 'slight left') return 'Slight left';
            if ($modifier === 'slight right') return 'Slight right';
            return 'Turn';
        case 'merge':
            return 'Merge';
        case 'on ramp':
            return 'Take ramp';
        case 'off ramp':
            return 'Exit ramp';
        case 'roundabout':
            return 'Enter roundabout';
        case 'fork':
            return 'Keep ' . ($modifier ?: 'straight');
        case 'continue':
        default:
            return 'Continue straight';
    }
}

// Get API key from environment, fallback to known key used in frontend (can be replaced in prod)
$apiKey = getenv('OPENROUTESERVICE_API_KEY');
if (!$apiKey || $apiKey === '') {
    $apiKey = '5b3ce3597851110001cf6248d40a71b0b51c4c9eb9927348e7276122';
}

$useGeojson = false;
if (isset($input['geometry_format']) && is_string($input['geometry_format']) && strtolower($input['geometry_format']) === 'geojson') {
    $useGeojson = true;
}
// CRITICAL: avoid_polygons ONLY works on the /geojson ORS endpoint
// Force GeoJSON mode whenever polygon avoidance is requested
$opts = $input['options'] ?? null;
if (is_array($opts) && isset($opts['avoid_polygons'])) {
    $useGeojson = true;
}
if ($useGeojson && isset($forwardBody['geometry_format'])) {
    unset($forwardBody['geometry_format']);
}
if ($useGeojson) {
    $url = "https://api.openrouteservice.org/v2/directions/{$profile}/geojson";
} else {
    $url = "https://api.openrouteservice.org/v2/directions/{$profile}";
}

// The GeoJSON endpoint does NOT support 'alternative_routes'
// Strip it BEFORE serializing the body to avoid a silent 400 error
if ($useGeojson && isset($forwardBody['alternative_routes'])) {
    unset($forwardBody['alternative_routes']);
}

// Execute request via cURL
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: ' . $apiKey,
    'Content-Type: application/json',
    'Accept: ' . ($useGeojson ? 'application/geo+json' : 'application/json')
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($forwardBody));
curl_setopt($ch, CURLOPT_TIMEOUT, 20);

$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Helper to try OSRM if ORS fails or doesn't return enough alternatives
$tryOsrm = false;
$hasAvoidPolygons = false;
try {
    $opts = $input['options'] ?? null;
    if (is_array($opts) && isset($opts['avoid_polygons'])) $hasAvoidPolygons = true;
} catch (Exception $e) { $hasAvoidPolygons = false; }

// Check if ORS succeeded
$orsFeatures = [];
if ($response !== false && $status >= 200 && $status < 300) {
    $json = json_decode($response, true);

    if ($useGeojson && isset($json['features']) && is_array($json['features']) && count($json['features']) > 0) {
        foreach ($json['features'] as $f) {
            if (!isset($f['properties']) || !is_array($f['properties'])) $f['properties'] = [];
            $f['properties']['provider'] = 'ors';
            // GeoJSON endpoint nests steps inside properties.segments already — ensure key exists
            if (!isset($f['properties']['segments'])) $f['properties']['segments'] = [];
            $orsFeatures[] = $f;
        }
    }

    // Handle standard JSON response (not GeoJSON)
    if (!$useGeojson && isset($json['routes']) && is_array($json['routes'])) {
        foreach ($json['routes'] as $route) {
            $orsFeatures[] = [
                'type' => 'Feature',
                'properties' => [
                    'provider' => 'ors',
                    'summary' => $route['summary'] ?? ['distance' => 0, 'duration' => 0],
                    'segments' => $route['segments'] ?? [],
                    'way_points' => $route['way_points'] ?? []
                ],
                'geometry' => $route['geometry'] ?? null
            ];
        }
    }
    
    // Handle GeoJSON response (fallback)
    if (empty($orsFeatures) && isset($json['features']) && count($json['features']) > 0) {
        foreach ($json['features'] as $f) {
            $f['properties']['provider'] = 'ors';
            $orsFeatures[] = $f;
        }
    }
}

// If avoid_polygons is provided, do NOT use OSRM fallback (OSRM cannot honor polygons)
if ($hasAvoidPolygons) {
    if (!empty($orsFeatures)) {
        http_response_code(200);
        echo json_encode([
            'type' => 'FeatureCollection',
            'features' => $orsFeatures,
            'metadata' => $json['metadata'] ?? []
        ]);
        exit;
    }
    http_response_code(422);
    $msg = 'No route found with avoid polygons';
    if ($response !== false) {
        $err = json_decode($response, true);
        if (is_array($err) && isset($err['error'])) $msg = $err['error'];
        if (is_array($err) && isset($err['message'])) $msg = $err['message'];
    }
    echo json_encode(['error' => $msg, 'provider' => 'ors']);
    exit;
}

// If ORS gave us fewer than 3 routes, ALWAYS try OSRM to get more options
if (count($orsFeatures) < 3) {
    $tryOsrm = true;
} else {
    // If ORS already gave us 3+ routes, we can just return those
    http_response_code(200);
    echo json_encode([
        'type' => 'FeatureCollection',
        'features' => $orsFeatures,
        'metadata' => $json['metadata'] ?? []
    ]);
    exit;
}

// If we are here, we try OSRM and combine results
$osrmBase = "https://router.project-osrm.org/route/v1/";
$osrmProfile = 'driving';

if (stripos($profile, 'foot') !== false || stripos($profile, 'walk') !== false) { 
    $osrmProfile = 'foot';
    $osrmBase = "https://routing.openstreetmap.de/routed-foot/route/v1/";
} elseif (stripos($profile, 'cycle') !== false || stripos($profile, 'bike') !== false) { 
    $osrmProfile = 'bicycle';
    $osrmBase = "https://routing.openstreetmap.de/routed-bike/route/v1/";
}

$coordStrings = array_map(function($c) { return $c[0] . ',' . $c[1]; }, $coordinates);
$coordPath = implode(';', $coordStrings);

// Always request alternatives from OSRM
$osrmUrl = "{$osrmBase}{$osrmProfile}/{$coordPath}?overview=full&geometries=geojson&steps=true&alternatives=true";
$och = curl_init($osrmUrl);
curl_setopt($och, CURLOPT_RETURNTRANSFER, true);
curl_setopt($och, CURLOPT_TIMEOUT, 15);
$oResponse = curl_exec($och);
$oStatus = curl_getinfo($och, CURLINFO_HTTP_CODE);
curl_close($och);

$combinedFeatures = $orsFeatures;

if ($oResponse && $oStatus >= 200 && $oStatus < 300) {
    $oJson = json_decode($oResponse, true);
    if (is_array($oJson) && isset($oJson['routes']) && count($oJson['routes']) > 0) {
        foreach ($oJson['routes'] as $route) {
            $summary = [
                'distance' => isset($route['distance']) ? $route['distance'] : 0,
                'duration' => isset($route['duration']) ? $route['duration'] : 0,
            ];
            
            // Deduplicate: Don't add OSRM route if it's identical to an ORS route (by distance)
            $isDup = false;
            foreach ($combinedFeatures as $existing) {
                if (abs($existing['properties']['summary']['distance'] - $summary['distance']) < 10) {
                    $isDup = true;
                    break;
                }
            }
            
            if (!$isDup) {
                $steps = [];
                if (isset($route['legs'][0]['steps']) && is_array($route['legs'][0]['steps'])) {
                    foreach ($route['legs'][0]['steps'] as $st) {
                        $steps[] = [
                            'distance' => isset($st['distance']) ? $st['distance'] : 0,
                            'duration' => isset($st['duration']) ? $st['duration'] : 0,
                            'instruction' => osrm_build_instruction(isset($st['maneuver']) ? $st['maneuver'] : []),
                            'name' => isset($st['name']) && $st['name'] !== '' ? $st['name'] : '-',
                        ];
                    }
                }
                $combinedFeatures[] = [
                    'type' => 'Feature',
                    'properties' => [
                        'provider' => 'osrm',
                        'profile' => $osrmProfile,
                        'summary' => $summary,
                        'segments' => [[ 'distance' => $summary['distance'], 'duration' => $summary['duration'], 'steps' => $steps ]],
                    ],
                    'geometry' => [
                        'type' => 'LineString',
                        'coordinates' => $route['geometry']['coordinates'],
                    ],
                ];
            }
        }
    }
}

// Return combined results
http_response_code(200);
echo json_encode([
    'type' => 'FeatureCollection',
    'features' => $combinedFeatures,
    'metadata' => ['ors_count' => count($orsFeatures), 'total_count' => count($combinedFeatures)]
]);
exit;

// Final fallback: direct segment
http_response_code(200);
echo json_encode([
    'type' => 'FeatureCollection',
    'features' => [[
        'type' => 'Feature',
        'properties' => [
            'warning' => 'Routing providers down, using direct segment',
            'profile' => $profile,
        ],
        'geometry' => [
            'type' => 'LineString',
            'coordinates' => $coordinates,
        ],
    ]],
]);
exit;
