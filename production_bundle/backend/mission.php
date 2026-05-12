<?php
// /Applications/XAMPP/xamppfiles/htdocs/eligtasmo latest/mission.php
$lat = isset($_GET['lat']) ? $_GET['lat'] : 0;
$lon = isset($_GET['lon']) ? $_GET['lon'] : 0;
$name = isset($_GET['name']) ? htmlspecialchars($_GET['name']) : 'Tactical Target';
$sLat = isset($_GET['sLat']) ? $_GET['sLat'] : null;
$sLon = isset($_GET['sLon']) ? $_GET['sLon'] : null;
$mode = isset($_GET['mode']) ? $_GET['mode'] : 'driving-car';
$prefix = isset($_GET['prefix']) ? $_GET['prefix'] : 'eligtasmo://';

$mapboxToken = "pk.eyJ1IjoiaXNoZWVjaGFuMTEiLCJhIjoiY21tbTV5cTVvMjduZTJycHM3NGhqbGJpaSJ9.IPJeEJ6qwGE3C1_dlo5BLw";

// Ensure prefix ends with a slash if it's the Expo style, or handle custom scheme
// Ensure prefix is handled correctly for Expo Go vs Production
$baseAppUrl = rtrim($prefix, '/');
$isExpo = (strpos($baseAppUrl, 'exp://') === 0);
$separator = $isExpo ? '/--/' : '/';

