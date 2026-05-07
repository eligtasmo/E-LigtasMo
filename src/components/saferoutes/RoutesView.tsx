import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback, useReducer, Component, ReactNode, useRef, Fragment, useMemo } from "react";
import MapboxMap, { Marker, Popup, NavigationControl, FullscreenControl, Source, Layer } from '../maps/MapboxMap';
import { DEFAULT_MAP_STATE } from '../../constants/geo';
import { apiFetch } from '../../utils/api';
import * as turf from '@turf/turf';
import { useGlobalMapContext } from '../../context/MapContext';
import { FaCar, FaMotorcycle, FaWalking, FaBus, FaBicycle, FaChevronLeft, FaStar, FaExclamationTriangle, FaArrowRight, FaArrowLeft, FaArrowUp, FaMapMarkerAlt, FaFacebookF } from 'react-icons/fa';
import TacticalMarker from '../maps/TacticalMarker';
import { BsCircle, BsGeoAltFill, BsThreeDotsVertical } from 'react-icons/bs';
import { LuArrowUpDown } from 'react-icons/lu';
import { FiAlertTriangle, FiChevronDown, FiChevronRight, FiCornerDownLeft, FiCornerDownRight, FiArrowUp, FiMapPin, FiInfo } from "react-icons/fi";
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
import * as THREE from 'three';
import HazardLayers from '../maps/HazardLayers';
import HazardManagementPanel from './HazardManagementPanel';
import { SantaCruzMapboxOutline } from '../maps/SantaCruzOutline';

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN) as string | undefined;
const MAPBOX_NAV_DAY = 'mapbox://styles/mapbox/light-v11';
const MAPBOX_NAV_NIGHT = 'mapbox://styles/mapbox/light-v11';

function bearingDegrees(from: [number, number], to: [number, number]) {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

const MapboxPin = ({ color }: { color: string }) => (
  <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 22s7-6.1 7-12a7 7 0 10-14 0c0 5.9 7 12 7 12z"
      fill={color}
      stroke="white"
      strokeWidth="1.5"
    />
    <circle cx="12" cy="10" r="3.25" fill="white" />
  </svg>
);

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('RoutesView Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              The safe routes component encountered an error. Please try refreshing the page.
            </p>
            <details className="text-sm text-gray-500 mb-4">
              <summary className="cursor-pointer">Error Details</summary>
              <pre className="mt-2 bg-gray-100 p-2 rounded overflow-auto">
                {this.state.error?.toString()}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

type StatusType = 'good' | 'caution' | 'danger' | 'active' | 'resolved' | 'monitoring';
const statusColors: Record<StatusType, string> = {
  good: "#10b981",
  caution: "#f59e0b",
  danger: "#ef4444",
  active: "#ef4444",
  resolved: "#10b981",
  monitoring: "#f97316",
};

const statusLabels: Record<StatusType, string> = {
  good: "Safe",
  caution: "Caution",
  danger: "Danger",
  active: "Active",
  resolved: "Resolved",
  monitoring: "Monitoring",
};

// NEW: Define detailed types for the ORS API response
type ORSStep = {
  distance: number;
  duration: number;
  instruction: string;
  name: string;
};

type ORSSegment = {
  distance: number;
  duration: number;
  steps: ORSStep[];
};

type ORSSummary = {
  distance: number; // in meters
  duration: number; // in seconds
};

type ORSDetailedRoute = {
  summary: ORSSummary;
  segments: ORSSegment[];
  geometry: {
    coordinates: Array<[number, number]>;
  };
};

type ORSResponse = {
  routes: ORSDetailedRoute[];
};

// Shared helpers for distance and speed used across routing and UI
const computeDistanceFromGeometry = (coords: Array<[number, number]>): number => {
  if (!Array.isArray(coords) || coords.length < 2) return 0;
  const toRad = (d: number) => d * Math.PI / 180;
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lng1, lat1] = coords[i - 1];
    const [lng2, lat2] = coords[i];
    const R = 6371e3; // meters
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    total += R * c;
  }
  return total;
};

const speedMps: Record<string, number> = {
  'driving-car': 8.33,      // ~30 km/h
  'cycling-regular': 4.17,  // ~15 km/h
  'foot-walking': 1.39,     // ~5 km/h
  'driving-hgv': 6.94,      // ~25 km/h
};

// Access polygon record shape for vehicle-specific route overrides
type AccessPolygon = {
  id: number;
  name?: string | null;
  brgy?: string | null;
  polygon: Array<[number, number]>; // [lat,lng] points forming a polygon
  allowedVehicles: string[] | string; // e.g., ['driving-car','cycling-regular','driving-hgv','foot-walking'] or "car,bike"
  status?: 'active' | 'inactive';
};

// Santa Cruz, Laguna bounding box
const SANTA_CRUZ_BOUNDS = {
  minLat: 14.25,
  maxLat: 14.32,
  minLng: 121.38,
  maxLng: 121.45,
};

type Bounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };

function computeBounds(center: [number, number], kmRadius = 5): Bounds {
  const [lat, lng] = center;
  const latDelta = kmRadius / 111; // ~111 km per degree latitude
  const lngDelta = kmRadius / (111 * Math.cos(lat * Math.PI / 180) || 1);
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

function isPathInBounds(path: [number, number][], bounds: Bounds): boolean {
  return path.every(([lat, lng]) =>
    lat >= bounds.minLat && lat <= bounds.maxLat &&
    lng >= bounds.minLng && lng <= bounds.maxLng
  );
}

function isPointInBounds(lat: number | null, lng: number | null, bounds: Bounds): boolean {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return false;
  return lat >= bounds.minLat && lat <= bounds.maxLat &&
         lng >= bounds.minLng && lng <= bounds.maxLng;
}

// Create flood-like buffer polygons around a path using Turf.js
function bufferPathToPolygons(path: Array<[number, number]>, meters = 30, rings = 3): Array<Array<[number, number]>> {
  try {
    if (!Array.isArray(path) || path.length < 2) return [];
    const line = turf.lineString(path.map(([lat, lng]) => [lng, lat]));
    const buffers: Array<Array<[number, number]>> = [];
    for (let r = 1; r <= rings; r++) {
      const feature = turf.buffer(line, meters * r, { units: 'meters' });
      const coords: any = feature?.geometry?.coordinates;
      if (!coords) continue;
      // Normalize Polygon vs MultiPolygon to an array of rings
      const polys = Array.isArray(coords[0][0][0]) ? coords : [coords];
      for (const poly of polys) {
        const ring = poly[0];
        const latLngRing = ring.map(([lng, lat]: [number, number]) => [lat, lng]);
        buffers.push(latLngRing);
      }
    }
    return buffers;
  } catch (e) {
    console.warn('bufferPathToPolygons failed:', e);
    return [];
  }
}

// Densify a path into heatmap points for smooth road overlays
function densifyPathToHeatPoints(path: Array<[number, number]>, everyMeters = 15, intensity = 0.6): Array<[number, number, number]> {
  const points: Array<[number, number, number]> = [];
  if (!path || path.length === 0) return points;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadius = 6371000; // meters

  for (let i = 0; i < path.length - 1; i++) {
    const [lat1, lng1] = path[i];
    const [lat2, lng2] = path[i + 1];
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadius * c;
    const steps = Math.max(1, Math.floor(distance / everyMeters));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const lat = lat1 + (lat2 - lat1) * t;
      const lng = lng1 + (lng2 - lng1) * t;
      points.push([lat, lng, intensity]);
    }
  }
  return points;
}

// NEW: Function to get address from coordinates
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'E-LigtasMo/1.0' } });
      if (!response.ok) return null;
      const data = await response.json();
      return data?.display_name || null;
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      return null;
    }
}

