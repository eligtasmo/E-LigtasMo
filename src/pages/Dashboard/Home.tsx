import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Bar } from "react-chartjs-2";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import PageMeta from "../../components/common/PageMeta";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { AlertIcon, BoxCubeIcon, ListIcon, CloudIcon } from "../../icons";
import { FaBullhorn, FaInfoCircle, FaBox, FaList, FaCloudSun } from 'react-icons/fa';
import React, { useEffect, useState } from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Placeholder data - in a real app, this would come from your state management or API
const keyMetrics = {
  activeIncidents: 4,
  sheltersAvailable: 3,
  sheltersTotal: 4,
  hazardZones: 5,
};

const recentIncidents = [
  { id: 1, type: "Flood", location: "Main St, Manila", time: "2 min ago", lat: 14.58, lng: 120.98},
  { id: 2, type: "Accident", location: "Highway 1, QC", time: "15 min ago", lat: 14.65, lng: 121.05},
  { id: 3, type: "Fire", location: "Market Area, Makati", time: "1 hour ago", lat: 14.55, lng: 121.02},
];

const shelterData = [
  { id: 1, name: "Barangay Hall", lat: 14.5995, lng: 120.9842, status: "available" },
  { id: 2, name: "Covered Court", lat: 14.605, lng: 120.99, status: "full" },
  { id: 3, name: "School Gym", lat: 14.59, lng: 120.975, status: "available" },
];

const incidentChartData = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  datasets: [{
    label: "Incidents",
    data: [5, 9, 3, 5, 2, 3, 7],
    backgroundColor: "#3b82f6",
    borderRadius: 6,
    hoverBackgroundColor: "#2563eb",
  }]
};

