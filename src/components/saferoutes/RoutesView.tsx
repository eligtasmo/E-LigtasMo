import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useState, useEffect, useCallback, useReducer, Component, ReactNode, useRef, MouseEvent } from "react";
import * as turf from '@turf/turf';
import { FaCar, FaMotorcycle, FaWalking, FaBus, FaBicycle } from 'react-icons/fa';
import { BsCircle, BsGeoAltFill } from 'react-icons/bs';
import { LuArrowRightLeft } from 'react-icons/lu';
import { FiTrash2, FiAlertTriangle, FiRotateCcw } from "react-icons/fi";

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

const hazards = [
  { lat: 14.5995, lng: 120.9842, type: "flood", status: "danger" },
  { lat: 14.6010, lng: 120.9850, type: "accident", status: "caution" },
  { lat: 14.6020, lng: 120.9860, type: "clear", status: "good" },
];

type StatusType = 'good' | 'caution' | 'danger';
const statusColors: Record<StatusType, string> = {
  good: "green",
  caution: "yellow",
  danger: "red",
};

const statusLabels: Record<StatusType, string> = {
  good: "Safe",
  caution: "Caution",
  danger: "Danger",
};

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

type Mode = 'startend' | 'danger';

function StartEndHandler({ mode, setStart, setEnd, start, end, activeInput, watchId, setActiveInput }: any) {
  useMapEvents({
    click(e) {
      if (mode !== 'startend') return;
      if (e.originalEvent && e.originalEvent.cancelBubble) return;
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.warn("Invalid coordinates clicked:", lat, lng);
        return;
      }
      // Only allow setting if the corresponding input is active, or if not set yet
      if (!start) {
        setStart([lat, lng]);
        setActiveInput('end');
      } else if (!end) {
        setEnd([lat, lng]);
      } else if (activeInput === 'start') {
        setStart([lat, lng]);
        setActiveInput('end'); // Optionally switch to end after setting
      } else if (activeInput === 'end') {
        setEnd([lat, lng]);
      }
      // Otherwise, do nothing (both set and no input is active)
    }
  });
  return null;
}

// New, professional-grade handler for selecting road segments
function DangerSegmentHandler({ mode, addDangerZone, dangerZones, setSelectedDangerZoneId }: { mode: Mode, addDangerZone: (polyline: Array<[number, number]>) => void, dangerZones: Array<{id: number|string, path: Array<[number, number]>}>, setSelectedDangerZoneId: (id: number|string|null) => void }) {
  const [points, setPoints] = useState<[number, number][]>([]);

  useMapEvents({
    async click(e) {
      if (mode !== 'danger') return;
      if (e.originalEvent && typeof e.originalEvent.preventDefault === 'function') {
        e.originalEvent.preventDefault();
      }

      // Prevent adding a new danger mark if clicking on an existing danger zone
      const clickedLatLng = [e.latlng.lat, e.latlng.lng];
      const isOnExistingDangerZone = dangerZones.some(zone =>
        zone.path.some(([lat, lng]) => Math.abs(lat - clickedLatLng[0]) < 0.0001 && Math.abs(lng - clickedLatLng[1]) < 0.0001)
      );
      if (isOnExistingDangerZone) {
        // Optionally, select the danger zone for edit/delete
        const foundZone = dangerZones.find(zone =>
          zone.path.some(([lat, lng]) => Math.abs(lat - clickedLatLng[0]) < 0.0001 && Math.abs(lng - clickedLatLng[1]) < 0.0001)
        );
        if (foundZone) setSelectedDangerZoneId(foundZone.id);
        return;
      }

      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      // Validate coordinates before using them
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.warn("Invalid coordinates clicked for danger zone:", lat, lng);
        return;
      }

      const newPoint: [number, number] = [lat, lng];
      const newPoints = [...points, newPoint];
      setPoints(newPoints);

      if (newPoints.length === 2) {
        try {
          const start = newPoints[0];
          const end = newPoints[1];

          // Validate the points are not too close together
          const distance = Math.sqrt(
            Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2)
          );

          if (distance < 0.001) { // Very small distance threshold
            alert("Please select points that are further apart for a meaningful danger zone.");
            setPoints([]);
            return;
          }

          const routePolyline = await getRouteSegment(start, end);

          // Validate the returned polyline
          if (!Array.isArray(routePolyline) || routePolyline.length === 0) {
            throw new Error("No route path was generated between the selected points.");
          }

          addDangerZone(routePolyline);
        } catch (error: any) {
          console.error("Error creating danger zone:", error);
          const errorMessage = error.message || "Could not create a danger path between these points. Please ensure they are on the road network.";
          alert(errorMessage);
        } finally {
          setPoints([]); // Reset for the next segment
        }
      }
    },
  });

  // No longer show a temporary marker on the first click for a cleaner UI
  return null;
}

