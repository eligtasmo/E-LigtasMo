<?php
error_reporting(0);
ini_set('display_errors', 0);
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';

// ── Configuration & Input ──────────────────────────────────────────────────
// loadEnv is already defined in env_helper.php via db.php
loadEnv(__DIR__ . '/../.env');

try {
    $MAPBOX_TOKEN = getenv('VITE_MAPBOX_ACCESS_TOKEN') ?: (getenv('MAPBOX_ACCESS_TOKEN') ?: getenv('EXPO_PUBLIC_MAPBOX_TOKEN'));
    if (!$MAPBOX_TOKEN || strlen($MAPBOX_TOKEN) < 20) {
        $MAPBOX_TOKEN = 'pk.eyJ1IjoiaXNoZWVjaGFuMTEiLCJhIjoiY21tbTV5cTVvMjduZTJycHM3NGhqbGJpaSJ9.IPJeEJ6qwGE3C1_dlo5BLw';
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $logMsg = "[DEBUG] Request at " . date('Y-m-d H:i:s') . "\n";
    $logMsg .= "Profile: " . ($input['profile'] ?? 'N/A') . "\n";
    $logMsg .= "Hazards Count: " . count($input['avoid_zones'] ?? []) . "\n";
    file_put_contents(__DIR__ . '/route_debug.log', $logMsg, FILE_APPEND);

    $start = $input['start'] ?? null;
    $end = $input['end'] ?? null;

    if (!$start && isset($input['coordinates'][0]))
        $start = $input['coordinates'][0];
    if (!$end && isset($input['coordinates'][1]))
        $end = $input['coordinates'][1];

    if (!$start)
        $start = [121.41, 14.30];
    if (!$end)
        $end = [121.42, 14.31];

    $profile = $input['profile'] ?? 'driving-car';
    $avoidZones = $input['avoid_zones'] ?? []; // GeoJSON Features/Geometries

    $startLng = (float) $start[0];
    $startLat = (float) $start[1];
    $endLng = (float) $end[0];
    $endLat = (float) $end[1];

    // Tactical Profile Resolution
    $profileMap = [
        'driving' => 'mapbox/driving',
        'walking' => 'mapbox/walking',
        'cycling' => 'mapbox/cycling',
        'driving-car' => 'mapbox/driving',
        'walking-foot' => 'mapbox/walking',
        'on_foot' => 'mapbox/walking'
    ];
    $mapboxProfile = $profileMap[$profile] ?? 'mapbox/driving';

    // Annotations must match profile capabilities
    $annotations = "duration,distance";
    if (strpos($mapboxProfile, 'driving') !== false) {
        $annotations .= ",maxspeed,congestion";
    }

    // Tactical Speed Factors (Mapbox Duration Multipliers)
    $speedFactor = 1.0;
    if ($profile === 'driving-hgv') {
        $speedFactor = 0.75; // Slower for heavy tactical vehicles
    } else if (strpos($profile, 'motorcycle') !== false) {
        $speedFactor = 1.15; // Faster for agile mission units
    } else if (strpos($profile, 'walking') !== false || strpos($profile, 'foot') !== false) {
        $speedFactor = 1.0; // Keep Mapbox native walking speed
    } else if (strpos($profile, 'cycling') !== false) {
        $speedFactor = 1.0; // Keep Mapbox native cycling speed
    }

    $baseUrl = "https://api.mapbox.com/directions/v5/{$mapboxProfile}";
    $baseParams = "?access_token={$MAPBOX_TOKEN}&geometries=geojson&steps=true&overview=full&annotations={$annotations}";

    // ── Tactical Helper Functions ───────────────────────────────────────────────

    function pointInPolygon($lng, $lat, $ring)
    {
        $lng = (float) $lng;
        $lat = (float) $lat;
        $count = count($ring);
        $inside = false;
        for ($i = 0, $j = $count - 1; $i < $count; $j = $i++) {
            $xi = (float) $ring[$i][0];
            $yi = (float) $ring[$i][1];
            $xj = (float) $ring[$j][0];
            $yj = (float) $ring[$j][1];
            if ((($yi > $lat) != ($yj > $lat)) && ($lng < ($xj - $xi) * ($lat - $yi) / ($yj - $yi) + $xi)) {
                $inside = !$inside;
            }
        }
        return $inside;
    }

    function extractRings($geom)
    {
        $rings = [];
        if (!is_array($geom))
            return [];

        // Check if it's a Feature with properties
        $isHardBlock = false;
        if (($geom['type'] ?? '') === 'Feature') {
            $props = $geom['properties'] ?? [];
            if (isset($props['is_passable']) && $props['is_passable'] === false) {
                $isHardBlock = true;
            }
            $geom = $geom['geometry'] ?? [];
        }

        $type = $geom['type'] ?? '';
        $coords = $geom['coordinates'] ?? [];

        $currentRings = [];
        if ($type === 'Polygon' && !empty($coords[0])) {
            $currentRings[] = $coords[0];
        } elseif ($type === 'MultiPolygon') {
            foreach ($coords as $p)
                if (!empty($p[0]))
                    $currentRings[] = $p[0];
        } elseif ($type === 'Point' && !empty($coords)) {
            $lng = $coords[0];
            $lat = $coords[1];
            $radiusKm = $isHardBlock ? 0.6 : 0.4;

            // High-precision circular ring (64 points)
            $ringCoords = [];
            $kmPerDegreeLat = 111.32;
            $kmPerDegreeLng = 40075 * cos($lat * M_PI / 180) / 360;
            for ($i = 0; $i <= 64; $i++) {
                $angle = ($i * 360) / 64;
                $rad = $angle * M_PI / 180;
                $px = $lng + ($radiusKm * sin($rad)) / $kmPerDegreeLng;
                $py = $lat + ($radiusKm * cos($rad)) / $kmPerDegreeLat;
                $ringCoords[] = [$px, $py];
            }
            $currentRings[] = $ringCoords;
        }

        foreach ($currentRings as $r) {
            $rings[] = ['coords' => $r, 'hard' => $isHardBlock];
        }
        return $rings;
    }

    function segmentsIntersect($a, $b, $c, $d)
    {
        $p0_x = (float) $a[0];
        $p0_y = (float) $a[1];
        $p1_x = (float) $b[0];
        $p1_y = (float) $b[1];
        $p2_x = (float) $c[0];
        $p2_y = (float) $c[1];
        $p3_x = (float) $d[0];
        $p3_y = (float) $d[1];

        $s1_x = $p1_x - $p0_x;
        $s1_y = $p1_y - $p0_y;
        $s2_x = $p3_x - $p2_x;
        $s2_y = $p3_y - $p2_y;

        $s = (-$s1_y * ($p0_x - $p2_x) + $s1_x * ($p0_y - $p2_y)) / (-$s2_x * $s1_y + $s1_x * $s2_y + 1e-20);
        $t = ($s2_x * ($p0_y - $p2_y) - $s2_y * ($p0_x - $p2_x)) / (-$s2_x * $s1_y + $s1_x * $s2_y + 1e-20);

        return ($s >= 0 && $s <= 1 && $t >= 0 && $t <= 1);
    }

    function evaluateRouteSafety($coords, $avoidRings)
    {
        if (empty($avoidRings))
            return ['intersects' => false, 'hard_block' => false, 'hazard_dist' => 0];

        $intersects = false;
        $hardBlock = false;
        $minDist = 999999;

        foreach ($coords as $p) {
            foreach ($avoidRings as $ring) {
                if (pointInPolygon($p[0], $p[1], $ring['coords'])) {
                    $intersects = true;
                    if ($ring['hard'])
                        $hardBlock = true;
                }
            }
        }
        return ['intersects' => $intersects, 'hard_block' => $hardBlock, 'hazard_dist' => $minDist];
    }
    function isUniqueRoute($newRoute, $existingRoutes)
    {
        if (empty($existingRoutes))
            return true;
        $newCoords = $newRoute['geometry']['coordinates'] ?? [];
        if (count($newCoords) < 3)
            return false;

        // Sample 3 points along the route (25%, 50%, 75%) to detect spatial variance
        $indices = [floor(count($newCoords) * 0.25), floor(count($newCoords) * 0.5), floor(count($newCoords) * 0.75)];

        foreach ($existingRoutes as $ex) {
            $exCoords = $ex['geometry']['coordinates'] ?? [];
            if (empty($exCoords))
                continue;

            $isDifferent = false;
            foreach ($indices as $idx) {
                $p1 = $newCoords[$idx];
                $exIdx = floor(($idx / count($newCoords)) * count($exCoords));
                $p2 = $exCoords[$exIdx] ?? $exCoords[0];

                $dLng = $p1[0] - $p2[0];
                $dLat = $p1[1] - $p2[1];
                $dist = sqrt($dLng * $dLng + $dLat * $dLat);

                // Robust spatial variance: If any sample point is > 300m apart (0.003 deg), routes are unique
                if ($dist > 0.003) {
                    $isDifferent = true;
                    break;
                }
            }

            if (!$isDifferent) {
                // If spatially identical, check distance as final fallback (2% threshold)
                $newDist = $newRoute['properties']['summary']['distance'];
                $exDist = $ex['properties']['summary']['distance'];
                if (abs($newDist - $exDist) / max($newDist, 1) < 0.02)
                    return false;
            }
        }
        return true;
    }

    function routeToFeature($route, $strategy, $safety, $speedFactor = 1.0)
    {
        $geomCoords = $route['geometry']['coordinates'] ?? [];
        // Round for cleaner JSON and mobile compatibility
        $roundedCoords = array_map(function ($c) {
            return [round($c[0], 6), round($c[1], 6)];
        }, $geomCoords);

        $distMeters = (float) ($route['distance'] ?? 0);
        $durationSec = (float) ($route['duration'] ?? 0) / $speedFactor; // Apply tactical speed scaling
        $rawSteps = $route['legs'][0]['steps'] ?? [];

        $steps = array_map(function ($s) {
            $m = $s['maneuver'] ?? [];
            $s['instruction'] = $m['instruction'] ?? '';
            return $s;
        }, $rawSteps);

        return [
            'type' => 'Feature',
            'properties' => [
                'provider' => 'mapbox',
                'strategy' => $strategy,
                'intersects' => $safety['intersects'],
                'hard_block' => $safety['hard_block'],
                'hazard_dist' => $safety['hazard_dist'],
                'summary' => [
                    'distance' => $distMeters,
                    'duration' => $durationSec
                ],
                'segments' => [
                    [
                        'distance' => $distMeters,
                        'duration' => $durationSec,
                        'steps' => $steps
                    ]
                ]
            ],
            'geometry' => [
                'type' => 'LineString',
                'coordinates' => $roundedCoords
            ]
        ];
    }

    // ── Build Avoid Rings ───────────────────────────────────────────────────────
    $avoidRings = [];
    foreach ($avoidZones as $zone) {
        // Only avoid zones that are explicitly NOT passable
        $props = $zone['properties'] ?? [];
        if (isset($props['is_passable']) && $props['is_passable'] === true) {
            continue;
        }

        $rings = extractRings($zone);
        foreach ($rings as $r)
            $avoidRings[] = $r;
    }
    error_log("Evaluating route with " . count($avoidRings) . " avoid rings.");
    $hasAvoid = !empty($avoidRings);
    // Add radiuses to prevent snapping to dead-end alleys (500m tolerance)
    $snapRadius = "500;500;500";

    // ── High-Resiliency Network Fetcher ───────────────────────────────────────
    function tacticalFetch($url)
    {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Essential for some local environments
        curl_setopt($ch, CURLOPT_USERAGENT, 'ELigtasMo-Tactical-Engine/1.0');
        $res = curl_exec($ch);
        $info = curl_getinfo($ch);
        $err = curl_error($ch);

        $log = "[FETCH] URL: {$url}\n[FETCH] Status: {$info['http_code']}\n";
        if ($err)
            $log .= "[FETCH] Error: {$err}\n";
        file_put_contents(__DIR__ . '/route_debug.log', $log, FILE_APPEND);

        return ($info['http_code'] >= 200 && $info['http_code'] < 300) ? $res : null;
    }

    // ── Tactical Route Acquisition (High Efficiency) ──────────────────────────
    $allFound = [];
    // Standardize safety response
    $safetyDefaults = ['intersects' => false, 'hard_block' => false, 'hazard_dist' => 0];

    // Phase 1: Request Primary & Natural Alternatives (Mapbox Native)
    $directUrl = "{$baseUrl}/{$startLng},{$startLat};{$endLng},{$endLat}{$baseParams}&alternatives=true&radiuses=50;50";
    $res = tacticalFetch($directUrl);
    file_put_contents(__DIR__ . '/route_debug.txt', "--- [" . date('Y-m-d H:i:s') . "] RAW RESPONSE ---\n" . ($res ?? 'NULL') . "\n\n", FILE_APPEND);

    if (!$res) {
        throw new Exception("Tactical Comms Failure: Mapbox API is unreachable or token is invalid. Please check your satellite connection.");
    }

    $data = json_decode($res, true);
    if (isset($data['code']) && $data['code'] !== 'Ok') {
        throw new Exception("Mission Error: Mapbox returned '{$data['code']}' - " . ($data['message'] ?? 'Unknown tactical error'));
    }

    if (!empty($data['routes'])) {
        foreach ($data['routes'] as $idx => $r) {
            $safety = $hasAvoid ? evaluateRouteSafety($r['geometry']['coordinates'], $avoidRings) : $safetyDefaults;
            $allFound[] = routeToFeature($r, "primary_{$idx}", $safety, $speedFactor);
        }
    }

    // Phase 2: Strategic Synthetic Alternates (Force Unique Corridors)
    if (count($allFound) < 3) {
        $missionDist = sqrt(pow($endLng - $startLng, 2) + pow($endLat - $startLat, 2));
        $missionBearing = atan2($endLat - $startLat, $endLng - $startLng);

        // Tactical nudge points (25%, 50%, 75%)
        $nudgeSpecs = [
            ['at' => 0.40, 'side' => 1, 'push' => 0.25], // 40% along, push right hard
            ['at' => 0.60, 'side' => -1, 'push' => 0.25], // 60% along, push left hard
            ['at' => 0.50, 'side' => 1, 'push' => 0.40]  // 50% along, deep push right
        ];

        foreach ($nudgeSpecs as $spec) {
            if (count($allFound) >= 3)
                break;

            $mX = $startLng + ($endLng - $startLng) * $spec['at'];
            $mY = $startLat + ($endLat - $startLat) * $spec['at'];

            // Calculate perpendicular nudge
            $perp = $missionBearing + ($spec['side'] * M_PI / 2);
            $nX = $mX + (cos($perp) * $missionDist * $spec['push']);
            $nY = $mY + (sin($perp) * $missionDist * $spec['push']);

            $altUrl = "{$baseUrl}/{$startLng},{$startLat};{$nX},{$nY};{$endLng},{$endLat}{$baseParams}&alternatives=false";
            $resAlt = tacticalFetch($altUrl);
            if ($resAlt) {
                $dataAlt = json_decode($resAlt, true);
                if (!empty($dataAlt['routes'])) {
                    $r = $dataAlt['routes'][0];
                    $safety = $hasAvoid ? evaluateRouteSafety($r['geometry']['coordinates'], $avoidRings) : $safetyDefaults;
                    $feat = routeToFeature($r, "strategic_" . count($allFound), $safety, $speedFactor);
                    if (isUniqueRoute($feat, $allFound)) {
                        $allFound[] = $feat;
                    }
                }
            }
        }
    }

    // Phase 3: Strategic Flanking (Multi-Hazard & Perpendicular Offsets)
    if (count($allFound) < 10 && $hasAvoid) {
        try {
            // Calculate main mission bearing to determine perpendicular "push" directions
            $missionBearing = atan2($endLat - $startLat, $endLng - $startLng);
            $perpBearing1 = $missionBearing + M_PI / 2;
            $perpBearing2 = $missionBearing - M_PI / 2;

            // Analyze the first 3 hazards in the path area
            $hazardsToFlank = array_slice($avoidRings, 0, 3);
            foreach ($hazardsToFlank as $hIdx => $h) {
                $ring = $h['coords'];
                $minLng = min(array_column($ring, 0));
                $maxLng = max(array_column($ring, 0));
                $minLat = min(array_column($ring, 1));
                $maxLat = max(array_column($ring, 1));
                $cX = ($minLng + $maxLng) / 2;
                $cY = ($minLat + $maxLat) / 2;
                $radius = max($maxLng - $minLng, $maxLat - $minLat) / 2 + 0.008;

                // Points: 2 Perpendicular "Pushes" + 2 Diagonal Flanks
                $offsets = [
                    [cos($perpBearing1) * $radius, sin($perpBearing1) * $radius],
                    [cos($perpBearing2) * $radius, sin($perpBearing2) * $radius],
                    [cos($perpBearing1 + M_PI / 4) * $radius, sin($perpBearing1 + M_PI / 4) * $radius],
                    [cos($perpBearing2 - M_PI / 4) * $radius, sin($perpBearing2 - M_PI / 4) * $radius]
                ];

                foreach ($offsets as $off) {
                    $px = $cX + $off[0];
                    $py = $cY + $off[1];
                    $detourUrl = "{$baseUrl}/{$startLng},{$startLat};{$px},{$py};{$endLng},{$endLat}{$baseParams}&radiuses=50;50;50";
                    $detourRes = tacticalFetch($detourUrl);
                    if ($detourRes) {
                        $dData = json_decode($detourRes, true);
                        if (!empty($dData['routes'])) {
                            foreach ($dData['routes'] as $rIdx => $r) {
                                $safety = evaluateRouteSafety($r['geometry']['coordinates'], $avoidRings);
                                $candidate = routeToFeature($r, "flank_{$hIdx}_{$rIdx}", $safety, $speedFactor);
                                if (isUniqueRoute($candidate, $allFound))
                                    $allFound[] = $candidate;
                            }
                        }
                    }
                    if (count($allFound) >= 15)
                        break 2;
                }
            }
        } catch (Exception $e) {
        }
    }

    // ── Strategic Slot Selection (Fastest, Balanced, Safer) ─────────────────────
    $tier1 = array_values(array_filter($allFound, fn($r) => !$r['properties']['intersects']));
    $tier2 = array_values(array_filter($allFound, fn($r) => $r['properties']['intersects'] && !$r['properties']['hard_block']));
    $tier3 = array_values(array_filter($allFound, fn($r) => $r['properties']['hard_block']));

    // Sort all tiers by duration
    usort($tier1, fn($a, $b) => (int) $a['properties']['summary']['duration'] <=> (int) $b['properties']['summary']['duration']);
    usort($tier2, fn($a, $b) => (int) $a['properties']['summary']['duration'] <=> (int) $b['properties']['summary']['duration']);
    usort($tier3, fn($a, $b) => (int) $a['properties']['summary']['duration'] <=> (int) $b['properties']['summary']['duration']);

    $finalRoutes = [];

    // Slot 1: FASTEST (Priority to Safe, then Tier 2)
    if (!empty($tier1))
        $finalRoutes[] = array_shift($tier1);
    else if (!empty($tier2))
        $finalRoutes[] = array_shift($tier2);
    else if (!empty($tier3))
        $finalRoutes[] = array_shift($tier3);

    // Slot 2: BALANCED / ALTERNATIVE (Clean if possible, otherwise least hazard)
    $pool = array_merge($tier1, $tier2, $tier3);
    foreach ($pool as $idx => $candidate) {
        if (count($finalRoutes) >= 2)
            break;
        if (isUniqueRoute($candidate, $finalRoutes)) {
            $finalRoutes[] = $candidate;
            unset($pool[$idx]);
        }
    }

    // Slot 3: SAFER / DIVERSE (Ensure it's a completely different path if available)
    foreach ($pool as $candidate) {
        if (count($finalRoutes) >= 3)
            break;
        if (isUniqueRoute($candidate, $finalRoutes)) {
            $finalRoutes[] = $candidate;
        }
    }
    $finalRoutes = array_slice($finalRoutes, 0, 3);

    // Hard Fallback: If we still don't have 3, just take any unique ones from allFound
    if (count($finalRoutes) < 3) {
        foreach ($allFound as $candidate) {
            if (count($finalRoutes) >= 3)
                break;
            if (isUniqueRoute($candidate, $finalRoutes))
                $finalRoutes[] = $candidate;
        }
    }

    $isTotalBlock = count($tier1) === 0 && count($tier2) === 0 && count($tier3) > 0;

    echo json_encode([
        'success' => true,
        'features' => $finalRoutes,
        'metadata' => [
            'is_total_block' => $isTotalBlock,
            'tier1_count' => count($tier1),
            'tier2_count' => count($tier2),
            'tier3_count' => count($tier3),
            'total_found' => count($allFound)
        ]
    ]);
} catch (Throwable $e) {
    file_put_contents(__DIR__ . '/route_debug.log', "[FATAL ERROR] " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine() . "\n", FILE_APPEND);
    // Return 200 so the mobile app can parse the actual 'error' message
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'file' => basename($e->getFile()), 'line' => $e->getLine()]);
}





