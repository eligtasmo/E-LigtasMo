import PageMeta from "../../components/common/PageMeta";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Bar } from "react-chartjs-2";
import "leaflet/dist/leaflet.css";
import { AlertIcon, BoxCubeIcon, ListIcon, CloudIcon } from "../../icons";
import { useNavigate } from "react-router-dom";
import { FaBullhorn, FaInfoCircle, FaBox, FaList, FaCloudSun } from 'react-icons/fa';

// Mock fetch functions (replace with real API calls)
const fetchMetrics = async () => ({
  activeIncidents: 3 + Math.floor(Math.random() * 3),
  sheltersAvailable: 5 + Math.floor(Math.random() * 2),
  sheltersTotal: 7,
  hazardZones: 4 + Math.floor(Math.random() * 2),
});
const fetchRecentIncidents = async () => ([
  { id: 1, type: "Flood", location: "Main St, Manila", time: "2 min ago", lat: 14.58, lng: 120.98 },
  { id: 2, type: "Accident", location: "Highway 1, QC", time: "15 min ago", lat: 14.65, lng: 121.05 },
  { id: 3, type: "Fire", location: "Market Area, Makati", time: "1 hour ago", lat: 14.55, lng: 121.02 },
]);
const fetchWeather = async () => ({
  temp: 30 + Math.floor(Math.random() * 3),
  desc: "Thunderstorms",
  humidity: 80 + Math.floor(Math.random() * 5),
  wind: 4 + Math.floor(Math.random() * 2),
});
const fetchAlerts = async () => ([
  { id: 1, title: "Flood Warning: Heavy rainfall expected in your area.", updated: "2 min ago" },
]);
const fetchIncidentChartData = async () => ({
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  datasets: [{
    label: "Incidents",
    data: Array.from({ length: 7 }, () => 1 + Math.floor(Math.random() * 5)),
    backgroundColor: "#3b82f6",
    borderRadius: 6,
    hoverBackgroundColor: "#2563eb",
  }],
});

// Custom house icons for shelters (same as admin)
const greenHouseIcon = new L.Icon({
  iconUrl: 'https://img.icons8.com/material-rounded/48/28a745/home.png',
  iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40]
});
const yellowHouseIcon = new L.Icon({
  iconUrl: 'https://img.icons8.com/material-rounded/48/ffc107/home.png',
  iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40]
});
const redHouseIcon = new L.Icon({
  iconUrl: 'https://img.icons8.com/material-rounded/48/dc3545/home.png',
  iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40]
});
function getShelterIcon(shelter: { occupancy: number; capacity: number }) {
  if (shelter.capacity === 0) return yellowHouseIcon;
  const percentage = shelter.occupancy / shelter.capacity;
  if (percentage >= 1) return redHouseIcon;
  if (percentage >= 0.8) return yellowHouseIcon;
  return greenHouseIcon;
}

const incidentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png', shadowSize: [41, 41]
});

