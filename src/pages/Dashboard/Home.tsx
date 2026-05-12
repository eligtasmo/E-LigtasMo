import MapboxMap, { Popup, Source, Layer } from '../../components/maps/MapboxMap';
import TacticalMarker from "../../components/maps/TacticalMarker";
import SantaCruzOutline from "../../components/maps/SantaCruzOutline";
import { useGlobalMapContext } from "../../context/MapContext";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { AlertIcon, BoxCubeIcon, ListIcon, CloudIcon } from "../../icons";
import { FiMapPin, FiClock as FiClockIcon, FiChevronRight, FiRefreshCw, FiActivity } from "react-icons/fi";
import { 
  FaBullhorn, 
  FaInfoCircle, 
  FaBox, 
  FaList, 
  FaCloudSun, 
  FaExclamationTriangle,
  FaShieldAlt,
  FaMapMarkerAlt,
  FaUsers,
  FaArrowUp,
  FaArrowDown,
  FaEye,
  FaChartLine,
  FaChartBar,
  FaChartPie,
  FaBell,
  FaCalendarAlt,
  FaWater,
  FaTimes,
  FaSkullCrossbones,
  FaWind,
  FaAmbulance,
  FaFire
} from 'react-icons/fa';
import { DEFAULT_MAP_STATE } from '../../constants/geo';
import React, { useEffect, useState } from "react";
import { apiFetch } from "../../utils/api";
import TacticalCommsStatus from "../../components/dashboard/TacticalCommsStatus";

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN) as string | undefined;
const OWM_KEY = import.meta.env.VITE_OPENWEATHERMAP_API_KEY as string | undefined;

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

let initialMetrics = {
  activeIncidents: { value: 0, trend: 0, status: 'stable' },
  sheltersAvailable: { value: 0, total: 0, occupancy: 0, trend: 0 },
  hazardZones: { value: 0, active: 0, trend: 0 },
  totalResidents: { value: 0, evacuated: 0, trend: 0 },
  responseTime: { value: 0, unit: 'min' as const, trend: 0 },
  weatherAlert: { level: '—', type: '—', trend: 'stable' }
};

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
    backgroundColor: "rgba(59, 130, 246, 0.8)",
    borderColor: "#3b82f6",
    borderWidth: 2,
    borderRadius: 8,
    hoverBackgroundColor: "#2563eb",
  }]
};

const incidentTypeData = {
  labels: ["Flood", "Fire", "Accident", "Medical", "Other"],
  datasets: [{
    data: [35, 20, 25, 15, 5],
    backgroundColor: [
      "#ef4444", // Red for flood
      "#f97316", // Orange for fire  
      "#eab308", // Yellow for accident
      "#22c55e", // Green for medical
      "#6b7280"  // Gray for other
    ],
    borderWidth: 0,
    hoverOffset: 4
  }]
};

const responseTimeData = {
  labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
  datasets: [{
    label: "Avg Response Time (min)",
    data: [12, 10, 8.5, 8.5],
    borderColor: "#10b981",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    fill: true,
    tension: 0.4,
    pointBackgroundColor: "#10b981",
    pointBorderColor: "#ffffff",
    pointBorderWidth: 2,
    pointRadius: 6
  }]
};



type Shelter = {
  id: number;
  name: string;
  lat: number | string;
  lng: number | string;
  status?: string;
};

