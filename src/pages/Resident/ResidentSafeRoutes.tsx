import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Route = {
  id: number;
  name: string;
  coordinates: [number, number][];
};

export default function ResidentSafeRoutes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  useEffect(() => {
    fetch("/api/list-safe-routes.php")
      .then((res) => res.json())
      .then((data) => setRoutes(data.routes || []));
  }, []);

  const center =
    selectedRoute?.coordinates[0] ||
    routes[0]?.coordinates[0] ||
    [14.5995, 120.9842]; // fallback: Manila

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Safe Routes</h1>
      <p className="mb-6 text-gray-600">
        View safe routes provided and approved by your barangay. Tap a route to highlight it on the map.
      </p>
      <div className="mb-4 flex flex-col gap-2">
        {routes.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No safe routes available at the moment.
          </div>
        )}
        {routes.map((route) => (
          <button
            key={route.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition
              ${selectedRoute?.id === route.id
                ? "bg-blue-100 border-blue-500 text-blue-800 font-semibold"
                : "bg-white border-gray-200 hover:bg-blue-50"}
            `}
            onClick={() => setSelectedRoute(route)}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
            <span>{route.name}</span>
          </button>
        ))}
      </div>
      <div className="h-80 rounded-lg overflow-hidden shadow border border-gray-200">
        <MapContainer
          center={center}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {routes.map((route) => (
            <Polyline
              key={route.id}
              positions={route.coordinates}
              color={selectedRoute?.id === route.id ? "#2563eb" : "#94a3b8"}
              weight={selectedRoute?.id === route.id ? 6 : 3}
            />
          ))}
          {selectedRoute &&
            selectedRoute.coordinates.length > 0 && (
              <Marker position={selectedRoute.coordinates[0]}>
                <Popup>
                  <span className="font-bold">{selectedRoute.name}</span>
                  <br />
                  Start of route
                </Popup>
              </Marker>
            )}
        </MapContainer>
      </div>
    </div>
  );
} 