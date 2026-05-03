<?php
/**
 * Shared tactical helpers for unified incident management
 */

function normalize_geometry($raw) {
    if (!$raw) return null;
    if (is_string($raw)) {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) $raw = $decoded;
    }
    if (!is_array($raw)) return null;
    return json_encode($raw);
}

function calculate_bbox($geojson) {
    if (!$geojson) return null;
    $data = is_string($geojson) ? json_decode($geojson, true) : $geojson;
    if (!$data) return null;

    $pairs = [];
    $extract = function($geom) use (&$pairs, &$extract) {
        if (!is_array($geom)) return;
        if (isset($geom['type']) && isset($geom['coordinates'])) {
            $extract($geom['coordinates']);
        } elseif (isset($geom['geometry']) && is_array($geom['geometry'])) {
            $extract($geom['geometry']['coordinates']);
        } elseif (count($geom) > 0 && is_numeric($geom[0])) {
            $pairs[] = [(float)$geom[0], (float)$geom[1]];
        } else {
            foreach ($geom as $child) $extract($child);
        }
    };
    $extract($data);

    if (empty($pairs)) return null;

    $minLng = $pairs[0][0]; $maxLng = $pairs[0][0];
    $minLat = $pairs[0][1]; $maxLat = $pairs[0][1];
    foreach ($pairs as $p) {
        $minLng = min($minLng, $p[0]); $maxLng = max($maxLng, $p[0]);
        $minLat = min($minLat, $p[1]); $maxLat = max($maxLat, $p[1]);
    }
    return [
        'north' => $maxLat,
        'south' => $minLat,
        'east' => $maxLng,
        'west' => $minLng
    ];
}

function normalize_is_passable($val) {
    if ($val === true || $val === 1 || $val === "1" || $val === "true") return 1;
    return 0;
}
