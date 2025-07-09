import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useState, useEffect, useCallback, useReducer, useRef } from "react";
import * as turf from '@turf/turf';
import { FaCar, FaMotorcycle, FaWalking, FaBus, FaBicycle, FaSyncAlt } from 'react-icons/fa';
import { GoLocation } from 'react-icons/go';
import { BsCircle } from 'react-icons/bs';
import { FiAlertTriangle } from 'react-icons/fi';
import { LuArrowRightLeft } from 'react-icons/lu';

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
  routes: ORSDetailedRoute[];
};

// Updated to handle danger zones as polygons
async function getSafeRoute(
  start: [number, number],
  end: [number, number],
  dangerPolylines: Array<Array<[number, number]>>
): Promise<ORSResponse> {
  const apiKey = "5b3ce3597851110001cf6248d40a71b0b51c4c9eb9927348e7276122";
  // Request the full JSON object, not just the GeoJSON geometry
  const url = "https://api.openrouteservice.org/v2/directions/driving-car";
  
  const bufferedPolygons = dangerPolylines.map(line => {
    // Turf.js expects [lng, lat]
    const lineString = turf.lineString(line.map(([lat, lng]) => [lng, lat])); 
    // Buffer by 10 meters to create a thin polygon area
    const buffered = turf.buffer(lineString, 10, { units: 'meters' });
    if (!buffered) {
        // This should rarely happen, but it's good practice to handle it.
        throw new Error("A danger zone could not be processed. Please try re-drawing it.");
    }
    // Return the coordinates for the MultiPolygon
    return buffered.geometry.coordinates; 
  });

  const body: any = {
    coordinates: [
      [start[1], start[0]],
      [end[1], end[0]],
    ],
    instructions: true,
    // NEW: Request alternative routes
    alternative_routes: {
        target_count: 3,
        share_factor: 0.6,
        weight_factor: 1.4
    }
  };

  // Only add the avoid_polygons option if there are actual zones to avoid
  if (bufferedPolygons.length > 0) {
    body.options = {
      avoid_polygons: {
        type: "MultiPolygon",
        coordinates: bufferedPolygons
      }
    };
  }
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Authorization": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("ORS API Error:", data);
    const message = data.error?.message || 'Unknown API error';
    throw new Error(`Route calculation failed: ${message}`);
  }

  // Also handle cases where the API returns a 200 OK status but no routes are found
  if (!data.routes || !Array.isArray(data.routes) || data.routes.length === 0) {
    const message = data.error?.message || "No routes could be found between the selected points.";
    throw new Error(`Route calculation failed: ${message}`);
  }

  return data;
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

// Function to search for a location using Nominatim
async function searchLocation(query: string): Promise<[number, number] | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'E-LigtasMo/1.0' } // Nominatim requires a User-Agent
    });
    const data = await response.json();
    if (data && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
    return null;
  } catch (error) {
    console.error("Nominatim search failed:", error);
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
  onSearch: (q: string) => void;
  placeholder: string;
}) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  
  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    const handler = setTimeout(async () => {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
      try {
        const response = await fetch(url, { headers: { 'User-Agent': 'E-LigtasMo/1.0' } });
        const data = await response.json();
        setSuggestions(data || []);
      } catch (error) {
        console.error("Nominatim suggestion fetch failed:", error);
      }
    }, 500); // Debounce for 500ms
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
      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border rounded mt-1 max-h-60 overflow-y-auto shadow-lg">
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100"
              onMouseDown={() => {
                setQuery(s.display_name);
                onSearch(s.display_name);
                setSuggestions([]);
              }}
            >
              {s.display_name}
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

