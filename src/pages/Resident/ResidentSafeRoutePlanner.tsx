import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { LatLngBounds } from 'leaflet';
import { useState, useEffect, useCallback, useReducer, ReactNode, useRef } from "react";
import * as turf from '@turf/turf';
import { FaCar, FaWalking, FaBicycle, FaSyncAlt } from 'react-icons/fa';
import { GoLocation } from 'react-icons/go';
import { BsCircle, BsGeoAltFill } from 'react-icons/bs';
import { LuArrowRightLeft } from 'react-icons/lu';
import RoutesView from '../../components/saferoutes/RoutesView';

// --- HELPER FUNCTIONS & CONFIGURATION ---

// Custom icons for start, end, and hazard points
const startIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png',
    shadowSize: [41, 41]
});

const endIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png',
    shadowSize: [41, 41]
});


// Types for the ORS API response
type ORSStep = { distance: number; duration: number; instruction: string; name: string; };
type ORSSegment = { distance: number; duration: number; steps: ORSStep[]; };
type ORSSummary = { distance: number; duration: number; };
type ORSDetailedRoute = { summary: ORSSummary; segments: ORSSegment[]; geometry: { coordinates: Array<[number, number]>; }; };
type ORSResponse = { routes: ORSDetailedRoute[]; };

// --- STATE MANAGEMENT ---

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

const initialState: State = { status: 'idle', data: null, error: null, };

function routeReducer(state: State, action: Action): State {
    switch (action.type) {
        case 'FETCH_START': return { ...state, status: 'loading', error: null, data: null };
        case 'FETCH_SUCCESS': return { ...state, status: 'success', data: action.payload };
        case 'FETCH_ERROR': return { ...state, status: 'error', error: action.payload, data: null };
        case 'RESET': return { ...initialState };
        default: throw new Error("Unhandled action type");
    }
}

// --- API & GEOLOCATION FUNCTIONS ---

async function getSafeRoute(start: [number, number], end: [number, number], dangerPolylines: Array<Array<[number, number]>>): Promise<ORSResponse> {
    const apiKey = "5b3ce3597851110001cf6248d40a71b0b51c4c9eb9927348e7276122";
    const url = "https://api.openrouteservice.org/v2/directions/driving-car";
    
    // Validate coordinates
    if (!start || !end || start.length !== 2 || end.length !== 2) {
        throw new Error("Invalid start or end coordinates");
    }

    const bufferedPolygons = dangerPolylines.map(line => {
        if (!line || line.length < 2) return null;
        try {
            const lineString = turf.lineString(line.map(([lat, lng]) => [lng, lat]));
            const buffered = turf.buffer(lineString, 10, { units: 'meters' });
            if (!buffered) return null;
            return buffered.geometry.coordinates;
        } catch (error) {
            console.warn("Error processing danger zone:", error);
            return null;
        }
    }).filter(Boolean);

    const body: any = {
        coordinates: [[start[1], start[0]], [end[1], end[0]]],
        instructions: true,
        alternative_routes: { target_count: 3, share_factor: 0.6, weight_factor: 1.4 },
        radiuses: [500, 500] // Add a 500-meter search radius for start and end points
    };

    if (bufferedPolygons.length > 0) {
        body.options = { avoid_polygons: { type: "MultiPolygon", coordinates: bufferedPolygons } };
    }
    
    try {
        console.log("Sending request to ORS:", JSON.stringify(body, null, 2));
        
        const response = await fetch(url, {
            method: "POST",
            headers: { 
                "Authorization": apiKey, 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error("ORS API Error:", data);
            throw new Error(data.error?.message || `API Error: ${response.status} ${response.statusText}`);
        }
        
        if (!data.routes || !Array.isArray(data.routes) || data.routes.length === 0) {
            throw new Error("No routes could be found between the selected points.");
        }

        if (!data.routes[0].geometry || !data.routes[0].geometry.coordinates || data.routes[0].geometry.coordinates.length === 0) {
            throw new Error("Route is missing path information. Please try different start/end points.");
        }

        return data;
    } catch (error: any) {
        console.error("Route calculation failed:", error);
        throw new Error(`Route calculation failed: ${error.message}`);
    }
}

async function searchLocation(
    query: string,
    bounds?: L.LatLngBounds
): Promise<[number, number] | null> {
    // Using Nominatim with viewbox biasing for better accuracy
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

    // Add viewbox biasing to prioritize results within the current map view
    if (bounds) {
        const west = bounds.getWest();
        const south = bounds.getSouth();
        const east = bounds.getEast();
        const north = bounds.getNorth();
        url += `&viewbox=${west},${north},${east},${south}`;
    }

    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'E-LigtasMo/1.0' } }); // Nominatim requires a user-agent
        const data = await response.json();
        
        if (data && data.length > 0) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
        return null;
    } catch (error) {
        console.error("Nominatim geocoding search failed:", error);
        return null;
    }
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'E-LigtasMo/1.0' } });
        const data = await response.json();
        return data?.display_name || null;
    } catch (error) {
        console.error("Reverse geocoding failed:", error);
        return null;
    }
}

