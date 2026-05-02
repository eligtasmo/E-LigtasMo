import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useState, useEffect, useCallback, useReducer, useRef, Fragment } from "react";
import * as turf from '@turf/turf';
import { FaCar, FaMotorcycle, FaWalking, FaBus, FaBicycle, FaSyncAlt, FaArrowLeft, FaArrowRight, FaArrowUp, FaMapMarkerAlt } from 'react-icons/fa';
import { GoLocation } from 'react-icons/go';
import { BsCircle } from 'react-icons/bs';
import { FiAlertTriangle } from 'react-icons/fi';
import { LuArrowRightLeft } from 'react-icons/lu';
import { apiFetch } from '../../utils/api';

function getMarkerIcon(color: string): L.Icon {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png',
    shadowSize: [41, 41],
  });
}

function StartEndHandler({ setStart, setEnd, start, end }: any) {
  useMapEvents({
    click(e) {
      if (!start) setStart([e.latlng.lat, e.latlng.lng]);
      else if (!end) setEnd([e.latlng.lat, e.latlng.lng]);
    }
  });
  return null;
}

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
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: {
      provider?: string;
      summary: ORSSummary;
      segments: ORSSegment[];
    };
    geometry: {
      type: 'LineString';
      coordinates: Array<[number, number]>;
    };
  }>;
};

// Updated to use our proxy and handle multiple strategies
async function getSafeRoute(
  start: [number, number],
  end: [number, number],
  dangerZones: Array<{ path: Array<[number, number]>, type?: string }>,
  transportMode: 'driving-car' | 'cycling-regular' | 'foot-walking' | 'driving-hgv' = 'driving-car'
): Promise<ORSResponse> {
  const proxyUrl = 'api/ors-directions.php';
  
  const bufferedPolygons = dangerZones.map(zone => {
    const { path, type } = zone;
    const lineString = turf.lineString(path.map(([lat, lng]) => [lng, lat])); 
    const bufferRadius = type === 'flood' ? 40 : 15;
    const buffered = turf.buffer(lineString, bufferRadius, { units: 'meters' });
    if (!buffered) throw new Error("A danger zone could not be processed.");
    return buffered.geometry.coordinates; 
  });

  const body: any = {
    coordinates: [
      [start[1], start[0]],
      [end[1], end[0]],
    ],
    instructions: true,
    options: bufferedPolygons.length > 0 ? {
      avoid_polygons: {
        type: "MultiPolygon",
        coordinates: bufferedPolygons
      }
    } : undefined
  };

  // Always request alternative routes to provide multiple path suggestions
  body.alternative_routes = {
      target_count: 3,
      share_factor: 0.9,
      weight_factor: 1.5
  };
  
  try {
    const fetchRoutes = async (b: any, profile: string) => {
        const payload = { profile, ...b };
        const response = await apiFetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) return null;
        return await response.json();
    };

    const processData = (data: any): any[] => {
        if (!data || (!data.features && !data.routes)) return [];
        let routesRaw: any[] = [];
        if (data.type === 'FeatureCollection' && data.features) {
          routesRaw = data.features;
        } else if (data.routes && Array.isArray(data.routes)) {
          routesRaw = data.routes.map((r: any) => ({
              type: 'Feature',
              properties: { summary: r.summary, segments: r.segments },
              geometry: r.geometry
          }));
        }
        return routesRaw;
    };

    // Strategy 1: Default (Fastest)
    let data = await fetchRoutes(body, transportMode);
    let allFeatures = processData(data);

    // Strategy 2: Shortest (if we have only 1 route so far)
    if (allFeatures.length < 2) {
        const shortestBody = { ...body, options: { ...body.options, profile_params: { weighting: 'shortest' } } };
        const shortestData = await fetchRoutes(shortestBody, transportMode);
        const shortestFeatures = processData(shortestData);
        
        // Add unique routes
        shortestFeatures.forEach(sf => {
            const dist = sf.properties?.summary?.distance || 0;
            if (!allFeatures.some(af => Math.abs((af.properties?.summary?.distance || 0) - dist) < 50)) {
                allFeatures.push(sf);
            }
        });
    }

    // Strategy 3: Bypass (if we still have only 1 route)
    if (allFeatures.length < 2 && allFeatures.length > 0) {
        try {
            const primary = allFeatures[0];
            const coords = primary.geometry.coordinates;
            const midIdx = Math.floor(coords.length / 2);
            const midPoint = coords[midIdx];
            
            // Create a small avoidance box around the midpoint to force a detour
            const lat = midPoint[1];
            const lon = midPoint[0];
            const r = 0.001; // ~100m
            const bypassAvoid = {
                type: "MultiPolygon",
                coordinates: [[
                    [
                        [lon - r, lat - r],
                        [lon + r, lat - r],
                        [lon + r, lat + r],
                        [lon - r, lat + r],
                        [lon - r, lat - r]
                    ]
                ]]
            };

            const bypassBody = { 
                ...body, 
                options: { 
                    ...body.options, 
                    avoid_polygons: bypassAvoid 
                } 
            };
            const bypassData = await fetchRoutes(bypassBody, transportMode);
            const bypassFeatures = processData(bypassData);
            
            bypassFeatures.forEach(bf => {
                const dist = bf.properties?.summary?.distance || 0;
                if (!allFeatures.some(af => Math.abs((af.properties?.summary?.distance || 0) - dist) < 50)) {
                    allFeatures.push(bf);
                }
            });
        } catch (e) {
            console.warn("Bypass strategy failed", e);
        }
    }

    if (allFeatures.length === 0) {
      throw new Error("No routes could be found between the selected points.");
    }
    
    // Sort routes by duration and limit to top 3
    allFeatures.sort((a, b) => (a.properties?.summary?.duration || 0) - (b.properties?.summary?.duration || 0));
    return { type: 'FeatureCollection', features: allFeatures.slice(0, 3) };
    
  } catch (error: any) {
    throw new Error(error.message || 'Route calculation failed');
  }
}