// Function to search for a location using Nominatim
async function searchLocation(query: string): Promise<[number, number] | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'E-LigtasMo/1.0' } });
    const data = await response.json();
    if (data && data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    return null;
  } catch (error) {
    console.error("Nominatim search failed:", error);
    return null;
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs} hr ${remMins} min` : `${hrs} hr`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function getPrimaryVia(segments: ORSSegment[]): string {
  if (!segments || segments.length === 0) return 'Local Road';

  const roadUsage: { [key: string]: number } = {};
  segments.forEach(segment => {
    segment.steps.forEach(step => {
      if (step.name && step.name !== '-') {
        roadUsage[step.name] = (roadUsage[step.name] || 0) + step.distance;
      }
    });
  });

  const primaryRoad = Object.keys(roadUsage).reduce((a, b) => roadUsage[a] > roadUsage[b] ? a : b, '');
  return primaryRoad || 'Local Road';
}

function getRouteSafety(route: any, dangerZones: any[]): 'safe' | 'partially_unsafe' | 'unsafe' {
  if (!route || !route.geometry || !route.geometry.coordinates || !dangerZones.length) return 'safe';
  const routeLine = turf.lineString(route.geometry.coordinates);
  let totalDangerMeters = 0;
  for (const zone of dangerZones) {
    if (!zone.path || zone.path.length < 2) continue;
    try {
      const zoneLine = turf.lineString(zone.path.map(([lat, lng]: [number, number]) => [lng, lat]));
      const buffer = turf.buffer(zoneLine, 50, { units: 'meters' });
      const intersect = turf.lineIntersect(routeLine, buffer as any);
      if (intersect.features.length > 0) totalDangerMeters += 100; // heuristic
    } catch (_) {}
  }
  if (totalDangerMeters === 0) return 'safe';
  if (totalDangerMeters < 500) return 'partially_unsafe';
  return 'unsafe';
}

function getSafetyBadge(safety: 'safe' | 'partially_unsafe' | 'unsafe') {
  switch (safety) {
    case 'safe': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">SAFEST</span>;
    case 'partially_unsafe': return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold">CAUTION</span>;
    case 'unsafe': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">UNSAFE</span>;
  }
}

function groupSteps(steps: ORSStep[]) {
  const groups: { title: string; distance: number; duration: number; steps: ORSStep[] }[] = [];
  if (!steps.length) return groups;
  let cur = { steps: [] as ORSStep[], distance: 0, duration: 0 };
  const pushCur = () => {
    if (cur.steps.length) {
      const main = cur.steps.find(s => s.name && s.name !== '-') || cur.steps[0];
      groups.push({ title: main.name || 'Unnamed Road', ...cur });
    }
  };
  steps.forEach((s, i) => {
    cur.steps.push(s);
    cur.distance += s.distance;
    cur.duration += s.duration;
    const isTurn = (step: ORSStep) => /turn|merge|ramp|roundabout/i.test(step.instruction);
    const breakHere = isTurn(s) && (cur.distance >= 800 || cur.steps.length >= 3);
    if (breakHere && i < steps.length - 1) {
      pushCur();
      cur = { steps: [], distance: 0, duration: 0 };
    }
  });
  pushCur();
  return groups;
}

function extractAvoidPolygonsFromGeojson(input: any): any[] {
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
}

function hazardAllowsMode(h: any, transportMode: string): boolean {
  const type = String((h as any)?.type || '').toLowerCase();
  if (type.includes('flood')) return false;
  const raw = (h as any)?.allowed_modes;
  if (!raw) return false;
  const arr =
    Array.isArray(raw)
      ? raw
      : typeof raw === 'string'
        ? (() => {
            const s = raw.trim();
            if (s === '') return [];
            if (s.startsWith('[')) {
              try {
                const parsed = JSON.parse(s);
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            }
            return s.split(',').map((x: string) => x.trim()).filter(Boolean);
          })()
        : [];
  return arr.includes(transportMode);
}

function buildForbiddenTurfPolygons(forbiddenPolys: any[]) {
  const polygons: any[] = [];
  for (const poly of forbiddenPolys) {
    try {
      const ring = poly?.[0];
      if (!Array.isArray(ring) || ring.length < 4) continue;
      polygons.push(turf.polygon([ring]));
    } catch {}
  }
  return polygons;
}

function scoreRouteAgainstPolygons(route: any, polygons: any[]) {
  const coords = route?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return { intersects: false, insidePenalty: 999 };
  let intersects = false;
  let insidePenalty = 0;
  try {
    const line = turf.lineString(coords);
    for (const p of polygons) {
      if (turf.booleanIntersects(line, p)) {
        intersects = true;
        break;
      }
    }
  } catch {}
  try {
    const step = Math.max(1, Math.ceil(coords.length / 60));
    for (let i = 0; i < coords.length; i += step) {
      const pt = turf.point(coords[i]);
      for (const p of polygons) {
        if (turf.booleanPointInPolygon(pt, p)) {
          insidePenalty++;
          break;
        }
      }
    }
  } catch {}
  return { intersects, insidePenalty };
}

function chooseBestRoutes(routes: any[], forbiddenPolys: any[]) {
  if (!Array.isArray(routes) || routes.length === 0) return { routes: [], selectedIndex: 0 };
  if (!Array.isArray(forbiddenPolys) || forbiddenPolys.length === 0) return { routes, selectedIndex: 0 };

  const polygons = buildForbiddenTurfPolygons(forbiddenPolys);
  if (polygons.length === 0) return { routes, selectedIndex: 0 };

  const scored = routes
    .map((r: any, idx: number) => {
      const coords = r?.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return null;
      const { intersects, insidePenalty } = scoreRouteAgainstPolygons(r, polygons);

      const distance = Number(r?.summary?.distance || 0);
      return { r, idx, intersects, insidePenalty, distance };
    })
    .filter(Boolean) as Array<{ r: any; idx: number; intersects: boolean; insidePenalty: number; distance: number }>;

  scored.sort((a, b) => {
    if (a.insidePenalty !== b.insidePenalty) return a.insidePenalty - b.insidePenalty;
    if (Number(a.intersects) !== Number(b.intersects)) return Number(a.intersects) - Number(b.intersects);
    return a.distance - b.distance;
  });

  const nextRoutes = scored.map(s => s.r);
  return { routes: nextRoutes, selectedIndex: 0 };
}

function buildDetourViaPoints(forbiddenPolys: any[], start: [number, number], end: [number, number]) {
  const polygons = buildForbiddenTurfPolygons(forbiddenPolys);
  if (!polygons.length) return [];

  const line = turf.lineString([[start[1], start[0]], [end[1], end[0]]]);
  let bestPoly: any = polygons[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const p of polygons) {
    try {
      const intersects = turf.booleanIntersects(line, p);
      const c = turf.centroid(p);
      const d = turf.pointToLineDistance(c, line, { units: 'kilometers' });
      const score = (intersects ? 0 : 10) + d;
      if (score < bestScore) {
        bestScore = score;
        bestPoly = p;
      }
    } catch {}
  }

  const center = turf.centroid(bestPoly);
  const bbox = turf.bbox(bestPoly);
  const [minX, minY, maxX, maxY] = bbox;
  const diagKm = (() => {
    try {
      return turf.distance(turf.point([minX, minY]), turf.point([maxX, maxY]), { units: 'kilometers' });
    } catch {
      return 1;
    }
  })();

  const lineBearing = (() => {
    try {
      return turf.bearing(turf.point([start[1], start[0]]), turf.point([end[1], end[0]]));
    } catch {
      return 0;
    }
  })();

  const basePoint = (() => {
    try {
      const boundary = turf.polygonToLine(bestPoly as any) as any;
      const ints = turf.lineIntersect(line, boundary);
      const pts = ints.features.map((f: any) => f.geometry?.coordinates).filter((c: any) => Array.isArray(c) && c.length >= 2);
      if (pts.length >= 2) {
        const a = pts[0] as [number, number];
        const b = pts[pts.length - 1] as [number, number];
        return turf.point([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
      }
    } catch {}
    return center;
  })();

  const radiusKm = Math.min(1.2, Math.max(0.18, diagKm * 0.7));
  const distances = [radiusKm, radiusKm * 1.6];
  const out: Array<[number, number]> = [];
  const seen = new Set<string>();

  for (const distKm of distances) {
    for (const side of [-1, 1] as const) {
      try {
        const bearing = lineBearing + side * 90;
        const dest = turf.destination(basePoint, distKm, bearing, { units: 'kilometers' });
        if (turf.booleanPointInPolygon(dest, bestPoly)) continue;
        const corridorDist = turf.pointToLineDistance(dest, line, { units: 'kilometers' });
        if (corridorDist > 2.0) continue;
        const [lng, lat] = dest.geometry.coordinates as [number, number];
        const key = `${lng.toFixed(5)},${lat.toFixed(5)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push([lat, lng]);
      } catch {}
    }
  }

  return out;
}

async function getRouteWithWaypoints(
  pointsLatLng: Array<[number, number]>,
  dangerPaths: Array<Array<[number, number]>>,
  transportMode: string,
  accessPolygons: AccessPolygon[],
  extraAvoidPolygons: any[] = []
): Promise<ORSResponse> {
  if (pointsLatLng.length < 2) return { routes: [] };
  const start = pointsLatLng[0];
  const end = pointsLatLng[pointsLatLng.length - 1];
  const bufferedPolygons = dangerPaths.flatMap(path => bufferPathToPolygons(path, 40, 1).map(ring => [ring.map(([lat, lng]) => [lng, lat])]));
  const modeAliases = (() => {
    switch (transportMode) {
      case 'driving-car': return ['car', 'motor', 'motorcycle'];
      case 'cycling-regular': return ['bike', 'bicycle'];
      case 'foot-walking': return ['foot', 'walk'];
      case 'driving-hgv': return ['truck', 'bus'];
      default: return [];
    }
  })();
  const restrictedPolygons = accessPolygons
    .filter(p => {
      const allowed = Array.isArray(p.allowedVehicles) ? p.allowedVehicles : String(p.allowedVehicles).split(',').map(s => s.trim().toLowerCase());
      const normalized = new Set(allowed);
      return !modeAliases.some(alias => normalized.has(alias));
    })
    .map(p => {
      let ring = p.polygon.map(([lat, lng]) => [lng, lat]);
      if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) ring.push(ring[0]);
      return [ring];
    });

  const body = {
    coordinates: pointsLatLng.map(([lat, lng]) => [lng, lat] as [number, number]),
    instructions: true,
    alternative_routes: { target_count: 3, share_factor: 0.9, weight_factor: 1.5 },
    geometry_format: 'geojson',
    options: {
      avoid_features: ["ferries"],
      avoid_polygons: (bufferedPolygons.length || restrictedPolygons.length || extraAvoidPolygons.length)
        ? { type: "MultiPolygon", coordinates: [...bufferedPolygons, ...restrictedPolygons, ...extraAvoidPolygons] }
        : undefined
    }
  };

  const response = await apiFetch('ors-directions.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: transportMode, ...body })
  });
  if (!response.ok) throw new Error('Route calculation failed');
  const data = await response.json();
  let routes = data.routes || [];
  if (data.type === 'FeatureCollection' && data.features) {
    routes = data.features
      .map((f: any) => {
        const coords = f?.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return null;
        return {
          summary: f.properties?.summary || { distance: 0, duration: 0 },
          segments: f.properties?.segments || [],
          geometry: { coordinates: coords },
        };
      })
      .filter(Boolean);
  }
  return {
    routes: (routes || [])
      .filter((r: any) => Array.isArray(r?.geometry?.coordinates) && r.geometry.coordinates.length >= 2)
      .map((r: any) => ({
        ...r,
        summary: {
          distance: r.summary?.distance || computeDistanceFromGeometry(r.geometry?.coordinates || []),
          duration: r.summary?.duration || 0
        }
      }))
  };
}