export default function Home() {
  const { viewport: viewState, setViewport: setViewState } = useGlobalMapContext();
  const [mapLayers, setMapLayers] = useState({
    showIncidents: true,
    showShelters: true,
  });
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loadingShelters, setLoadingShelters] = useState(true);
  const [shelterError, setShelterError] = useState<string | null>(null);
  const [keyMetrics, setKeyMetrics] = useState(initialMetrics);
  const [weatherLayer, setWeatherLayer] = useState<'none' | 'wind_new' | 'precipitation_new' | 'clouds_new'>('none');
  const [showWindyRadar, setShowWindyRadar] = useState(false);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(true);
  const [loadingHazards, setLoadingHazards] = useState(true);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const [hazardsError, setHazardsError] = useState<string | null>(null);
  const [brgyLevels, setBarangayLevels] = useState<any[]>([]);
  const [loadingLevels, setLoadingLevels] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [isViewingDetails, setIsViewingDetails] = useState(false);

  useEffect(() => {
    const fetchShelters = async () => {
      setLoadingShelters(true);
      setShelterError(null);
      try {
        const res = await apiFetch('shelters-list.php');
        if (!res.ok) throw new Error('Failed to fetch shelters');
        const data = await res.json();
        setShelters(Array.isArray(data) ? data : data.shelters || []);
      } catch (err) {
        setShelterError(err instanceof Error ? err.message : 'Error loading shelters');
      } finally {
        setLoadingShelters(false);
      }
    };
    fetchShelters();
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoadingIncidents(true);
      setLoadingHazards(true);
      setLoadingLevels(true);
      setIncidentsError(null);
      setHazardsError(null);
      try {
        const [incRes, hazRes, shStatsRes, usersRes, brgyRes] = await Promise.allSettled([
          apiFetch('list-incidents.php?limit=100'),
          apiFetch('list-hazards.php'),
          apiFetch('shelters-stats.php'),
          apiFetch('list-users.php'),
          apiFetch('brgy-status.php')
        ]);

        let incidents: any[] = [];
        if (incRes.status === 'fulfilled') {
          const r = incRes.value;
          const j = await r.json().catch(() => ({} as any));
          incidents = Array.isArray(j) ? j : (j.incidents || []);
          setRecentIncidents(incidents.slice(0, 5).map((it: any) => ({
            id: it.id,
            type: it.type || 'Incident',
            location: it.address || it.location || '—',
            time: it.datetime || it.created_at || '—',
            lat: Number(it.lat ?? it.start_lat ?? 0),
            lng: Number(it.lng ?? it.start_lng ?? 0),
            status: it.status || 'Approved'
          })));
        } else {
          setIncidentsError('Failed to load incidents');
        }

        let hazards: any[] = [];
        if (hazRes.status === 'fulfilled') {
          const r = hazRes.value;
          const j = await r.json().catch(() => ({} as any));
          hazards = Array.isArray(j) ? j : (j.hazards || []);
        } else {
          setHazardsError('Failed to load hazards');
        }

        let shelterStats: any = null;
        if (shStatsRes.status === 'fulfilled') {
          const r = shStatsRes.value;
          const j = await r.json().catch(() => ({} as any));
          shelterStats = j?.metrics || null;
        }

        let totalResidents = 0;
        if (usersRes.status === 'fulfilled') {
          const r = usersRes.value;
          const j = await r.json().catch(() => ({} as any));
          const users = Array.isArray(j) ? j : (j.users || []);
          totalResidents = Array.isArray(users) ? users.length : 0;
        }

        if (brgyRes.status === 'fulfilled') {
          const r = brgyRes.value;
          const j = await r.json().catch(() => ({} as any));
          if (j.status === 'success' && Array.isArray(j.data)) {
             const sorted = j.data.sort((a: any, b: any) => {
                const priority: Record<string, number> = { critical: 3, warning: 2, monitor: 1, safe: 0 };
                const pA = priority[a.status_level?.toLowerCase()] || 0;
                const pB = priority[b.status_level?.toLowerCase()] || 0;
                if (pA !== pB) return pB - pA;
                
  return (
    <>
      <PageMeta
        title="MMDRMO Command Center"
        description="Global Tactical Operations Dashboard."
      />
      <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden font-inter bg-slate-950 text-white flex">
        
        {/* Absolute Map Background */}
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <MapboxMap
                {...viewState}
                onMove={(evt: any) => setViewState(evt.viewState)}
                minZoom={DEFAULT_MAP_STATE.minZoom}
                maxBounds={DEFAULT_MAP_STATE.maxBounds}
                pitch={0}
                bearing={0}
                mapStyle="mapbox://styles/mapbox/light-v11"
                mapboxAccessToken={MAPBOX_TOKEN}
                style={{ width: '100%', height: '100%' }}
                onLoad={() => {}}
              >
                <SantaCruzOutline />
                {weatherLayer !== 'none' && OWM_KEY && (
                  <Source
                    id="owm-weather-admin"
                    type="raster"
                    tiles={[`https://tile.openweathermap.org/map/${weatherLayer}/{z}/{x}/{y}.png?appid=${OWM_KEY}`]}
                    tileSize={256}
                  >
                    <Layer
                      id="owm-layer-admin"
                      type="raster"
                      paint={{ 'raster-opacity': 0.6 }}
                    />
                  </Source>
                )}
                {/* Sector Comms Panel - Floating Overlay */}
                <div className="absolute left-4 top-24 bottom-4 z-10 w-72 pointer-events-none">
                  <div className="pointer-events-auto h-full">
                    <TacticalCommsStatus 
                      title="Sector Matrix"
                      sectors={brgyLevels.map(b => ({
                        name: b.brgy_name,
                        status: (b.status_level || 'safe').toLowerCase() as any,
                        lastPing: 'Active Now',
                        depth: b.flood_depth_cm
                      }))}
                    />
                  </div>
                </div>

                {/* Layer Controls Widget */}
                <div className="absolute right-4 top-24 z-10 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 p-4 min-w-[180px]">
                  <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-4 border-b border-gray-100 pb-2">Tactical Layers</div>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-[11px] font-bold text-gray-600 group-hover:text-red-600 transition-colors tracking-tight">Active Incidents</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 bg-gray-50 text-red-600 focus:ring-red-500/50 w-4 h-4"
                        checked={mapLayers.showIncidents} 
                        onChange={(e) => setMapLayers(v => ({ ...v, showIncidents: e.target.checked }))} 
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-[11px] font-bold text-gray-600 group-hover:text-emerald-500 transition-colors tracking-tight">Shelter Network</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 bg-gray-50 text-emerald-600 focus:ring-emerald-500/50 w-4 h-4"
                        checked={mapLayers.showShelters} 
                        onChange={(e) => setMapLayers(v => ({ ...v, showShelters: e.target.checked }))} 
                      />
                    </label>
                  </div>
                </div>

                {/* Map Shelters from DB */}
                {loadingShelters ? null : shelterError ? (
                  <></>
                ) : mapLayers.showShelters && (
                  shelters.map((shelter, sIdx) => (
                    <React.Fragment key={`map-shelter-${shelter.id || sIdx}`}>
                      <TacticalMarker
                        latitude={Number(shelter.lat)}
                        longitude={Number(shelter.lng)}
                        type="shelter"
                        onClick={(e) => {
                          e.originalEvent.stopPropagation();
                        }}
                      />
                    </React.Fragment>
                  ))
                )}
                {/* Map Incidents */}
                {mapLayers.showIncidents && recentIncidents.map((incident, iIdx) => (
                    <React.Fragment key={`map-incident-${incident.id || iIdx}`}>
                      <TacticalMarker
                        latitude={Number(incident.lat)}
                        longitude={Number(incident.lng)}
                        type={incident.type || 'flood'}
                      />
                    </React.Fragment>
                ))}
              </MapboxMap>
        </div>

        {/* Floating HUD Container */}
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col p-4 lg:p-6 gap-4">
          
          {/* Top Header HUD */}
          <div className="flex justify-between items-start">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl pointer-events-auto flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30 shadow-inner">
                <FaShieldAlt className="text-blue-400 text-2xl" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span className="text-[10px] font-semibold tracking-wider text-emerald-400 uppercase">System Stability Confirmed</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white leading-none">
                  Strategic Command
                </h1>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 pointer-events-auto">
               <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl shadow-2xl flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-bold text-white leading-none">
                      {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </div>
                    <div className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mt-1">Local Time</div>
                  </div>
                  <div className="w-px h-8 bg-white/10"></div>
                  <TacticalCommsStatus />
               </div>
            </div>
          </div>

          {/* Main Interface Area */}
          <div className="flex-1 flex justify-between gap-4 min-h-0 relative">
             
             {/* Left Sidebar: Metrics & Sector Status */}
             <div className="w-full lg:w-[320px] flex flex-col gap-4 pointer-events-auto">
                {/* Global Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <Link to="/admin/incident-reports" className="bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl flex flex-col gap-2 transition-all">
                    <div className="flex justify-between items-center"><FaFire className="text-red-400" /><span className="text-2xl font-bold text-white">{keyMetrics.activeIncidents.value}</span></div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-widest">Active Incidents</div>
                  </Link>
                  <Link to="/admin/hazards" className="bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl flex flex-col gap-2 transition-all">
                    <div className="flex justify-between items-center"><FaSkullCrossbones className="text-orange-400" /><span className="text-2xl font-bold text-white">{keyMetrics.hazardZones.value}</span></div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-widest">Hazard Zones</div>
                  </Link>
                  <Link to="/admin/shelters" className="bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl flex flex-col gap-2 transition-all">
                    <div className="flex justify-between items-center"><FaHome className="text-blue-400" /><span className="text-2xl font-bold text-white">{keyMetrics.sheltersAvailable.value}</span></div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-widest">Shelters</div>
                  </Link>
                  <Link to="/admin/weather" className="bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl flex flex-col gap-2 transition-all">
                    <div className="flex justify-between items-center"><FaWind className="text-cyan-400" /><span className="text-xl font-bold text-white truncate max-w-[50px]">{keyMetrics.weatherAlert.type}</span></div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-widest">Weather Alert</div>
                  </Link>
                </div>

                {/* Sector Status Matrix */}
                <div className="flex-1 flex flex-col bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                   <div className="p-4 border-b border-white/5 flex justify-between items-center">
                      <h2 className="text-xs font-semibold text-white uppercase tracking-wider">Sector Matrix</h2>
                      <span className="text-[9px] text-slate-400">Flood Levels</span>
                   </div>
                   <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                     {brgyLevels.length > 0 ? brgyLevels.map((b, i) => (
                       <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg border-b border-white/5 last:border-0 transition-colors">
                         <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${b.status_level === 'critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : b.status_level === 'warning' ? 'bg-orange-400' : 'bg-emerald-500'}`} />
                           <span className="text-[11px] font-medium text-slate-200">{b.barangay_name}</span>
                         </div>
                         <div className="text-[10px] font-bold text-blue-300">{b.flood_depth_cm || 0}cm</div>
                       </div>
                     )) : (
                       <div className="text-center p-4 text-[10px] text-slate-500">Loading Sectors...</div>
                     )}
                   </div>
                </div>
             </div>

             {/* Right Sidebar: Live Reports */}
             <div className="w-full lg:w-[360px] flex flex-col gap-4 pointer-events-auto">
                <div className="flex-1 flex flex-col bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                  <div className="p-5 border-b border-white/5 bg-white/5 flex justify-between items-center">
                     <h2 className="text-sm font-semibold flex items-center gap-2 text-white"><FaList className="text-slate-400" /> Live Feed</h2>
                     <Link to="/admin/incident-reports" className="text-[9px] text-blue-400 hover:text-blue-300 uppercase tracking-widest font-bold transition-colors">Matrix View</Link>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                     {recentIncidents.map((incident, index) => (
                        <div key={`${incident.source_table || 'inc'}-${incident.id || index}`} onClick={() => { setSelectedIncident(incident); setIsViewingDetails(true); }} className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 p-4 rounded-2xl cursor-pointer transition-all flex flex-col gap-2 relative overflow-hidden">
                           <div className={`absolute left-0 top-0 bottom-0 w-1 ${incident.type === 'Flood' ? 'bg-blue-500' : incident.type === 'Accident' ? 'bg-orange-500' : incident.type === 'Fire' ? 'bg-red-500' : 'bg-slate-400'}`} />
                           <div className="flex justify-between items-start pl-2">
                              <div>
                                 <div className="text-sm font-bold text-white flex items-center gap-1.5 mb-1">{incident.type || 'Incident'}</div>
                                 <div className="text-[10px] text-slate-400 flex items-center gap-1"><FiMapPin className="text-slate-500 shrink-0" /> <span className="truncate max-w-[180px]">{incident.location || 'Location Unspecified'}</span></div>
                              </div>
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase">Active</span>
                           </div>
                           <div className="flex justify-between items-center pl-2 pt-3 mt-1 border-t border-white/5">
                              <div className="text-[9px] text-slate-500 flex items-center gap-1"><FiClockIcon /> {incident.time.toUpperCase()}</div>
                              <FiChevronRight className="text-slate-500 group-hover:text-white transition-colors" />
                           </div>
                        </div>
                     ))}
                  </div>
                </div>
             </div>

          </div>

          {/* Bottom Bar: Charts & Ticker */}
          <div className="flex gap-4 pointer-events-auto h-36">
             <div className="w-[320px] bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-center">
                 <Doughnut 
                  data={incidentTypeData} 
                  options={{ 
                    plugins: { legend: { position: 'right', labels: { color: '#94a3b8', boxWidth: 10, font: { size: 9 } } } }, 
                    maintainAspectRatio: false, 
                    cutout: '70%' 
                  }} 
                />
             </div>
             
             <div className="flex-1 bg-blue-600/20 backdrop-blur-xl rounded-2xl p-4 shadow-2xl flex flex-col justify-center border border-blue-500/30">
               <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-2"><FaBullhorn /> Global Broadcast Channel</div>
               <div className="text-sm font-semibold text-blue-100">All local government units and response teams are currently on standby. Tactical dispatch matrix is fully operational.</div>
             </div>

             <div className="w-[360px] bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-center">
                <Line 
                  data={responseTimeData} 
                  options={{ 
                    plugins: { legend: { display: false } }, 
                    scales: { x: { display: false }, y: { display: false } }, 
                    maintainAspectRatio: false 
                  }} 
                />
             </div>
          </div>

        </div>
        
        {/* Incident Detail Modal (Admin) */}
        {isViewingDetails && selectedIncident && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto p-4">
            <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
               <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                 <span className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2"><FaList className="text-blue-400"/> Incident Overview</span>
                 <button onClick={() => setIsViewingDetails(false)} className="text-slate-400 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 text-[10px] uppercase font-bold"><FaTimes className="inline mr-1"/> Close</button>
               </div>
               <div className="p-6 grid grid-cols-2 gap-6">
                 <div>
                   <h2 className="text-2xl font-bold text-white mb-2">{selectedIncident.type}</h2>
                   <div className="text-xs text-slate-400 flex items-center gap-2 mb-4"><FiMapPin /> {selectedIncident.location}</div>
                   <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 border-t border-white/10 pt-4">Timeline</div>
                   <div className="text-sm font-medium text-white mb-4">{selectedIncident.time}</div>
                 </div>
                 <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col justify-center items-center gap-2">
                   <FaShieldAlt className="text-3xl text-emerald-400" />
                   <div className="text-[10px] text-slate-400 uppercase tracking-widest">Status</div>
                   <div className="text-lg font-bold text-emerald-400">{selectedIncident.status}</div>
                 </div>
               </div>
               <div className="p-4 bg-slate-950 border-t border-white/10 flex justify-end gap-3">
                 <Link to="/admin/incident-reports" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-xl shadow-lg transition-all uppercase tracking-wider">Manage in Matrix</Link>
               </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default Home;