function RouteDetails({ route, isSelected, onClick }: { route: ORSDetailedRoute | null, isSelected: boolean, onClick: () => void }) {
  if (!route) return null;

  const { summary, segments } = route;
  const borderClass = isSelected ? 'border-blue-500' : 'border-transparent';

  return (
    <div className={`p-3 mb-3 border-2 rounded-lg cursor-pointer hover:border-blue-400 ${borderClass}`} onClick={onClick}>
      <div className="flex items-center justify-between">
        <div>
            <h3 className="text-xl font-bold text-blue-600">{formatDuration(summary.duration)}</h3>
            <p className="text-sm text-gray-600">Total Distance: {formatDistance(summary.distance)}</p>
        </div>
        <div className="text-right">
            <p className="text-sm text-gray-500">via {segments[0].steps[0].name || 'unnamed road'}</p>
        </div>
      </div>
      <h4 className="font-semibold mt-4 mb-2 text-gray-800">Directions</h4>
      <ul className="list-decimal list-inside overflow-y-auto max-h-80 bg-gray-50 p-2 rounded">
        {segments[0].steps.map((step, index) => (
          <li key={index} className="p-2 border-b text-sm">
            {step.instruction} <span className="text-gray-500">({formatDistance(step.distance)})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// NEW: Component for Travel Mode Icons
const TravelModes = () => (
  <div className="flex justify-around items-center p-2 mb-4 border-b">
      <button className="flex flex-col items-center text-blue-600 border-b-2 border-blue-600 pb-1">
          <FaCar size={24} />
          <span className="text-xs font-bold">Best</span>
      </button>
      <button className="flex flex-col items-center text-gray-500 hover:text-blue-600">
          <FaMotorcycle size={24} />
      </button>
      <button className="flex flex-col items-center text-gray-500 hover:text-blue-600">
          <FaBus size={24} />
      </button>
      <button className="flex flex-col items-center text-gray-500 hover:text-blue-600">
          <FaWalking size={24} />
      </button>
      <button className="flex flex-col items-center text-gray-500 hover:text-blue-600">
          <FaBicycle size={24} />
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

  const [state, dispatch] = useReducer(routeReducer, initialState);
  const { status, data: route, error } = state;

  const dangerZoneRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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

  const handleSearch = async (query: string, type: 'start' | 'end') => {
    if (!query) return;
    const coords = await searchLocation(query);
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
      const result = await getSafeRoute(start, end, dangerZones.map(zone => zone.path));
      dispatch({ type: 'FETCH_SUCCESS', payload: result });
    } catch (e: any) {
      dispatch({ type: 'FETCH_ERROR', payload: e.message });
    }
  }, [start, end, dangerZones]);

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
    dispatch({ type: 'RESET' });
  };

  // Fetch full danger zone objects on load
  useEffect(() => {
    fetch('http://localhost:3001/danger_zones')
      .then(res => res.json())
      .then((data: any[]) => {
        if (data && Array.isArray(data)) {
          const zones = data.filter(item => Array.isArray(item.path)).map(item => ({
            id: item.id,
            path: item.path,
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
      {/* Left Panel */}
      <div className="w-full md:w-[450px] flex flex-col p-4 bg-white rounded-lg shadow-md z-10 relative overflow-hidden">
        <div className="px-2 mb-4">
          <div className="relative flex flex-col gap-3 mb-4">
            {/* Start Location */}
            <div className="relative">
                <SearchableInput
                    icon={<BsCircle />}
                    query={startQuery}
                    setQuery={setStartQuery}
                    onSearch={(q) => handleSearch(q, 'start')}
                placeholder="Choose starting point, or click on the map"
              />
            </div>
            {/* Swap Button */}
            <button
              onClick={handleSwapLocations}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white border-2 border-gray-300 rounded-full p-2 shadow hover:bg-gray-100 transition"
              aria-label="Swap start and destination"
            >
              <LuArrowRightLeft className="text-gray-500" />
            </button>
            {/* End Location */}
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
          {/* Reset Route button */}
          <div className="flex flex-col gap-2 mb-4">
            <button
              onClick={handleReset}
              className="w-full bg-white border-2 border-gray-300 text-gray-700 font-medium py-2 px-4 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <FaSyncAlt className="text-lg" />
              Reset Route
            </button>
          </div>
          {/* Tabs for Find Route (no Manage Hazards for residents) */}
          <div className="mt-2 flex flex-wrap gap-2 justify-start items-center border-t pt-4">
            <button
              className="px-4 py-2 rounded font-semibold transition bg-blue-600 text-white"
              disabled
            >
              Find Route
            </button>
          </div>
        </div>
        <div className="flex-grow overflow-y-auto px-2">
          {/* Danger Zone Section (read-only) */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <FiAlertTriangle className="text-red-500 text-2xl" />
              <h3 className="text-lg font-bold text-red-600">Existing Danger Zones <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{dangerZones.length}</span></h3>
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
                          <MapContainer center={zone.path && zone.path[0]} zoom={16} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false} dragging={false} doubleClickZoom={false} zoomControl={false} attributionControl={false}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Polyline positions={zone.path} color="red" weight={5} />
                          </MapContainer>
                        </div>
                      </div>
                      <button type="button" className="mt-2 px-3 py-1 rounded bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300" onClick={() => setExpandedDangerZoneId(null)}>
                        Close
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Route Results Section (unchanged) */}
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
            route.routes.map((r, index) => (
              <RouteDetails 
                key={index} 
                route={r} 
                isSelected={index === selectedRouteIndex} 
                onClick={() => setSelectedRouteIndex(index)}
              />
            ))
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
      {/* Right Panel (Map) */}
      <div className="flex-1 h-full rounded-lg shadow-md overflow-hidden">
        <MapContainer center={[14.5995, 120.9842]} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          <StartEndHandler setStart={setStart} setEnd={setEnd} start={start} end={end} />
          {dangerZones.map((zone, idx) => (
            <Polyline
              key={zone.id}
              positions={zone.path}
              color="red"
              weight={5}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent?.stopPropagation?.();
                  setExpandedDangerZoneId(zone.id);
                  // Zoom to the polyline
                  const map = e.target._map;
                  if (map && zone.path.length > 0) {
                    const bounds = L.latLngBounds(zone.path);
                    map.fitBounds(bounds, { maxZoom: 17, animate: true, duration: 0.7 });
                  }
                }
              }}
            />
          ))}
          {start && <Marker position={start} icon={getMarkerIcon('green')}><Popup>Start</Popup></Marker>}
          {end && <Marker position={end} icon={getMarkerIcon('blue')}><Popup>End</Popup></Marker>}
          {status === 'success' && route && (
            route.routes.map((r, index) => (
              <Polyline
                key={index}
                positions={r.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng])}
                color={index === selectedRouteIndex ? '#3b82f6' : 'gray'}
                weight={index === selectedRouteIndex ? 6 : 5}
                opacity={index === selectedRouteIndex ? 1.0 : 0.6}
              />
            ))
          )}
          <MapController panTo={panTo} />
        </MapContainer>
      </div>
    </div>
  );
} 
