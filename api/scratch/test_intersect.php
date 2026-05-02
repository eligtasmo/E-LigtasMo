<?php
function pointInPolygon($lng, $lat, $ring) {
    $inside = false;
    $n = count($ring);
    for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
        $xi = (float)$ring[$i][0]; $yi = (float)$ring[$i][1];
        $xj = (float)$ring[$j][0]; $yj = (float)$ring[$j][1];
        $intersect = (($yi > $lat) != ($yj > $lat)) && ($lng < ($xj - $xi) * ($lat - $yi) / ($yj - $yi) + $xi);
        if ($intersect) $inside = !$inside;
    }
    return $inside;
}

function routeIntersectsZones($coords, $avoidRings) {
    $n = count($coords);
    if ($n === 0) return false;
    
    // To have high resolution, we first build a dense array of points
    $denseCoords = [];
    for ($i = 0; $i < $n - 1; $i++) {
        $p1 = $coords[$i]; $p2 = $coords[$i+1];
        $denseCoords[] = $p1;
        $dist = sqrt(pow($p2[0]-$p1[0], 2) + pow($p2[1]-$p1[1], 2));
        $steps = ceil($dist / 0.0001); // ~10m resolution
        if ($steps > 1) {
            for ($s = 1; $s < $steps; $s++) {
                $t = $s / $steps;
                $denseCoords[] = [$p1[0] + ($p2[0]-$p1[0])*$t, $p1[1] + ($p2[1]-$p1[1])*$t];
            }
        }
    }
    $denseCoords[] = $coords[$n - 1];
    $dn = count($denseCoords);
    
    foreach ($avoidRings as $ring) {
        $startIn = pointInPolygon($denseCoords[0][0], $denseCoords[0][1], $ring);
        $endIn = pointInPolygon($denseCoords[$dn-1][0], $denseCoords[$dn-1][1], $ring);
        
        if ($startIn && $endIn) {
            // Completely inside or starts/ends in the same zone. Ignore.
            continue;
        }
        
        // We track the state transitions.
        // State 0: Haven't exited start zone yet (if startIn) OR haven't entered yet (if !startIn)
        // State 1: Outside the zone.
        // State 2: Re-entered the zone (if startIn) OR entered the destination zone (if endIn)
        // State 3: Exited destination zone (Violation)
        
        $currentState = $startIn ? 0 : 1; 
        
        for ($i = 1; $i < $dn; $i++) {
            $pt = $denseCoords[$i];
            $inZone = pointInPolygon($pt[0], $pt[1], $ring);
            
            if ($currentState === 0) {
                // We started inside. Waiting to exit.
                if (!$inZone) {
                    $currentState = 1; // Exited!
                }
            } elseif ($currentState === 1) {
                // We are outside.
                if ($inZone) {
                    if ($endIn) {
                        $currentState = 2; // Entered the destination zone. Allowed once.
                    } else {
                        return true; // Entered a zone we shouldn't be in! Violation!
                    }
                }
            } elseif ($currentState === 2) {
                // We entered the destination zone. Waiting to reach the end.
                if (!$inZone) {
                    return true; // We left the destination zone before the end! Violation!
                }
            }
        }
    }
    
    return false;
}
echo "OK\n";