// Construct App Deep Link
// Use rawurlencode for %20 instead of + for compatibility with React Navigation
$encodedName = rawurlencode($name);
$appLink = "$baseAppUrl{$separator}route-planner/$lat/$lon/$encodedName/$mode/true";
if ($sLat && $sLon) {
    $appLink .= "/$sLat/$sLon";
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>E-LigtasMo | Mission Briefing</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'></script>
    <link href='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css' rel='stylesheet' />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
    <style>
        body, html { margin: 0; padding: 0; height: 100%; font-family: 'Inter', sans-serif; background: #050505; color: #FFF; overflow: hidden; }
        #map { position: absolute; top: 0; bottom: 0; width: 100%; z-index: 1; }
        
        .briefing-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 10;
            background: linear-gradient(to top, rgba(5,5,5,1) 0%, rgba(5,5,5,0.95) 70%, rgba(5,5,5,0) 100%);
            padding: 40px 24px;
            pointer-events: none;
        }

        .briefing-card {
            max-width: 500px;
            margin: 0 auto;
            background: rgba(20, 18, 16, 0.85);
            backdrop-filter: blur(20px);
            border-radius: 32px;
            padding: 24px;
            border: 2px solid rgba(179, 114, 19, 0.2);
            pointer-events: auto;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
            from { transform: translateY(100px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .tag { background: rgba(179, 114, 19, 0.1); color: #B37213; font-size: 10px; font-weight: 800; letter-spacing: 2px; padding: 6px 12px; border-radius: 20px; border: 1px solid rgba(179,114,19,0.2); }
        
        .objective-label { font-size: 10px; color: rgba(255,255,255,0.4); font-weight: 800; letter-spacing: 1px; margin-bottom: 4px; text-transform: uppercase; }
        .objective-name { font-size: 20px; font-weight: 700; color: #FFF; margin: 0; }
        
        .action-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            background: #B37213;
            color: #FFF;
            text-decoration: none;
            padding: 18px;
            border-radius: 20px;
            font-weight: 700;
            font-size: 16px;
            margin-top: 24px;
            transition: all 0.3s ease;
            box-shadow: 0 8px 20px rgba(179, 114, 19, 0.3);
            text-align: center;
        }
        .action-btn:hover { background: #d48a20; transform: translateY(-2px); }
        .action-btn:active { transform: translateY(0); }

        .app-store-prompt {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: rgba(255,255,255,0.4);
        }
        .app-store-prompt a { color: #B37213; text-decoration: none; font-weight: 600; }

        .hazard-marker {
            width: 30px;
            height: 30px;
            background-color: #EF4444;
            border: 2px solid white;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 16px;
        }
    </style>
</head>
<body>

<div id="map"></div>

<div class="briefing-overlay">
    <div class="briefing-card">
        <div class="header">
            <div class="tag">TACTICAL MISSION BRIEF</div>
            <img src="mobile-app/assets/eligtasmo_logo.png" style="height: 24px;" onerror="this.style.display='none'">
        </div>

        <div>
            <div class="objective-label">Assigned Objective</div>
            <h1 class="objective-name"><?php echo $name; ?></h1>
        </div>

        <div style="margin-top: 20px; background: rgba(255,255,255,0.03); padding: 16px; border-radius: 16px;">
            <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 8px;">INTELLIGENCE SUMMARY</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 10px; font-weight: 700; background: rgba(103,153,73,0.1); color: #679949; padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(103,153,73,0.2);">SECURE ROUTE IDENTIFIED</span>
                <span style="font-size: 10px; font-weight: 700; background: rgba(239,68,68,0.1); color: #EF4444; padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(239,68,68,0.2);">HAZARDS DETECTED</span>
            </div>
        </div>

        <a href="<?php echo $appLink; ?>" class="action-btn">
            START MISSION IN APP
        </a>

        <div class="app-store-prompt">
            Don't have the tactical app? <a href="#">Download E-LigtasMo</a>
        </div>
    </div>
</div>

<script>
    mapboxgl.accessToken = '<?php echo $mapboxToken; ?>';
    
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [<?php echo $lon; ?>, <?php echo $lat; ?>],
        zoom: 14,
        pitch: 45
    });

    map.on('load', () => {
        // Add objective marker
        new mapboxgl.Marker({ color: '#B37213' })
            .setLngLat([<?php echo $lon; ?>, <?php echo $lat; ?>])
            .setPopup(new mapboxgl.Popup().setHTML("<h3>Mission Objective</h3>"))
            .addTo(map);

        <?php if ($sLat && $sLon): ?>
        // Add start marker
        new mapboxgl.Marker({ color: '#679949' })
            .setLngLat([<?php echo $sLon; ?>, <?php echo $sLat; ?>])
            .addTo(map);

        // Fetch and draw path
        fetch(`api/mapbox-directions.php?start=<?php echo "$sLon,$sLat"; ?>&end=<?php echo "$lon,$lat"; ?>&mode=<?php echo $mode; ?>`)
            .then(r => r.json())
            .then(data => {
                if (data.features && data.features[0]) {
                    const coords = data.features[0].geometry.coordinates;
                    map.addSource('route', {
                        'type': 'geojson',
                        'data': {
                            'type': 'Feature',
                            'properties': {},
                            'geometry': {
                                'type': 'LineString',
                                'coordinates': coords
                            }
                        }
                    });
                    map.addLayer({
                        'id': 'route',
                        'type': 'line',
                        'source': 'route',
                        'layout': { 'line-join': 'round', 'line-cap': 'round' },
                        'paint': { 'line-color': '#B37213', 'line-width': 6, 'line-opacity': 0.8 }
                    });

                    const bounds = new mapboxgl.LngLatBounds();
                    coords.forEach(c => bounds.extend(c));
                    map.fitBounds(bounds, { padding: 80 });
                }
            });
        <?php endif; ?>

        // Load hazards from Santa Cruz
        fetch('api/list-map-overlays.php')
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    const markers = [...(data.hazards || []), ...(data.reports || [])];
                    markers.forEach(h => {
                        const el = document.createElement('div');
                        el.className = 'hazard-marker';
                        el.innerHTML = '!';
                        new mapboxgl.Marker(el)
                            .setLngLat([parseFloat(h.lng), parseFloat(h.lat)])
                            .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<h3>${h.hazard_type || 'Active Hazard'}</h3><p>${h.description || 'Passage Restricted'}</p>`))
                            .addTo(map);
                    });
                }
            });
    });
</script>

</body>
</html>
