<?php
// Disable error reporting of notices/warnings to prevent breaking JSON output
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: *');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Ensure no previous output (like BOM or whitespace) exists
if (ob_get_level()) ob_end_clean();

function fetch_json($url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // In case of local dev SSL issues
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'User-Agent: ELIGTASMO-App/1.0',
        'Accept: application/json'
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($httpCode !== 200 || $resp === false) return null;
    $data = json_decode($resp, true);
    return is_array($data) ? $data : null;
}

try {
    $q = isset($_GET['q']) ? trim($_GET['q']) : '';
    if ($q === '') {
        echo json_encode(['success' => false, 'message' => 'Empty query', 'results' => []]);
        exit;
    }

    $results = [];
    $data = null;
    
    if (strlen($q) >= 2) {
        // 1. Try Nominatim (Priority Viewbox)
        $scViewbox = '121.3500,14.3500,121.5000,14.2000';
        $nomiUrl = 'https://nominatim.openstreetmap.org/search?format=json&' .
            'q=' . urlencode($q) .
            '&viewbox=' . $scViewbox .
            '&bounded=0&limit=30&addressdetails=1';
        $data = fetch_json($nomiUrl);

        // 2. Fallback to Photon if Nominatim fails or returns nothing
        if (empty($data)) {
            $photonUrl = 'https://photon.komoot.io/api/?' .
                'q=' . urlencode($q) .
                '&lang=en&limit=30';
            $pData = fetch_json($photonUrl);
            if (is_array($pData) && isset($pData['features']) && is_array($pData['features'])) {
                $data = [];
                foreach ($pData['features'] as $f) {
                    $coords = $f['geometry']['coordinates'] ?? null;
                    if (!is_array($coords) || count($coords) < 2) continue;
                    $props = $f['properties'] ?? [];
                    
                    // Format Photon results to match Nominatim structure
                    $data[] = [
                        'place_id' => $props['osm_id'] ?? (string)microtime(true),
                        'display_name' => ($props['name'] ?? '') . 
                                         (isset($props['street']) ? ', ' . $props['street'] : '') . 
                                         (isset($props['city']) ? ', ' . $props['city'] : '') . 
                                         (isset($props['state']) ? ', ' . $props['state'] : ''),
                        'lat' => $coords[1],
                        'lon' => $coords[0],
                        'type' => $props['type'] ?? 'Location',
                        'address' => [
                            'city' => $props['city'] ?? '',
                            'state' => $props['state'] ?? '',
                            'province' => $props['district'] ?? ''
                        ]
                    ];
                }
            }
        }
    }

    if ($data !== null && is_array($data)) {
        $idx = 0;
        foreach ($data as $item) {
            $lat = isset($item['lat']) ? floatval($item['lat']) : null;
            $lon = isset($item['lon']) ? floatval($item['lon']) : null;
            if ($lat === null || $lon === null) continue;

            $name = isset($item['display_name']) ? $item['display_name'] : '';
            $addr = isset($item['address']) ? $item['address'] : [];
            
            // Check if it's in Santa Cruz, Laguna for prioritization
            $isSantaCruz = false;
            if (is_array($addr)) {
                $cityMatch = false; $provMatch = false;
                foreach (['city', 'town', 'municipality', 'village'] as $k) {
                    if (isset($addr[$k]) && stripos((string)$addr[$k], 'Santa Cruz') !== false) $cityMatch = true;
                }
                foreach (['state', 'province', 'region', 'county', 'province'] as $k) {
                    if (isset($addr[$k]) && stripos((string)$addr[$k], 'Laguna') !== false) $provMatch = true;
                }
                $isSantaCruz = $cityMatch && $provMatch;
            }

            // Ensure unique ID by combining place_id with an index
            $uniqueId = (isset($item['place_id']) ? $item['place_id'] : 'loc') . '-' . $idx;
            $idx++;

            $results[] = [
                'id' => $uniqueId,
                'title' => $name,
                'latitude' => $lat,
                'longitude' => $lon,
                'type' => isset($item['type']) ? $item['type'] : 'Location',
                'priority' => $isSantaCruz ? 1 : 0
            ];
        }
    }

    // Sort results: Priority 1 first
    usort($results, function($a, $b) {
        return $b['priority'] <=> $a['priority'];
    });

    echo json_encode(['success' => true, 'results' => array_values($results)]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server Error: ' . $e->getMessage(), 'results' => []]);
}
?>