export default function ResidentHome() {
  const [metrics, setMetrics] = useState({ activeIncidents: 0, sheltersAvailable: 0, sheltersTotal: 0, hazardZones: 0, shelterOccupancyPct: 0 });
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [shelters, setShelters] = useState<any[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [incidentChartData, setIncidentChartData] = useState<any>({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch shelters from real API
  const fetchShelters = async () => {
    const response = await fetch('http://localhost:3001/shelters');
    if (!response.ok) throw new Error('Failed to fetch shelters');
    return await response.json();
  };

  // Fetch all dashboard data
  const fetchAll = async () => {
    setLoading(true);
    const [m, i, s, w, a, c] = await Promise.all([
      fetchMetrics(),
      fetchRecentIncidents(),
      fetchShelters(),
      fetchWeather(),
      fetchAlerts(),
      fetchIncidentChartData(),
    ]);
    // Calculate shelter metrics
    const totalShelters = s.length;
    const availableShelters = s.filter((sh: any) => sh.status === 'available').length;
    const totalCapacity = s.reduce((sum: number, sh: any) => sum + (sh.capacity || 0), 0);
    const totalOccupancy = s.reduce((sum: number, sh: any) => sum + (sh.occupancy || 0), 0);
    const shelterOccupancyPct = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;
    setMetrics({ ...m, sheltersAvailable: availableShelters, sheltersTotal: totalShelters, shelterOccupancyPct });
    setRecentIncidents(i);
    setShelters(s);
    setWeather(w);
    setAlerts(a);
    setIncidentChartData(c);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <PageMeta
        title="Resident Dashboard - E-LigtasMo"
        description="Your personalized safety dashboard."
      />
      <div className="min-h-screen w-full bg-[#fafbfc] space-y-8 px-2 py-6 md:px-8">
        {/* Emergency Contacts Widget */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-[#fff5f5] border-l-4 border-red-200 rounded-xl p-4 md:p-6 mb-4">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <FaBullhorn className="text-red-500 text-xl md:text-2xl" />
            <div>
              <div className="font-bold text-lg md:text-xl text-red-800">Emergency Contacts</div>
              <div className="text-sm md:text-base text-red-700">Quick access to critical emergency numbers</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full md:w-auto">
            <button
              onClick={() => window.open('tel:911', '_self')}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-3 rounded-lg text-sm md:text-base transition-colors min-h-[48px]"
            >
              Call 911
            </button>
            <button
              onClick={() => window.open('tel:143', '_self')}
              className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-3 rounded-lg text-sm md:text-base transition-colors min-h-[48px]"
            >
              Red Cross 143
            </button>
            <button
              onClick={() => window.open('tel:136', '_self')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-3 rounded-lg text-sm md:text-base transition-colors min-h-[48px]"
            >
              MMDA 136
            </button>
          </div>
        </div>

        {/* Key Metric Cards - Clean, Flat Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="flex items-center bg-white rounded-lg px-4 py-4 gap-3 min-w-0 border border-gray-100 hover:bg-gray-50 transition">
            <span className="bg-gray-100 text-red-500 rounded-full p-2 flex items-center justify-center min-w-[40px] min-h-[40px]"><FaInfoCircle className="text-lg" /></span>
            <div className="min-w-0">
              <div className="font-bold text-lg leading-tight text-gray-900">{metrics.activeIncidents}</div>
              <div className="text-sm text-gray-600 truncate">Active Incidents</div>
            </div>
          </div>
          <div className="flex items-center bg-white rounded-lg px-4 py-4 gap-3 min-w-0 border border-gray-100 hover:bg-gray-50 transition">
            <span className="bg-gray-100 text-blue-500 rounded-full p-2 flex items-center justify-center min-w-[40px] min-h-[40px]"><FaBox className="text-lg" /></span>
            <div className="min-w-0">
              <div className="font-bold text-lg leading-tight text-gray-900">{metrics.sheltersAvailable} / {metrics.sheltersTotal}</div>
              <div className="text-sm text-gray-600 truncate">Shelters Available</div>
              <span className="text-xs text-blue-700 font-semibold underline cursor-pointer">{metrics.shelterOccupancyPct}% occupied</span>
            </div>
          </div>
          <div className="flex items-center bg-white rounded-lg px-4 py-4 gap-3 min-w-0 border border-gray-100 hover:bg-gray-50 transition">
            <span className="bg-gray-100 text-yellow-500 rounded-full p-2 flex items-center justify-center min-w-[40px] min-h-[40px]"><FaList className="text-lg" /></span>
            <div className="min-w-0">
              <div className="font-bold text-lg leading-tight text-gray-900">{metrics.hazardZones}</div>
              <div className="text-sm text-gray-600 truncate">Hazard Zones</div>
            </div>
          </div>
          <div className="flex items-center bg-white rounded-lg px-4 py-4 gap-3 min-w-0 border border-gray-100 hover:bg-gray-50 transition">
            <span className="bg-gray-100 text-gray-500 rounded-full p-2 flex items-center justify-center min-w-[40px] min-h-[40px]"><FaCloudSun className="text-lg" /></span>
            <div className="min-w-0">
              <div className="font-bold text-lg leading-tight text-gray-900">{weather ? weather.desc : "-"}</div>
              <div className="text-sm text-gray-600 truncate">Weather Alerts</div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6" style={{ minHeight: "400px" }}>
          {/* Map */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0">
              <MapContainer
                center={[14.5995, 120.9842]}
                zoom={12}
                style={{ height: "100%", width: "100%", minHeight: "300px" }}
                className="h-full"
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap &copy; CARTO" />
                {/* Map Shelters */}
                {shelters.map(shelter => (
                  <Marker key={`shelter-${shelter.id}`} position={[shelter.lat, shelter.lng]} icon={getShelterIcon(shelter)}>
                    <Popup><b>Shelter:</b> {shelter.name} ({shelter.status})</Popup>
                  </Marker>
                ))}
                {/* Map Incidents */}
                {recentIncidents.map(incident => (
                  <Marker key={`incident-${incident.id}`} position={[incident.lat, incident.lng]} icon={incidentIcon}>
                    <Popup><b>Incident:</b> {incident.type} at {incident.location}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
          {/* Recent Incidents & Alerts */}
          <div className="flex flex-col gap-4 lg:gap-6">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-semibold text-lg mb-3 text-gray-800">Recent Incidents</h3>
              <ul className="divide-y divide-gray-200 space-y-2">
                {recentIncidents.map(inc => (
                  <li key={inc.id} className="py-3 flex flex-col">
                    <span className="font-semibold text-blue-700 text-base">{inc.type}</span>
                    <span className="text-sm text-gray-500">{inc.location} • {inc.time}</span>
                  </li>
                ))}
              </ul>
            </div>
            {alerts.map(alert => (
              <div key={alert.id} className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4 shadow">
                <h3 className="font-semibold text-lg mb-2 text-yellow-800">Emergency Alert</h3>
                <div className="text-base text-gray-700">{alert.title}</div>
                <div className="text-sm text-gray-500 mt-2">Last updated: {alert.updated}</div>
              </div>
            ))}
            <div className="bg-blue-50 rounded-lg p-4 shadow">
              <h3 className="font-semibold text-lg mb-2 text-blue-800">Weather Summary</h3>
              <div className="flex items-center gap-3">
                <span className="text-3xl">🌧️</span>
                <div>
                  <span className="text-xl font-bold">{weather ? `${weather.temp}°C` : "-"}</span>
                  <div className="text-base text-gray-600">{weather ? weather.desc : "-"}</div>
                </div>
              </div>
              <div className="text-sm text-gray-500 mt-2">Humidity: {weather ? weather.humidity : "-"}% • Wind: {weather ? weather.wind : "-"} m/s</div>
            </div>
          </div>
        </div>
        {/* Bottom Section: Charts */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h3 className="font-semibold text-lg mb-4 text-gray-800">Incidents This Week</h3>
          <div style={{ height: 220 }}>
            <Bar data={incidentChartData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }} />
          </div>
        </div>
      </div>
    </>
  );
}
