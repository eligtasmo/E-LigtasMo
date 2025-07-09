import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useAuth } from "../../context/AuthContext";
import { FaCheckCircle, FaTimesCircle, FaPhone, FaLocationArrow } from 'react-icons/fa';

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

// Define the new blue house icon for the resident view
const blueHouseIcon = new L.Icon({
    iconUrl: 'https://img.icons8.com/ios-filled/50/4a90e2/cottage.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png',
    shadowSize: [41, 41]
});

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
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [userLocation, setUserLocation] = useState<L.LatLng | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedShelterId, setSelectedShelterId] = useState<number | null>(null);

  useEffect(() => {
    const fetchShelters = async () => {
      try {
        // Changed endpoint to use XAMPP PHP backend
        const response = await fetch('/api/shelters-list.php');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setShelters(data);
      } catch (error) {
        console.error("Failed to fetch shelters:", error);
      }
    };
    fetchShelters();
  }, []);

  const handleShelterSelect = (shelter: Shelter) => {
    setSelectedShelter(shelter);
    if (mapRef.current) {
      mapRef.current.flyTo([shelter.lat, shelter.lng], 15);
    }
  };

  return (
    <div className="flex gap-4" style={{ height: "calc(100vh - 100px)" }}>
      {/* Sidebar */}
      <div className="w-1/3 flex flex-col p-4 bg-white dark:bg-boxdark rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Find Shelters</h2>
        
        {selectedShelter ? (
          <div className="relative flex-grow overflow-y-auto">
            {/* Close (X) icon at top right */}
            <button
              onClick={() => setSelectedShelter(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label="Close details"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 w-full max-w-md mx-auto">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{selectedShelter.name}</h3>
                  <p className="text-sm text-gray-500 mb-2">{selectedShelter.address}</p>
                </div>
                <span className={`flex items-center px-2 py-0.5 bg-${selectedShelter.status === 'full' ? 'red' : 'green'}-100 text-${selectedShelter.status === 'full' ? 'red' : 'green'}-700 text-xs font-medium rounded-full`}>
                  {selectedShelter.status === 'full' ? (
                    <FaTimesCircle className="w-4 h-4 mr-1 text-red-500" />
                  ) : (
                    <FaCheckCircle className="w-4 h-4 mr-1 text-green-500" />
                  )}
                  {selectedShelter.status.charAt(0).toUpperCase() + selectedShelter.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <FaPhone className="w-4 h-4 mr-1 text-gray-400" />
                <span className="mr-2 font-semibold">{selectedShelter.contact_person}</span>
                <a href={`tel:${selectedShelter.contact_number}`} className="text-blue-600 hover:underline">({selectedShelter.contact_number})</a>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">Capacity:</span>
                  <span className="font-semibold text-gray-900">{selectedShelter.occupancy}/{selectedShelter.capacity}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full ${selectedShelter.status === 'full' ? 'bg-red-400' : 'bg-green-500'}`} style={{ width: `${Math.min(100, Math.round((selectedShelter.occupancy / selectedShelter.capacity) * 100))}%` }}></div>
                </div>
                <div className="text-xs text-gray-500 text-right mt-1">{Math.min(100, Math.round((selectedShelter.occupancy / selectedShelter.capacity) * 100))}%</div>
              </div>
              <button
                className="mt-5 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg shadow transition"
                onClick={() => alert("Route planning functionality coming soon!")}
                disabled={!userLocation}
              >
                <FaLocationArrow className="w-5 h-5" />
                Take Me There
              </button>
              {!userLocation && <p className="text-xs text-center text-red-500 mt-2">Cannot get directions without your location.</p>}
            </div>
          </div>
        ) : (
             <div className="border-t pt-4 flex-grow overflow-y-auto">
              <p className="mb-4 text-gray-600 dark:text-gray-400">
                Showing all available shelters. Click one from the list or the map to see more details.
              </p>
              {shelters.length === 0 && <div className="text-gray-500">No shelters available.</div>}
              {showSidebar && (
                <div className="flex flex-col gap-4 mt-4">
                  {shelters.map((shelter, idx) => {
                    const isFull = shelter.occupancy >= shelter.capacity;
                    const percent = Math.min(100, Math.round((shelter.occupancy / shelter.capacity) * 100));
                    const isSelected = selectedShelterId === shelter.id;
                    return (
                      <div
                        key={shelter.id}
                        className={`bg-white rounded-xl shadow-md border p-5 w-full max-w-md mx-auto transition cursor-pointer ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'}`}
                        onClick={() => {
                          setSelectedShelterId(shelter.id);
                          if (mapRef.current) {
                            mapRef.current.flyTo([shelter.lat, shelter.lng], 16, { animate: true, duration: 1.5 });
                          }
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{shelter.name}</h3>
                            <p className="text-sm text-gray-500 mb-2">{shelter.address}</p>
                          </div>
                          <span className={`flex items-center px-2 py-0.5 bg-${isFull ? 'red' : 'green'}-100 text-${isFull ? 'red' : 'green'}-700 text-xs font-medium rounded-full`}>
                            {isFull ? (
                              <FaTimesCircle className="w-4 h-4 mr-1 text-red-500" />
                            ) : (
                              <FaCheckCircle className="w-4 h-4 mr-1 text-green-500" />
                            )}
                            {isFull ? 'Full' : 'Available'}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <FaPhone className="w-4 h-4 mr-1 text-gray-400" />
                          <span className="mr-2 font-semibold">{shelter.contact_person}</span>
                          <a
                            href={`tel:${shelter.contact_number}`}
                            className="text-blue-600 hover:underline"
                            onClick={e => e.stopPropagation()}
                          >
                            ({shelter.contact_number})
                          </a>
                        </div>
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-700">Capacity:</span>
                            <span className="font-semibold text-gray-900">{shelter.occupancy}/{shelter.capacity}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className={`h-2.5 rounded-full ${isFull ? 'bg-red-400' : 'bg-green-500'}`} style={{ width: `${percent}%` }}></div>
                          </div>
                          <div className="text-xs text-gray-500 text-right mt-1">{percent}%</div>
                        </div>
                        <button
                          className={`mt-5 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg shadow transition ${isFull ? 'bg-gray-400 cursor-not-allowed hover:bg-gray-400' : ''}`}
                          disabled={isFull}
                          title={isFull ? 'Shelter is full, please choose another.' : 'Navigate to this shelter'}
                          onClick={e => {
                            e.stopPropagation();
                            if (!isFull) {
                              // Replace this with your navigation logic, e.g. setDestination(shelter)
                              console.log('Navigate to shelter:', shelter);
                            }
                          }}
                        >
                          <FaLocationArrow className="w-5 h-5" />
                          Take Me There
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
        )}
      </div>

      {/* Map */}
      <div className="w-2/3 h-full rounded-lg shadow-md overflow-hidden">
        <MapContainer ref={mapRef} center={[14.28, 121.42]} zoom={9} style={{ height: "100%", width: "100%" }}>
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

          {shelters.map((shelter) => (
            <Marker 
                key={shelter.id} 
                position={[shelter.lat, shelter.lng]} 
                icon={blueHouseIcon}
                eventHandlers={{
                    click: () => {
                        handleShelterSelect(shelter);
                    },
                }}
            >
              <Popup>
                <strong>{shelter.name}</strong><br />
                Click to see details
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
} 