async function getSafeRoute(
  start: [number, number],
  end: [number, number],
  dangerPaths: Array<Array<[number, number]>>,
  transportMode: string,
  accessPolygons: AccessPolygon[],
  extraAvoidPolygons: any[] = []
): Promise<ORSResponse> {
  const bufferedPolygons = dangerPaths.flatMap(path => bufferPathToPolygons(path, 40, 1).map(ring => [ring.map(([lat, lng]) => [lng, lat])]));
  const modeAliases = (() => {
    switch (transportMode) {
      case 'driving-car': return ['car', 'motor', 'motorcycle'];
      case 'cycling-regular': return ['bike', 'bicycle'];
      case 'foot-walking': return ['foot', 'walk'];
      case 'driving-hgv': return ['truck', 'bus'];
      default: return [];
    }
  })();
  const restrictedPolygons = accessPolygons
    .filter(p => {
      const allowed = Array.isArray(p.allowedVehicles) ? p.allowedVehicles : String(p.allowedVehicles).split(',').map(s => s.trim().toLowerCase());
      const normalized = new Set(allowed);
      return !modeAliases.some(alias => normalized.has(alias));
    })
    .map(p => {
      let ring = p.polygon.map(([lat, lng]) => [lng, lat]);
      if (ring.length > 0 && (ring[0][0] !== ring[ring.length-1][0] || ring[0][1] !== ring[ring.length-1][1])) ring.push(ring[0]);
      return [ring];
    });

  const body = {
    coordinates: [[start[1], start[0]], [end[1], end[0]]],
    instructions: true,
    alternative_routes: { target_count: 3, share_factor: 0.9, weight_factor: 1.5 },
    geometry_format: 'geojson',
    options: {
      avoid_features: ["ferries"],
      avoid_polygons: (bufferedPolygons.length || restrictedPolygons.length || extraAvoidPolygons.length)
        ? { type: "MultiPolygon", coordinates: [...bufferedPolygons, ...restrictedPolygons, ...extraAvoidPolygons] }
        : undefined
    }
  };

  const response = await apiFetch('ors-directions.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: transportMode, ...body })
  });
  if (!response.ok) throw new Error('Route calculation failed');
  const data = await response.json();
  let routes = data.routes || [];
  if (data.type === 'FeatureCollection' && data.features) {
    routes = data.features
      .map((f: any) => {
        const coords = f?.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return null;
        return {
          summary: f.properties?.summary || { distance: 0, duration: 0 },
          segments: f.properties?.segments || [],
          geometry: { coordinates: coords },
        };
      })
      .filter(Boolean);
  }
  return {
    routes: (routes || [])
      .filter((r: any) => Array.isArray(r?.geometry?.coordinates) && r.geometry.coordinates.length >= 2)
      .map((r: any) => ({
        ...r,
        summary: {
          distance: r.summary?.distance || computeDistanceFromGeometry(r.geometry?.coordinates || []),
          duration: r.summary?.duration || 0
        }
      }))
  };
}

interface RoutesViewProps {
  fullscreen?: boolean;
  canManageHazards?: boolean;
  initialCollapsed?: boolean;
  initialTab?: 'planner' | 'saved' | 'hazards';
}

type State = { status: 'idle' | 'loading' | 'success' | 'error'; data: ORSResponse | null; error: string | null; };
type Action = { type: 'FETCH_START' } | { type: 'FETCH_SUCCESS'; payload: ORSResponse } | { type: 'FETCH_ERROR'; payload: string } | { type: 'RESET' };
const initialState: State = { status: 'idle', data: null, error: null };
function routeReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START': return { ...state, status: 'loading', error: null, data: null };
    case 'FETCH_SUCCESS': return { ...state, status: 'success', data: action.payload };
    case 'FETCH_ERROR': return { ...state, status: 'error', error: action.payload, data: null };
    case 'RESET': return { ...initialState };
    default: return state;
  }
}