// Helper to get a route segment between two points
async function getRouteSegment(start: [number, number], end: [number, number]): Promise<Array<[number, number]>> {
  const apiKey = "5b3ce3597851110001cf6248d40a71b0b51c4c9eb9927348e7276122";
  const url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
  const body = {
    coordinates: [
      [start[1], start[0]],
      [end[1], end[0]],
    ],
    // Snap clicks to the nearest road within 30 meters for accuracy
    radiuses: [30, 30],
  };
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Authorization": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("ORS API Error in getRouteSegment:", errorData);
      throw new Error(`ORS API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    console.log('ORS Directions API response:', data);
    
    // Validate the response structure
    if (!data || !data.features || !Array.isArray(data.features) || data.features.length === 0) {
      console.error("Invalid ORS response structure:", data);
      throw new Error("No route found between the selected points. Please try different points.");
    }
    
    const feature = data.features[0];
    if (!feature || !feature.geometry || !feature.geometry.coordinates || !Array.isArray(feature.geometry.coordinates)) {
      console.error("Invalid feature structure:", feature);
      throw new Error("Invalid route data received from the API.");
    }
    
    return feature.geometry.coordinates.map((coord: any) => {
      if (!Array.isArray(coord) || coord.length < 2) {
        console.warn("Invalid coordinate in route:", coord);
        return [0, 0]; // fallback
      }
      const [lng, lat] = coord;
      return [lat, lng];
    });
  } catch (error) {
    console.error("Error in getRouteSegment:", error);
    throw error; // Re-throw to be handled by the calling function
  }
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
  const url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
  
  const bufferedPolygons = dangerPolylines.map(line => {
    // Turf.js expects [lng, lat]
    const lineString = turf.lineString(line.map(([lat, lng]) => [lng, lat])); 
    // Buffer by 30 meters to create a thin polygon area
    const buffered = turf.buffer(lineString, 30, { units: 'meters' });
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
    },
    options: {
      avoid_polygons: {
        type: "MultiPolygon",
        coordinates: bufferedPolygons
      }
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
  console.log('ORS Directions API response:', data);

  if (!response.ok) {
    console.error("ORS API Error:", data);
    const message = data.error?.message || 'Unknown API error';
    throw new Error(`Route calculation failed: ${message}`);
  }

  // --- PATCH: Accept FeatureCollection with features array ---
  if (data.type === 'FeatureCollection' && Array.isArray(data.features) && data.features.length > 0) {
    // Convert features to routes array compatible with the rest of the app
    const routes = data.features
      .filter((feature: any) => feature.geometry && feature.geometry.type === 'LineString' && Array.isArray(feature.geometry.coordinates))
      .map((feature: any) => ({
        summary: feature.properties?.summary || { distance: 0, duration: 0 },
        segments: feature.properties?.segments || [],
        geometry: { coordinates: feature.geometry.coordinates },
      }));
    if (routes.length === 0) {
      throw new Error('No routes could be found between the selected points.');
    }
    return { routes };
  }

  // --- Original: Accept old-style routes array ---
  if (!data.routes || !Array.isArray(data.routes) || data.routes.length === 0) {
    const message = data.error?.message || "No routes could be found between the selected points.";
    throw new Error(`Route calculation failed: ${message}`);
  }

  // Stricter validation: Ensure the route has a drawable path.
  const firstRoute = data.routes[0];
  if (!firstRoute.geometry || !Array.isArray(firstRoute.geometry.coordinates) || firstRoute.geometry.coordinates.length === 0) {
      throw new Error("The route returned by the API is missing the path information (geometry) and cannot be drawn.");
  }

  console.log('First route:', data.routes[0]);

  return data;
}

// NEW: Function to get address from coordinates
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
    // Validate coordinates first
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.warn("Invalid coordinates for reverse geocoding:", lat, lng);
        return null;
    }
    
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'E-LigtasMo/1.0' }
      });
      
      if (!response.ok) {
        console.warn("Reverse geocoding failed with status:", response.status);
        return null;
      }
      
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

// NEW: Helper components and functions for displaying route details

function FitBoundsOnZone({ path }: { path: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (path && path.length > 0) {
      const bounds = L.latLngBounds(path);
      map.fitBounds(bounds, { maxZoom: 16, animate: false });
    }
  }, [path, map]);
  return null;
}

// Add color mapping for danger zone types
const DANGER_TYPE_COLORS: Record<string, string> = {
  flood: '#06b6d4',      // Teal/Cyan
  accident: '#f59e42',   // Orange
  landslide: '#a16207',  // Brown/Yellow
  fire: '#ef4444',       // Red
  other: '#6366f1',      // Indigo/Purple
};
const DANGER_TYPE_LABELS: Record<string, string> = {
  flood: 'Flood',
  accident: 'Accident',
  landslide: 'Landslide',
  fire: 'Fire',
  other: 'Other',
};
const DANGER_TYPE_OPTIONS = [
  { value: 'flood', label: 'Flood' },
  { value: 'accident', label: 'Accident' },
  { value: 'landslide', label: 'Landslide' },
  { value: 'fire', label: 'Fire' },
  { value: 'other', label: 'Other' },
];

function DangerZoneSection({
  dangerZones,
  expandedDangerZoneId,
  setExpandedDangerZoneId,
  canManageHazards,
  deleteDangerZone,
  setSelectedDangerZoneId
}: {
  dangerZones: any[],
  expandedDangerZoneId: string | number | null,
  setExpandedDangerZoneId: (id: string | number | null) => void,
  canManageHazards: boolean,
  deleteDangerZone?: (id: string | number) => void,
  setSelectedDangerZoneId: (id: string | number | null) => void
}) {
  if (!canManageHazards) {
    // Resident: Only show details for selected zone, never a list
    const zone = dangerZones.find(z => z.id === expandedDangerZoneId);
    if (!zone) return null; // Show nothing if no zone is selected
  return (
      <div className="mb-6 relative">
        <div className="mt-2 mb-2 ml-2 p-3 w-full bg-white border-l-4 border-red-400 rounded shadow relative">
          {/* Close icon button at top right */}
          <button
            type="button"
            aria-label="Close details"
            className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400"
            onClick={() => setExpandedDangerZoneId(null)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20">
              <path stroke="#9B1C1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 6l8 8M14 6l-8 8" />
            </svg>
          </button>
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
                center={zone.path && zone.path.length > 0 ? zone.path[Math.floor(zone.path.length / 2)] : [14.5995, 120.9842]}
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
                <FitBoundsOnZone path={zone.path} />
              </MapContainer>
            </div>
          </div>
        </div>
    </div>
  );
}
  // Admin: show list + details as before
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <FiAlertTriangle className="text-red-500 text-2xl" />
        <h3 className="text-lg font-bold text-red-600">Existing Danger Zones <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{dangerZones.length}</span></h3>
      </div>
      <div className="flex flex-col gap-2">
        {dangerZones.map((zone, idx) => (
          <div key={zone.id}>
            <div
              className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition ${expandedDangerZoneId === zone.id ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'}`}
              onClick={() => {
                setExpandedDangerZoneId(expandedDangerZoneId === zone.id ? null : zone.id);
                setSelectedDangerZoneId(zone.id);
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">Zone {idx + 1}</span>
                <span className="text-xs text-gray-500">({zone.path.length} points)</span>
                <FiAlertTriangle className="text-red-400 ml-1" />
              </div>
              {canManageHazards && deleteDangerZone && (
                <button type="button" className="p-1 text-red-500 hover:text-red-700" onClick={e => { e.stopPropagation(); deleteDangerZone(zone.id); }}>
                  <FiTrash2 />
      </button>
              )}
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
              </div>
            )}
          </div>
        ))}
      </div>
  </div>
);
}