// --- REACT COMPONENTS ---

function MapController({ panTo }: { panTo: [number, number] | null }) {
    const map = useMap();
    useEffect(() => { if (panTo) map.setView(panTo, 15); }, [panTo, map]);
    return null;
}

function MapInstanceController({ setMap }: { setMap: (map: L.Map) => void }) {
    const map = useMap();
    useEffect(() => {
        setMap(map);
    }, [map, setMap]);
    return null;
}

function SearchableInput({ icon, query, setQuery, onSearch, placeholder }: { icon: ReactNode; query: string; setQuery: (q: string) => void; onSearch: (q: string) => void; placeholder: string; }) {
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    
    useEffect(() => {
        if (query.length < 3) { setSuggestions([]); return; }
        const handler = setTimeout(async () => {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
            const response = await fetch(url, { headers: { 'User-Agent': 'E-LigtasMo/1.0' } });
            setSuggestions(await response.json() || []);
        }, 300);
        return () => clearTimeout(handler);
    }, [query]);

    const handleSuggestionClick = (suggestion: any) => {
        setQuery(suggestion.display_name);
        onSearch(suggestion.display_name);
        setIsFocused(false);
    };

    return (
        <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
            <input
                type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="border rounded-md py-2 pl-10 w-full focus:ring-blue-500 focus:border-blue-500"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            />
            {isFocused && suggestions.length > 0 && (
                <ul className="absolute z-[1000] w-full bg-white border rounded mt-1 max-h-60 overflow-y-auto shadow-lg">
                    {suggestions.map((s) => (
                        <li key={s.place_id} className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                            onMouseDown={() => handleSuggestionClick(s)}>
                            {s.display_name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return "< 1 min";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

function formatDistance(meters: number): string {
    return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function RouteDetails({ route, isSelected, onClick, onToggleDetails }: { route: ORSDetailedRoute, isSelected: boolean, onClick: () => void, onToggleDetails: () => void }) {
    if (!route) return null;
    return (
        <div className={`p-3 mb-3 border-2 rounded-lg cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-blue-400'}`} onClick={onClick}>
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-blue-600">{formatDuration(route.summary.duration)}</h3>
                <p className="text-sm text-gray-600">{formatDistance(route.summary.distance)}</p>
            </div>
            {isSelected && (
                 <button onClick={onToggleDetails} className="text-sm text-blue-500 hover:underline mt-2">
                    Show Directions
                </button>
            )}
        </div>
    );
}

function DirectionsPanel({ route, onClose }: { route: ORSDetailedRoute, onClose: () => void }) {
    return (
        <div className="absolute top-0 left-0 w-full h-full bg-white z-20 p-4 flex flex-col">
             <button onClick={onClose} className="text-blue-500 hover:underline mb-4 self-start">{"< Back to Routes"}</button>
            <h2 className="text-xl font-bold mb-4">Directions</h2>
            <div className="overflow-y-auto flex-grow">
                 <ul className="list-decimal list-inside space-y-2">
                    {route.segments[0].steps.map((step, index) => (
                      <li key={index} className="p-2 border-b text-sm"
                          dangerouslySetInnerHTML={{ __html: `${step.instruction} <span class="text-gray-500">(${formatDistance(step.distance)})</span>`}}
                      />
                    ))}
                </ul>
            </div>
        </div>
    )
}

// --- SAFETY CHECK ---
function getRouteSafety(route: any, dangerZones: Array<{ id: number, path: Array<[number, number]> }>) {
  if (!route || !route.geometry || !route.geometry.coordinates) return 'unknown';
  const routeLine = turf.lineString(route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lng, lat]));
  let intersects = 0;
  for (const zone of dangerZones) {
    if (!zone.path || zone.path.length < 2) continue;
    const zoneLine = turf.lineString(zone.path.map(([lat, lng]) => [lng, lat]));
    const buffered = turf.buffer(zoneLine, 0.0001, { units: 'degrees' }); // ~10m buffer
    if (!buffered) continue;
    if (turf.booleanIntersects(routeLine, buffered)) intersects++;
  }
  if (intersects === 0) return 'safe';
  if (intersects === 1) return 'partially_unsafe';
  if (intersects > 1) return 'unsafe';
  return 'unknown';
}

function getSafetyColor(safety: string) {
  if (safety === 'safe') return '#2563eb'; // blue
  if (safety === 'partially_unsafe') return '#f59e42'; // orange
  if (safety === 'unsafe') return '#ef4444'; // red
  return 'gray';
}

function getSafetyLabel(safety: string) {
  if (safety === 'safe') return 'Safest';
  if (safety === 'partially_unsafe') return 'Caution';
  if (safety === 'unsafe') return 'Danger';
  return 'Unknown';
}

// --- MAIN COMPONENT ---

export default function ResidentSafeRoutePlanner() {
    return <RoutesView canManageHazards={false} />;
}