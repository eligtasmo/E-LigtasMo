import { useEffect, useMemo, useState, useRef, Fragment } from "react";
import { FiAlertTriangle, FiActivity, FiMap, FiChevronRight, FiExternalLink, FiX } from "react-icons/fi";
import { FaCloudRain, FaTint, FaWind, FaMapMarkerAlt, FaWater } from "react-icons/fa";
import TacticalMarker from "../maps/TacticalMarker";
import MapboxMap, {
  Marker,
  Popup,
  NavigationControl,
  FullscreenControl,
  Source,
  Layer,
  useMap as useMapboxMap,
  MapProvider,
} from "../maps/MapboxMap";
import { useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import * as turf from "@turf/turf";
import { apiFetch } from "../../utils/api";

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN) as string | undefined;
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const mockForecast = [
  { day: "Today", temp: 31, rain: 12, desc: "Thunderstorms" },
  { day: "Tomorrow", temp: 29, rain: 20, desc: "Heavy Rain" },
  { day: "Wed", temp: 30, rain: 5, desc: "Cloudy" },
];

const mockRainfallData = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  datasets: [
    {
      label: "Rainfall (mm)",
      data: [5, 12, 20, 8, 15, 30, 25],
      fill: true,
      backgroundColor: "rgba(59, 130, 246, 0.2)",
      borderColor: "#2563eb",
      tension: 0.4,
    },
  ],
};

const mockAdvisories = [
  {
    id: 1,
    title: "Flood Warning: Manila",
    time: "2025-06-10 14:00",
    details: "Heavy rainfall expected. Possible flooding in low-lying areas.",
  },
  {
    id: 2,
    title: "Thunderstorm Advisory: Quezon City",
    time: "2025-06-10 13:00",
    details: "Thunderstorms detected. Take necessary precautions.",
  },
  {
    id: 3,
    title: "Typhoon Alert: Typhoon Ambo",
    time: "2025-06-09 18:00",
    details: "Typhoon Ambo is within PAR. Monitor updates from PAGASA.",
  },
];