// Restore type definitions for props and reducer
interface RoutesViewProps {
  canManageHazards?: boolean;
}

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

// Santa Cruz, Laguna bounding box
const SANTA_CRUZ_BOUNDS = {
  minLat: 14.25,
  maxLat: 14.32,
  minLng: 121.38,
  maxLng: 121.45,
};

function isInSantaCruzLaguna(path: [number, number][]): boolean {
  // path: Array of [lat, lng]
  return path.every(([lat, lng]) =>
    lat >= SANTA_CRUZ_BOUNDS.minLat && lat <= SANTA_CRUZ_BOUNDS.maxLat &&
    lng >= SANTA_CRUZ_BOUNDS.minLng && lng <= SANTA_CRUZ_BOUNDS.maxLng
  );
}

const RoutesView: React.FC<RoutesViewProps> = ({ canManageHazards = true }) => {
  console.log('RoutesView rendered');
  const [mode, setMode] = useState<Mode>('startend');
  const [dangerZones, setDangerZones] = useState<Array<{
    id: number | string,
    path: Array<[number, number]>,
    description?: string,
    reportedBy?: string,
    reportedAt?: string,
    type: string
  }>>([]);
  const [start, setStart] = useState<[number, number] | null>(null);
  const [end, setEnd] = useState<[number, number] | null>(null);
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [panTo, setPanTo] = useState<[number, number] | null>([14.2792, 121.4156]); // Santa Cruz, Laguna
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [selectedDangerZoneId, setSelectedDangerZoneId] = useState<string | number | null>(null);
  const mapRef = useRef<any>(null);
  const [activeInput, setActiveInput] = useState<'start' | 'end'>('start');
  const [liveLocation, setLiveLocation] = useState<[number, number] | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [liveETA, setLiveETA] = useState<{ duration: number; distance: number } | null>(null);
  const [newDangerZoneDraft, setNewDangerZoneDraft] = useState<Array<[number, number]> | null>(null);
  const [dangerZoneForm, setDangerZoneForm] = useState({ description: '', reportedBy: 'Admin User', reportedAt: new Date().toISOString(), type: 'flood' });
  const [expandedDangerZoneId, setExpandedDangerZoneId] = useState<string | number | null>(null);
  const [hoveredRoutePoint, setHoveredRoutePoint] = useState<[number, number] | null>(null);
  const [hoveredRouteDistance, setHoveredRouteDistance] = useState<number | null>(null);

  const [state, dispatch] = useReducer(routeReducer, initialState);
  const { status, data: route, error } = state;

  // Debug logging for route data
  useEffect(() => {
    if (status === 'success' && route) {
      // console.log('Route data received:', route);
      // console.log('Routes array:', route.routes);
      // if (route.routes && route.routes.length > 0) {
      //   console.log('First route:', route.routes[0]);
      //   console.log('First route segments:', route.routes[0].segments);
      // }
    }
  }, [status, route]);

  useEffect(() => {
    // When start point is set by clicking, update the address
    if (start && Array.isArray(start) && start.length === 2) {
      try {
        reverseGeocode(start[0], start[1])
          .then(name => {
            if (name) setStartQuery(name);
          })
          .catch(error => {
            console.error("Failed to get address for start point:", error);
          });
      } catch (error) {
        console.error("Error in start point reverse geocoding:", error);
      }
    }
  }, [start]);

  useEffect(() => {
    // When end point is set by clicking, update the address
    if (end && Array.isArray(end) && end.length === 2) {
      try {
        reverseGeocode(end[0], end[1])
          .then(name => {
            if (name) setEndQuery(name);
          })
          .catch(error => {
            console.error("Failed to get address for end point:", error);
          });
      } catch (error) {
        console.error("Error in end point reverse geocoding:", error);
      }
    }
  }, [end]);

  const handleFindRoute = useCallback(async () => {
    if (!start || !end || !Array.isArray(start) || !Array.isArray(end)) {
      return;
    }
    dispatch({ type: 'FETCH_START' });
    try {
      const dangerPaths = dangerZones
        .filter(zone => zone && zone.path && Array.isArray(zone.path))
        .map(zone => zone.path);
      const result = await getSafeRoute(start as [number, number], end as [number, number], dangerPaths);
      dispatch({ type: 'FETCH_SUCCESS', payload: result });
      setSelectedRouteIndex(0);
    } catch (e: any) {
      let userFriendlyMessage = e.message || 'An unknown error occurred during route calculation.';
      if (e.message?.includes('missing the path information')) {
        userFriendlyMessage = "A route could not be found. This can happen if one of the points is in an area a car can't reach (like a park or building), or if the path is completely blocked by a danger zone. Please try different points.";
      } else if (e.message?.includes('No routes could be found')) {
        userFriendlyMessage = "No routes were found between the selected points. They may be too far apart or disconnected from the road network.";
      }
      dispatch({ type: 'FETCH_ERROR', payload: userFriendlyMessage });
    }
  }, [start, end, dangerZones]);

  const handleReset = () => {
    try {
      setStart(null);
      setEnd(null);
      setDangerZones([]);
      setStartQuery('');
      setEndQuery('');
      setSelectedRouteIndex(0);
      dispatch({ type: 'RESET' });
    } catch (error) {
      console.error("Error in handleReset:", error);
    }
  };

  const addAndSaveDangerZoneWithDetails = async (polyline: Array<[number, number]>, description: string, reportedBy: string, reportedAt: string, type: string) => {
    if (!Array.isArray(polyline) || polyline.length === 0) {
      console.error("Invalid polyline data:", polyline);
      return;
    }
    const tempZone = { id: Date.now(), path: polyline, description, reportedBy, reportedAt, type };
    setDangerZones(z => [...z, tempZone]);
    try {
      const response = await fetch('http://localhost:3001/danger_zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: polyline, description, reportedBy, reportedAt, type })
      });
      if (!response.ok) {
        throw new Error('Failed to save danger zone');
      }
      let savedZone: any = null;
      if (response.status !== 204) {
        savedZone = await response.json();
        setDangerZones(z => z.map(zone => zone.id === tempZone.id ? { ...zone, id: savedZone.id } : zone));
      }
    } catch (error) {
      console.error('Error saving danger zone:', error);
    }
  };

  const deleteDangerZone = async (zoneId: number | string) => {
    if (typeof zoneId !== 'number' && typeof zoneId !== 'string') {
      console.error("Invalid zone ID:", zoneId);
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/danger_zones/${zoneId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete danger zone');
      }
      // Do NOT call response.json() for DELETE if status is 204
      // Remove from UI (compare as string for robustness)
      setDangerZones(z => z.filter(zone => String(zone.id) !== String(zoneId)));
    } catch (error) {
      console.error("Failed to delete danger zone:", error);
      alert("Could not delete the danger zone. Please check if the server is running.");
    }
  };

  // Fetch saved danger zones on initial load
  useEffect(() => {
    const fetchDangerZones = async () => {
      try {
        const response = await fetch('http://localhost:3001/danger_zones');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (data && Array.isArray(data)) {
          // Filter out any invalid entries to prevent crashes
          const zones = data
            .filter(item => item && typeof item === 'object' && Array.isArray(item.path))
            .map(item => ({
              id: item.id || Date.now(),
              path: item.path,
              description: item.description,
              reportedBy: item.reportedBy,
              reportedAt: item.reportedAt,
              type: item.type
            }));
          setDangerZones(zones);
        }
      } catch (err) {
        console.error("Could not fetch danger zones:", err);
        // Don't show alert on initial load to avoid spam
      }
    };

    fetchDangerZones();
  }, []);

  // Pan/zoom to selected danger zone
  useEffect(() => {
    if (selectedDangerZoneId && mapRef.current) {
      const zone = dangerZones.find(z => z.id === selectedDangerZoneId);
      if (zone && Array.isArray(zone.path) && zone.path.length > 0) {
        const bounds = L.latLngBounds(zone.path);
        mapRef.current.fitBounds(bounds, { maxZoom: 17 });
      }
    }
  }, [selectedDangerZoneId, dangerZones]);

  // Debug log before rendering polylines to confirm correct state
  console.log('selectedRouteIndex:', selectedRouteIndex, 'route.routes:', route && route.routes);

  // Add debug log for mode changes
  useEffect(() => {
    console.log('Mode changed:', mode);
  }, [mode]);

  // Automatically calculate route when both start and end are set
  useEffect(() => {
    if (start && end) {
      handleFindRoute();
    }
  }, [start, end, handleFindRoute]);

  // Start/Stop live tracking
  const startLiveTracking = () => {
    if ('geolocation' in navigator) {
      const id = navigator.geolocation.watchPosition(
        (pos) => setLiveLocation([pos.coords.latitude, pos.coords.longitude]),
        (err) => alert('Location error: ' + err.message),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
      setWatchId(id);
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };
  const stopLiveTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setLiveLocation(null);
      setLiveETA(null);
      setActiveInput('start');
    }
  };

  // Recalculate route and ETA from live location to destination
  useEffect(() => {
    const getLiveRoute = async () => {
      if (liveLocation && end) {
        try {
          const dangerPaths = dangerZones
            .filter(zone => zone && zone.path && Array.isArray(zone.path))
            .map(zone => zone.path);
          const result = await getSafeRoute(liveLocation as [number, number], end as [number, number], dangerPaths);
          if (result && result.routes && result.routes[0] && result.routes[0].summary) {
            setLiveETA({
              duration: result.routes[0].summary.duration,
              distance: result.routes[0].summary.distance,
            });
          }
        } catch (e) {
          setLiveETA(null);
        }
      }
    };
    getLiveRoute();
  }, [liveLocation, end, dangerZones]);

  // Default to 'startend' mode if canManageHazards is false
  useEffect(() => {
    if (!canManageHazards) setMode('startend');
  }, [canManageHazards]);

  // When a new danger zone is drawn (polyline), instead of saving immediately:
  const handleNewDangerZoneDrawn = (polyline: Array<[number, number]>) => {
    setNewDangerZoneDraft(polyline);
    setDangerZoneForm({ description: '', reportedBy: 'Admin User', reportedAt: new Date().toISOString(), type: 'flood' });
  };

  // Prepare the hazard form JSX
  const hazardForm = (
    <>
      <h2 className="text-xl font-bold text-red-600 mb-2 flex items-center gap-2">
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        New Danger Zone
      </h2>
      <form
        onSubmit={e => {
          e.preventDefault();
          addAndSaveDangerZoneWithDetails(newDangerZoneDraft!, dangerZoneForm.description, dangerZoneForm.reportedBy, dangerZoneForm.reportedAt, dangerZoneForm.type);
          setNewDangerZoneDraft(null);
          setDangerZoneForm({ description: '', reportedBy: 'Admin User', reportedAt: new Date().toISOString(), type: 'flood' });
        }}
        className="flex flex-col gap-4"
      >
        <label className="block text-sm font-semibold">Type</label>
        <select
          className="w-full border rounded px-2 py-1"
          value={dangerZoneForm.type}
          onChange={e => setDangerZoneForm({ ...dangerZoneForm, type: e.target.value })}
          required
        >
          {DANGER_TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <label className="block text-sm font-semibold">Reason/Description</label>
        <textarea
          className="w-full border rounded px-2 py-1"
          value={dangerZoneForm.description}
          onChange={e => setDangerZoneForm({ ...dangerZoneForm, description: e.target.value })}
          required
          rows={3}
          placeholder="Describe the hazard (e.g., Flooded, Road Blocked, etc.)"
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs font-semibold">Reported By</label>
            <input className="w-full border rounded px-2 py-1 bg-gray-100" value={dangerZoneForm.reportedBy} readOnly />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold">Date/Time</label>
            <input className="w-full border rounded px-2 py-1 bg-gray-100" value={new Date(dangerZoneForm.reportedAt).toLocaleString()} readOnly />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" className="px-4 py-2 rounded bg-gray-300 text-gray-800 font-semibold hover:bg-gray-400" onClick={() => setNewDangerZoneDraft(null)}>Cancel</button>
          <button type="submit" className="px-4 py-2 rounded bg-red-600 text-white font-semibold hover:bg-red-700">Save Danger Zone</button>
        </div>
      </form>
    </>
  );

  // Add a ref to each danger zone list item for scrolling
  const dangerZoneRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Pulsing dot CSS (add to index.css if not present)
  // .pulsing-dot-blue { width: 18px; height: 18px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 0 rgba(59,130,246, 0.7); animation: pulse-blue 1.5s infinite; border: 2px solid #fff; }
  // .pulsing-dot-green { width: 18px; height: 18px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 0 rgba(34,197,94, 0.7); animation: pulse-green 1.5s infinite; border: 2px solid #fff; }
  // @keyframes pulse-blue { 0% { box-shadow: 0 0 0 0 rgba(59,130,246, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(59,130,246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59,130,246, 0); } }
  // @keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(34,197,94, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(34,197,94, 0); } 100% { box-shadow: 0 0 0 0 rgba(34,197,94, 0); } }
  // Add pulsing dot icons
  const pulsingDotBlue = L.divIcon({ className: 'pulsing-dot-blue' });
  const pulsingDotGreen = L.divIcon({ className: 'pulsing-dot-green' });

  // Helper to calculate cumulative distance along route
  function getCumulativeDistance(coords: [number, number][], idx: number) {
    let dist = 0;
    for (let i = 1; i <= idx; i++) {
      const [lat1, lng1] = coords[i - 1];
      const [lat2, lng2] = coords[i];
      const R = 6371e3; // meters
      const toRad = (d: number) => d * Math.PI / 180;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      dist += R * c;
    }
    return dist;
  }

  const filteredDangerZones = dangerZones.filter(zone => Array.isArray(zone.path) && isInSantaCruzLaguna(zone.path));

  return (
    <ErrorBoundary>
      <div className="flex flex-col md:flex-row" style={{ height: 'calc(100vh - 100px)' }}>
        {/* Left Panel */}
        <div className="w-full md:w-[450px] flex flex-col p-4 bg-white rounded-lg shadow-md z-10 relative overflow-hidden">
          {newDangerZoneDraft && mode === 'danger' ? hazardForm : (
            <div className="px-2 mb-4">
              <div className="relative flex flex-col gap-3 mb-4">
                {/* Start Location */}
                <div className="relative">
                  <input
                    type="text"
                    value={watchId !== null ? 'Your Location (Live)' : startQuery}
                    onChange={e => setStartQuery(e.target.value)}
                    onFocus={() => setActiveInput('start')}
                    placeholder="Choose starting point, or click on the map"
                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-base shadow-sm transition bg-white"
                    disabled={watchId !== null}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </span>
                </div>
                {/* Swap Button */}
                <button
                  onClick={() => {
                    setStart(end);
                    setEnd(start);
                    setStartQuery(endQuery);
                    setEndQuery(startQuery);
                  }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white border-2 border-gray-300 rounded-full p-2 shadow hover:bg-gray-100 transition"
                  aria-label="Swap start and destination"
                  disabled={watchId !== null}
                >
                  <LuArrowRightLeft className="text-gray-500" />
                </button>
                {/* End Location */}
                <div className="relative">
                  <input
                    type="text"
                    value={endQuery}
                    onChange={e => setEndQuery(e.target.value)}
                    onFocus={() => setActiveInput('end')}
                    placeholder="Choose destination..."
                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-base shadow-sm transition"
                    disabled={watchId !== null && !endQuery}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                  </span>
                </div>
              </div>
            
              {/* Professional Reset Route button */}
              <div className="flex flex-col gap-2 mb-4">
                {watchId === null ? (
                  <button
                    onClick={startLiveTracking}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded shadow"
                  >
                    Start Live Navigation
                  </button>
                ) : (
                  <button
                    onClick={stopLiveTracking}
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded shadow"
                  >
                    Stop Live Navigation
                  </button>
                )}
                <button
                  onClick={() => {
                    setStart(null);
                    setEnd(null);
                    setStartQuery('');
                    setEndQuery('');
                    setSelectedRouteIndex(0);
                    dispatch({ type: 'RESET' });
                  }}
                  className="w-full bg-white border-2 border-gray-300 text-gray-700 font-medium py-2 px-4 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <FiRotateCcw className="text-lg" />
                  Reset Route
                </button>
              </div>
              {/* Divider: only for residents */}
              {!canManageHazards && <div className="border-t border-gray-200 mt-4 mb-0" />}
              {/* Tabs for Find Route / Manage Hazards */}
              {canManageHazards ? (
                <div className="mt-2 flex flex-wrap gap-2 justify-start items-center border-t pt-4">
                  <button
                    className={`px-4 py-2 rounded font-semibold transition ${mode === 'startend' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-100'}`}
                    onClick={() => setMode('startend')}
                  >
                    Find Route
                  </button>
                  <button
                    className={`px-4 py-2 rounded font-semibold transition ${mode === 'danger' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-red-100'}`}
                    onClick={() => setMode('danger')}
                  >
                    Manage Hazards
                  </button>
                </div>
              ) : null}
            </div>
          )}

          <div className="flex-grow overflow-y-auto px-2">
            {/* For admins, show the full danger zone list at the top */}
            {canManageHazards && mode === 'danger' && (
              <DangerZoneSection
                dangerZones={dangerZones}
                expandedDangerZoneId={expandedDangerZoneId}
                setExpandedDangerZoneId={setExpandedDangerZoneId}
                canManageHazards={canManageHazards}
                deleteDangerZone={deleteDangerZone}
                setSelectedDangerZoneId={setSelectedDangerZoneId}
              />
                        )}
            {/* Route Options Section */}
            {mode === 'startend' && (
              <div className="flex flex-col gap-4 mt-4">
                {status === 'loading' && (
                  <div className="text-center text-gray-500 py-8 font-semibold">Calculating route...</div>
                )}
                {status === 'error' && (
                  <div className="text-center text-red-500 p-4 bg-red-50 rounded-lg">
                    <p className="font-bold">Error</p>
                    <p className="text-sm">{error}</p>
                  </div>
                )}
                {status === 'success' && state.data && state.data.routes && state.data.routes.length > 0 && (
                  state.data.routes.map((route: any, idx: number) => {
                    const summary = route.summary || {};
                    const segments = route.segments || [];
                    const firstSegment = segments[0] || {};
                    const steps = firstSegment.steps || [];
                    // Find the first named road for 'via'
                    const mainStep = steps.find((s: any) => s.name && s.name !== '-') || steps[0] || {};
                    const roadName = mainStep.name || 'unnamed road';
                    const isSelected = selectedRouteIndex === idx;
                    const isFastest = idx === 0;
                    return (
                      <div
                        key={idx}
                        className={`relative border rounded-lg shadow-sm p-4 cursor-pointer transition-all duration-150 bg-white ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'} group`}
                        onClick={() => setSelectedRouteIndex(idx)}
                        tabIndex={0}
                        aria-label={`Select route ${idx + 1}`}
                      >
                        {/* Badge and Selected indicator */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${isFastest ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{isFastest ? 'Fastest' : 'Alternative'}</span>
                            <span className="text-gray-700 text-sm">via <span className="font-medium">{roadName}</span></span>
                          </div>
                          {isSelected && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded shadow">Selected</span>}
                        </div>
                        {/* Time and Distance */}
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-blue-600 font-bold text-xl">{formatDuration(summary.duration)}</span>
                          <span className="text-gray-500 text-base">{formatDistance(summary.distance)}</span>
                        </div>
                        {/* Only show directions for the selected route */}
                        {isSelected && steps.length > 0 && (
                          <div className="mt-3 border-t pt-3 max-h-56 overflow-y-auto bg-gray-50 rounded">
                            <div className="font-bold mb-2 text-gray-700">Directions</div>
                            <ol className="list-decimal list-inside text-sm text-gray-700">
                              {steps.map((step: any, i: number) => (
                                <li key={i} className="mb-2 pb-2 border-b last:border-b-0 flex items-start">
                                  <span className="font-medium mr-2">{step.instruction}</span>
                                  {step.distance && (
                                    <span className="text-gray-500 ml-auto whitespace-nowrap">({formatDistance(step.distance)})</span>
                                  )}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                {status === 'idle' && (
                  <div className="text-center text-gray-400 py-8">
                    <p className="font-semibold">Find the safest route.</p>
                    <p className="text-sm">Route details and directions will appear here.</p>
                  </div>
                )}
              </div>
            )}
            {/* For residents, show danger zone details at the bottom */}
            {!canManageHazards && (
              <DangerZoneSection
                dangerZones={dangerZones}
                expandedDangerZoneId={expandedDangerZoneId}
                setExpandedDangerZoneId={setExpandedDangerZoneId}
                canManageHazards={canManageHazards}
                setSelectedDangerZoneId={setSelectedDangerZoneId}
              />
            )}
          </div>
        </div>
        
        {/* Right Panel (Map) */}
        <div className="flex-grow h-full w-full rounded-lg shadow-md overflow-hidden">
          <MapContainer
            center={[14.2786, 121.4156]}
            zoom={14}
            style={{ height: "100%", width: "100%" }}
            maxBounds={[[13.9, 120.9], [14.7, 121.7]]}
            maxBoundsViscosity={1.0}
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <StartEndHandler mode={mode} setStart={setStart} setEnd={setEnd} start={start} end={end} activeInput={activeInput} watchId={watchId} setActiveInput={setActiveInput} />
            <DangerSegmentHandler mode={mode} addDangerZone={handleNewDangerZoneDrawn} dangerZones={dangerZones} setSelectedDangerZoneId={setSelectedDangerZoneId} />
            {hazards.map((hazard, idx) => (
              <Marker
                key={idx}
                position={[hazard.lat, hazard.lng]}
                icon={getMarkerIcon(statusColors[hazard.status as StatusType] || 'blue')}
              >
                <Popup>
                  <div>
                    <strong>Type:</strong> {hazard.type}<br />
                    <strong>Status:</strong> <span style={{color: statusColors[hazard.status as StatusType]}}>{statusLabels[hazard.status as StatusType]}</span>
                  </div>
                </Popup>
              </Marker>
            ))}
            {filteredDangerZones.map((zone, idx) => {
              if (!zone || !zone.path || !Array.isArray(zone.path)) {
                console.warn("Invalid danger zone at index:", idx);
                return null;
              }
              const color = DANGER_TYPE_COLORS[zone.type] || '#ef4444'; // Default to red if missing
              return (
                <Polyline
                  key={zone.id}
                  positions={zone.path}
                  color={color}
                  weight={5}
                  eventHandlers={{
                    click: (e) => {
                      e.originalEvent?.stopPropagation?.();
                      if (canManageHazards) {
                        setMode('danger');
                      }
                      setExpandedDangerZoneId(zone.id);
                      setSelectedDangerZoneId(zone.id);
                      setTimeout(() => {
                        const ref = dangerZoneRefs.current[zone.id];
                        if (ref) {
                          ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }, 100);
                      if (mapRef.current && zone.path.length > 0) {
                        const bounds = L.latLngBounds(zone.path);
                        mapRef.current.fitBounds(bounds, { maxZoom: 17, animate: true, duration: 0.7 });
                      }
                    },
                  }}
                />
              );
            }).filter(Boolean)}
            {start && Array.isArray(start) && start.length === 2 && (
              <Marker position={start} icon={pulsingDotBlue}><Popup>Start</Popup></Marker>
            )}
            {end && Array.isArray(end) && end.length === 2 && (
              <Marker position={end} icon={pulsingDotGreen}><Popup>End</Popup></Marker>
            )}
            {route && route.routes && route.routes.map((r: any, index: number) => {
              const isSelected = index === selectedRouteIndex;
              const coords = r.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
              return isSelected ? (
                <>
                  {/* Outline polyline */}
                  <Polyline
                    key={`outline-${index}`}
                    positions={coords}
                    color="#2563eb"
                    weight={14}
                    opacity={0.3}
                    interactive={false}
                    pane="shadowPane"
                  />
                  {/* Main route polyline */}
                  <Polyline
                    key={`main-${index}`}
                    positions={coords}
                    color="#3b82f6"
                    weight={7}
                    opacity={1.0}
                    eventHandlers={{
                      mousemove: (e: any) => {
                        let minDist = Infinity;
                        let closestIdx = 0;
                        coords.forEach((pt: [number, number], i: number) => {
                          const d = Math.pow(pt[0] - e.latlng.lat, 2) + Math.pow(pt[1] - e.latlng.lng, 2);
                          if (d < minDist) {
                            minDist = d;
                            closestIdx = i;
                          }
                        });
                        setHoveredRoutePoint(coords[closestIdx]);
                        setHoveredRouteDistance(getCumulativeDistance(coords, closestIdx));
                      },
                      mouseout: () => {
                        setHoveredRoutePoint(null);
                        setHoveredRouteDistance(null);
                      }
                    }}
                  />
                </>
              ) : (
              <Polyline
                key={`${index}-${selectedRouteIndex}`}
                  positions={coords}
                  color={'gray'}
                  weight={5}
                  opacity={0.6}
              />
              );
            })}
            {liveLocation && (
              <Marker position={liveLocation} icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', iconSize: [32, 32], iconAnchor: [16, 32] })}>
                <Popup>Your current location</Popup>
              </Marker>
            )}
            {liveETA && liveLocation && (
              <div className="mb-2 flex items-center gap-4 text-green-700 font-semibold">
                <span>Live ETA: {formatDuration(liveETA.duration)}</span>
                <span>({formatDistance(liveETA.distance)})</span>
              </div>
            )}
            {hoveredRoutePoint && hoveredRouteDistance !== null && (
              <Marker
                position={hoveredRoutePoint}
                icon={L.divIcon({
                  className: 'route-hover-circle',
                  html: '<div></div>',
                  iconSize: [24, 24],
                  iconAnchor: [12, 12],
                })}
                interactive={false}
              >
                <Popup autoPan={false} closeButton={false} closeOnClick={false} autoClose={false} className="route-hover-popup">
                  Distance: {hoveredRouteDistance >= 1000 ? `${(hoveredRouteDistance/1000).toFixed(1)} km` : `${Math.round(hoveredRouteDistance)} m`}
                </Popup>
              </Marker>
            )}
            <MapController panTo={panTo} />
            {/* Add a legend to the map (bottom left corner) */}
            <div className="absolute left-4 bottom-4 bg-white bg-opacity-90 rounded shadow p-3 z-[1000] text-xs flex flex-col gap-1 border border-gray-200">
              <div className="font-bold mb-1">Legend</div>
              <div className="flex items-center gap-2"><span className="inline-block w-4 h-1 rounded" style={{ background: '#3b82f6' }} /> Route</div>
              {DANGER_TYPE_OPTIONS.map(opt => (
                <div key={opt.value} className="flex items-center gap-2">
                  <span className="inline-block w-4 h-1 rounded" style={{ background: DANGER_TYPE_COLORS[opt.value] }} /> {opt.label}
                </div>
              ))}
            </div>
          </MapContainer>
          {/* Floating panel for danger zone actions */}
          {canManageHazards && selectedDangerZoneId && (
            <div className="fixed bottom-4 left-4 bg-white p-4 rounded shadow-lg z-50 flex gap-2 items-center">
              <button
                type="button"
                className="bg-red-500 text-white px-4 py-2 rounded mr-2"
                onClick={() => {
                  deleteDangerZone(selectedDangerZoneId);
                  setSelectedDangerZoneId(null);
                }}
              >
                Delete Danger Zone
              </button>
              <button
                type="button"
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
                onClick={() => setSelectedDangerZoneId(null)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default RoutesView; 