// NEW: Function to get address from coordinates
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'E-LigtasMo/1.0' }
      });
      const data = await response.json();
      if (data && data.display_name) {
        return data.display_name;
      }
      return null;
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      return null;
    }
}

async function searchLocation(query: string): Promise<[number, number] | null> {
  try {
    const res = await apiFetch(`search-map.php?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data && data.success && Array.isArray(data.results) && data.results.length > 0) {
      const r = data.results[0];
      return [Number(r.latitude), Number(r.longitude)];
    }
    return null;
  } catch {
    return null;
  }
}

// Component to programmatically pan the map
function MapController({ panTo }: { panTo: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (panTo) {
      map.setView(panTo, 15); // Pan to coordinates with zoom level 15
    }
  }, [panTo, map]);
  return null;
}

// A new component for a searchable input with suggestions
function SearchableInput({
  icon,
  query,
  setQuery,
  onSearch,
  placeholder,
}: {
  icon: React.ReactNode;
  query: string;
  setQuery: (q: string) => void;
  onSearch: (item: any) => void;
  placeholder: string;
}) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }
    const handler = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`search-map.php?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions((data && data.success && Array.isArray(data.results)) ? data.results : []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handler);
  }, [query]);

  return (
    <div className="relative w-full">
      <div className="flex items-center">
        <span className="absolute left-3 text-gray-400">{icon}</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="border rounded-md px-2 py-2 pl-10 w-full focus:ring-blue-500 focus:border-blue-500"
          onBlur={() => setTimeout(() => setSuggestions([]), 200)} // Hide on blur
        />
      </div>
      {loading && (
        <div className="absolute right-3 top-2 text-xs text-gray-400">Searching…</div>
      )}
      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border rounded mt-1 max-h-60 overflow-y-auto shadow-lg">
          {suggestions.map((s) => (
            <li
              key={String(s.id || s.title)}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100"
              onMouseDown={() => {
                setQuery(s.title);
                onSearch(s);
                setSuggestions([]);
              }}
            >
              <div className="flex flex-col">
                <span className="text-sm text-gray-800">{s.title}</span>
                <span className="text-xs text-gray-500">{s.type || 'Location'}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// NEW: Helper components and functions for displaying route details

function formatDuration(seconds: number): string {
  if (seconds < 60) return "< 1 min";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = (meters / 1000).toFixed(1);
  return `${km} km`;
}

// Group consecutive steps into concise sections with a header and nested maneuvers
function groupSteps(steps: ORSStep[]) {
  if (!Array.isArray(steps)) return [] as any[];
  const groups: Array<{ title: string; steps: ORSStep[]; distance: number; duration: number } > = [];
  let cur: { steps: ORSStep[]; distance: number; duration: number } = { steps: [], distance: 0, duration: 0 };

  const isTurn = (s: ORSStep) => String(s?.instruction || '').toLowerCase().startsWith('turn');
  const cleanName = (n?: string) => {
    const v = String(n || '').trim();
    return v && v !== '-' && !/^unnamed/i.test(v) ? v : '';
  };
  const buildTitle = (grp: { steps: ORSStep[] }) => {
    const names = grp.steps.map(s => cleanName(s.name)).filter(Boolean);
    const start = names[0] || '';
    const end = names.length > 1 ? names[names.length - 1] : start;
    const middle = names.slice(1, -1).find(n => n !== start && n !== end) || '';
    if (start && end && start !== end) {
      return middle ? `Take ${start} and ${middle} to ${end}` : `Take ${start} to ${end}`;
    }
    return start ? `Take ${start}` : 'Route section';
  };

  const pushCur = () => {
    if (!cur.steps.length) return;
    const title = buildTitle(cur);
    groups.push({ title, steps: cur.steps, distance: cur.distance, duration: cur.duration });
  };

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    cur.steps.push(s);
    cur.distance += s?.distance || 0;
    cur.duration += s?.duration || 0;
    const breakHere = isTurn(s) && (cur.distance >= 800 || cur.steps.length >= 3);
    if (breakHere && i < steps.length - 1) {
      pushCur();
      cur = { steps: [], distance: 0, duration: 0 };
    }
  }
  pushCur();
  return groups;
}

function RouteDetails({ route, index, isSelected, onClick, isShortest, isLongest }: { 
  route: any, 
  index: number,
  isSelected: boolean, 
  onClick: () => void,
  isShortest: boolean,
  isLongest: boolean
}) {
  if (!route) return null;
  const { summary, segments, provider } = route.properties;
  const firstSegment = segments[0] || { steps: [] as ORSStep[] };
  const steps = firstSegment.steps || [];
  const mainStep = steps.find((s: any) => s && s.name && s.name !== '-') || steps[0];
  const roadName = mainStep && mainStep.name ? mainStep.name : 'Main road';
  
  let label = index === 0 ? 'Primary route' : 'Alternative route';
  if (isShortest && index !== 0) label = 'Nearest route';
  if (isLongest && index !== 0) label = 'Longest route';

  const containerClasses = isSelected
    ? 'bg-blue-50 ring-2 ring-blue-400 shadow-md border-transparent'
    : 'bg-white border border-gray-200 hover:border-blue-300 hover:shadow-sm';

  const badgeColor = index === 0 ? 'bg-blue-600' : (isShortest ? 'bg-emerald-600' : (isLongest ? 'bg-amber-600' : 'bg-gray-600'));

  return (
    <div
      className={`rounded-xl px-4 py-4 mb-3 cursor-pointer transition-all duration-200 ${containerClasses}`}
      onClick={onClick}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <span className={`${badgeColor} text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight`}>
              {label}
            </span>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight flex items-center gap-1">
              <BsCircle className="w-1.5 h-1.5 fill-current" />
              Lowest hazard
            </span>
          </div>
          <div className="text-sm font-bold text-gray-900">
            {formatDuration(summary.duration)}
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-blue-700">
              <FaMapMarkerAlt className="text-xs" />
              <span className="text-sm font-bold truncate max-w-[180px]">via {roadName}</span>
            </div>
            <span className="text-[11px] text-gray-500 mt-0.5">
              {provider === 'osrm' ? 'Bypass search' : 'Standard search'}
            </span>
          </div>
          <div className="text-xs font-semibold text-gray-500">
            {formatDistance(summary.distance)}
          </div>
        </div>
      </div>
    </div>
  );
}

// NEW: Component for Travel Mode Icons
const TravelModes = ({ transportMode, setTransportMode }: { 
  transportMode: 'driving-car' | 'cycling-regular' | 'foot-walking' | 'driving-hgv',
  setTransportMode: (mode: 'driving-car' | 'cycling-regular' | 'foot-walking' | 'driving-hgv') => void 
}) => (
  <div className="flex justify-around items-center p-2 mb-4 border-b">
      <button 
        className={`flex flex-col items-center pb-1 ${transportMode === 'driving-car' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
        onClick={() => setTransportMode('driving-car')}
      >
          <FaCar size={28} />
          <span className="text-xs font-bold">Car</span>
      </button>
      <button 
        className={`flex flex-col items-center pb-1 ${transportMode === 'driving-hgv' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
        onClick={() => setTransportMode('driving-hgv')}
      >
          <FaBus size={28} />
          <span className="text-xs font-bold">Truck</span>
      </button>
      <button 
        className={`flex flex-col items-center pb-1 ${transportMode === 'cycling-regular' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
        onClick={() => setTransportMode('cycling-regular')}
      >
          <FaBicycle size={28} />
          <span className="text-xs font-bold">Bike</span>
      </button>
      <button 
        className={`flex flex-col items-center pb-1 ${transportMode === 'foot-walking' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
        onClick={() => setTransportMode('foot-walking')}
      >
          <FaWalking size={24} />
          <span className="text-xs font-bold">Walk</span>
      </button>
  </div>
);

// --- State Management with a Reducer for Robustness ---

type State = {
    status: 'idle' | 'loading' | 'success' | 'error';
    data: ORSResponse | null;
    error: string | null;
};

type Action = 
    | { type: 'FETCH_START' }
    | { type: 'FETCH_SUCCESS'; payload: ORSResponse }
    | { type: 'FETCH_ERROR'; payload: string }
    | { type: 'RESET' };

const initialState: State = {
    status: 'idle',
    data: null,
    error: null,
};

function routeReducer(state: State, action: Action): State {
    switch (action.type) {
        case 'FETCH_START':
            return { ...state, status: 'loading', error: null, data: null };
        case 'FETCH_SUCCESS':
            return { ...state, status: 'success', data: action.payload };
        case 'FETCH_ERROR':
            return { ...state, status: 'error', error: action.payload, data: null };
        case 'RESET':
            return { ...initialState };
        default:
            throw new Error("Unhandled action type");
    }
}

export default function ResidentView() {
  const [dangerZones, setDangerZones] = useState<Array<{
    id: string | number,
    path: Array<[number, number]>,
    type?: string,
    description?: string,
    reportedBy?: string,
    reportedAt?: string
  }>>([]);
  const [start, setStart] = useState<[number, number] | null>(null);
  const [end, setEnd] = useState<[number, number] | null>(null);
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [panTo, setPanTo] = useState<[number, number] | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [expandedDangerZoneId, setExpandedDangerZoneId] = useState<string | number | null>(null);
  const [transportMode, setTransportMode] = useState<'driving-car' | 'cycling-regular' | 'foot-walking' | 'driving-hgv'>('driving-car');
  const [navigationMode, setNavigationMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const floodZones = dangerZones.filter(z => z.type === 'flood');
  const otherZones = dangerZones.filter(z => z.type !== 'flood');

  const [state, dispatch] = useReducer(routeReducer, initialState);
  const { status, data: route, error } = state;

  const dangerZoneRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const selectedRoute = status === 'success' && route ? route.features[selectedRouteIndex] : null;
  const firstSegment = selectedRoute?.properties?.segments?.[0];
  const steps = firstSegment?.steps || [];
  const currentStep = steps[currentStepIndex] || null;
  const totalSteps = steps.length;

  useEffect(() => {
    // When start point is set by clicking, update the address
    if (start) {
      reverseGeocode(start[0], start[1]).then(name => {
        if (name) setStartQuery(name);
      });
    }
  }, [start]);

  useEffect(() => {
    // When end point is set by clicking, update the address
    if (end) {
      reverseGeocode(end[0], end[1]).then(name => {
        if (name) setEndQuery(name);
      });
    }
  }, [end]);

  const handleSearch = async (payload: any, type: 'start' | 'end') => {
    let coords: [number, number] | null = null;
    if (payload && typeof payload === 'object' && 'latitude' in payload && 'longitude' in payload) {
      coords = [Number(payload.latitude), Number(payload.longitude)];
    } else if (typeof payload === 'string' && payload.trim().length > 0) {
      coords = await searchLocation(payload);
    }
    if (coords) {
      if (type === 'start') setStart(coords);
      else setEnd(coords);
      setPanTo(coords);
    } else {
      alert('Location not found.');
    }
    setStartQuery('');
    setEndQuery('');
    setSelectedRouteIndex(0);
  };

  const handleSwapLocations = () => {
    // Swap coordinates
    const tempStartCoord = start;
    setStart(end);
    setEnd(tempStartCoord);

    // Swap search queries
    const tempStartQuery = startQuery;
    setStartQuery(endQuery);
    setEndQuery(tempStartQuery);
  };

  const handleFindRoute = useCallback(async () => {
    if (!start || !end) {
      return;
    }
    dispatch({ type: 'FETCH_START' });
    try {
      const result = await getSafeRoute(start, end, dangerZones, transportMode);
      dispatch({ type: 'FETCH_SUCCESS', payload: result });
    } catch (e: any) {
      dispatch({ type: 'FETCH_ERROR', payload: e.message });
    }
  }, [start, end, dangerZones, transportMode]);

  useEffect(() => {
    if (start && end) {
      handleFindRoute();
    }
  }, [start, end, handleFindRoute]);

  const handleReset = () => {
    setStart(null);
    setEnd(null);
    setStartQuery('');
    setEndQuery('');
    setSelectedRouteIndex(0);
    setNavigationMode(false);
    setCurrentStepIndex(0);
    dispatch({ type: 'RESET' });
  };

  const handleStartNavigation = () => {
    if (!selectedRoute) return;
    setNavigationMode(true);
    setCurrentStepIndex(0);
    if (start) {
      setPanTo(start);
    }
  };

  const handleExitNavigation = () => {
    setNavigationMode(false);
    setCurrentStepIndex(0);
  };

  const goToPrevStep = () => {
    if (!steps.length) return;
    setCurrentStepIndex(prev => (prev > 0 ? prev - 1 : prev));
  };

  const goToNextStep = () => {
    if (!steps.length) return;
    setCurrentStepIndex(prev => (prev < steps.length - 1 ? prev + 1 : prev));
  };

  // Fetch full danger zone objects on load
  useEffect(() => {
    apiFetch('list-danger-zones.php')
      .then(res => res.json())
      .then((data: any[]) => {
        if (data && Array.isArray(data)) {
          const zones = data.filter(item => Array.isArray(item.path)).map(item => ({
            id: item.id,
            path: item.path,
            type: item.type,
            description: item.description,
            reportedBy: item.reportedBy,
            reportedAt: item.reportedAt
          }));
          setDangerZones(zones);
        }
      })
      .catch(err => {
        console.error("Could not fetch danger zones:", err);
        alert("Could not connect to the database. Please ensure the 'npm run server' command is running in a separate terminal.");
      });
  }, []);

  return (
    <div className="w-full h-[85vh] flex flex-row">
      {!navigationMode && (
        <div className="w-full md:w-[450px] flex flex-col p-4 bg-white rounded-lg shadow-md z-10 relative overflow-hidden">
          <div className="px-2 mb-4">
            <div className="relative flex flex-col gap-3 mb-4">
              <div className="relative">
                <SearchableInput
                  icon={<BsCircle />}
                  query={startQuery}
                  setQuery={setStartQuery}
                  onSearch={(q) => handleSearch(q, 'start')}
                  placeholder="Choose starting point, or click on the map"
                />
              </div>
              <button
                onClick={handleSwapLocations}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white border-2 border-gray-300 rounded-full p-2 shadow hover:bg-gray-100 transition"
                aria-label="Swap start and destination"
              >
                <LuArrowRightLeft className="text-gray-500" />
              </button>
              <div className="relative">
                <SearchableInput
                  icon={<GoLocation />}
                  query={endQuery}
                  setQuery={setEndQuery}
                  onSearch={(q) => handleSearch(q, 'end')}
                  placeholder="Choose destination..."
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              <button
                onClick={handleReset}
                className="w-full bg-white border-2 border-gray-300 text-gray-700 font-medium py-2 px-4 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <FaSyncAlt className="text-lg" />
                Reset Route
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 justify-start items-center border-t pt-4">
              <button
                className="px-4 py-2 rounded font-semibold transition bg-blue-600 text-white"
                disabled
              >
                Find Route
              </button>
            </div>
            <TravelModes transportMode={transportMode} setTransportMode={setTransportMode} />
          </div>
          <div className="flex-grow overflow-y-auto px-2">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <FiAlertTriangle className="text-red-500 text-2xl" />
                <h3 className="text-lg font-bold text-red-600">
                  Existing Danger Zones
                  <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    {dangerZones.length}
                  </span>
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {dangerZones.map((zone, idx) => (
                  <div key={zone.id} ref={el => { dangerZoneRefs.current[zone.id] = el; return; }}>
                    <div
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition ${expandedDangerZoneId === zone.id ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'}`}
                      onClick={() => setExpandedDangerZoneId(expandedDangerZoneId === zone.id ? null : zone.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Zone {idx + 1}</span>
                        <span className="text-xs text-gray-500">({zone.path.length} points)</span>
                        <FiAlertTriangle className="text-red-400 ml-1" />
                      </div>
                    </div>
                    {expandedDangerZoneId === zone.id && (
                      <div className="mt-2 mb-2 ml-2 p-3 bg-white border-l-4 border-red-400 rounded shadow">
                        <div className="mb-1 text-gray-700">
                          <strong>Description:</strong> {zone.description || 'No description provided.'}
                        </div>
                        {zone.reportedBy && (
                          <div className="mb-1 text-gray-700">
                            <strong>Reported by:</strong> {zone.reportedBy}
                          </div>
                        )}
                        {zone.reportedAt && (
                          <div className="mb-1 text-gray-700">
                            <strong>Added:</strong> {new Date(zone.reportedAt).toLocaleString()}
                          </div>
                        )}
                        <div className="mb-1 text-gray-700">
                          <strong>Coordinates:</strong> {zone.path && Array.isArray(zone.path) ? `${zone.path.length} points` : 'N/A'}
                        </div>
                        <div className="mb-2">
                          <strong>Map Preview:</strong>
                          <div className="mt-2 rounded overflow-hidden border" style={{ height: 80 }}>
                            <MapContainer
                              center={zone.path && zone.path[0]}
                              zoom={16}
                              style={{ height: '100%', width: '100%' }}
                              scrollWheelZoom={false}
                              dragging={false}
                              doubleClickZoom={false}
                              zoomControl={false}
                              attributionControl={false}
                            >
                              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                              <Polyline positions={zone.path} color="red" weight={5} />
                            </MapContainer>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="mt-2 px-3 py-1 rounded bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300"
                          onClick={() => setExpandedDangerZoneId(null)}
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6">
              {status === 'loading' && (
                <div className="text-center text-gray-500 pt-8 font-semibold">Calculating route...</div>
              )}
              {status === 'error' && (
                <div className="text-center text-red-500 p-4 bg-red-50 rounded-lg">
                  <p className="font-bold">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              )}
              {status === 'success' && route && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1 flex items-center justify-between">
                    <span>Route Options</span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{route.features.length} found</span>
                  </h4>
                  {(() => {
                    const sortedByDist = [...route.features].sort((a, b) => a.properties.summary.distance - b.properties.summary.distance);
                    const minDist = sortedByDist[0].properties.summary.distance;
                    const maxDist = sortedByDist[sortedByDist.length - 1].properties.summary.distance;

                    return route.features.map((f, index) => (
                      <RouteDetails
                        key={index}
                        index={index}
                        route={f}
                        isSelected={index === selectedRouteIndex}
                        onClick={() => setSelectedRouteIndex(index)}
                        isShortest={f.properties.summary.distance === minDist}
                        isLongest={f.properties.summary.distance === maxDist}
                      />
                    ));
                  })()}
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={handleStartNavigation}
                      className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <FaArrowUp />
                      Start Navigation
                    </button>
                  </div>
                </div>
              )}
              {status === 'idle' && (
                <div className="text-center text-gray-400 pt-8">
                  <p className="font-semibold">Find the safest route.</p>
                  <p className="text-sm">Route details and directions will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 h-full rounded-lg shadow-md overflow-hidden relative">
        <MapContainer
          center={[14.5995, 120.9842]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap &copy; CARTO"
          />
          <StartEndHandler setStart={setStart} setEnd={setEnd} start={start} end={end} />
          {floodZones.map((zone) => {
            // Buffer flood areas visually as semi-transparent polygons to indicate "Heavy Flooded Area"
            const lineString = turf.lineString(zone.path.map(([lat, lng]) => [lng, lat]));
            const buffered = turf.buffer(lineString, 40, { units: 'meters' });
            if (!buffered) return null;
            const polygonCoords = buffered.geometry.coordinates[0].map((coord: any) => [coord[1], coord[0]] as [number, number]);
            
            return (
              <Fragment key={zone.id}>
                <Polygon
                  positions={polygonCoords}
                  pathOptions={{
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.35,
                    weight: 2,
                    dashArray: '5, 10'
                  }}
                  eventHandlers={{
                    click: (e) => {
                      e.originalEvent?.stopPropagation?.();
                      setExpandedDangerZoneId(zone.id);
                    }
                  }}
                >
                  <Popup>
                    <div className="p-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="font-bold text-red-700">HEAVY FLOODED AREA</span>
                      </div>
                      <p className="text-xs text-gray-700">{zone.description || 'Avoid this area for safety.'}</p>
                    </div>
                  </Popup>
                </Polygon>
                <Polyline
                  positions={zone.path}
                  color="#b91c1c"
                  weight={4}
                  opacity={0.8}
                />
              </Fragment>
            );
          })}
          {otherZones.map((zone) => (
            <Polyline
              key={zone.id}
              positions={zone.path}
              color="#f59e0b"
              weight={5}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent?.stopPropagation?.();
                  setExpandedDangerZoneId(zone.id);
                  const map = e.target._map;
                  if (map && zone.path.length > 0) {
                    const bounds = L.latLngBounds(zone.path);
                    map.fitBounds(bounds, { maxZoom: 17, animate: true, duration: 0.7 });
                  }
                }
              }}
            >
               <Popup>
                 <span className="font-bold text-orange-700">DANGER ZONE</span>
                 <br />
                 {zone.description || 'Caution required in this area.'}
               </Popup>
            </Polyline>
          ))}
          {start && <Marker position={start} icon={getMarkerIcon('green')}><Popup>Start</Popup></Marker>}
          {end && <Marker position={end} icon={getMarkerIcon('blue')}><Popup>End</Popup></Marker>}
          {status === 'success' && route && (
            route.features.map((f, index) => (
              <Polyline
                key={index}
                positions={f.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng])}
                color={index === selectedRouteIndex ? '#3b82f6' : '#94a3b8'}
                weight={index === selectedRouteIndex ? 7 : 4}
                opacity={index === selectedRouteIndex ? 1.0 : 0.5}
                eventHandlers={{
                  click: () => setSelectedRouteIndex(index)
                }}
              >
                <Popup>
                  <div className="p-1 font-semibold">
                    {index === 0 ? 'Primary' : 'Alternative'} Route
                    <br />
                    <span className="text-xs text-gray-500 font-normal">
                      {formatDuration(f.properties.summary.duration)} • {formatDistance(f.properties.summary.distance)}
                    </span>
                  </div>
                </Popup>
              </Polyline>
            ))
          )}
          <MapController panTo={panTo} />
        </MapContainer>
        {navigationMode && selectedRoute && (
          <div className="absolute inset-x-0 bottom-0 p-4 pointer-events-none">
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-4 pointer-events-auto">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={handleExitNavigation}
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  <FaArrowLeft className="text-gray-500" />
                  <span>Exit navigation</span>
                </button>
                <div className="text-xs text-gray-500">
                  ETA {formatDuration(selectedRoute.properties?.summary?.duration || 0)} • {formatDistance(selectedRoute.properties?.summary?.distance || 0)}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white">
                  <FaArrowUp className="text-xl" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">
                    {currentStep?.instruction || 'Follow the highlighted route'}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {currentStep
                      ? `${formatDistance(currentStep.distance)} • about ${formatDuration(currentStep.duration)}`
                      : 'Turn-by-turn guidance'}
                  </div>
                  {totalSteps > 0 && (
                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                      <span>Step {currentStepIndex + 1} of {totalSteps}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={goToPrevStep}
                          disabled={currentStepIndex === 0}
                          className="px-2 py-1 rounded-full border border-gray-300 text-xs bg-white disabled:opacity-40"
                        >
                          Prev
                        </button>
                        <button
                          type="button"
                          onClick={goToNextStep}
                          disabled={currentStepIndex >= totalSteps - 1}
                          className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
