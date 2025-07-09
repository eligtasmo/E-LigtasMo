import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom shelter icon
const shelterIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiA3VjIwSDIyVjdMMTIgMloiIHN0cm9rZT0iIzA2NkZGRiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSIjMDY2RkZGIiBmaWxsLW9wYWNpdHk9IjAuMiIvPgo8cGF0aCBkPSJNMTIgMTJIMjJWMjBIMTJWMjBaIiBzdHJva2U9IiMwNjZGRkYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0iIzA2NkZGRiIgZmlsbC1vcGFjaXR5PSIwLjIiLz4KPHBhdGggZD0iTTIgMTJIMTJWMjBIMlYxMloiIHN0cm9rZT0iIzA2NkZGRiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSIjMDY2RkZGIiBmaWxsLW9wYWNpdHk9IjAuMiIvPgo8L3N2Zz4K",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function MapController({ panTo }: { panTo: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { if (panTo) map.setView(panTo, 15); }, [panTo, map]);
  return null;
}

interface Shelter {
  id: number;
  name: string;
  address: string;
  capacity: number;
  occupancy: number;
  lat: number;
  lng: number;
  type: string;
  contact: string;
  status: string;
}

export default function ShelterMapView() {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [loading, setLoading] = useState(true);
  const [panTo, setPanTo] = useState<[number, number] | null>(null);

  useEffect(() => {
    const fetchShelters = async () => {
      try {
        const response = await fetch('http://localhost:3001/shelters');
        const data = await response.json();
        setShelters(data);
      } catch (error) {
        console.error("Failed to fetch shelters:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchShelters();
  }, []);

  const getAvailabilityColor = (occupancy: number, capacity: number) => {
    const percentage = (occupancy / capacity) * 100;
    if (percentage >= 90) return "text-red-500";
    if (percentage >= 70) return "text-yellow-500";
    return "text-green-500";
  };

  const getAvailabilityText = (occupancy: number, capacity: number) => {
    const percentage = (occupancy / capacity) * 100;
    if (percentage >= 90) return "Critical";
    if (percentage >= 70) return "Limited";
    return "Available";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row" style={{ height: 'calc(100vh - 100px)' }}>
      {/* Left Panel - Shelter List */}
      <div className="w-full md:w-[450px] flex flex-col p-4 bg-white rounded-lg shadow-md z-10 relative overflow-hidden">
        <div className="p-2 border-b border-gray-200 mb-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Emergency Shelters</h1>
          <p className="text-gray-600 text-sm">
            {shelters.length} shelter{shelters.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4">
          {shelters.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-gray-500">No shelters available</p>
              <p className="text-gray-400 text-sm">Shelters will appear here once added</p>
            </div>
          ) : (
            shelters.map((shelter) => (
              <div
                key={shelter.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedShelter?.id === shelter.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => {
                  setSelectedShelter(shelter);
                  setPanTo([shelter.lat, shelter.lng]);
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-800 text-lg">{shelter.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    getAvailabilityColor(shelter.occupancy, shelter.capacity).replace('text-', 'bg-').replace('-500', '-100') + ' ' +
                    getAvailabilityColor(shelter.occupancy, shelter.capacity)
                  }`}>
                    {getAvailabilityText(shelter.occupancy, shelter.capacity)}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-2">{shelter.address}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Type: {shelter.type}</span>
                  <span className="text-gray-500">
                    {shelter.occupancy}/{shelter.capacity} occupied
                  </span>
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Capacity</span>
                    <span>{Math.round((shelter.occupancy / shelter.capacity) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        getAvailabilityColor(shelter.occupancy, shelter.capacity).replace('text-', 'bg-')
                      }`}
                      style={{ width: `${Math.min((shelter.occupancy / shelter.capacity) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {/* Selected Shelter Details */}
        {selectedShelter && (
          <div className="border-t border-gray-200 p-4 bg-gray-50 mt-4">
            <h3 className="font-semibold text-gray-800 mb-3">Shelter Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-600">Name:</span>
                <span className="ml-2 text-gray-800">{selectedShelter.name}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Address:</span>
                <span className="ml-2 text-gray-800">{selectedShelter.address}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Type:</span>
                <span className="ml-2 text-gray-800">{selectedShelter.type}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Contact:</span>
                <span className="ml-2 text-gray-800">{selectedShelter.contact}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Status:</span>
                <span className="ml-2 text-gray-800">{selectedShelter.status}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Coordinates:</span>
                <span className="ml-2 text-gray-800">
                  {selectedShelter.lat.toFixed(6)}, {selectedShelter.lng.toFixed(6)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Right Panel - Map */}
      <div className="flex-grow h-full w-full">
        <MapContainer
          center={panTo || [14.6091, 121.0223]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          />
          <MapController panTo={panTo} />
          {shelters.map((shelter) => (
            <Marker
              key={shelter.id}
              position={[shelter.lat, shelter.lng]}
              icon={shelterIcon}
              eventHandlers={{
                click: () => {
                  setSelectedShelter(shelter);
                  setPanTo([shelter.lat, shelter.lng]);
                },
              }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-gray-800">{shelter.name}</h3>
                  <p className="text-sm text-gray-600">{shelter.address}</p>
                  <p className="text-sm text-gray-600">
                    Capacity: {shelter.occupancy}/{shelter.capacity}
                  </p>
                  <p className={`text-sm font-medium ${getAvailabilityColor(shelter.occupancy, shelter.capacity)}`}>
                    {getAvailabilityText(shelter.occupancy, shelter.capacity)}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
} 