export default function WeatherFloodTrackingView() {
  const navigate = useNavigate();
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [hourly, setHourly] = useState<{ time: string[]; rain: number[]; precipProb?: number[] } | null>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [dangerZones, setDangerZones] = useState<any[]>([]);
  const [hazards, setHazards] = useState<any[]>([]);
  const [hazardRouteSegments, setHazardRouteSegments] = useState<{[key: string]: Array<[number, number]>}>({});
  const [shelters, setShelters] = useState<any[]>([]);
  const [lastPassabilityUpdate, setLastPassabilityUpdate] = useState<Date | null>(null);
  const [showLiveRoads, setShowLiveRoads] = useState(true);
  const [showFloodAreas, setShowFloodAreas] = useState(true);
  const [showDangerZones, setShowDangerZones] = useState(true);
  const [showHazards, setShowHazards] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showPassabilityList, setShowPassabilityList] = useState(true);
  const [scaleOverlaysWithRain, setScaleOverlaysWithRain] = useState(true);
  const [useMyLocation, setUseMyLocation] = useState(true);
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [forecastWindow, setForecastWindow] = useState<1 | 3 | 6>(3);
  const [showHeatLayer, setShowHeatLayer] = useState(true);
  const heatFetchBusyRef = useRef<boolean>(false);
  const [heatGridSize, setHeatGridSize] = useState<3 | 5>(5);
  const [heatDisplayMode, setHeatDisplayMode] = useState<"heatmap" | "grid">("heatmap");
  const [heatRadius, setHeatRadius] = useState<number>(28);
  const [heatBlur, setHeatBlur] = useState<number>(16);
  const [heatCells, setHeatCells] = useState<Array<{ bounds: [[number, number], [number, number]]; index: number }>>([]);
  const [lastHeatRefresh, setLastHeatRefresh] = useState<number | null>(null);
  const [showHydrology, setShowHydrology] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [residentAlert, setResidentAlert] = useState<any | null>(null);
  const [transportMode, setTransportMode] = useState<'driving-car' | 'cycling-regular' | 'foot-walking' | 'driving-hgv'>('driving-car');
  const [accessPolygons, setAccessPolygons] = useState<Array<{ polygon: Array<[number, number]>; allowedVehicles: string[] }>>([]);

  const [selectedMarker, setSelectedMarker] = useState<{
    type: 'incident' | 'shelter' | 'hazard' | 'zone' | 'monitoring';
    data: any;
  } | null>(null);

  const severityToColor = (sev?: string) => {
    const s = (sev || '').toLowerCase();
    if (s === 'critical') return '#7f1d1d';
    if (s === 'high') return '#ef4444';
    if (s === 'medium' || s === 'moderate') return '#FBBF24';
    return '#3B82F6';
  };

  const openResidentAlert = (payload: any) => setResidentAlert(payload);

  function closeResidentAlert() {
    setResidentAlert(null);
  }

  function formatAllowedVehicles(source: any, fallbackVehicles?: string) {
    const v = source?.allowed_vehicles ?? source?.allowedVehicles ?? source?.allowed_modes;
    if (Array.isArray(v)) return v.join(', ');
    if (typeof v === 'string' && v.trim().length > 0) return v;
    if (typeof fallbackVehicles === 'string' && fallbackVehicles.length > 0) return fallbackVehicles;
    return 'Unknown';
  }

  const getAccessStatusForPoint = (
    latlng: [number, number],
    allowed?: string[] | string
  ): { allowed: boolean; label: string } => {
    let allowedForMode: boolean | null = null;
    if (allowed) {
      const arr = Array.isArray(allowed)
        ? allowed
        : String(allowed)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
      const normalized = arr.map((s) => s.toLowerCase());
      const aliases =
        transportMode === 'driving-car'
          ? ['car', 'vehicle']
          : transportMode === 'driving-hgv'
          ? ['truck', 'hgv']
          : transportMode === 'foot-walking'
          ? ['foot', 'walk', 'walking']
          : transportMode === 'cycling-regular'
          ? ['bike', 'bicycle', 'cycling']
          : [];
      allowedForMode =
        normalized.includes(transportMode) || aliases.some((a) => normalized.includes(a));
    }

    let polygonRestriction = false;
    try {
      const point = turf.point([latlng[1], latlng[0]]);
      for (const poly of accessPolygons) {
        const ring = (poly.polygon || []).map(([lat, lng]) => [lng, lat]);
        if (ring.length >= 3) {
          const geo = turf.polygon([ring]);
          if (turf.booleanPointInPolygon(point, geo)) {
            const isAllowed = (poly.allowedVehicles || []).includes(transportMode);
            polygonRestriction = !isAllowed;
            break;
          }
        }
      }
    } catch (e) {
      // ignore turf errors
    }

    const allowedFinal = allowedForMode !== null ? allowedForMode : !polygonRestriction;
    return {
      allowed: !!allowedFinal,
      label: allowedFinal ? 'Passable for current mode' : 'Restricted for current mode',
    };
  };

  // Santa Cruz, Laguna bounds (approx.)
  type Bounds = { north: number; south: number; east: number; west: number };
  const SANTA_CRUZ_BOUNDS: Bounds = { north: 14.31, south: 14.26, east: 121.44, west: 121.40 };
  const [mapBounds, setMapBounds] = useState<Bounds | null>(null);
  function isPointInBounds(point: [number, number], b: Bounds) {
    const [lat, lng] = point;
    return lat <= b.north && lat >= b.south && lng <= b.east && lng >= b.west;
  }

  // Try to use browser geolocation when enabled
  useEffect(() => {
    if (useMyLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMyLocation([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, maximumAge: 60_000 }
      );
    }
  }, [useMyLocation]);

  const DEFAULT_CENTER: [number, number] = [14.281, 121.415];
  const queryLatLng = useMemo<[number, number]>(() => {
    if (useMyLocation && myLocation) return myLocation;
    if (mapCenter) return mapCenter;
    return DEFAULT_CENTER;
  }, [useMyLocation, myLocation, mapCenter]);

  // Keep track of last successful weather query to avoid rapid re-fetches on tiny map movements
  const [lastWeatherQuery, setLastWeatherQuery] = useState<[number, number] | null>(null);
  // Guard and abort for single-location weather fetch to avoid overlaps and 429 loops
  const weatherFetchBusyRef = useRef<boolean>(false);
  const weatherAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Use Open-Meteo (no API key) for Santa Cruz, Laguna
    let intervalId: number | undefined;
    const CACHE_TTL_MS = 5 * 60 * 1000; // cache weather for 5 minutes
    const BACKOFF_MINUTES = 45; // after 429s, wait this long before trying again
    const DAILY_BACKOFF_MS = 24 * 60 * 60 * 1000; // daily cap reached
    const GLOBAL_BACKOFF_KEY = 'openmeteo_backoff_until';

    async function fetchWeather() {
      // Prevent overlapping runs
      if (weatherFetchBusyRef.current) return;

      // If the map center moved only a tiny amount (< ~200m), skip refresh to prevent flicker
      if (lastWeatherQuery) {
        const dLat = Math.abs(queryLatLng[0] - lastWeatherQuery[0]);
        const dLng = Math.abs(queryLatLng[1] - lastWeatherQuery[1]);
        if (dLat < 0.002 && dLng < 0.002) {
          return; // movement too small; keep existing data
        }
      }
      if (!weather) setLoading(true); // show loading only if we don’t have data yet
      try {
        // Round to ~1.1km (0.01°) to improve cache reuse while moving
        const cacheKey = `hourly:${queryLatLng[0].toFixed(2)},${queryLatLng[1].toFixed(2)}`;
        const backoffKey = `wbackoff:${queryLatLng[0].toFixed(2)},${queryLatLng[1].toFixed(2)}`;

        const now = Date.now();
        let cached: any = null;
        try {
          const cachedRaw = localStorage.getItem(cacheKey);
          if (cachedRaw) cached = JSON.parse(cachedRaw);
        } catch {}

        let backoffUntil = 0;
        try {
          const braw = localStorage.getItem(backoffKey);
          if (braw) backoffUntil = parseInt(braw) || 0;
        } catch {}

        // Use cache if fresh and skip network
        if (cached?.ts && (now - cached.ts) < CACHE_TTL_MS && cached.hourly && cached.weather) {
          setWeather(cached.weather);
          setHourly(cached.hourly);
          setLastWeatherQuery([queryLatLng[0], queryLatLng[1]]);
          setLoading(false);
          setWeatherError(null);
          return;
        }

        // Respect global backoff window first (applies across all locations)
        try {
          const gbRaw = localStorage.getItem(GLOBAL_BACKOFF_KEY);
          const gbUntil = gbRaw ? parseInt(gbRaw) || 0 : 0;
          if (gbUntil && now < gbUntil) {
            if (cached?.weather && cached?.hourly) {
              setWeather(cached.weather);
              setHourly(cached.hourly);
              setLastWeatherQuery([queryLatLng[0], queryLatLng[1]]);
              setWeatherError(null);
            } else {
              setWeather({ temp: undefined, desc: 'No precipitation', icon: null, humidity: undefined, wind: undefined, precipitation: 0 });
              setHourly({ time: [], rain: [], precipProb: [] });
              setWeatherError('Weather data limited (rate-limited)');
            }
            setLoading(false);
            return;
          }
        } catch {}

        // Respect per-location backoff window on 429
        if (backoffUntil && now < backoffUntil) {
          if (cached?.weather && cached?.hourly) {
            setWeather(cached.weather);
            setHourly(cached.hourly);
            setLastWeatherQuery([queryLatLng[0], queryLatLng[1]]);
            setWeatherError(null);
          } else {
            // Graceful synthetic fallback when no cache is available
            setWeather({
              temp: undefined,
              desc: 'No precipitation',
              icon: null,
              humidity: undefined,
              wind: undefined,
              precipitation: 0,
            });
            setHourly({ time: [], rain: [], precipProb: [] });
            setWeatherError('Weather data limited (rate-limited)');
          }
          setLoading(false);
          return;
        }

        // Start a new request; abort any previous one
        weatherFetchBusyRef.current = true;
        if (weatherAbortRef.current) {
          weatherAbortRef.current.abort();
        }
        const abortController = new AbortController();
        weatherAbortRef.current = abortController;

        const resp = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${queryLatLng[0]}&longitude=${queryLatLng[1]}&current=precipitation,temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=rain,precipitation_probability&timezone=Asia%2FManila`,
          { signal: abortController.signal }
        );
        if (resp.ok) {
          const data = await resp.json();
          const current = data.current || {};
          const hourlyTimes: string[] = (data.hourly?.time as string[]) || [];
          const hourlyRain: number[] = (data.hourly?.rain as number[]) || [];
          const hourlyProb: number[] = (data.hourly?.precipitation_probability as number[]) || [];
          setWeather({
            temp: current.temperature_2m,
            desc: current.precipitation > 0 ? "Precipitation" : "No precipitation",
            icon: null,
            humidity: current.relative_humidity_2m,
            wind: current.wind_speed_10m,
            precipitation: current.precipitation,
          });
          const newHourly = { time: hourlyTimes, rain: hourlyRain, precipProb: hourlyProb };
          setHourly(newHourly);
          setLastWeatherQuery([queryLatLng[0], queryLatLng[1]]);
          setWeatherError(null);
          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                weather: {
                  temp: current.temperature_2m,
                  desc: current.precipitation > 0 ? "Precipitation" : "No precipitation",
                  icon: null,
                  humidity: current.relative_humidity_2m,
                  wind: current.wind_speed_10m,
                  precipitation: current.precipitation,
                },
                hourly: newHourly,
                ts: Date.now(),
              })
            );
          } catch {}
        } else {
          // Respect 429 with backoff window
          if (resp.status === 429) {
            let reasonStr = '';
            try {
              const errJson = await resp.clone().json();
              reasonStr = String(errJson?.reason || '');
            } catch {}
            try {
              const nowMs = Date.now();
              const untilMs = reasonStr.toLowerCase().includes('daily api request limit exceeded')
                ? (nowMs + DAILY_BACKOFF_MS)
                : (nowMs + BACKOFF_MINUTES * 60 * 1000);
              localStorage.setItem(backoffKey, String(untilMs));
              localStorage.setItem(GLOBAL_BACKOFF_KEY, String(untilMs));
            } catch {}
          }
          // Keep previous data; just note the error
          setWeatherError('Weather data unavailable');
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          // Keep previous data; just note the error
          setWeatherError('Weather data unavailable');
        }
      } finally {
        setLoading(false);
        weatherFetchBusyRef.current = false;
      }
    }

    // Initial fetch
    fetchWeather();
    // Auto-refresh every 1 minute, fetchWeather will reuse cache when still fresh
    intervalId = window.setInterval(fetchWeather, 60 * 1000);

    // Cleanup on unmount
    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [queryLatLng]);

  // Compute a simple flood level index based on recent 3-hour rain accumulation
  const floodLevel = useMemo(() => {
    if (!hourly || !hourly.rain?.length || !hourly.time?.length) {
      return { level: "Unknown", color: "#9ca3af", value: 0, last3h: 0, next3h: 0, index: 0 };
    }
    const fw = forecastWindow;
    // Recent accumulation over forecast window
    const lastN = hourly.rain.slice(-fw);
    const lastNTotal = lastN.reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);

    // Next hours forecast accumulation weighted by precipitation probability
    const now = Date.now();
    const upcoming: Array<{ t: number; rain: number; prob: number }> = [];
    for (let i = 0; i < hourly.time.length; i++) {
      const t = new Date(hourly.time[i]).getTime();
      if (t > now) {
        upcoming.push({ t, rain: hourly.rain[i] || 0, prob: (hourly.precipProb?.[i] ?? 100) });
      }
    }
    const nextN = upcoming.slice(0, fw);
    const nextNWeighted = nextN.reduce((sum, v) => sum + (v.rain * (v.prob / 100)), 0);

    // Simple flood index combining recent and near-future rain
    const floodIndex = lastNTotal + nextNWeighted;

    let level = "Low";
    let color = "#22c55e"; // green
    if (floodIndex >= 5 && floodIndex < 15) {
      level = "Moderate";
      color = "#f59e0b"; // amber
    } else if (floodIndex >= 15) {
      level = "High";
      color = "#ef4444"; // red
    }
    return { level, color, value: floodIndex, last3h: lastNTotal, next3h: nextNWeighted, index: floodIndex };
  }, [hourly, forecastWindow]);

  // Color bands for rings based on severity/type
  function ringColorsForIncident(incident: any): string[] {
    const severity = (incident.severity || '').toLowerCase();
    if (["high", "severe", "critical"].includes(severity)) {
      return ["#7f1d1d", "#b91c1c", "#ef4444"]; // inner→outer: dark→red
    }
    if (severity === "moderate") {
      return ["#92400e", "#f59e0b", "#fbbf24"]; // brown→amber→yellow
    }
    if (["low", "minor"].includes(severity)) {
      return ["#166534", "#22c55e", "#86efac"]; // dark green→green→light
    }
    return ["#475569", "#64748b", "#cbd5e1"]; // slate gradient
  }

  function ringColorsForZone(zone: any): string[] {
    const type = (zone.type || '').toLowerCase();
    if (type === 'flood') {
      return ["#92400e", "#f59e0b", "#fbbf24"]; // amber range
    }
    if (type === 'landslide') {
      return ["#7f1d1d", "#b91c1c", "#ef4444"]; // red range
    }
    return ["#475569", "#64748b", "#cbd5e1"]; // slate range
  }

  // Build a grid around current query location and compute a simple heat intensity.
  // If stepDeg <= 0, derive step from a constant span to keep coverage roughly constant.
  function generateGridCenters(center: [number, number], grid = 3, stepDeg = 0.01) {
    const out: Array<{ bounds: [[number, number], [number, number]]; center: [number, number] }> = [];
    const half = Math.floor(grid / 2);
    const derivedStep = stepDeg > 0 ? stepDeg : (0.03 / grid); // ~0.03° total span
    for (let i = -half; i <= half; i++) {
      for (let j = -half; j <= half; j++) {
        const lat = center[0] + i * derivedStep;
        const lng = center[1] + j * derivedStep;
        const bld = derivedStep / 2;
        out.push({
          center: [lat, lng],
          bounds: [[lat - bld, lng - bld], [lat + bld, lng + bld]],
        });
      }
    }
    return out;
  }

  function colorForIndex(idx: number): string {
    if (idx >= 15) return "#ef4444"; // high -> red
    if (idx >= 5) return "#f59e0b"; // moderate -> amber
    return "#22c55e"; // low -> green
  }

  useEffect(() => {
    if (!showHeatLayer || !queryLatLng) return;
    // Hourly refresh cadence for flood/precipitation heat grid
    const refreshTTL = 60 * 60 * 1000;
    if (heatFetchBusyRef.current) return; // prevent concurrent runs
    if (lastHeatRefresh && (Date.now() - lastHeatRefresh) < refreshTTL) return;

    // Mark run started immediately to avoid duplicate loops
    heatFetchBusyRef.current = true;
    setLastHeatRefresh(Date.now());

    // Respect global Open-Meteo backoff (e.g., daily cap): synthesize from current flood index
    try {
      const gbRaw = localStorage.getItem('openmeteo_backoff_until');
      const gbUntil = gbRaw ? parseInt(gbRaw) || 0 : 0;
      if (gbUntil && Date.now() < gbUntil) {
        const centers = generateGridCenters(queryLatLng, heatGridSize, 0);
        const synthetic = centers.map((c) => ({ bounds: c.bounds, index: floodLevel.index }));
        setHeatCells(synthetic);
        heatFetchBusyRef.current = false;
        return;
      }
    } catch {}

    // Build centers with derived step to keep span constant
    const centers = generateGridCenters(queryLatLng, heatGridSize, 0);
    const cellsCount = centers.length;
    // Adaptive per-request delay (skip delay for cached cells)
    const perCellDelayMs = Math.min(800, Math.max(150, Math.ceil(cellsCount / 9) * 150));
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      const results: Array<{ bounds: [[number, number], [number, number]]; index: number }> = [];
      let apiFailed = false;
      for (const c of centers) {
        if (cancelled) break;
        const key = `heat:${c.center[0].toFixed(3)},${c.center[1].toFixed(3)}`;
        let usedCache = false;
        try {
          const cachedRaw = localStorage.getItem(key);
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            if (cached?.ts && (Date.now() - cached.ts) < 10 * 60 * 1000 && typeof cached.index === 'number') {
              results.push({ bounds: c.bounds, index: cached.index });
              usedCache = true;
            }
          }
        } catch {}
        if (usedCache) continue;
        // Respect adaptive rate limiting when hitting the API
        await sleep(perCellDelayMs);
        try {
          const resp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.center[0]}&longitude=${c.center[1]}&hourly=rain,precipitation_probability&timezone=Asia%2FManila`, { signal: controller.signal });
          if (resp.ok) {
            const data = await resp.json();
            const times: string[] = (data.hourly?.time as string[]) || [];
            const rains: number[] = (data.hourly?.rain as number[]) || [];
            const probs: number[] = (data.hourly?.precipitation_probability as number[]) || [];
            const now = Date.now();
            const upcoming: Array<{ t: number; rain: number; prob: number }> = [];
            for (let i = 0; i < times.length; i++) {
              const t = new Date(times[i]).getTime();
              if (t > now) upcoming.push({ t, rain: rains[i] || 0, prob: probs?.[i] ?? 100 });
            }
            const fw = forecastWindow;
            const lastNTotal = rains.slice(-fw).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
            const nextNWeighted = upcoming.slice(0, fw).reduce((s, v) => s + (v.rain * (v.prob / 100)), 0);
            const index = lastNTotal + nextNWeighted;
            try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), index })); } catch {}
            results.push({ bounds: c.bounds, index });
          } else if (resp.status === 429) {
            apiFailed = true;
            let reasonStr = '';
            try {
              const errJson = await resp.clone().json();
              reasonStr = String(errJson?.reason || '');
            } catch {}
            const untilMs = reasonStr.toLowerCase().includes('daily api request limit exceeded')
              ? (Date.now() + 24 * 60 * 60 * 1000)
              : (Date.now() + 45 * 60 * 1000);
            try { localStorage.setItem('openmeteo_backoff_until', String(untilMs)); } catch {}
            break; // stop hitting the API if rate-limited
          } else {
            results.push({ bounds: c.bounds, index: 0 });
          }
        } catch (err) {
          // If aborted or resource-limited, fall back to synthetic values
          apiFailed = true;
          break;
        }
      }
      if (apiFailed) {
        // Fallback: use current flood index uniformly across grid to avoid freezes
        const synthetic = centers.map((c) => ({ bounds: c.bounds, index: floodLevel.index }));
        setHeatCells(synthetic);
      } else {
        setHeatCells(results);
      }
      heatFetchBusyRef.current = false;
    })();

    return () => {
      cancelled = true;
      controller.abort();
      heatFetchBusyRef.current = false;
    };
  }, [queryLatLng, forecastWindow, showHeatLayer, heatGridSize, floodLevel.index]);

  const heatPoints = useMemo(() => {
    if (!showHeatLayer || !heatCells.length) return { type: 'FeatureCollection' as const, features: [] };
    return {
      type: 'FeatureCollection' as const,
      features: heatCells.map((c) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [(c.bounds[0][1] + c.bounds[1][1]) / 2, (c.bounds[0][0] + c.bounds[1][0]) / 2]
        },
        properties: {
          intensity: Math.max(0, Math.min(1, c.index / 20))
        }
      }))
    };
  }, [heatCells, showHeatLayer]);

  // Create a 12-hour rainfall chart from hourly data
  const twelveHourChart = useMemo(() => {
    if (!hourly || !hourly.time?.length) return null;
    const count = hourly.time.length;
    const start = Math.max(0, count - 12);
    const labels = hourly.time.slice(start).map((t) => new Date(t).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }));
    const dataPoints = hourly.rain.slice(start);
    return {
      labels,
      datasets: [
        {
          label: "Rainfall (mm)",
          data: dataPoints,
          fill: true,
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          borderColor: "#2563eb",
          tension: 0.4,
        },
      ],
    };
  }, [hourly]);

  // Sample monitoring points around Santa Cruz, Laguna
  const monitoringPoints = useMemo(() => (
    [
      { name: "Santa Cruz Riverbank A", position: [14.2792, 121.4156] as [number, number] },
      { name: "Santa Cruz Downtown", position: [14.2798, 121.4200] as [number, number] },
      { name: "Santa Cruz East", position: [14.2850, 121.4300] as [number, number] },
      { name: "Santa Cruz West", position: [14.2750, 121.4050] as [number, number] },
    ]
  ), []);

  // Scope items to Santa Cruz bounds
  const scopedIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const latRaw = (inc.start_lat ?? inc.lat);
      const lngRaw = (inc.start_lng ?? inc.lng);
      const lat = typeof latRaw === 'number' ? latRaw : Number(latRaw);
      const lng = typeof lngRaw === 'number' ? lngRaw : Number(lngRaw);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      const b = mapBounds || SANTA_CRUZ_BOUNDS;
      return isPointInBounds([lat, lng], b);
    });
  }, [incidents, mapBounds]);

  // Normalize coordinates to [lat, lng] regardless of input order
  function normalizePair(pt: any): [number, number] | null {
    if (Array.isArray(pt) && pt.length >= 2) {
      const a = Number(pt[0]);
      const b = Number(pt[1]);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
      // If first value looks like longitude (|value| > 90) and second like latitude, swap
      if (Math.abs(a) > 90 && Math.abs(b) <= 90) return [b, a];
      return [a, b];
    }
    if (pt && typeof pt === 'object') {
      const a = Number(pt.lat ?? pt.latitude ?? pt.y);
      const b = Number(pt.lng ?? pt.longitude ?? pt.x);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
      return [a, b];
    }
    return null;
  }
  function normalizePath(path: any): Array<[number, number]> {
    if (!Array.isArray(path)) return [];
    const out: Array<[number, number]> = [];
    for (const pt of path) {
      const n = normalizePair(pt);
      if (n) out.push(n);
    }
    return out;
  }

  const scopedDangerZones = useMemo(() => {
    return dangerZones.filter((dz) => {
      const normalized = normalizePath(dz.path);
      const b = mapBounds || SANTA_CRUZ_BOUNDS;
      return normalized.some((pt) => isPointInBounds(pt, b));
    });
  }, [dangerZones, mapBounds]);

  const scopedHazards = useMemo(() => {
    return hazards.filter((hz) => {
      const latRaw = (hz.start_lat ?? hz.lat);
      const lngRaw = (hz.start_lng ?? hz.lng);
      const lat = typeof latRaw === 'number' ? latRaw : Number(latRaw);
      const lng = typeof lngRaw === 'number' ? lngRaw : Number(lngRaw);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      const b = mapBounds || SANTA_CRUZ_BOUNDS;
      return isPointInBounds([lat, lng], b);
    });
  }, [hazards, mapBounds]);

  // Hazard density heatmap points (from DB incidents + hazards)
  const hazardPoints = useMemo(() => {
    if (!showHazards) return [] as Array<[number, number, number]>;
    const points: Array<[number, number, number]> = [];

    const sev = (s: any) => {
      const v = typeof s === 'string' ? s.toLowerCase() : s;
      switch (v) {
        case 'critical': return 1.0;
        case 'severe': return 0.9;
        case 'high': return 0.85;
        case 'medium': return 0.6;
        case 'moderate': return 0.6;
        case 'low': return 0.35;
        default: return 0.5;
      }
    };
    const add = (lat?: number, lng?: number, intensity?: number) => {
      if (typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng)) {
        points.push([lat, lng, Math.min(1, Math.max(0.2, intensity ?? 0.5))]);
      }
    };
    const incidentsSample = scopedIncidents.slice(0, 1000);
    for (const inc of incidentsSample) {
      const anyInc: any = inc;
      const intensity = sev(anyInc.severity) * (anyInc.status === 'resolved' ? 0.35 : 1);
      if (typeof anyInc.lat === 'number' && typeof anyInc.lng === 'number') {
        add(anyInc.lat, anyInc.lng, intensity);
      }
      add(anyInc.start_lat, anyInc.start_lng, intensity);
      add(anyInc.end_lat, anyInc.end_lng, intensity);
    }
    const hazardsSample = scopedHazards.slice(0, 1000);
    for (const hz of hazardsSample) {
      const anyHz: any = hz;
      const intensity = sev(anyHz.severity) * (anyHz.status === 'resolved' ? 0.35 : 1);
      add(anyHz.lat, anyHz.lng, intensity);
      add(anyHz.start_lat, anyHz.start_lng, intensity);
      add(anyHz.end_lat, anyHz.end_lng, intensity);
    }
    return points;
  }, [showHazards, scopedIncidents, scopedHazards]);

  // Color gradients for incident types
  const INCIDENT_GRADIENTS = useMemo(() => ({
    flood: {
      0.1: '#e0f2fe',
      0.3: '#93c5fd',
      0.6: '#3b82f6',
      0.85: '#1d4ed8',
    } as any,
    landslide: {
      0.1: '#fef3c7',
      0.3: '#fbbf24',
      0.6: '#d97706',
      0.85: '#92400e',
    } as any,
    accident: {
      0.1: '#fff7ed',
      0.3: '#fdba74',
      0.6: '#fb923c',
      0.85: '#c2410c',
    } as any,
    closure: {
      0.1: '#fee2e2',
      0.3: '#fca5a5',
      0.6: '#ef4444',
      0.85: '#7f1d1d',
    } as any,
    fire: {
      0.1: '#ffedd5',
      0.3: '#fdba74',
      0.6: '#f97316',
      0.85: '#b45309',
    } as any,
    other: {
      0.1: '#e5e7eb',
      0.3: '#9ca3af',
      0.6: '#6b7280',
      0.85: '#374151',
    } as any,
  }), []);

  // Map incident type string to a normalized key
  function typeKey(t: any): 'flood' | 'landslide' | 'accident' | 'closure' | 'fire' | 'other' {
    const v = String(t || '').toLowerCase();
    if (v.includes('flood')) return 'flood';
    if (v.includes('landslide')) return 'landslide';
    if (v.includes('accident')) return 'accident';
    if (v.includes('fire') || v.includes('burn')) return 'fire';
    if (v.includes('closure') || v.includes('closed') || v.includes('road closed')) return 'closure';
    return 'other';
  }

  // Densify straight segments into heat points (start → end)
  function densifySegmentToHeatPoints(start: [number, number], end: [number, number], intensity: number): Array<[number, number, number]> {
    try {
      const line = turf.lineString([[start[1], start[0]], [end[1], end[0]]]);
      const lenKm = turf.length(line, { units: 'kilometers' });
      const count = Math.max(8, Math.floor(lenKm * 60));
      const pts: Array<[number, number, number]> = [];
      for (let i = 0; i <= count; i++) {
        const dist = (lenKm * i) / count;
        const p: any = turf.along(line, dist, { units: 'kilometers' }).geometry.coordinates;
        pts.push([p[1], p[0], Math.min(1, Math.max(0.2, intensity))]);
      }
      return pts;
    } catch {
      return [[start[0], start[1], Math.min(1, Math.max(0.2, intensity))], [end[0], end[1], Math.min(1, Math.max(0.2, intensity))]];
    }
  }

  // Densify a path into heatmap points at regular intervals
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

  // Fetch a route segment via local ORS proxy; falls back to straight line
  async function getRouteSegment(start: [number, number], end: [number, number]): Promise<Array<[number, number]>> {
    const body = {
      coordinates: [
        [start[1], start[0]],
        [end[1], end[0]],
      ],
    };
    const cacheKey = `${start[0]},${start[1]}|${end[0]},${end[1]}`;
    // @ts-ignore
    if (!(window as any)._orsSegmentCache) {
      // @ts-ignore
      (window as any)._orsSegmentCache = new Map<string, Array<[number, number]>>();
    }
    // @ts-ignore
    const cache: Map<string, Array<[number, number]>> = (window as any)._orsSegmentCache;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    try {
      const response = await apiFetch('ors-directions.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        console.error('ORS proxy error:', response.status, response.statusText);
        return [start, end];
      }
      const data = await response.json();
      if (!data.features || !data.features[0] || !data.features[0].geometry) {
        console.warn('Invalid route data from proxy, using straight line');
        return [start, end];
      }
      const coordinates = data.features[0].geometry.coordinates;
      const segment = coordinates.map((coord: any) => [coord[1], coord[0]] as [number, number]);
      cache.set(cacheKey, segment);
      return segment;
    } catch (error) {
      console.error('Error fetching route via proxy:', error);
      return [start, end];
    }
  }

  // Calculate route segments for hazards with start and end coordinates
  useEffect(() => {
    const calculateHazardRouteSegments = async () => {
      const newSegments: { [key: string]: Array<[number, number]> } = {};
      for (const hz of hazards) {
        const anyHz: any = hz;
        const startLat = typeof anyHz.start_lat === 'number' ? anyHz.start_lat : Number(anyHz.start_lat);
        const startLng = typeof anyHz.start_lng === 'number' ? anyHz.start_lng : Number(anyHz.start_lng);
        const endLat = typeof anyHz.end_lat === 'number' ? anyHz.end_lat : Number(anyHz.end_lat);
        const endLng = typeof anyHz.end_lng === 'number' ? anyHz.end_lng : Number(anyHz.end_lng);
        if (Number.isFinite(startLat) && Number.isFinite(startLng) && Number.isFinite(endLat) && Number.isFinite(endLng)) {
          const start: [number, number] = [startLat, startLng];
          const end: [number, number] = [endLat, endLng];
          try {
            const seg = await getRouteSegment(start, end);
            const key = (anyHz.id != null)
              ? `hazard-${anyHz.id}`
              : `hazard-${startLat},${startLng}|${endLat},${endLng}`;
            newSegments[key] = seg;
            // Throttle to respect ORS limits
            await new Promise(res => setTimeout(res, 1500));
          } catch (err) {
            console.error('Failed to fetch hazard route, using straight line', err);
            const key = (anyHz.id != null)
              ? `hazard-${anyHz.id}`
              : `hazard-${startLat},${startLng}|${endLat},${endLng}`;
            newSegments[key] = [start, end];
          }
        }
      }
      setHazardRouteSegments(newSegments);
    };
    if (hazards && hazards.length > 0) calculateHazardRouteSegments();
  }, [hazards]);

  const typedHazardGeoJSON = useMemo(() => {
    const collections: Record<string, any> = {
      flood: { type: 'FeatureCollection' as const, features: [] },
      landslide: { type: 'FeatureCollection' as const, features: [] },
      accident: { type: 'FeatureCollection' as const, features: [] },
      closure: { type: 'FeatureCollection' as const, features: [] },
      fire: { type: 'FeatureCollection' as const, features: [] },
      other: { type: 'FeatureCollection' as const, features: [] },
    };

    if (!showHazards) return collections;

    const sev = (s: any) => {
      const v = typeof s === 'string' ? s.toLowerCase() : s;
      switch (v) {
        case 'critical': return 1.0;
        case 'severe': return 0.9;
        case 'high': return 0.85;
        case 'medium': return 0.6;
        case 'moderate': return 0.6;
        case 'low': return 0.35;
        default: return 0.5;
      }
    };

    const addFeature = (key: string, lat: number, lng: number, intensity: number) => {
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        collections[key].features.push({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [lng, lat] },
          properties: { intensity }
        });
      }
    };

    scopedIncidents.slice(0, 1000).forEach((inc: any) => {
      const key = typeKey(inc.type);
      const intensity = sev(inc.severity) * (inc.status === 'resolved' ? 0.35 : 1);
      const start = (typeof inc.start_lat === 'number' && typeof inc.start_lng === 'number') ? [inc.start_lat, inc.start_lng] as [number, number] : null;
      const endPt = (typeof inc.end_lat === 'number' && typeof inc.end_lng === 'number') ? [inc.end_lat, inc.end_lng] as [number, number] : null;
      
      if (start && endPt) {
        densifySegmentToHeatPoints(start, endPt, intensity).forEach(([lat, lng, i]) => addFeature(key, lat, lng, i));
      } else {
        if (typeof inc.lat === 'number' && typeof inc.lng === 'number') addFeature(key, inc.lat, inc.lng, intensity);
        if (start) addFeature(key, start[0], start[1], intensity);
        if (endPt) addFeature(key, endPt[0], endPt[1], intensity);
      }
    });

    scopedHazards.slice(0, 1000).forEach((hz: any) => {
      const key = typeKey(hz.type);
      const intensity = sev(hz.severity) * (hz.status === 'resolved' ? 0.35 : 1);
      const start = (typeof hz.start_lat === 'number' && typeof hz.start_lng === 'number') ? [hz.start_lat, hz.start_lng] as [number, number] : null;
      const endPt = (typeof hz.end_lat === 'number' && typeof hz.end_lng === 'number') ? [hz.end_lat, hz.end_lng] as [number, number] : null;
      
      const segKey = hz.id != null ? `hazard-${hz.id}` : (start && endPt ? `hazard-${start[0]},${start[1]}|${endPt[0]},${endPt[1]}` : undefined);
      const segment = segKey ? hazardRouteSegments[segKey] : undefined;
      
      if (segment && segment.length > 0) {
        densifyPathToHeatPoints(segment, 15, intensity).forEach(([lat, lng, i]) => addFeature(key, lat, lng, i));
      } else if (start && endPt) {
        densifySegmentToHeatPoints(start, endPt, intensity).forEach(([lat, lng, i]) => addFeature(key, lat, lng, i));
      } else {
        if (typeof hz.lat === 'number' && typeof hz.lng === 'number') addFeature(key, hz.lat, hz.lng, intensity);
        if (start) addFeature(key, start[0], start[1], intensity);
        if (endPt) addFeature(key, endPt[0], endPt[1], intensity);
      }
    });

    scopedDangerZones.slice(0, 500).forEach((dz: any) => {
      const key = typeKey(dz.type);
      const intensity = sev(dz.severity);
      const path = normalizePath(dz.path);
      if (Array.isArray(path) && path.length > 1) {
        densifyPathToHeatPoints(path, 15, intensity).forEach(([lat, lng, i]) => addFeature(key, lat, lng, i));
      }
    });

    return collections;
  }, [showHazards, scopedIncidents, scopedHazards, scopedDangerZones, hazardRouteSegments]);

  // Progressive buffering for incidents to avoid UI freezes
  const incidentBufferCacheRef = useRef<Map<string, Array<Array<[number, number]>>>>(new Map());
  const [incidentBuffered, setIncidentBuffered] = useState<Array<{
    id: any;
    path: Array<[number, number]>;
    polygons: Array<Array<[number, number]>>;
    pass: { label: string; vehicles: string; color: string };
    ringColors: string[];
    label: string;
    type: string;
    severity: string;
    status: string;
  }>>([]);

  useEffect(() => {
    if (!showLiveRoads) {
      setIncidentBuffered([]);
      return;
    }
    let cancelled = false;
    const baseMeters = (scaleOverlaysWithRain ? Math.min(60, 20 + (floodLevel.index * 2)) : 30);
    const cache = incidentBufferCacheRef.current;
    setIncidentBuffered([]);
    const items = scopedIncidents.slice(0, 500);
    let i = 0;
    const batchSize = 10;
    function processSlice() {
      if (cancelled) return;
      const end = Math.min(items.length, i + batchSize);
      const batch: Array<{
        id: any;
        path: Array<[number, number]>;
        polygons: Array<Array<[number, number]>>;
        pass: { label: string; vehicles: string; color: string };
        ringColors: string[];
        label: string;
        type: string;
        severity: string;
        status: string;
      }> = [];
      for (; i < end; i++) {
        const inc = items[i];
        const start = (typeof inc.start_lat === 'number' && typeof inc.start_lng === 'number') ? [inc.start_lat, inc.start_lng] as [number, number] : null;
        const endPt = (typeof inc.end_lat === 'number' && typeof inc.end_lng === 'number') ? [inc.end_lat, inc.end_lng] as [number, number] : null;
        if (!start || !endPt) continue;
        const path: Array<[number, number]> = [start, endPt];
        const key = `${path[0][0]},${path[0][1]}_${path[1][0]},${path[1][1]}_${baseMeters}`;
        let polygons = cache.get(key);
        if (!polygons) {
          polygons = bufferPathToPolygons(path, baseMeters, 3);
          cache.set(key, polygons);
        }
        const pass = deriveIncidentPassability(inc);
        const ringColors = ringColorsForIncident(inc);
        const label = inc.address || inc.location || inc.barangay || `${inc.lat?.toFixed?.(4)}, ${inc.lng?.toFixed?.(4)}`;
        batch.push({ id: inc.id, path, polygons, pass, ringColors, label, type: (inc.type || 'Incident'), severity: (inc.severity || 'Unknown'), status: (inc.status || '') });
      }
      if (batch.length) {
        setIncidentBuffered((prev) => {
          const combined = [...prev, ...batch];
          return combined.slice(0, 100);
        });
      }
      if (i < items.length && !cancelled) {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(processSlice, { timeout: 50 });
        } else {
          setTimeout(processSlice, 16);
        }
      }
    }
    processSlice();
    return () => { cancelled = true; };
  }, [scopedIncidents, floodLevel.index, scaleOverlaysWithRain, showLiveRoads]);

  // Progressive buffering for danger zones to avoid UI freezes
  const zoneBufferCacheRef = useRef<Map<string, Array<Array<[number, number]>>>>(new Map());
  const [zoneBuffered, setZoneBuffered] = useState<Array<{
    id: any;
    path: Array<[number, number]>;
    polygons: Array<Array<[number, number]>>;
    pass: { label: string; vehicles: string; color: string };
    ringColors: string[];
    description: string;
    type: string;
  }>>([]);

  useEffect(() => {
    if (!showDangerZones) {
      setZoneBuffered([]);
      return;
    }
    let cancelled = false;
    const baseMeters = (scaleOverlaysWithRain ? Math.min(60, 20 + (floodLevel.index * 2)) : 30);
    const cache = zoneBufferCacheRef.current;
    setZoneBuffered([]);
    const items = scopedDangerZones.slice(0, 500);
    let i = 0;
    const batchSize = 10;
    function processSlice() {
      if (cancelled) return;
      const end = Math.min(items.length, i + batchSize);
      const batch: Array<{
        id: any;
        path: Array<[number, number]>;
        polygons: Array<Array<[number, number]>>;
        pass: { label: string; vehicles: string; color: string };
        ringColors: string[];
        description: string;
        type: string;
      }> = [];
      for (; i < end; i++) {
        const dz = items[i];
        const path = normalizePath(dz.path);
        if (!path || path.length < 2) continue;
        const key = `${path[0][0]},${path[0][1]}_${path[path.length-1][0]},${path[path.length-1][1]}_${baseMeters}`;
        let polygons = cache.get(key);
        if (!polygons) {
          polygons = bufferPathToPolygons(path as Array<[number, number]>, baseMeters, 3);
          cache.set(key, polygons);
        }
        const pass = deriveZonePassability(dz);
        const ringColors = ringColorsForZone(dz);
        batch.push({ id: dz.id, path, polygons, pass, ringColors, description: dz.description || 'Danger Zone', type: dz.type || 'Hazard' });
      }
      if (batch.length) {
        setZoneBuffered((prev) => {
          const combined = [...prev, ...batch];
          return combined.slice(0, 100);
        });
      }
      if (i < items.length && !cancelled) {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(processSlice, { timeout: 50 });
        } else {
          setTimeout(processSlice, 16);
        }
      }
    }
    processSlice();
    return () => { cancelled = true; };
  }, [scopedDangerZones, floodLevel.index, scaleOverlaysWithRain, showDangerZones]);

  // Hazards from DB: progressive buffering to avoid UI freezes
  const hazardBufferCacheRef = useRef<Map<string, Array<Array<[number, number]>>>>(new Map());
  const [hazardBuffered, setHazardBuffered] = useState<Array<{
    id: any;
    path: Array<[number, number]>;
    polygons: Array<Array<[number, number]>>;
    pass: { label: string; vehicles: string; color: string };
    ringColors: string[];
    label: string;
    type: string;
    severity: string;
    status: string;
  }>>([]);

  useEffect(() => {
    // Hazards are now shown as a heatmap; skip path buffering entirely
    setHazardBuffered([]);
    const cache = hazardBufferCacheRef.current as any;
    if (cache && typeof cache.clear === 'function') cache.clear();
    return;
  }, [scopedHazards, floodLevel.index, scaleOverlaysWithRain, showHazards]);

  // Derive passability from incident severity/type
  function deriveIncidentPassability(incident: any) {
    const type = (incident.type || '').toLowerCase();
    const severity = (incident.severity || '').toLowerCase();
    const status = (incident.status || '').toLowerCase();
    if (type.includes('closure') || status === 'closed') {
      return { label: 'Road closed', vehicles: 'None', color: '#7f1d1d' };
    }
    if (type.includes('flood')) {
      if (["high", "severe", "critical"].includes(severity)) {
        return { label: 'Severe flooding', vehicles: 'Emergency vehicles, heavy trucks only', color: '#ef4444' };
      }
      if (["moderate"].includes(severity)) {
        return { label: 'Moderate flooding', vehicles: 'High-clearance SUVs, trucks; avoid low cars', color: '#f59e0b' };
      }
      if (["low", "minor"].includes(severity)) {
        return { label: 'Minor flooding', vehicles: 'Cars, SUVs, motorcycles', color: '#22c55e' };
      }
      return { label: 'Incident reported', vehicles: 'Assess locally; avoid low-clearance vehicles', color: '#9ca3af' };
    }
    if (type.includes('landslide')) {
      return { label: 'Landslide', vehicles: 'Avoid; emergency response only', color: '#b91c1c' };
    }
    if (type.includes('accident')) {
      return { label: 'Accident', vehicles: 'Caution; passable with delays', color: '#f59e0b' };
    }
    return { label: 'Incident', vehicles: 'Assess locally', color: '#9ca3af' };
  }

  // Derive passability from danger zone type (no severity)
  function deriveZonePassability(zone: any) {
    const type = (zone.type || '').toLowerCase();
    if (type === 'flood') {
      return { label: 'Flood zone', vehicles: 'High-clearance SUVs, trucks; avoid low cars', color: '#f59e0b' };
    }
    if (type === 'landslide') {
      return { label: 'Landslide zone', vehicles: 'Avoid; emergency response only', color: '#b91c1c' };
    }
    if (type === 'accident') {
      return { label: 'Accident zone', vehicles: 'Caution; passable with delays', color: '#f59e0b' };
    }
    return { label: 'Hazard zone', vehicles: 'Assess locally', color: '#9ca3af' };
  }

  // Generate flood-style buffer polygons around a path
  function bufferPathToPolygons(path: Array<[number, number]>, baseMeters = 30, rings = 3): Array<Array<[number, number]>> {
    try {
      if (!Array.isArray(path) || path.length < 2) return [];
      const line = turf.lineString(path.map(([lat, lng]) => [lng, lat]));
      const polygons: Array<Array<[number, number]>> = [];
      for (let i = 1; i <= rings; i++) {
        const distance = baseMeters * i;
        const buffered = turf.buffer(line, distance, { units: 'meters' });
        const coords = (buffered?.geometry as any)?.coordinates || [];
        if (Array.isArray(coords) && coords.length > 0) {
          // Use outer ring (coords[0]) and convert back to [lat, lng]
          const outer = coords[0].map(([lng, lat]: [number, number]) => [lat, lng]);
          polygons.push(outer);
        }
      }
      return polygons;
    } catch (e) {
      console.warn('Failed to buffer path:', e);
      return [];
    }
  }

  // Fetch incidents and danger zones periodically for real-time passability
  useEffect(() => {
    let refreshId: number | undefined;
    async function fetchPassability() {
      try {
        const [incResp, dzResp] = await Promise.all([
          fetch(`/api/list-incidents.php?status=Approved&limit=100&ts=${Date.now()}`),
          fetch(`/api/list-danger-zones.php?ts=${Date.now()}`)
        ]);
        const incData = incResp.ok ? await incResp.json() : { success: false, incidents: [] };
        const dzData = dzResp.ok ? await dzResp.json() : [];
        let incList = incData.incidents || [];
        // Fallback for case variations used elsewhere (e.g., 'approved')
        if (!Array.isArray(incList) || incList.length === 0) {
          const incRespAlt = await fetch(`/api/list-incidents.php?status=approved&limit=100&ts=${Date.now()}`);
          const incDataAlt = incRespAlt.ok ? await incRespAlt.json() : { success: false, incidents: [] };
          incList = incDataAlt.incidents || incList;
        }
        setIncidents(incList);
        setDangerZones(Array.isArray(dzData) ? dzData : []);
        setLastPassabilityUpdate(new Date());
      } catch {
        // Keep previous values on failure
      }
    }
    fetchPassability();
    const onVisible = () => { if (document.visibilityState === 'visible') fetchPassability(); };
    document.addEventListener('visibilitychange', onVisible);
    refreshId = window.setInterval(fetchPassability, 60 * 1000);
    return () => { if (refreshId) window.clearInterval(refreshId); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  // Fetch hazards and shelters from DB and periodically refresh
  useEffect(() => {
    let refreshId: number | undefined;
    async function fetchDbLayers() {
      try {
        const [hzResp, shResp, apResp] = await Promise.all([
          fetch(`/api/list-hazards.php?ts=${Date.now()}`),
          fetch(`/api/shelters-list.php?ts=${Date.now()}`),
          fetch(`/api/list-access-polygons.php?ts=${Date.now()}`)
        ]);
        const hzData = hzResp.ok ? await hzResp.json() : [];
        const shData = shResp.ok ? await shResp.json() : [];
        const apData = apResp.ok ? await apResp.json() : [];
        setHazards(Array.isArray(hzData) ? hzData : []);
        // Handle both array and object wrapper formats for shelters
        const validShelters = Array.isArray(shData) ? shData : (Array.isArray(shData?.shelters) ? shData.shelters : []);
        setShelters(validShelters);
        setAccessPolygons(Array.isArray(apData) ? apData.map((p: any) => ({
          polygon: Array.isArray(p?.polygon) ? p.polygon : [],
          allowedVehicles: Array.isArray(p?.allowedVehicles) ? p.allowedVehicles : (typeof p?.allowed_vehicles === 'string' ? p.allowed_vehicles.split(',').map((s: string) => s.trim()).filter(Boolean) : []),
        })) : []);
      } catch {
        // Keep prior values on failure
      }
    }
    fetchDbLayers();
    const onVisible = () => { if (document.visibilityState === 'visible') fetchDbLayers(); };
    document.addEventListener('visibilitychange', onVisible);
    refreshId = window.setInterval(fetchDbLayers, 60 * 1000);
    return () => { if (refreshId) window.clearInterval(refreshId); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  return (
    <div className="flex gap-4 w-full h-full">
      {/* Sidebar logic remains the same, but we update the toggles */}
      <div className="w-full h-full rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
        <MapboxMap
          initialViewState={{
            latitude: 14.28,
            longitude: 121.42,
            zoom: 12
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={MAPBOX_TOKEN}
          onMove={(evt: any) => {
            const c = evt.viewState;
            setMapCenter([c.latitude, c.longitude]);
          }}
          onIdle={(evt: any) => {
            const b = evt.target.getBounds();
            setMapBounds({
              north: b.getNorth(),
              south: b.getSouth(),
              east: b.getEast(),
              west: b.getWest()
            });
          }}
        >
          <NavigationControl position="top-right" />
          <FullscreenControl position="top-right" />

          {/* Precipitation Heatmap Layer */}
          {showHeatLayer && heatDisplayMode === 'heatmap' && (
            <Source id="precip-heat" type="geojson" data={heatPoints}>
              <Layer
                id="precip-heat-layer"
                type="heatmap"
                paint={{
                  'heatmap-weight': ['get', 'intensity'],
                  'heatmap-intensity': 1,
                  'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0, 'rgba(34, 197, 94, 0)',
                    0.2, 'rgba(34, 197, 94, 0.5)',
                    0.5, 'rgba(245, 158, 11, 0.8)',
                    0.8, 'rgba(239, 68, 68, 0.9)',
                    1, 'rgba(239, 68, 68, 1)'
                  ],
                  'heatmap-radius': heatRadius,
                  'heatmap-opacity': 0.6
                }}
              />
            </Source>
          )}

          {/* Hazard Heatmap Layers */}
          {showHazards && Object.entries(typedHazardGeoJSON).map(([type, data]: [string, any]) => (
            <Source key={`hazard-src-${type}`} id={`hazard-src-${type}`} type="geojson" data={data}>
              <Layer
                id={`hazard-layer-${type}`}
                type="heatmap"
                paint={{
                  'heatmap-weight': ['get', 'intensity'],
                  'heatmap-intensity': 1,
                  'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0, 'rgba(0,0,0,0)',
                    0.2, type === 'flood' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(239, 68, 68, 0.5)',
                    0.7, type === 'flood' ? 'rgba(37, 99, 235, 0.8)' : 'rgba(185, 28, 28, 0.8)',
                    1, type === 'flood' ? 'rgba(30, 64, 175, 1)' : 'rgba(127, 29, 29, 1)'
                  ],
                  'heatmap-radius': heatRadius,
                  'heatmap-opacity': 0.7
                }}
              />
            </Source>
          ))}

          {/* Monitoring Points (Circles) */}
          {showFloodAreas && monitoringPoints.map((pt) => (
            <Marker
              key={pt.name}
              latitude={pt.position[0]}
              longitude={pt.position[1]}
              onClick={e => {
                e.originalEvent.stopPropagation();
                setSelectedMarker({ type: 'monitoring', data: pt });
              }}
            >
              <div className="w-8 h-8 rounded-full bg-blue-500/30 border-2 border-blue-500 animate-pulse cursor-pointer" />
            </Marker>
          ))}

          {/* Incident Buffered Polygons */}
          {showLiveRoads && incidentBuffered.map((item) => (
            <Source key={`inc-src-${item.id}`} type="geojson" data={{
              type: 'FeatureCollection' as const,
              features: item.polygons.map((poly, i) => ({
                type: 'Feature' as const,
                geometry: { type: 'Polygon' as const, coordinates: [poly.map(([lat, lng]) => [lng, lat])] },
                properties: { color: item.ringColors[i], opacity: i === 0 ? 0.35 : i === 1 ? 0.25 : 0.15 }
              }))
            }}>
              <Layer
                id={`inc-layer-${item.id}`}
                type="fill"
                paint={{
                  'fill-color': ['get', 'color'],
                  'fill-opacity': ['get', 'opacity']
                }}
              />
            </Source>
          ))}

          {/* Shelters */}
          {showShelters && shelters.map((s: any, idx: number) => {
            const lat = Number(s.lat ?? s.latitude);
            const lng = Number(s.lng ?? s.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            return (
              <TacticalMarker
                key={`shelter-${s.id ?? idx}`}
                latitude={lat}
                longitude={lng}
                type="shelter"
                onClick={e => {
                  e.originalEvent.stopPropagation();
                  setSelectedMarker({ type: 'shelter', data: s });
                }}
              />
            );
          })}

          {/* Popups */}
          {selectedMarker?.type === 'monitoring' && (
            <Popup
              latitude={selectedMarker.data.position[0]}
              longitude={selectedMarker.data.position[1]}
              onClose={() => setSelectedMarker(null)}
              closeButton={false}
            >
              <div className="p-2">
                <div className="font-semibold">{selectedMarker.data.name}</div>
                <div className="text-sm">Flood Level: <span style={{ color: floodLevel.color }}>{floodLevel.level}</span></div>
                <div className="text-xs text-gray-600">Recent: {floodLevel.last3h.toFixed(1)} mm • Next: {floodLevel.next3h.toFixed(1)} mm</div>
              </div>
            </Popup>
          )}

          {selectedMarker?.type === 'shelter' && (
            <Popup
              latitude={Number(selectedMarker.data.lat ?? selectedMarker.data.latitude)}
              longitude={Number(selectedMarker.data.lng ?? selectedMarker.data.longitude)}
              onClose={() => setSelectedMarker(null)}
              closeButton={false}
            >
              <div className="p-2 min-w-[150px]">
                <div className="font-semibold">{selectedMarker.data.name || 'Shelter'}</div>
                <div className="text-xs text-gray-600">{selectedMarker.data.address}</div>
                <button
                  onClick={() => navigate(`/route-planner?end=${selectedMarker.data.lat},${selectedMarker.data.lng}`)}
                  className="mt-2 bg-emerald-500 text-white text-xs font-bold py-1.5 px-3 rounded w-full"
                >
                  Follow Safe Routes
                </button>
              </div>
            </Popup>
          )}

        </MapboxMap>

        {/* HUD and Legends (logic remains same, adjusted position) */}
        <div className="absolute top-3 left-3 z-[10] pointer-events-auto">
          <div className="bg-white/95 backdrop-blur rounded-lg shadow-sm border border-gray-200 p-3 text-xs min-w-[240px]">
            <div className="font-semibold mb-2">Map Controls</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-1">
                <span>Window</span>
                <select className="border rounded px-1 py-0.5" value={forecastWindow} onChange={(e) => setForecastWindow(Number(e.target.value) as 1 | 3 | 6)}>
                  <option value={1}>1h</option>
                  <option value={3}>3h</option>
                  <option value={6}>6h</option>
                </select>
              </label>
              <label className="flex items-center gap-1">
                <span>Layers</span>
                <button 
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="px-2 py-0.5 bg-gray-100 rounded border hover:bg-gray-200"
                >
                  {showSidebar ? 'Hide' : 'Show'}
                </button>
              </label>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute top-3 right-12 z-[10] bg-white/90 backdrop-blur rounded-md shadow p-2 text-xs">
          <div className="font-semibold mb-1">Legend</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500/50 rounded-full border border-blue-500"></div>
            <span>Flood Risk</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-3 h-3 bg-red-500/50 rounded-full border border-red-500"></div>
            <span>Hazard Zone</span>
          </div>
        </div>
      </div>
    </div>
  );
}
