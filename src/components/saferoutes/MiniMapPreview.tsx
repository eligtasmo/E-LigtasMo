import React, { useEffect, useState, useMemo } from "react";
import MapboxMap, { Source, Layer } from "../maps/MapboxMap";

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN) as string | undefined;

type DangerZone = {
  id: number;
  path: [number, number][];
};

interface MiniMapPreviewProps {
  height?: number;
}

const MiniMapPreview: React.FC<MiniMapPreviewProps> = ({ height = 220 }) => {
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchDangerZones() {
      setLoading(true);
      try {
        const resp = await fetch("/api/list-danger-zones.php");
        const data = await resp.json();
        if (mounted && Array.isArray(data)) {
          setDangerZones(
            data
              .filter((z: any) => Array.isArray(z.path))
              .map((z: any) => ({ id: z.id ?? Math.random(), path: z.path }))
          );
        }
      } catch (e) {
        // Keep empty on failure
      }
      setLoading(false);
    }
    fetchDangerZones();
    return () => { mounted = false; };
  }, []);

  const geojson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: dangerZones.map(zone => ({
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: zone.path.map(([lat, lng]) => [lng, lat])
      },
      properties: { id: zone.id }
    }))
  }), [dangerZones]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-2 text-sm font-semibold text-gray-700">Nearby Hazards</div>
      <div style={{ height }}>
        <MapboxMap
          initialViewState={{
            latitude: 14.5995,
            longitude: 120.9842,
            zoom: 12
          }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={MAPBOX_TOKEN}
          style={{ height: "100%", width: "100%" }}
        >
          <Source id="danger-zones" type="geojson" data={geojson}>
            <Layer
              id="danger-zones-line"
              type="line"
              paint={{
                'line-color': '#ef4444',
                'line-width': 4
              }}
            />
          </Source>
        </MapboxMap>
      </div>
      {loading && (
        <div className="px-4 py-2 text-xs text-gray-500">Loading hazard overlays…</div>
      )}
    </div>
  );
};

export default MiniMapPreview;
