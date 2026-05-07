import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { MapContainer, TileLayer, Polyline, Polygon, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_MAP_STATE, SANTA_CRUZ_BOUNDS_LEAFLET } from '../constants/geo';

type Mode = 'driving-car' | 'driving-hgv' | 'foot-walking' | 'cycling-regular';

const PublicRouteShare: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [routes, setRoutes] = useState<Array<{ coords: Array<[number, number]>; distance: number; duration: number }>>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedPolygons, setBlockedPolygons] = useState<any[]>([]);
  const mapRef = useRef<L.Map | null>(null);

  const parseLatLng = (raw: string | null): [number, number] | null => {
    if (!raw) return null;
    const parts = raw.split(',').map(s => Number(s.trim()));
    if (parts.length !== 2) return null;
    const [lat, lng] = parts;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return [lat, lng];
  };

  const start = useMemo(() => parseLatLng(searchParams.get('start')), [searchParams]);
  const end = useMemo(() => parseLatLng(searchParams.get('end')), [searchParams]);
  const mode = useMemo(() => {
    const raw = String(searchParams.get('mode') || 'driving-car');
    if (raw === 'driving-hgv' || raw === 'foot-walking' || raw === 'cycling-regular') return raw as Mode;
    return 'driving-car' as Mode;
  }, [searchParams]);

  const extractAvoidPolygonsFromGeojson = (input: any): any[] => {
    const out: any[] = [];
    const normRing = (ring: any) => {
      if (!Array.isArray(ring) || ring.length < 3) return null;
      const cleaned0 = ring
        .filter((c: any) => Array.isArray(c) && c.length >= 2 && Number.isFinite(Number(c[0])) && Number.isFinite(Number(c[1])))
        .map((c: any) => [Number(c[0]), Number(c[1])]);
      if (cleaned0.length < 3) return null;
      const looksSwapped = (() => {
        const s = cleaned0.slice(0, 6);
        let swapped = 0;
        for (const [x, y] of s) {
          if (Math.abs(x) <= 90 && Math.abs(y) > 90) swapped++;
        }
        return swapped >= Math.max(2, Math.ceil(s.length / 2));
      })();
      const cleaned = looksSwapped ? cleaned0.map(([x, y]) => [y, x]) : cleaned0;
      const first = cleaned[0];
      const last = cleaned[cleaned.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) cleaned.push(first);
      if (cleaned.length < 4) return null;
      return cleaned;
    };

    const visitGeom = (g: any) => {
      if (!g || !g.type) return;
      if (g.type === 'Polygon') {
        const ring = normRing(g.coordinates?.[0]);
        if (ring) out.push([ring]);
        return;
      }
      if (g.type === 'MultiPolygon') {
        const polys = Array.isArray(g.coordinates) ? g.coordinates : [];
        polys.forEach((p: any) => {
          const ring = normRing(p?.[0]);
          if (ring) out.push([ring]);
        });
        return;
      }
      if (g.type === 'GeometryCollection') {
        const geoms = Array.isArray(g.geometries) ? g.geometries : [];
        geoms.forEach(visitGeom);
      }
    };

    if (!input) return out;
    if (input.type === 'Feature') visitGeom(input.geometry);
    else if (input.type === 'FeatureCollection' && Array.isArray(input.features)) input.features.forEach((f: any) => visitGeom(f?.geometry));
    else visitGeom(input);
    return out;
  };

  const getMarkerIcon = (color: string): L.Icon => {
    const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="${color}" stroke="#333" stroke-width="1.5"/><circle cx="12.5" cy="12.5" r="5" fill="#fff"/></svg>`;
    const dataUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    return new L.Icon({ iconUrl: dataUrl, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] });
  };

  useEffect(() => {
    if (!start || !end) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const pad = 0.03;
        const north = Math.max(start[0], end[0]) + pad;
        const south = Math.min(start[0], end[0]) - pad;
        const east = Math.max(start[1], end[1]) + pad;
        const west = Math.min(start[1], end[1]) - pad;
        const qs = new URLSearchParams({ north: String(north), south: String(south), east: String(east), west: String(west) });
        const overlaysRes = await apiFetch(`list-map-overlays.php?${qs.toString()}`);
        const overlays = await overlaysRes.json().catch(() => ({} as any));
        const hazardsArr = Array.isArray(overlays?.hazards) ? overlays.hazards : [];
        const floodsArr = Array.isArray(overlays?.reports) ? overlays.reports : [];
        const avoidPolys: any[] = [];
        for (const h of hazardsArr) {
          if (h?.area_geojson) avoidPolys.push(...extractAvoidPolygonsFromGeojson(h.area_geojson));
        }
        for (const f of floodsArr) {
          if (f?.area_geojson) avoidPolys.push(...extractAvoidPolygonsFromGeojson(f.area_geojson));
        }
        if (!cancelled) setBlockedPolygons(avoidPolys);

        const body: any = {
          profile: mode,
          coordinates: [[start[1], start[0]], [end[1], end[0]]],
          instructions: true,
          alternative_routes: { target_count: 3, share_factor: 0.9, weight_factor: 1.5 },
          geometry_format: 'geojson',
          options: {
            avoid_features: ['ferries'],
            avoid_polygons: avoidPolys.length ? { type: 'MultiPolygon', coordinates: avoidPolys } : undefined
          }
        };
        const rRes = await apiFetch('ors-directions.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!rRes.ok) throw new Error('Routing failed');
        const data = await rRes.json().catch(() => ({} as any));
        const features = Array.isArray(data?.features) ? data.features : [];
        const nextRoutes = features.map((f: any) => {
          const coords = f?.geometry?.coordinates;
          if (!Array.isArray(coords) || coords.length < 2) return null;
          const latlngs: Array<[number, number]> = coords.map((c: any) => [Number(c[1]), Number(c[0])]);
          const summary = f?.properties?.summary || {};
          return { coords: latlngs, distance: Number(summary?.distance || 0), duration: Number(summary?.duration || 0) };
        }).filter(Boolean) as Array<{ coords: Array<[number, number]>; distance: number; duration: number }>;
        if (!cancelled) {
          setRoutes(nextRoutes.slice(0, 3));
          setSelectedIndex(0);
        }
      } catch (e: any) {
        if (!cancelled) {
          setRoutes([]);
          setError(String(e?.message || 'Failed to load route'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [start, end, mode]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!routes.length) return;
    try {
      const selected = routes[selectedIndex];
      if (!selected?.coords?.length) return;
      const bounds = L.latLngBounds(selected.coords.map(c => L.latLng(c[0], c[1])));
      mapRef.current.fitBounds(bounds, { padding: [30, 30] });
    } catch {}
  }, [routes, selectedIndex]);

  const center = useMemo(() => {
    if (!start || !end) return [14.28, 121.42] as [number, number];
    return [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2] as [number, number];
  }, [start, end]);

  const blockedPolygonsLatLng = useMemo(() => {
    return blockedPolygons
      .map((p: any) => {
        const ring = p?.[0];
        if (!Array.isArray(ring) || ring.length < 4) return null;
        return ring.map((c: any) => [Number(c[1]), Number(c[0])] as [number, number]);
      })
      .filter(Boolean) as Array<Array<[number, number]>>;
  }, [blockedPolygons]);

  const routeStats = useMemo(() => {
    const r = routes[selectedIndex];
    if (!r) return null;
    const distanceKm = r.distance ? (r.distance / 1000).toFixed(1) : '—';
    const durationMin = r.duration ? String(Math.round(r.duration / 60)) : '—';
    return { distanceKm, durationMin };
  }, [routes, selectedIndex]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
            <div className="font-semibold text-sm text-gray-900">Shared Safe Route</div>
            <div className="text-xs text-gray-500">
              {routeStats ? `${routeStats.distanceKm} km • ${routeStats.durationMin} min` : null}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4">
            <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-r p-3">
              <div className="text-xs font-semibold text-gray-700 mb-2">Routes</div>
              {loading ? <div className="text-xs text-gray-500">Loading…</div> : null}
              {error ? <div className="text-xs text-red-600">{error}</div> : null}
              {!loading && !error && routes.length === 0 ? (
                <div className="text-xs text-gray-500">No routes found.</div>
              ) : null}
              <div className="space-y-2">
                {routes.map((r, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-xs ${
                      idx === selectedIndex ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-semibold">Route {idx + 1}</div>
                    <div className="text-[11px] text-gray-600">
                      {(r.distance ? (r.distance / 1000).toFixed(1) : '—')} km • {(r.duration ? Math.round(r.duration / 60) : '—')} min
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-3 text-[11px] text-gray-500">
                Open this link in the app for live navigation and updates.
              </div>
            </div>
            <div className="lg:col-span-3 h-[70vh]">
              <MapContainer
                center={center}
                zoom={13}
                minZoom={DEFAULT_MAP_STATE.minZoom}
                maxBounds={SANTA_CRUZ_BOUNDS_LEAFLET}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                attributionControl={false}
                ref={mapRef as any}
              >
                <ZoomControl position="bottomright" />
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                {blockedPolygonsLatLng.map((ring, idx) => (
                  <Polygon
                    key={`blk-${idx}`}
                    positions={ring}
                    pathOptions={{ color: '#2563eb', weight: 2, fillColor: '#2563eb', fillOpacity: 0.18 }}
                  />
                ))}
                {routes.map((r, idx) => (
                  <Polyline
                    key={`rt-${idx}`}
                    positions={r.coords}
                    pathOptions={{
                      color: idx === selectedIndex ? '#2563eb' : '#94a3b8',
                      weight: idx === selectedIndex ? 6 : 4,
                      opacity: idx === selectedIndex ? 0.95 : 0.6
                    }}
                  />
                ))}
                {start ? (
                  <Marker position={start} icon={getMarkerIcon('#2563eb')}>
                    <Popup>Start</Popup>
                  </Marker>
                ) : null}
                {end ? (
                  <Marker position={end} icon={getMarkerIcon('#ef4444')}>
                    <Popup>End</Popup>
                  </Marker>
                ) : null}
              </MapContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicRouteShare;
