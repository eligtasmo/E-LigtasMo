import { useState } from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { useAuth } from "../../context/AuthContext";

const containerStyle = { width: "100%", height: "500px" };
const center = { lat: 14.5995, lng: 120.9842 };

export default function AdminBrgyEditor() {
  const [hazards, setHazards] = useState([
    { lat: 14.5995, lng: 120.9842, type: "flood" },
    { lat: 14.6010, lng: 120.9850, type: "accident" },
  ]);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      // For demo, default to 'flood'. In production, show a dialog to select type.
      setHazards([...hazards, { lat, lng, type: "flood" }]);
    }
  };

  const removeHazard = (idx: number) => {
    setHazards(hazards.filter((_, i) => i !== idx));
  };

  const { user } = useAuth();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Edit Hazard Areas</h2>
      <p className="mb-2 text-gray-600">Click on the map to add a hazard. Click a marker to remove it.</p>
      <LoadScript googleMapsApiKey="AIzaSyDiBz4ZI-y1F5kJnSaz70BC92Xd-IRt9Ao">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={14}
          onClick={handleMapClick}
        >
          {hazards.map((hazard, idx) => (
            <Marker
              key={idx}
              position={hazard}
              icon="http://maps.google.com/mapfiles/ms/icons/red-dot.png"
              onClick={() => removeHazard(idx)}
            />
          ))}
        </GoogleMap>
      </LoadScript>
      {user && user.role === "admin" && (
        <div>
          {/* Show admin controls (add/edit/delete) */}
        </div>
      )}
      {user && user.role === "brgy" && (
        <div>
          {/* Show brgy controls (edit only their shelter, or view only) */}
        </div>
      )}
    </div>
  );
} 