const shelterIcon = (status: 'available' | 'full') => new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${status === 'available' ? 'green' : 'red'}.png`,
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png', shadowSize: [41, 41]
});

const incidentIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png', shadowSize: [41, 41]
});

type Shelter = {
  id: number;
  name: string;
  lat: number | string;
  lng: number | string;
  status?: string;
};

export default function Home() {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loadingShelters, setLoadingShelters] = useState(true);
  const [shelterError, setShelterError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShelters = async () => {
      setLoadingShelters(true);
      setShelterError(null);
      try {
        const baseUrl = window.location.origin;
        const res = await fetch(`${baseUrl}/api/shelters-list.php`);
        if (!res.ok) throw new Error("Failed to fetch shelters");
        const data = await res.json();
        setShelters(Array.isArray(data) ? data : data.shelters || []);
      } catch (err) {
        setShelterError(err instanceof Error ? err.message : "Error loading shelters");
      } finally {
        setLoadingShelters(false);
      }
    };
    fetchShelters();
  }, []);

  return (
    <>
      <PageMeta
        title="Admin Command Center - E-LigtasMo"
        description="Dashboard for disaster risk management."
      />
      <div className="space-y-6">
        {/* Emergency Contacts Widget */}
        <div className="flex items-center justify-between bg-red-50 border-l-4 border-red-200 rounded-2xl shadow p-4 mb-2">
          <div className="flex items-center gap-3">
            <FaBullhorn className="text-red-500 text-2xl" />
            <div>
              <div className="font-bold text-lg text-red-800">Emergency Contacts</div>
              <div className="text-sm text-red-700">Quick access to critical emergency numbers</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.open('tel:911', '_self')}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 rounded-lg text-base shadow-sm transition-colors"
            >
              Call 911
            </button>
            <button
              onClick={() => window.open('tel:143', '_self')}
              className="bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2 rounded-lg text-base shadow-sm transition-colors"
            >
              Red Cross 143
            </button>
            <button
              onClick={() => window.open('tel:136', '_self')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-lg text-base shadow-sm transition-colors"
            >
              MMDA 136
            </button>
          </div>
        </div>

        {/* Key Metric Cards - Compact Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
          <div className="flex items-center bg-white rounded-xl shadow-sm px-4 py-3 gap-3 min-w-0">
            <span className="bg-red-100 text-red-600 rounded-full p-2 flex items-center justify-center"><FaInfoCircle className="text-lg" /></span>
            <div className="min-w-0">
              <div className="font-bold text-lg leading-tight text-gray-900">{keyMetrics.activeIncidents}</div>
              <div className="text-xs text-gray-600 truncate">Active Incidents</div>
            </div>
          </div>
          <div className="flex items-center bg-white rounded-xl shadow-sm px-4 py-3 gap-3 min-w-0">
            <span className="bg-blue-100 text-blue-600 rounded-full p-2 flex items-center justify-center"><FaBox className="text-lg" /></span>
            <div className="min-w-0">
              <div className="font-bold text-lg leading-tight text-gray-900">{keyMetrics.sheltersAvailable} / {keyMetrics.sheltersTotal}</div>
              <div className="text-xs text-gray-600 truncate">Shelters Available</div>
              <a href="#" className="text-xs text-blue-700 font-semibold underline cursor-pointer">67% occupied</a>
            </div>
          </div>
          <div className="flex items-center bg-white rounded-xl shadow-sm px-4 py-3 gap-3 min-w-0">
            <span className="bg-yellow-100 text-yellow-600 rounded-full p-2 flex items-center justify-center"><FaList className="text-lg" /></span>
            <div className="min-w-0">
              <div className="font-bold text-lg leading-tight text-gray-900">{keyMetrics.hazardZones}</div>
              <div className="text-xs text-gray-600 truncate">Hazard Zones</div>
            </div>
          </div>
          <div className="flex items-center bg-white rounded-xl shadow-sm px-4 py-3 gap-3 min-w-0">
            <span className="bg-gray-200 text-gray-700 rounded-full p-2 flex items-center justify-center"><FaCloudSun className="text-lg" /></span>
            <div className="min-w-0">
              <div className="font-bold text-lg leading-tight text-gray-900">Thunderstorms</div>
              <div className="text-xs text-gray-600 truncate">Weather Alerts</div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: "55vh" }}>
          {/* Left Column: Recent Activity */}
          <div className="lg:col-span-1 bg-white dark:bg-boxdark rounded-lg shadow-md p-4 flex flex-col">
            <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-white">Recent Incidents</h3>
            <ul className="space-y-3 overflow-y-auto flex-grow">
              {recentIncidents.map(incident => (
                <li key={incident.id} className="p-3 border-l-4 border-blue-500 bg-gray-50 hover:bg-gray-100 dark:bg-boxdark-2 dark:hover:bg-gray-700 rounded-r-lg cursor-pointer">
                  <div className="font-semibold text-sm text-gray-900 dark:text-gray-200">{incident.type}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{incident.location}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 italic mt-1">{incident.time}</div>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Column: Live Overview Map */}
          <div className="lg:col-span-2 bg-white dark:bg-boxdark rounded-lg shadow-md overflow-hidden">
             <MapContainer center={[14.5995, 120.9842]} zoom={12} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap &copy; CARTO" />
              {/* Map Shelters from DB */}
              {loadingShelters ? null : shelterError ? (
                <></>
              ) : (
                shelters.map((shelter) => (
                  <Marker key={`shelter-${shelter.id}`} position={[Number(shelter.lat), Number(shelter.lng)]} icon={shelterIcon((shelter.status || '').toLowerCase() === 'full' ? 'full' : 'available')}>
                    <Popup><b>Shelter:</b> {shelter.name} ({shelter.status})</Popup>
                  </Marker>
                ))
              )}
              {/* Map Incidents */}
              {recentIncidents.map(incident => (
                  <Marker key={`incident-${incident.id}`} position={[incident.lat, incident.lng]} icon={incidentIcon}>
                      <Popup><b>Incident:</b> {incident.type} at {incident.location}</Popup>
                  </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Bottom Section: Charts */}
        <div className="bg-white dark:bg-boxdark rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-white">Incidents This Week</h3>
          <div style={{ height: 250 }}>
            <Bar data={incidentChartData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }} />
          </div>
        </div>
      </div>
    </>
  );
}
