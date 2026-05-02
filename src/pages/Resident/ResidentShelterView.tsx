import { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle, Polygon } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FaCheckCircle, FaTimesCircle, FaPhone, FaExclamationTriangle, FaShieldAlt, FaRoute, FaDirections, FaUser, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

// Define Shelter type based on your db.json structure
type Shelter = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  occupancy: number;
  status: "available" | "full";
  contact_person: string;
  contact_number: string;
  address: string;
};

// Define Hazard Zone types
type HazardZone = {
  id: string;
  type: 'flood' | 'landslide' | 'fire' | 'earthquake' | 'storm' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  center: [number, number];
  radius: number; // in meters
  description: string;
  active: boolean;
};

type DangerZone = {
  id: string;
  type: 'flood' | 'landslide' | 'road_damage' | 'construction' | 'other';
  coordinates: [number, number][];
  description: string;
  reportedBy: string;
  reportedAt: string;
  active: boolean;
  dangerLevel: string;
  color: string;
  name: string;
};

// Hazard zone colors and styles
const HAZARD_COLORS = {
  flood: '#3b82f6',
  landslide: '#f59e0b',
  fire: '#ef4444',
  earthquake: '#8b5cf6',
  storm: '#6b7280',
  other: '#10b981'
};

// Create shelter icon
const createShelterIcon = (isFull: boolean, isSelected: boolean) => {
  const color = isFull ? '#ef4444' : '#10b981';
  const size = isSelected ? 35 : 30;
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L22 20H2L12 2Z" stroke="${color}" stroke-width="2" fill="${color}" fill-opacity="0.8"/>
        <path d="M12 8V12" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="16" r="1" fill="white"/>
      </svg>
    `)}`,
    iconSize: [size, size],
    iconAnchor: [size/2, size],
    popupAnchor: [0, -size]
  });
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// A simple component to get user's location
function LocateUser({ onLocationFound }: { onLocationFound: (latlng: L.LatLng) => void }) {
  const map = useMapEvents({
    locationfound(e) {
      onLocationFound(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
    map.locate();
  }, [map]);

  return null;
}

export default function ResidentShelterView() {
  const navigate = useNavigate();
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [userLocation, setUserLocation] = useState<L.LatLng | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [selectedShelterId, setSelectedShelterId] = useState<number | null>(null);
  const [showHazards, setShowHazards] = useState(false);
  const [showDangerZones, setShowDangerZones] = useState(false);
  const [query, setQuery] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "full">("all");
  const [sortBy, setSortBy] = useState<"distance" | "name">("distance");

  // Mock data for hazard zones
  const hazardZones: HazardZone[] = [
    {
      id: 'hz1',
      type: 'flood',
      severity: 'high',
      center: [14.2691, 121.4113],
      radius: 2000,
      description: 'Flood-prone area during heavy rainfall',
      active: true
    },
    {
      id: 'hz2',
      type: 'landslide',
      severity: 'critical',
      center: [14.2891, 121.4313],
      radius: 1500,
      description: 'High risk of landslides during monsoon season',
      active: true
    }
  ];

  // Mock data for danger zones
  const dangerZones: DangerZone[] = [
    {
      id: 'dz1',
      type: 'flood',
      coordinates: [
        [14.2591, 121.4013],
        [14.2691, 121.4113],
        [14.2791, 121.4213],
        [14.2691, 121.4313],
        [14.2591, 121.4213]
      ],
      description: 'Flood zone - avoid during heavy rains',
      reportedBy: 'Emergency Services',
      reportedAt: '2024-01-15',
      active: true,
      dangerLevel: 'High',
      color: '#dc2626',
      name: 'Flood Zone Alpha'
    }
  ];

  useEffect(() => {
    // Fetch shelters from API
    fetch("/api/shelters-list.php")
      .then((response) => response.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.shelters || []);
        setShelters(Array.isArray(list) ? list : []);
      })
      .catch((error) => console.error("Error fetching shelters:", error));
  }, []);

  useEffect(() => {
  }, [selectedShelterId, shelters]);

  const visibleShelters = useMemo(() => {
    let arr = shelters;
    const q = query.trim().toLowerCase();
    if (q) {
      arr = arr.filter(s => s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q));
    }
    if (availabilityFilter !== "all") {
      arr = arr.filter(s => (s.occupancy >= s.capacity) ? availabilityFilter === "full" : availabilityFilter === "available");
    }
    if (sortBy === "distance" && userLocation) {
      const lat = userLocation.lat;
      const lng = userLocation.lng;
      arr = [...arr].sort((a, b) => haversineKm(lat, lng, a.lat, a.lng) - haversineKm(lat, lng, b.lat, b.lng));
    } else {
      arr = [...arr].sort((a, b) => a.name.localeCompare(b.name));
    }
    return arr;
  }, [shelters, query, availabilityFilter, sortBy, userLocation]);

  

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="flex h-full">
        <div className="w-80 h-full bg-white shadow-lg border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-blue-600">
            <div className="flex items-center space-x-2 text-white mb-2">
              <FaShieldAlt className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Emergency Shelters</h2>
            </div>
            <p className="text-blue-100 text-sm">Find nearby emergency shelters</p>
          </div>

          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="space-y-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or address"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setAvailabilityFilter("all")}
                    className={`px-2 py-1 rounded text-xs border ${availabilityFilter === "all" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300"}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setAvailabilityFilter("available")}
                    className={`px-2 py-1 rounded text-xs border ${availabilityFilter === "available" ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-700 border-gray-300"}`}
                  >
                    Available
                  </button>
                  <button
                    onClick={() => setAvailabilityFilter("full")}
                    className={`px-2 py-1 rounded text-xs border ${availabilityFilter === "full" ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-700 border-gray-300"}`}
                  >
                    Full
                  </button>
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'distance' | 'name')}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="distance" disabled={!userLocation}>Sort by distance</option>
                  <option value="name">Sort by name</option>
                </select>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox"
                         checked={showHazards}
                         onChange={(e) => setShowHazards(e.target.checked)}
                         className="rounded border-gray-300" />
                  Show hazard zones
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox"
                         checked={showDangerZones}
                         onChange={(e) => setShowDangerZones(e.target.checked)}
                         className="rounded border-gray-300" />
                  Show danger areas
                </label>
              </div>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Shelters ({visibleShelters.length})</h3>
            <div className="space-y-3">
              {visibleShelters.map((shelter) => {
                const isFull = shelter.occupancy >= shelter.capacity;
                const isSelected = selectedShelterId === shelter.id;
                const dist = userLocation ? haversineKm(userLocation.lat, userLocation.lng, shelter.lat, shelter.lng) : null;
                return (
                  <div
                    key={shelter.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${isSelected ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:shadow-sm"}`}
                    onClick={() => {
                      setSelectedShelterId(isSelected ? null : shelter.id);
                      if (mapRef.current && !isSelected) {
                        mapRef.current.flyTo([shelter.lat, shelter.lng], 16, { animate: true, duration: 1.5 });
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-gray-900 text-sm truncate">{shelter.name}</div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isFull ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        {isFull ? "Full" : "Available"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 truncate">{shelter.address}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                      <span>Capacity {shelter.occupancy}/{shelter.capacity}</span>
                      {dist !== null && <span className="text-gray-500">{dist.toFixed(1)} km</span>}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedShelterId(shelter.id);
                          if (mapRef.current) {
                            mapRef.current.flyTo([shelter.lat, shelter.lng], 16, { animate: true, duration: 1.5 });
                          }
                        }}
                        className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700"
                      >
                        View
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/route-planner?end=${shelter.lat},${shelter.lng}`);
                        }}
                        className="px-2 py-1 text-xs rounded bg-blue-600 text-white"
                      >
                        Follow Safe Routes
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          
        </div>

        {/* Center - Map Container */}
        <div className="flex-1 relative h-full">
          <div className="relative h-full bg-white rounded-l-xl shadow-lg overflow-hidden">
            <MapContainer ref={mapRef} center={[14.28, 121.42]} zoom={9} style={{ height: "100%", width: "100%" }} className="rounded-l-xl">
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; OpenStreetMap contributors &copy; CARTO'
              />
              <LocateUser onLocationFound={setUserLocation} />
              
              {userLocation && (
                <Marker position={userLocation} icon={new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png', shadowSize: [41, 41] })}>
                  <Popup>You are here.</Popup>
                </Marker>
              )}

              {/* Hazard zones */}
              {showHazards && hazardZones.map((hazard) => (
                <Circle
                  key={hazard.id}
                  center={hazard.center}
                  radius={hazard.radius}
                  pathOptions={{
                    color: HAZARD_COLORS[hazard.type] || '#666',
                    fillColor: HAZARD_COLORS[hazard.type] || '#666',
                    fillOpacity: 0.2,
                    weight: 2,
                    dashArray: hazard.severity === 'critical' ? '10, 5' : undefined
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h4 className="font-bold text-lg capitalize">
                        {hazard.type} Hazard Zone
                      </h4>
                      <p className="text-sm mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          hazard.severity === 'low' ? 'bg-green-100 text-green-800' :
                          hazard.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          hazard.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {hazard.severity.toUpperCase()}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">{hazard.description}</p>
                    </div>
                  </Popup>
                </Circle>
              ))}

              {/* Danger zones */}
              {showDangerZones && dangerZones.map((zone) => (
                <Polygon
                  key={zone.id}
                  positions={zone.coordinates}
                  pathOptions={{
                    color: zone.color,
                    fillColor: zone.color,
                    fillOpacity: 0.4,
                    weight: 3,
                  }}
                >
                  <Popup>
                    <div className="text-center">
                      <h3 className="font-semibold text-gray-800">{zone.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{zone.description}</p>
                      <div className="mt-2 text-xs text-gray-500">
                        Danger Level: <span className="font-medium text-red-600">{zone.dangerLevel}</span>
                      </div>
                    </div>
                  </Popup>
                </Polygon>
              ))}

              {/* Shelter markers */}
              {shelters.map((shelter) => {
                if (!shelter || !Number.isFinite(Number(shelter.lat)) || !Number.isFinite(Number(shelter.lng)) || (Math.abs(Number(shelter.lat)) < 0.1 && Math.abs(Number(shelter.lng)) < 0.1)) return null;
                const isFull = shelter.occupancy >= shelter.capacity;
                const isSelected = selectedShelterId === shelter.id;
                return (
                  <Marker
                    key={shelter.id}
                    position={[shelter.lat, shelter.lng]}
                    icon={createShelterIcon(isFull, isSelected)}
                    eventHandlers={{
                      click: () => {
                        setSelectedShelterId(shelter.id);
                        if (mapRef.current) {
                          mapRef.current.flyTo([shelter.lat, shelter.lng], 16, { animate: true, duration: 1.5 });
                        }
                      },
                    }}
                  >
                    <Popup>
                      <div className="text-center max-w-xs">
                        <h3 className="font-semibold text-gray-800 mb-1">{shelter.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{shelter.address}</p>
                        <div className="flex items-center justify-center mb-2">
                          <span className={`flex items-center px-2 py-1 bg-${isFull ? 'red' : 'green'}-100 text-${isFull ? 'red' : 'green'}-700 text-xs font-medium rounded-full`}>
                            {isFull ? (
                              <FaTimesCircle className="w-3 h-3 mr-1" />
                            ) : (
                              <FaCheckCircle className="w-3 h-3 mr-1" />
                            )}
                            {isFull ? 'Full' : 'Available'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Capacity: {shelter.occupancy}/{shelter.capacity}
                        </div>
                        <div className="mt-3 flex gap-2 justify-center">
                          <button
                            onClick={() => {
                              navigate(`/route-planner?end=${shelter.lat},${shelter.lng}`);
                            }}
                            className="bg-[#10B981] hover:bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded"
                          >
                            Follow Safe Routes
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
            <div className="absolute md:top-4 md:right-4 top-auto bottom-4 right-4 z-20 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow p-3 text-xs text-gray-700">
              <div className="font-semibold text-gray-800 mb-2">Map Legend</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block align-middle">
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path d="M12 2L22 20H2L12 2Z" fill="#10b981" opacity="0.8" />
                      <path d="M12 8V12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="12" cy="16" r="1" fill="white"/>
                    </svg>
                  </span>
                  <span>Shelter Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block align-middle">
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path d="M12 2L22 20H2L12 2Z" fill="#ef4444" opacity="0.8" />
                      <path d="M12 8V12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="12" cy="16" r="1" fill="white"/>
                    </svg>
                  </span>
                  <span>Shelter Full</span>
                </div>
                <div className="flex items-center gap-2">
                  <img
                    alt="You are here"
                    className="inline-block"
                    width="12"
                    height="20"
                    src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png"
                  />
                  <span>You Are Here</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: HAZARD_COLORS.flood }} />
                  <span>Flood Zone</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: HAZARD_COLORS.landslide }} />
                  <span>Landslide Zone</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: HAZARD_COLORS.fire }} />
                  <span>Fire Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: HAZARD_COLORS.earthquake }} />
                  <span>Active Flood</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-4 h-[3px] rounded" style={{ backgroundColor: '#dc2626' }} />
                  <span>Danger Zone</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-4 h-[3px] rounded" style={{ backgroundColor: '#FBBF24' }} />
                  <span>Moderate Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-4 h-[3px] rounded" style={{ backgroundColor: '#3B82F6' }} />
                  <span>Low Risk</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Available Shelters List or Selected Shelter Details */}
        <div className="w-80 h-full bg-white shadow-lg border-l border-gray-200 flex flex-col">
          {selectedShelterId ? (
            // Selected Shelter Details View
            (() => {
              const selectedShelter = shelters.find(s => s.id === selectedShelterId);
              if (!selectedShelter) return null;
              
              const isFull = selectedShelter.occupancy >= selectedShelter.capacity;
              const percent = Math.min(100, Math.round((selectedShelter.occupancy / selectedShelter.capacity) * 100));
              const headerColor = isFull ? 'bg-red-600' : 'bg-green-600';
              
              return (
                <>
                  <div className={`p-4 border-b border-gray-200 ${headerColor}`}>
                    <div className="flex items-center justify-between text-white mb-2">
                      <h2 className="text-lg font-semibold">{selectedShelter.name}</h2>
                      <button
                        onClick={() => setSelectedShelterId(null)}
                        className="text-white hover:text-gray-200 transition-colors"
                      >
                        <FaTimes className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-green-100 text-sm">{selectedShelter.address}</p>
                    <div className="mt-3 flex items-center justify-center">
                      <span className={`flex items-center px-3 py-2 rounded-full text-sm font-medium bg-white ${isFull ? 'text-red-700' : 'text-green-700'}`}>
                        {isFull ? (
                          <FaTimesCircle className="w-4 h-4 mr-2" />
                        ) : (
                          <FaCheckCircle className="w-4 h-4 mr-2" />
                        )}
                        {isFull ? 'Full' : 'Available'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4 border-b border-gray-200">
                  </div>
                  
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Capacity Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Current Occupancy:</span>
                        <span className="font-medium">{selectedShelter.occupancy}/{selectedShelter.capacity}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${isFull ? 'bg-red-400' : 'bg-green-500'}`} style={{ width: `${percent}%` }}></div>
                      </div>
                      <div className="text-xs text-gray-500 text-center">{percent}% occupied</div>
                    </div>
                  </div>
                  
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Contact Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <FaUser className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Contact Person:</span>
                      </div>
                      <p className="text-sm font-medium ml-6">{selectedShelter.contact_person}</p>
                      
                      <div className="flex items-center text-sm mt-3">
                        <FaPhone className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Phone Number:</span>
                      </div>
                      <a
                        href={`tel:${selectedShelter.contact_number}`}
                        className="text-sm font-medium ml-6 text-blue-600"
                      >
                        {selectedShelter.contact_number}
                      </a>
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    <button
                      onClick={() => {
                        navigate(`/route-planner?end=${selectedShelter.lat},${selectedShelter.lng}`);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <FaDirections className="w-5 h-5" />
                      <span>Follow Safe Routes</span>
                    </button>
                    
                    <button
                      onClick={() => navigate(`/route-planner?end=${selectedShelter.lat},${selectedShelter.lng}`)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <FaRoute className="w-5 h-5" />
                      <span>Go There (Safe Route)</span>
                    </button>
                  </div>
                  
                  <div className="p-4 bg-red-50 border-t border-red-200">
                    <div className="flex items-start space-x-2">
                      <FaExclamationTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-700">
                        Location access required for directions
                      </p>
                    </div>
                  </div>
                </>
              );
            })()
          ) : (
            <>
              <div className="flex-1 flex items-center justify-center p-6">
                <p className="text-sm text-gray-500">Info will show here</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