const RoutesView: React.FC<RoutesViewProps> = ({ fullscreen = false, canManageHazards, initialCollapsed = false, initialTab = 'planner' }) => {
  const { user, updatePreferredVehicle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [start, setStart] = useState<[number, number] | null>(null);
  const [end, setEnd] = useState<[number, number] | null>(null);
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [endLocked, setEndLocked] = useState(false);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [panelView, setPanelView] = useState<'list' | 'detail'>('list');
  const [detailRouteIndex, setDetailRouteIndex] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [panelTab, setPanelTab] = useState<'planner' | 'saved' | 'hazards'>(initialTab);
  const mapRef = useRef<any>(null);
  const [activeInput, setActiveInput] = useState<'start' | 'end'>('start');

  useEffect(() => {
    if (panelTab === 'saved') setPanelTab('planner');
  }, [panelTab]);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [dangerZones, setDangerZones] = useState<any[]>([]);
  const [accessPolygons, setAccessPolygons] = useState<AccessPolygon[]>([]);
  const [shelters, setShelters] = useState<any[]>([]);
  const { viewport: viewState, setViewport: setViewState, updateViewport } = useGlobalMapContext();
  const [mapStyle, setMapStyle] = useState<string>(MAPBOX_NAV_DAY);
  const [navMode, setNavMode] = useState(false);
  const [enable3d, setEnable3d] = useState(true);
  const [state, dispatch] = useReducer(routeReducer, initialState);
  const { status, data: route, error } = state;
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const prevLocRef = useRef<{ lat: number; lng: number; t: number } | null>(null);
  const carLayerRef = useRef<{ renderer: any; scene: any; camera: any; mesh: any } | null>(null);

  const [hazardPoints, setHazardPoints] = useState<any[]>([]);
  const [hazards, setHazards] = useState<any[]>([]);
  const [floodOverlays, setFloodOverlays] = useState<any[]>([]);
  const [selectedHazard, setSelectedHazard] = useState<any | null>(null);
  const hazardsRef = useRef<any[]>([]);
  const floodOverlaysRef = useRef<any[]>([]);
  const [hazardStart, setHazardStart] = useState<[number, number] | null>(null);
  const [hazardEnd, setHazardEnd] = useState<[number, number] | null>(null);
  const [activeHazardInput, setActiveHazardInput] = useState<'start' | 'end'>('start');
  const [isHazardFormOpen, setIsHazardFormOpen] = useState(false);
  const [snapHazardToRoad, setSnapHazardToRoad] = useState(true);
  const [draftHazardSeverity, setDraftHazardSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [hazardPreviewLine, setHazardPreviewLine] = useState<Array<[number, number]> | null>(null);

  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    try {
      if (enable3d) {
        if (!map.getSource('mapbox-dem')) {
          map.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14,
          } as any);
        }
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.25 } as any);
      } else {
        map.setTerrain(null as any);
      }
    } catch {}
  }, [enable3d]);
  const [hazardDrawTool, setHazardDrawTool] = useState<'segment' | 'polygon'>('segment');
  const [hazardPolygon, setHazardPolygon] = useState<Array<[number, number]>>([]);
  const [hazardPolygonFeature, setHazardPolygonFeature] = useState<any | null>(null);
  const [isHazardDrawing, setIsHazardDrawing] = useState(false);
  const [hazardPhotoModalUrl, setHazardPhotoModalUrl] = useState<string | null>(null);
  const [savedRoutes, setSavedRoutes] = useState<Array<{ id: number; name: string; coordinates: [number, number][] }>>([]);
  const [selectedSavedRouteId, setSelectedSavedRouteId] = useState<number | null>(null);

  const selectedSavedRoute = useMemo(() => {
    if (selectedSavedRouteId == null) return null;
    return savedRoutes.find(r => r.id === selectedSavedRouteId) || null;
  }, [savedRoutes, selectedSavedRouteId]);

  const savedRouteGeojson = useMemo(() => {
    if (!selectedSavedRoute?.coordinates?.length) return null;
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: selectedSavedRoute.coordinates.map(([lat, lng]) => [lng, lat] as [number, number]),
      },
      properties: { id: selectedSavedRoute.id, name: selectedSavedRoute.name },
    };
  }, [selectedSavedRoute]);
  const [modeSummaries, setModeSummaries] = useState<Record<string, { duration: number; distance: number }>>({});
  const [routeSortMode, setRouteSortMode] = useState<'fastest' | 'safest'>('fastest');
  const [bestSelected, setBestSelected] = useState(true);
  const [autoBestApplied, setAutoBestApplied] = useState(false);
  const preferred = (user?.preferred_vehicle ?? 'driving-car') as string;
  const [transportMode, setTransportMode] = useState<'driving-car' | 'cycling-regular' | 'foot-walking' | 'driving-hgv'>(
    preferred.includes('cycling') || preferred.includes('bike') ? 'cycling-regular' : preferred.includes('foot') || preferred.includes('walk') ? 'foot-walking' : preferred.includes('hgv') || preferred.includes('truck') ? 'driving-hgv' : 'driving-car'
  );
  const [displayVehicle, setDisplayVehicle] = useState<'car' | 'motor' | 'bike' | 'walk' | 'truck'>(
    preferred.includes('motor') ? 'motor' : preferred.includes('cycling') || preferred.includes('bike') ? 'bike' : preferred.includes('foot') || preferred.includes('walk') ? 'walk' : preferred.includes('hgv') || preferred.includes('truck') ? 'truck' : 'car'
  );
  const shareUrl = useMemo(() => {
    if (!start || !end) return '';
    const url = new URL(`${window.location.origin}/route-planner`);
    url.searchParams.set('start', `${start[0]},${start[1]}`);
    url.searchParams.set('end', `${end[0]},${end[1]}`);
    url.searchParams.set('mode', transportMode);
    return url.toString();
  }, [start, end, transportMode]);

  const isResidentViewer = user && ['resident', 'brgy'].includes(String(user.role || '').toLowerCase());
  const canEditHazards = typeof canManageHazards === 'boolean' ? canManageHazards : !!user && ['admin', 'brgy'].includes(String(user.role || '').toLowerCase());

  const hazardPreviewRadiusM = useMemo(() => {
    if (draftHazardSeverity === 'critical') return 350;
    if (draftHazardSeverity === 'high') return 250;
    if (draftHazardSeverity === 'medium') return 160;
    return 110;
  }, [draftHazardSeverity]);

  const hazardPreviewArea = useMemo(() => {
    if (!hazardStart || !hazardEnd) return null;
    const line = (hazardPreviewLine && hazardPreviewLine.length >= 2) ? hazardPreviewLine : [hazardStart, hazardEnd];
    try {
      const lineString = turf.lineString(line.map(([lat, lng]) => [lng, lat]));
      const poly = turf.buffer(lineString, hazardPreviewRadiusM / 1000, { units: 'kilometers' }) as any;
      poly.properties = { severity: draftHazardSeverity };
      return poly;
    } catch {
      return null;
    }
  }, [hazardStart, hazardEnd, hazardPreviewLine, hazardPreviewRadiusM, draftHazardSeverity]);

  const hazardPreviewLineGeojson = useMemo(() => {
    if (!hazardStart || !hazardEnd) return null;
    const line = (hazardPreviewLine && hazardPreviewLine.length >= 2) ? hazardPreviewLine : [hazardStart, hazardEnd];
    return {
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: line.map(([lat, lng]) => [lng, lat] as [number, number]) },
      properties: {},
    };
  }, [hazardStart, hazardEnd, hazardPreviewLine]);

  const hazardPolygonPreview = useMemo(() => {
    if (!hazardPolygon || hazardPolygon.length < 2) return null;
    const coords = hazardPolygon.map(([lat, lng]) => [lng, lat] as [number, number]);
    return {
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: coords },
      properties: { severity: draftHazardSeverity },
    };
  }, [hazardPolygon, draftHazardSeverity]);

  const hazardPolygonPreviewFill = useMemo(() => {
    if (!hazardPolygon || hazardPolygon.length < 3) return null;
    const ring = [...hazardPolygon, hazardPolygon[0]].map(([lat, lng]) => [lng, lat] as [number, number]);
    return {
      type: 'Feature' as const,
      geometry: { type: 'Polygon' as const, coordinates: [ring] },
      properties: { severity: draftHazardSeverity },
    };
  }, [hazardPolygon, draftHazardSeverity]);

  const hazardAreas = useMemo(() => {
    const features: any[] = [];
    for (const h of hazards || []) {
      const a = (h as any).area_geojson;
      if (!a) continue;
      const sevRaw = String((h as any).severity || '').toLowerCase();
      const sev = sevRaw === 'critical' ? 'critical' : sevRaw === 'high' ? 'high' : sevRaw === 'moderate' || sevRaw === 'medium' ? 'medium' : sevRaw === 'low' ? 'low' : 'medium';
      const props = {
        id: (h as any).id,
        type: (h as any).type,
        status: (h as any).status,
        severity: sev,
        address: (h as any).address,
        description: (h as any).description,
        datetime: (h as any).datetime,
        photo_url: (h as any).photo_url,
        reporter: (h as any).reporter || (h as any).reported_by,
        contact: (h as any).contact,
        email: (h as any).email,
        brgy: (h as any).brgy,
        allowed_modes: (h as any).allowed_modes,
      };
      if (a.type === 'Feature' && a.geometry) {
        features.push({ ...a, properties: { ...(a.properties || {}), ...props } });
      } else if (a.type && a.coordinates) {
        features.push({ type: 'Feature', geometry: a, properties: props });
      }
    }
    return features;
  }, [hazards]);

  useEffect(() => {
    hazardsRef.current = hazards;
  }, [hazards]);

  useEffect(() => {
    floodOverlaysRef.current = floodOverlays;
  }, [floodOverlays]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [dzRes, apRes, shRes] = await Promise.all([
          apiFetch('list-danger-zones.php'),
          apiFetch(`list-access-polygons.php?status=active${user?.role === 'brgy' ? `&brgy=${user.brgy_name}` : ''}`),
          apiFetch('shelters-list.php')
        ]);
        const dzData = await dzRes.json();
        if (Array.isArray(dzData)) setDangerZones(dzData.map(d => ({ ...d, path: typeof d.path === 'string' ? JSON.parse(d.path) : d.path })));
        const apData = await apRes.json();
        if (apData.success) setAccessPolygons(apData.polygons);
        const shData = await shRes.json();
        if (Array.isArray(shData)) setShelters(shData);
      } catch (e) { console.warn('Failed to load map data', e); }
    };
    fetchInitialData();
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const endParam = params.get('end');
    if (endParam) {
      const parts = endParam.split(',').map(p => parseFloat(p));
      if (parts.length === 2 && parts.every(n => !isNaN(n))) {
        setEnd([parts[0], parts[1]]);
        setEndLocked(true);
        setActiveInput('start');
        updateViewport({ latitude: parts[0], longitude: parts[1], zoom: 16 });
      }
    }
  }, [location.search]);

  useEffect(() => {
    if (start) reverseGeocode(start[0], start[1]).then(n => n && setStartQuery(n));
  }, [start]);
  useEffect(() => {
    if (end) reverseGeocode(end[0], end[1]).then(n => n && setEndQuery(n));
  }, [end]);

  const handleFindRoute = useCallback(async () => {
    if (!start || !end) return;
    dispatch({ type: 'FETCH_START' });
    try {
      const dangerPaths = dangerZones.map(z => z.path);
      const latestHazards = hazardsRef.current || [];
      const latestFloods = floodOverlaysRef.current || [];
      const hazardAvoidPolys = latestHazards
        .filter((h: any) => h?.area_geojson && !hazardAllowsMode(h, transportMode))
        .flatMap((h: any) => extractAvoidPolygonsFromGeojson(h.area_geojson));
      const floodAvoidPolys = latestFloods
        .filter((f: any) => f?.area_geojson)
        .flatMap((f: any) => extractAvoidPolygonsFromGeojson(f.area_geojson));
      const forbiddenPolys = [...hazardAvoidPolys, ...floodAvoidPolys];
      const res = await getSafeRoute(start, end, dangerPaths, transportMode, accessPolygons, forbiddenPolys);
      const polygons = buildForbiddenTurfPolygons(forbiddenPolys);
      const rankRoutes = (routes: any[]) => chooseBestRoutes(routes, forbiddenPolys).routes;
      const isSafe = (r: any) => {
        if (!polygons.length) return true;
        const s = scoreRouteAgainstPolygons(r, polygons);
        return !s.intersects && s.insidePenalty === 0;
      };

      let mergedRoutes = rankRoutes(res.routes || []);

      const snapVia = async (via: [number, number]) => {
        try {
          const qs = new URLSearchParams({ lat: String(via[0]), lng: String(via[1]), profile: transportMode });
          const resp = await apiFetch(`osrm-nearest.php?${qs.toString()}`);
          const j = await resp.json();
          if (!j?.success) return null;
          const lat = Number(j.lat);
          const lng = Number(j.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          if (polygons.length) {
            const pt = turf.point([lng, lat]);
            for (const p of polygons) {
              if (turf.booleanPointInPolygon(pt, p)) return null;
            }
          }
          return [lat, lng] as [number, number];
        } catch {
          return null;
        }
      };

      const safeNow = mergedRoutes.filter(isSafe);
      if (polygons.length && safeNow.length < 2) {
        const rawVias = buildDetourViaPoints(forbiddenPolys, start, end).slice(0, 4);
        const snapped = (await Promise.all(rawVias.map(snapVia))).filter(Boolean) as Array<[number, number]>;
        const unique: Array<[number, number]> = [];
        const seen = new Set<string>();
        for (const v of snapped) {
          const key = `${v[0].toFixed(5)},${v[1].toFixed(5)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          unique.push(v);
        }

        if (unique.length) {
          const viaResults = await Promise.allSettled(
            unique.slice(0, 3).map(via => getRouteWithWaypoints([start, via, end], dangerPaths, transportMode, accessPolygons, forbiddenPolys))
          );
          const extraRoutes = viaResults
            .flatMap(r => (r.status === 'fulfilled' ? (r.value.routes || []) : []))
            .filter((r: any) => Array.isArray(r?.geometry?.coordinates) && r.geometry.coordinates.length >= 2);
          mergedRoutes = rankRoutes([...mergedRoutes, ...extraRoutes]);

          const dedup: any[] = [];
          for (const r of mergedRoutes) {
            const d = Number(r?.summary?.distance || 0);
            if (!Number.isFinite(d) || d <= 0) continue;
            const isDup = dedup.some((e: any) => Math.abs(Number(e?.summary?.distance || 0) - d) < 10);
            if (!isDup) dedup.push(r);
          }
          const bestDistance = Math.min(...dedup.map(r => Number(r?.summary?.distance || Number.POSITIVE_INFINITY)));
          const maxDistance = Number.isFinite(bestDistance) ? bestDistance * 1.6 : Number.POSITIVE_INFINITY;
          mergedRoutes = rankRoutes(dedup.filter(r => Number(r?.summary?.distance || 0) <= maxDistance));
        }
      }

      const finalSafe = mergedRoutes.filter(isSafe);
      const finalRoutes = (polygons.length && finalSafe.length) ? finalSafe.slice(0, 3) : mergedRoutes.slice(0, 3);
      const limited = finalRoutes;
      const nextRes = { ...res, routes: limited };
      dispatch({ type: 'FETCH_SUCCESS', payload: nextRes });
      setSelectedRouteIndex(0);

      // Fit map to route bounds
      if (limited?.[0]?.geometry?.coordinates) {
        const coords = limited[0].geometry.coordinates;
        const bounds = coords.reduce(
          (acc: any, coord: [number, number]) => {
            return [
              [Math.min(acc[0][0], coord[0]), Math.min(acc[0][1], coord[1])],
              [Math.max(acc[1][0], coord[0]), Math.max(acc[1][1], coord[1])]
            ];
          },
          [[coords[0][0], coords[0][1]], [coords[0][0], coords[0][1]]]
        );
        mapRef.current?.getMap().fitBounds(bounds, { padding: 50, duration: 1000 });
      }
    } catch (e: any) {
      dispatch({ type: 'FETCH_ERROR', payload: e.message || 'Calculation failed' });
    }
  }, [start, end, dangerZones, accessPolygons, transportMode]);

  useEffect(() => {
    if (start && end) handleFindRoute();
  }, [start, end, transportMode, handleFindRoute]);

  const [overlayBbox, setOverlayBbox] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const lastOverlayBboxRef = useRef<{ north: number; south: number; east: number; west: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadSaved = async () => {
      try {
        const savedRes = await fetch('/api/list-safe-routes.php').then(r => r.json()).catch(() => ({ routes: [] }));
        if (!mounted) return;
        const routes = Array.isArray(savedRes?.routes) ? savedRes.routes : [];
        setSavedRoutes(
          routes
            .filter((r: any) => Array.isArray(r.coordinates))
            .map((r: any) => ({ id: Number(r.id), name: String(r.name || `Route ${r.id}`), coordinates: r.coordinates }))
        );
      } catch {
        if (!mounted) return;
        setSavedRoutes([]);
      }
    };
    loadSaved();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!overlayBbox) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const qs = new URLSearchParams({
          north: String(overlayBbox.north),
          south: String(overlayBbox.south),
          east: String(overlayBbox.east),
          west: String(overlayBbox.west),
        });
        const res = await apiFetch(`list-map-overlays.php?${qs.toString()}`);
        const data = await res.json();
        if (cancelled) return;
        const hazardsArr = Array.isArray(data?.hazards) ? data.hazards : [];
        const floodsArr = Array.isArray(data?.reports) ? data.reports : [];
        setHazards(
          hazardsArr.map((h: any) => {
            const raw = String(h.severity || '').toLowerCase();
            const sev = raw === 'moderate' ? 'medium' : raw === 'low' || raw === 'medium' || raw === 'high' || raw === 'critical' ? raw : String(h.severity || 'medium').toLowerCase();
            return { ...h, severity: sev, area_geojson: h.area_geojson || null };
          })
        );
        setFloodOverlays(floodsArr);
        const merged = [
          ...hazardsArr.filter((h: any) => !h?.area_geojson).map((h: any) => ({ lat: h.lat, lng: h.lng, severity: h.severity })),
          ...floodsArr.map((f: any) => ({ lat: f.lat, lng: f.lng, severity: f.severity })),
        ];
        setHazardPoints(merged);
      } catch {
        if (!cancelled) {
          setHazardPoints([]);
          setHazards([]);
        }
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [overlayBbox]);

  useEffect(() => {
    if (!route?.routes?.length) return;
    const latestHazards = hazardsRef.current || [];
    const latestFloods = floodOverlaysRef.current || [];
    const hazardAvoidPolys = latestHazards
      .filter((h: any) => h?.area_geojson && !hazardAllowsMode(h, transportMode))
      .flatMap((h: any) => extractAvoidPolygonsFromGeojson(h.area_geojson));
    const floodAvoidPolys = latestFloods
      .filter((f: any) => f?.area_geojson)
      .flatMap((f: any) => extractAvoidPolygonsFromGeojson(f.area_geojson));
    const forbiddenPolys = [...hazardAvoidPolys, ...floodAvoidPolys];
    if (!forbiddenPolys.length) return;

    const picked = chooseBestRoutes(route.routes, forbiddenPolys);
    if (picked.routes.length && picked.routes[0] !== route.routes[0]) {
      dispatch({ type: 'FETCH_SUCCESS', payload: { ...route, routes: picked.routes } });
      setSelectedRouteIndex(0);
    }
  }, [hazards, floodOverlays, transportMode]);

  useEffect(() => {
    if (!navMode) return;
    const coords = route?.routes?.[selectedRouteIndex]?.geometry?.coordinates;
    if (!coords || coords.length < 2) return;
    const b = bearingDegrees(coords[0], coords[1]);
    updateViewport({ bearing: b, pitch: 0, zoom: Math.max(viewState.zoom, 16) });
    setMapStyle(MAPBOX_NAV_DAY);
  }, [navMode, route, selectedRouteIndex, enable3d]);

  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [navWatchId, setNavWatchId] = useState<number | null>(null);

  const computeRouteHeadingNear = useCallback(
    (lat: number, lng: number) => {
      const coords = route?.routes?.[selectedRouteIndex]?.geometry?.coordinates;
      if (!coords || coords.length < 2) return heading;
      try {
        const line = turf.lineString(coords);
        const pt = turf.point([lng, lat]);
        const nearest = turf.nearestPointOnLine(line, pt, { units: 'meters' }) as any;
        const idx = nearest?.properties?.index ?? 0;
        const a = coords[Math.max(0, Math.min(coords.length - 1, idx))];
        const b = coords[Math.max(0, Math.min(coords.length - 1, idx + 1))];
        return bearingDegrees(a, b);
      } catch {
        return heading;
      }
    },
    [route, selectedRouteIndex, heading]
  );

  useEffect(() => {
    if (!navMode) {
      if (navWatchId != null) {
        navigator.geolocation.clearWatch(navWatchId);
        setNavWatchId(null);
      }
      return;
    }
    const id = navigator.geolocation.watchPosition(
      p => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        const h = typeof p.coords.heading === 'number' && !isNaN(p.coords.heading)
          ? p.coords.heading
          : computeRouteHeadingNear(lat, lng);
        setUserLoc([lat, lng]);
        setHeading(h);
        const now = p.timestamp || Date.now();
        const prev = prevLocRef.current;
        if (prev) {
          const dt = Math.max(0.5, (now - prev.t) / 1000);
          const dx = turf.distance(turf.point([prev.lng, prev.lat]), turf.point([lng, lat]), { units: 'kilometers' });
          const v = (dx / (dt / 3600));
          setSpeedKmh((s: number) => s * 0.6 + v * 0.4);
        }
        prevLocRef.current = { lat, lng, t: now };
        updateViewport({
          latitude: lat,
          longitude: lng,
          bearing: h,
          pitch: 0,
          zoom: Math.max(viewState.zoom, 16),
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 500, timeout: 10000 }
    );
    setNavWatchId(id);
    return () => {
      navigator.geolocation.clearWatch(id);
    };
  }, [navMode, enable3d, computeRouteHeadingNear]);

  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map || !navMode || !userLoc) return;
    if (map.getLayer('car-3d')) return;
    map.addLayer({
      id: 'car-3d',
      type: 'custom',
      renderingMode: '3d',
      onAdd: function (_map: any, gl: WebGLRenderingContext) {
        const renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl });
        renderer.autoClear = false;
        const scene = new THREE.Scene();
        const camera = new THREE.Camera();
        const geom = new THREE.ConeGeometry(0.02, 0.06, 16);
        const mat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.4, roughness: 0.2 });
        const mesh = new THREE.Mesh(geom, mat);
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dir = new THREE.DirectionalLight(0xffffff, 0.8);
        dir.position.set(0, 0, 1);
        scene.add(dir);
        scene.add(mesh);
        carLayerRef.current = { renderer, scene, camera, mesh };
      },
      render: function (gl: WebGLRenderingContext, matrix: number[]) {
        const car = carLayerRef.current;
        if (!car || !userLoc) return;
        const mc = (window as any).mapboxgl.MercatorCoordinate.fromLngLat({ lng: userLoc[1], lat: userLoc[0] });
        const m = new THREE.Matrix4().fromArray(matrix);
        car.mesh.position.set(mc.x, mc.y, mc.z || 0);
        car.mesh.rotation.set(-Math.PI / 2, 0, (heading * Math.PI) / 180);
        car.renderer.state.reset();
        car.renderer.render(car.scene, car.camera);
        map.triggerRepaint();
      }
    });
  }, [navMode, userLoc, heading]);

  const useMyLocationOnce = () => {
    navigator.geolocation.getCurrentPosition(p => {
      const lat = p.coords.latitude, lng = p.coords.longitude;
      setStart([lat, lng]);
      setStartQuery('Your Location');
      setActiveInput('end');
      updateViewport({ latitude: lat, longitude: lng, zoom: 16 });
    });
  };

  const resetHazardDraft = () => {
    setHazardStart(null);
    setHazardEnd(null);
    setHazardPreviewLine(null);
    setHazardPolygon([]);
    setHazardPolygonFeature(null);
    setActiveHazardInput('start');
  };

  useEffect(() => {
    resetHazardDraft();
    setIsHazardDrawing(false);
    setIsHazardFormOpen(false);
    setSelectedHazard(null);
  }, [panelTab]);

  useEffect(() => {
    resetHazardDraft();
    setIsHazardDrawing(false);
    setIsHazardFormOpen(false);
    setSelectedHazard(null);
  }, [hazardDrawTool]);

  const finishHazardPolygon = () => {
    if (hazardPolygon.length < 3) return;
    const ring = [...hazardPolygon, hazardPolygon[0]].map(([lat, lng]) => [lng, lat] as [number, number]);
    const feature = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: { severity: draftHazardSeverity },
    };
    try {
      const c = turf.centroid(feature as any);
      const clng = Number((c as any)?.geometry?.coordinates?.[0]);
      const clat = Number((c as any)?.geometry?.coordinates?.[1]);
      if (Number.isFinite(clat) && Number.isFinite(clng)) {
        setHazardStart([clat, clng]);
        setHazardEnd([clat, clng]);
      } else if (hazardPolygon[0]) {
        setHazardStart(hazardPolygon[0]);
        setHazardEnd(hazardPolygon[0]);
      }
    } catch {
      if (hazardPolygon[0]) {
        setHazardStart(hazardPolygon[0]);
        setHazardEnd(hazardPolygon[0]);
      }
    }
    setHazardPolygonFeature(feature);
    setIsHazardFormOpen(true);
    setIsHazardDrawing(false);
  };

  const handleMapClick = async (e: any) => {
    const clicked = Array.isArray((e as any)?.features) ? (e as any).features[0] : null;
    if (panelTab === 'hazards' && !isHazardDrawing && clicked?.layer?.id && String(clicked.layer.id).includes('routes-view-hazard-area')) {
      const hid = (clicked?.properties as any)?.id;
      const found = hazards.find((h: any) => String(h.id) === String(hid));
      setSelectedHazard(found || clicked?.properties || null);
      return;
    }
    const { lat, lng } = e.lngLat;
    if (panelTab === 'hazards' && canEditHazards && isHazardDrawing) {
      if (hazardDrawTool === 'polygon') {
        setHazardPolygon(prev => [...prev, [lat, lng]]);
        return;
      }

      if (activeHazardInput === 'start' || !hazardStart) {
        setHazardStart([lat, lng]);
        setActiveHazardInput('end');
        setHazardEnd(null);
        setHazardPreviewLine(null);
      } else {
        const start = hazardStart;
        const endRaw: [number, number] = [lat, lng];
        if (snapHazardToRoad) {
          try {
            const body = {
              profile: 'driving-car',
              coordinates: [
                [start[1], start[0]],
                [endRaw[1], endRaw[0]],
              ],
              geometry_format: 'geojson',
            };
            const res = await apiFetch('ors-directions.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            const json = await res.json();
            const coords = (json as any)?.features?.[0]?.geometry?.coordinates;
            if (Array.isArray(coords) && coords.length >= 2) {
              const line: Array<[number, number]> = coords.map((c: [number, number]) => [c[1], c[0]]);
              setHazardPreviewLine(line);
              const first = line[0];
              const last = line[line.length - 1];
              setHazardStart([first[0], first[1]]);
              setHazardEnd([last[0], last[1]]);
            } else {
              setHazardEnd(endRaw);
              setHazardPreviewLine(null);
            }
          } catch {
            setHazardEnd(endRaw);
            setHazardPreviewLine(null);
          }
        } else {
          setHazardEnd(endRaw);
          setHazardPreviewLine(null);
        }
        setIsHazardFormOpen(true);
        setIsHazardDrawing(false);
      }
      return;
    }
    if (activeInput === 'start' || !start) {
      setStart([lat, lng]);
      setActiveInput('end');
    } else if (!endLocked) {
      setEnd([lat, lng]);
    }
  };
  const handleShareRoute = () => {
    if (!shareUrl) return;
    const primaryRoute = route?.routes?.[0];
    const via = primaryRoute ? getPrimaryVia(primaryRoute.segments) : 'Local Road';
    const distance = primaryRoute ? formatDistance(primaryRoute.summary.distance) : '';
    const duration = primaryRoute ? formatDuration(primaryRoute.summary.duration) : '';
    const from = startQuery || 'Starting point';
    const to = endQuery || 'Destination';
    const quote = primaryRoute
      ? `Safe route: ${from} → ${to}. ${distance} • ${duration} via ${via}.`
      : `Safe route: ${from} → ${to}.`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(quote)}`;
    window.open(facebookUrl, '_blank', 'noopener,noreferrer');
  };

  const filteredDangerZones = dangerZones.filter(z => Array.isArray(z.path) && isPathInBounds(z.path, SANTA_CRUZ_BOUNDS));

  return (
    <ErrorBoundary>
      <div className={`relative w-full ${fullscreen ? 'h-full' : 'h-[75vh]'}`}>
        <div
          className={`tactical-panel absolute top-0 right-0 bottom-0 z-[10] transition-all duration-500 shadow-2xl ${
            collapsed ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
          }`}
          style={{ width: '340px' }}
        >
          {!fullscreen ? (
            <button
              type="button"
              onClick={() => setCollapsed(v => !v)}
              className="absolute -left-7 top-1/2 -translate-y-1/2 bg-white text-gray-700 rounded-l-xl shadow-md w-7 h-14 z-20 flex items-center justify-center"
            >
              <FaChevronLeft className={`w-4 h-4 transform ${collapsed ? '' : 'rotate-180'}`} />
            </button>
          ) : null}

          {fullscreen && !collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-12 rounded-l-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-700"
            >
              <FaChevronLeft className="w-4 h-4 rotate-180" />
            </button>
          ) : null}

          <div className={`h-full flex flex-col ${collapsed ? 'hidden' : ''}`}>
            <div className="p-6 border-b border-gray-100 bg-white">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black font-jetbrains uppercase tracking-tight text-black">Safe Routes</h2>
                  <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-100">
                    <button
                      type="button"
                      onClick={() => { setPanelTab('planner'); if (fullscreen && collapsed) setCollapsed(false); }}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition ${
                        panelTab === 'planner' ? 'bg-black shadow-lg shadow-black/10 text-white' : 'text-gray-400 hover:text-black'
                      }`}
                    >
                      Planner
                    </button>
                    {canEditHazards ? (
                      <button
                        type="button"
                        onClick={() => { setPanelTab('hazards'); if (fullscreen && collapsed) setCollapsed(false); }}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition ${
                          panelTab === 'hazards' ? 'bg-black shadow-lg shadow-black/10 text-white' : 'text-gray-400 hover:text-black'
                        }`}
                      >
                        Hazards
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className={`flex-1 overflow-y-auto ${fullscreen && collapsed ? 'hidden' : ''}`}>
              {panelTab === 'hazards' ? (
                <div className="px-4 py-6">
                  <HazardManagementPanel
                    hazards={hazards}
                    snapToRoadEnabled={snapHazardToRoad}
                    setSnapToRoadEnabled={setSnapHazardToRoad}
                    draftSeverity={draftHazardSeverity}
                    setDraftSeverity={setDraftHazardSeverity}
                    isHazardDrawing={isHazardDrawing}
                    setIsHazardDrawing={setIsHazardDrawing}
                    hazardDrawTool={hazardDrawTool}
                    setHazardDrawTool={setHazardDrawTool}
                    previewLineGeojson={hazardPreviewLineGeojson}
                    previewAreaGeojson={hazardDrawTool === 'polygon' ? hazardPolygonFeature : hazardPreviewArea}
                    hazardPolygonCount={hazardPolygon.length}
                    onUndoHazardPolygon={() => setHazardPolygon(v => v.slice(0, -1))}
                    onFinishHazardPolygon={finishHazardPolygon}
                    onResetHazardDraft={resetHazardDraft}
                    defaultReporter={user?.full_name || user?.username || 'Barangay'}
                    defaultContact={user?.contact_number || ''}
                    defaultEmail={user?.email || ''}
                    defaultLocation={user?.brgy_name || ''}
                    defaultAddress={user?.brgy_name || ''}
                    onAddHazard={async (hazard: any) => {
                      const severityDb =
                        draftHazardSeverity === 'critical'
                          ? 'Critical'
                          : draftHazardSeverity === 'high'
                            ? 'High'
                            : draftHazardSeverity === 'medium'
                              ? 'Moderate'
                              : 'Low';
                      const area = hazardDrawTool === 'polygon' ? hazardPolygonFeature : hazardPreviewArea;
                      let centerLat: number | null = null;
                      let centerLng: number | null = null;
                      try {
                        if (area) {
                          const feature = (area as any).type === 'Feature' ? area : { type: 'Feature', geometry: area, properties: {} };
                          const c = turf.centroid(feature as any);
                          const lon = Number((c as any)?.geometry?.coordinates?.[0]);
                          const lat = Number((c as any)?.geometry?.coordinates?.[1]);
                          if (Number.isFinite(lat) && Number.isFinite(lon)) {
                            centerLat = lat;
                            centerLng = lon;
                          }
                        }
                      } catch {}
                      const payload = {
                        ...hazard,
                        severity: severityDb,
                        area_geojson: area,
                        brgy: user?.brgy_name || '',
                        reportedBy: hazard.reportedBy || user?.full_name || user?.username || 'Barangay',
                        reporter: hazard.reporter || user?.full_name || user?.username || 'Barangay',
                        location: hazard.location || user?.brgy_name || '',
                        address: hazard.address || user?.brgy_name || '',
                        lat: centerLat ?? hazardStart?.[0] ?? hazard.lat,
                        lng: centerLng ?? hazardStart?.[1] ?? hazard.lng,
                      };
                      if (hazardDrawTool === 'segment') {
                        (payload as any).start_lat = hazardStart?.[0] ?? hazard.start_lat;
                        (payload as any).start_lng = hazardStart?.[1] ?? hazard.start_lng;
                        (payload as any).end_lat = hazardEnd?.[0] ?? hazard.end_lat;
                        (payload as any).end_lng = hazardEnd?.[1] ?? hazard.end_lng;
                      }
                      const res = await apiFetch('add-hazard.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                      });
                      const data = await res.json();
                      if (!data?.success) throw new Error(data?.error || 'Failed to add hazard');
                      resetHazardDraft();
                      setIsHazardFormOpen(false);
                      setOverlayBbox(v => (v ? { ...v } : v));
                    }}
                    onEditHazard={async (id: any, patch: any) => {
                      const res = await apiFetch('update-hazard.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, ...patch }),
                      });
                      const data = await res.json();
                      if (data?.error) throw new Error(data.error);
                      setOverlayBbox(v => (v ? { ...v } : v));
                    }}
                    onDeleteHazard={async (id: any) => {
                      const res = await apiFetch('delete-hazard.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id }),
                      });
                      const data = await res.json();
                      if (!data?.success) throw new Error(data?.error || 'Failed to delete hazard');
                      setSelectedHazard(null);
                      setOverlayBbox(v => (v ? { ...v } : v));
                    }}
                    onSelectHazard={(h: any) => {
                      setSelectedHazard(h);
                      if (h?.lat && h?.lng) updateViewport({ latitude: Number(h.lat), longitude: Number(h.lng), zoom: Math.max(viewState.zoom, 15) });
                    }}
                    selectedHazard={selectedHazard}
                    hazardStart={hazardStart}
                    hazardEnd={hazardEnd}
                    activeHazardInput={activeHazardInput}
                    setActiveHazardInput={setActiveHazardInput}
                    setHazardStart={setHazardStart}
                    setHazardEnd={setHazardEnd}
                    isHazardFormOpen={isHazardFormOpen}
                    setIsHazardFormOpen={setIsHazardFormOpen}
                  />
                </div>
              ) : (
                <>
                  <div className="p-6 bg-white border-b border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] font-jetbrains">Plan a safe route</h3>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEnable3d(v => !v)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition ${enable3d ? 'bg-black text-white border-black shadow-lg shadow-black/10' : 'bg-white text-gray-400 border-gray-100 hover:text-black hover:border-black/10'}`}
                        >
                          3D
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setNavMode(v => {
                              const next = !v;
                              if (next && !fullscreen) setCollapsed(true);
                              return next;
                            })
                          }
                          disabled={!(route?.routes?.length && start && end)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition ${navMode ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-white text-gray-400 border-gray-100 hover:text-black hover:border-black/10'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          Navigate
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="relative group">
                        <input
                          type="text" value={startQuery} onChange={e => setStartQuery(e.target.value)} onFocus={() => setActiveInput('start')}
                          placeholder="Starting point" className="premium-input w-full pl-12 pr-12"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                        <button onClick={useMyLocationOnce} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:text-black transition-colors">LIVE</button>
                      </div>
                      <div className="relative group">
                        <input
                          type="text" value={endQuery} onChange={e => setEndQuery(e.target.value)} onFocus={() => setActiveInput('end')}
                          placeholder="Destination" disabled={endLocked} className="premium-input w-full pl-12"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 p-6 overflow-x-auto no-scrollbar">
                    {[
                      { id: 'car', icon: FaCar, mode: 'driving-car' },
                      { id: 'motor', icon: FaMotorcycle, mode: 'driving-car' },
                      { id: 'bike', icon: FaBicycle, mode: 'cycling-regular' },
                      { id: 'walk', icon: FaWalking, mode: 'foot-walking' },
                      { id: 'truck', icon: FaBus, mode: 'driving-hgv' }
                    ].map(m => {
                      const active = displayVehicle === m.id;
                      return (
                        <button
                          key={m.id} onClick={() => { setTransportMode(m.mode as any); setDisplayVehicle(m.id as any); }}
                          className={`flex flex-col items-center justify-center min-w-[56px] aspect-square rounded-2xl transition-all duration-300 ${active ? 'bg-black text-white shadow-xl shadow-black/20 scale-105' : 'bg-white text-gray-400 hover:text-black border border-gray-100 hover:border-black/10'}`}
                        >
                          <m.icon size={18} />
                          <span className="text-[9px] mt-1 font-black uppercase tracking-tighter">{m.id}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-6 space-y-4">
                    {status === 'success' && route?.routes?.length ? (
                      <button
                        type="button"
                        onClick={handleShareRoute}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-4 shadow-xl shadow-black/10 group active:scale-[0.98]"
                      >
                        <FaFacebookF className="text-white group-hover:scale-110 transition-transform" />
                        <span className="font-bold tracking-tight">Share on Facebook</span>
                      </button>
                    ) : null}
                    {status === 'loading' ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-black/10 border-b-black mx-auto"></div>
                        <p className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Finding safest path...</p>
                      </div>
                    ) : null}
                    {status === 'error' ? (
                      <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-[11px] font-bold border border-red-100 flex items-center gap-3">
                        <FiAlertTriangle size={20} />
                        {error}
                      </div>
                    ) : null}
                    {status === 'success' && route?.routes?.length ? (
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 font-jetbrains">Available Routes</label>
                        {route.routes.map((r, i) => (
                          <div
                            key={i}
                            onClick={() => setSelectedRouteIndex(i)}
                            className={`bento-card p-4 cursor-pointer relative overflow-hidden group transition-all duration-300 ${
                              selectedRouteIndex === i ? 'ring-2 ring-black bg-white shadow-2xl scale-[1.02]' : 'border-gray-100 bg-white/50 hover:bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-lg font-black font-jetbrains text-black">{formatDuration(r.summary.duration)}</span>
                              {getSafetyBadge(getRouteSafety(r, dangerZones))}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
                              <span className="text-gray-900">{formatDistance(r.summary.distance)}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-200" />
                              <span>via {getPrimaryVia(r.segments)}</span>
                            </div>
                            {selectedRouteIndex === i && (
                              <div className="absolute right-0 bottom-0 w-12 h-12 bg-black/5 -mr-4 -mb-4 rotate-45" />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {fullscreen && collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-14 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-700"
          >
            <FaChevronLeft className="w-4 h-4" />
          </button>
        ) : null}

        {/* Map */}
        <div className="h-full w-full relative">
          {/* Floating Search Bar */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[10] w-[400px] max-w-[90%]">
            <form onSubmit={(e) => e.preventDefault()} className="flex shadow-2xl rounded-2xl bg-white/95 backdrop-blur-md overflow-hidden border border-gray-200/50 transition-all focus-within:ring-4 focus-within:ring-blue-600/10">
              <div className="pl-5 flex items-center">
                <FaSearch className="text-gray-400 text-sm" />
              </div>
              <input
                type="text"
                placeholder="Search for a location..."
                className="flex-1 px-4 py-3.5 text-[13px] outline-none bg-transparent text-gray-900 font-bold placeholder-gray-400"
              />
              <button 
                type="submit" 
                className="bg-blue-600 text-white px-6 hover:bg-blue-700 transition-all flex items-center justify-center active:scale-95"
              >
                <FaCheckCircle className="text-sm" />
              </button>
            </form>
          </div>
          <MapboxMap
            ref={mapRef}
            initialViewState={{
              latitude: DEFAULT_MAP_STATE.latitude,
              longitude: DEFAULT_MAP_STATE.longitude,
              zoom: DEFAULT_MAP_STATE.zoom
            }}
            minZoom={DEFAULT_MAP_STATE.minZoom}
            maxBounds={DEFAULT_MAP_STATE.maxBounds}
            onMove={(e: any) => setViewState(e.viewState)}
            onLoad={(e: any) => {
              const map = e?.target?.getMap?.();
              if (map) {
                map.setTerrain(null);
              }
            }}
            onIdle={(e: any) => {
              try {
                const b = e.target.getBounds();
                const next = {
                  north: b.getNorth(),
                  south: b.getSouth(),
                  east: b.getEast(),
                  west: b.getWest(),
                };
                const prev = lastOverlayBboxRef.current;
                const changed =
                  !prev ||
                  Math.abs(prev.north - next.north) > 0.002 ||
                  Math.abs(prev.south - next.south) > 0.002 ||
                  Math.abs(prev.east - next.east) > 0.002 ||
                  Math.abs(prev.west - next.west) > 0.002;
                if (changed) {
                  lastOverlayBboxRef.current = next;
                  setOverlayBbox(next);
                }
              } catch {}
            }}
            mapStyle={mapStyle}
            mapboxAccessToken={MAPBOX_TOKEN}
            onClick={handleMapClick}
            interactiveLayerIds={[
              'routes-view-hazard-area-glow',
              'routes-view-hazard-area-fill',
              'routes-view-hazard-area-outline',
              'routes-view-hazard-area-icon',
            ]}
            style={{ width: '100%', height: '100%' }}
          >
            <NavigationControl position="top-right" />
            <FullscreenControl position="top-right" />

            <SantaCruzMapboxOutline />

            <HazardLayers points={hazardPoints} areas={hazardAreas} idPrefix="routes-view" />

            {panelTab === 'hazards' && selectedHazard && !isHazardDrawing ? (
              <div className="absolute z-10 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-sm p-3 w-[320px] max-w-[calc(100vw-1rem)] right-2 bottom-20 sm:right-4 sm:bottom-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-gray-900 truncate">
                      {String((selectedHazard as any).type || 'Hazard')}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {String((selectedHazard as any).status || 'active')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {String((selectedHazard as any).severity || '').toLowerCase() === 'critical'
                          ? 'Critical'
                          : String((selectedHazard as any).severity || '').toLowerCase() === 'high'
                            ? 'High'
                            : String((selectedHazard as any).severity || '').toLowerCase() === 'low'
                              ? 'Low'
                              : 'Moderate'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedHazard(null)}
                    className="w-8 h-8 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 grid place-items-center"
                  >
                    ✕
                  </button>
                </div>

                {(selectedHazard as any).photo_url ? (
                  <button
                    type="button"
                    onClick={() => setHazardPhotoModalUrl(String((selectedHazard as any).photo_url))}
                    className="mt-3 w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
                  >
                    <img
                      src={String((selectedHazard as any).photo_url)}
                      alt="Hazard"
                      className="w-full h-36 object-cover"
                      loading="lazy"
                    />
                  </button>
                ) : (
                  <div className="mt-3 w-full h-16 rounded-xl border border-dashed border-gray-200 bg-gray-50 grid place-items-center text-xs font-semibold text-gray-500">
                    No photo attached
                  </div>
                )}

                <div className="mt-3 space-y-1 text-xs">
                  {(selectedHazard as any).address ? (
                    <div className="text-gray-700 font-semibold">{String((selectedHazard as any).address)}</div>
                  ) : null}
                  {(selectedHazard as any).datetime ? (
                    <div className="text-gray-500 font-semibold">{String((selectedHazard as any).datetime)}</div>
                  ) : null}
                </div>

                {(selectedHazard as any).description ? (
                  <div className="mt-3 text-xs text-gray-700 whitespace-pre-wrap">
                    {String((selectedHazard as any).description)}
                  </div>
                ) : null}

                {Array.isArray((selectedHazard as any).allowed_modes) && (selectedHazard as any).allowed_modes.length ? (
                  <div className="mt-3">
                    <div className="text-[11px] font-semibold text-gray-500">Affected modes</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {(selectedHazard as any).allowed_modes.map((m: any) => (
                        <span key={String(m)} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px] font-semibold">
                          {String(m)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold">
                  <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                    <div className="text-gray-500">Reported by</div>
                    <div className="text-gray-900 truncate">{String((selectedHazard as any).reporter || (selectedHazard as any).reported_by || '—')}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                    <div className="text-gray-500">Contact</div>
                    <div className="text-gray-900 truncate">{String((selectedHazard as any).contact || '—')}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const a = (selectedHazard as any).area_geojson;
                        if (a) {
                          const f = a.type === 'Feature' ? a : { type: 'Feature', geometry: a, properties: {} };
                          const c = turf.centroid(f as any);
                          const lon = Number((c as any)?.geometry?.coordinates?.[0]);
                          const lat = Number((c as any)?.geometry?.coordinates?.[1]);
                          if (Number.isFinite(lat) && Number.isFinite(lon)) {
                            mapRef.current?.getMap?.().flyTo({ center: [lon, lat], zoom: 16, duration: 700 });
                            return;
                          }
                        }
                        const lat = Number((selectedHazard as any).lat);
                        const lon = Number((selectedHazard as any).lng);
                        if (Number.isFinite(lat) && Number.isFinite(lon)) {
                          mapRef.current?.getMap?.().flyTo({ center: [lon, lat], zoom: 16, duration: 700 });
                        }
                      } catch {}
                    }}
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-extrabold bg-gray-900 text-white hover:bg-gray-800"
                  >
                    Zoom
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const url = (selectedHazard as any).photo_url;
                      if (url) setHazardPhotoModalUrl(String(url));
                    }}
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-extrabold border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                    disabled={!(selectedHazard as any).photo_url}
                  >
                    View photo
                  </button>
                </div>
              </div>
            ) : null}

            {hazardPhotoModalUrl ? (
              <div className="absolute inset-0 z-20 bg-black/70 grid place-items-center p-4">
                <button
                  type="button"
                  onClick={() => setHazardPhotoModalUrl(null)}
                  className="absolute right-4 top-4 w-10 h-10 rounded-2xl bg-white/95 border border-gray-200 text-gray-800 font-extrabold"
                >
                  ✕
                </button>
                <img
                  src={hazardPhotoModalUrl}
                  alt="Hazard"
                  className="max-h-[85vh] max-w-[95vw] rounded-2xl shadow-2xl"
                />
              </div>
            ) : null}

            {savedRouteGeojson ? (
              <Source id="saved-route" type="geojson" data={savedRouteGeojson as any}>
                <Layer
                  id="saved-route-casing"
                  type="line"
                  layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                  paint={{ 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': 0.95 }}
                />
                <Layer
                  id="saved-route-main"
                  type="line"
                  layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                  paint={{ 'line-color': '#2563eb', 'line-width': 5, 'line-opacity': 0.85 }}
                />
              </Source>
            ) : null}

            {panelTab === 'hazards' && isHazardDrawing && hazardDrawTool === 'segment' && hazardPreviewArea ? (
              <Source id="hazard-preview-area" type="geojson" data={hazardPreviewArea as any}>
                <Layer
                  id="hazard-preview-glow"
                  type="line"
                  paint={{
                    'line-color': draftHazardSeverity === 'critical' ? '#7F1D1D' : draftHazardSeverity === 'high' ? '#EF4444' : draftHazardSeverity === 'medium' ? '#F59E0B' : '#60A5FA',
                    'line-width': ['interpolate', ['linear'], ['zoom'], 11, 6, 16, 14],
                    'line-opacity': 0.22,
                    'line-blur': 2,
                  }}
                />
                <Layer
                  id="hazard-preview-fill"
                  type="fill"
                  paint={{
                    'fill-color': draftHazardSeverity === 'critical' ? '#7F1D1D' : draftHazardSeverity === 'high' ? '#EF4444' : draftHazardSeverity === 'medium' ? '#F59E0B' : '#3B82F6',
                    'fill-opacity': 0.4,
                  }}
                />
                <Layer
                  id="hazard-preview-outline"
                  type="line"
                  paint={{
                    'line-color': draftHazardSeverity === 'critical' ? '#7F1D1D' : draftHazardSeverity === 'high' ? '#EF4444' : draftHazardSeverity === 'medium' ? '#F59E0B' : '#3B82F6',
                    'line-width': 2,
                    'line-opacity': 0.85,
                  }}
                />
              </Source>
            ) : null}

            {panelTab === 'hazards' && isHazardDrawing && hazardDrawTool === 'segment' && hazardPreviewLineGeojson ? (
              <Source id="hazard-preview-line" type="geojson" data={hazardPreviewLineGeojson as any}>
                <Layer
                  id="hazard-preview-line-casing"
                  type="line"
                  layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                  paint={{ 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.95 }}
                />
                <Layer
                  id="hazard-preview-line-main"
                  type="line"
                  layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                  paint={{ 'line-color': '#2563eb', 'line-width': 4, 'line-opacity': 0.9 }}
                />
              </Source>
            ) : null}

            {panelTab === 'hazards' && isHazardDrawing && hazardDrawTool === 'polygon' && hazardPolygonPreviewFill ? (
              <Source id="hazard-polygon-preview-fill" type="geojson" data={hazardPolygonPreviewFill as any}>
                <Layer
                  id="hazard-polygon-preview-glow-layer"
                  type="line"
                  paint={{
                    'line-color': draftHazardSeverity === 'critical' ? '#7F1D1D' : draftHazardSeverity === 'high' ? '#EF4444' : '#60A5FA',
                    'line-width': ['interpolate', ['linear'], ['zoom'], 11, 6, 16, 14],
                    'line-opacity': 0.22,
                    'line-blur': 2,
                  }}
                />
                <Layer
                  id="hazard-polygon-preview-fill-layer"
                  type="fill"
                  paint={{
                    'fill-color': draftHazardSeverity === 'critical' ? '#7F1D1D' : draftHazardSeverity === 'high' ? '#EF4444' : draftHazardSeverity === 'medium' ? '#2563EB' : '#60A5FA',
                    'fill-opacity': 0.4,
                  }}
                />
                <Layer
                  id="hazard-polygon-preview-outline-layer"
                  type="line"
                  paint={{
                    'line-color': draftHazardSeverity === 'critical' ? '#7F1D1D' : draftHazardSeverity === 'high' ? '#EF4444' : '#60A5FA',
                    'line-width': 2,
                    'line-opacity': 0.85,
                  }}
                />
              </Source>
            ) : null}

            {panelTab === 'hazards' && isHazardDrawing && hazardDrawTool === 'polygon' && hazardPolygonPreview ? (
              <Source id="hazard-polygon-preview-line" type="geojson" data={hazardPolygonPreview as any}>
                <Layer
                  id="hazard-polygon-preview-line-layer"
                  type="line"
                  layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                  paint={{ 'line-color': '#2563eb', 'line-width': 3, 'line-opacity': 0.9 }}
                />
              </Source>
            ) : null}

            {panelTab === 'hazards' && isHazardDrawing && hazardDrawTool === 'segment' && hazardStart ? (
              <Marker latitude={hazardStart[0]} longitude={hazardStart[1]} anchor="center">
                <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow" />
              </Marker>
            ) : null}
            {panelTab === 'hazards' && isHazardDrawing && hazardDrawTool === 'segment' && hazardEnd ? (
              <Marker latitude={hazardEnd[0]} longitude={hazardEnd[1]} anchor="center">
                <div className="w-4 h-4 rounded-full bg-rose-500 border-2 border-white shadow" />
              </Marker>
            ) : null}

            {navMode && route?.routes?.[selectedRouteIndex]?.segments?.[0]?.steps?.length ? (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4">
                <div className="bg-blue-600 text-white rounded-2xl shadow-lg px-4 py-3 min-w-[280px] max-w-[520px]">
                  <div className="flex items-center gap-3">
                    <svg width="28" height="28" viewBox="0 0 24 24">
                      <path d="M6 20 L6 8 L12 8 L12 4 L20 12 L12 20 L12 16 L6 16 Z" fill="white"/>
                    </svg>
                    <div className="flex-1">
                      <div className="text-xl font-extrabold">
                        {formatDistance(route.routes[selectedRouteIndex].segments[0].steps[0].distance)}
                      </div>
                      <div className="text-sm opacity-90">
                        {route.routes[selectedRouteIndex].segments[0].steps[0].name || 'Unnamed road'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {navMode ? (
              <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
                <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow px-2 py-1 w-16 text-center">
                  <div className="text-[11px] font-bold text-gray-700">km/h</div>
                  <div className="text-xl font-extrabold text-gray-900">{Math.round(speedKmh)}</div>
                </div>
              </div>
            ) : null}

            {null}

            {/* 3D layers removed for unified 2D light theme */}

            {/* Start Marker */}
            {panelTab === 'planner' && start ? (
              <Marker latitude={start[0]} longitude={start[1]} anchor="bottom" offset={[0, -3]}>
                <div className="drop-shadow-lg">
                  <MapboxPin color="#2563eb" />
                </div>
              </Marker>
            ) : null}
            
            {/* End Marker */}
            {panelTab === 'planner' && end ? (
              <Marker latitude={end[0]} longitude={end[1]} anchor="bottom" offset={[0, -3]}>
                <div className="drop-shadow-lg">
                  <MapboxPin color="#ef4444" />
                </div>
              </Marker>
            ) : null}

            {/* Route Polylines */}
            {route?.routes?.map((r, i) => (
              <Source key={i} type="geojson" data={{ type: 'Feature', geometry: { type: 'LineString', coordinates: r.geometry.coordinates }, properties: {} }}>
                <Layer
                  id={`route-${i}-casing`} type="line"
                  layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                  paint={{
                    'line-color': i === selectedRouteIndex ? '#ffffff' : '#e5e7eb',
                    'line-width': i === selectedRouteIndex ? 10 : 7,
                    'line-opacity': i === selectedRouteIndex ? 0.95 : 0.7,
                  }}
                />
                <Layer
                  id={`route-${i}-main`} type="line"
                  layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                  paint={{
                    'line-color': i === selectedRouteIndex ? '#2563eb' : '#9ca3af',
                    'line-width': i === selectedRouteIndex ? 6 : 4,
                    'line-opacity': i === selectedRouteIndex ? 1 : 0.6,
                  }}
                />
              </Source>
            ))}

            {navMode && userLoc ? (
              <Marker latitude={userLoc[0]} longitude={userLoc[1]} anchor="center">
                <div
                  style={{ transform: `rotate(${heading}deg)` }}
                  className="w-8 h-8"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" className="drop-shadow-lg">
                    <defs>
                      <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb"/>
                        <stop offset="100%" stopColor="#1e3a8a"/>
                      </linearGradient>
                    </defs>
                    <path d="M12 2 L19 22 L12 18 L5 22 Z" fill="url(#g)" stroke="white" strokeWidth="1.5" />
                  </svg>
                </div>
              </Marker>
            ) : null}

            {navMode && route?.routes?.[selectedRouteIndex]?.segments?.[0]?.steps?.length ? (
              <div className="absolute bottom-4 left-4 z-10 max-w-[360px] bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Navigation</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900 line-clamp-2">
                      {route.routes[selectedRouteIndex].segments[0].steps[0].instruction}
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      {formatDistance(route.routes[selectedRouteIndex].segments[0].steps[0].distance)} • {formatDuration(route.routes[selectedRouteIndex].segments[0].steps[0].duration)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNavMode(false)}
                    className="shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800"
                  >
                    Exit
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="text-2xl font-extrabold text-gray-900">{Math.round(speedKmh)}</div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-500">km/h</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{formatDuration(route.routes[selectedRouteIndex].summary.duration)}</div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-500">ETA</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{formatDistance(route.routes[selectedRouteIndex].summary.distance)}</div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-500">Remain</div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Danger Zones */}
            {filteredDangerZones.map((z, i) => (
              <Fragment key={i}>
                <Source type="geojson" data={{ type: 'Feature', geometry: { type: 'LineString', coordinates: z.path.map(([lat, lng]: [number, number]) => [lng, lat]) }, properties: {} }}>
                  <Layer id={`danger-line-${i}`} type="line" paint={{ 'line-color': statusColors[z.type as StatusType] || '#ef4444', 'line-width': 4, 'line-dasharray': [2, 2] }} />
                </Source>
                <TacticalMarker 
                  latitude={z.path[0][0]} 
                  longitude={z.path[0][1]} 
                  type="hazard"
                />
              </Fragment>
            ))}

            {/* Shelter Markers */}
            {shelters.map((s, idx) => {
              const lat = parseFloat(s.lat || s.latitude);
              const lng = parseFloat(s.lng || s.longitude);
              return (
                <TacticalMarker 
                  key={`sh-${s.id || idx}`} 
                  latitude={lat} 
                  longitude={lng} 
                  type="shelter" 
                />
              );
            })}
          </MapboxMap>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default RoutesView;
