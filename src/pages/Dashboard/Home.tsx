import MapboxMap, { Popup } from '../../components/maps/MapboxMap';
import TacticalMarker from "../../components/maps/TacticalMarker";
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
import React, { useEffect, useState } from "react";
import { apiFetch } from "../../utils/api";

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
  const [barangayLevels, setBarangayLevels] = useState<any[]>([]);
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
          apiFetch('barangay-status.php')
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
                return (b.flood_depth_cm || 0) - (a.flood_depth_cm || 0);
             });
             setBarangayLevels(sorted);
          }
        }

        const activeCount = incidents.filter((x: any) => String(x.status || '').toLowerCase() === 'approved').length;
        const resolvedWithTimes = incidents.filter((x: any) => String(x.status || '').toLowerCase() === 'resolved' && x.created_at && x.reviewed_at);
        let avgMins = 0;
        if (resolvedWithTimes.length) {
          const sums = resolvedWithTimes.map((x: any) => {
            const start = new Date(x.created_at).getTime();
            const end = new Date(x.reviewed_at).getTime();
            return Math.max(0, end - start);
          });
          avgMins = Math.round((sums.reduce((a: number, b: number) => a + b, 0) / resolvedWithTimes.length) / 60000);
        }

        const activeHazards = hazards.filter((h: any) => String(h.status || '').toLowerCase() === 'active').length;

        setKeyMetrics({
          activeIncidents: { value: activeCount, trend: 0, status: 'stable' },
          sheltersAvailable: {
            value: shelterStats ? Math.max(0, (shelterStats.totalShelters || 0) - (shelterStats.status?.offline || 0)) : shelters.length,
            total: shelterStats ? (shelterStats.totalShelters || 0) : shelters.length,
            occupancy: shelterStats ? Math.round((shelterStats.capacityUtilizationPct || 0)) : 0,
            trend: 0
          },
          hazardZones: { value: hazards.length, active: activeHazards, trend: 0 },
          totalResidents: { value: totalResidents, evacuated: 0, trend: 0 },
          responseTime: { value: avgMins, unit: 'min', trend: 0 },
          weatherAlert: { level: 'moderate', type: 'Thunderstorms', trend: 'stable' }
        });
      } catch (e) {
      } finally {
        setLoadingIncidents(false);
        setLoadingHazards(false);
        setLoadingLevels(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <>
      <PageMeta
        title="Admin Command Center - E-LigtasMo"
        description="Dashboard for disaster risk management."
      />
      <div className="flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <FaShieldAlt className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Emergency Management Dashboard</h1>
                <p className="text-sm text-gray-600">Real-time monitoring and response coordination</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Last 24 Hours
              </button>
              <button className="px-3 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Live
              </button>
            </div>
          </div>
        </div>
        {/* Merged Emergency Command Center & Hotlines - Single Container */}
        <div className="bg-[#0f172a] rounded-2xl shadow-2xl overflow-hidden mb-6 border border-slate-800 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-red-600/10 opacity-50 group-hover:opacity-70 transition-opacity" />
          
          {/* Emergency Command Center Header Section */}
          <div className="p-6 text-white relative z-10 border-b border-slate-800/50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/20 border border-red-500/30">
                  <FaShieldAlt className="text-white text-2xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight uppercase flex items-center gap-3">
                    MDRRMO <span className="text-red-500">Command Center</span>
                  </h1>
                  <p className="text-slate-400 font-mono text-xs flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    SYSTEM_PROTOCOL_ACTIVE // {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-3xl font-black font-mono tracking-tighter text-white">
                    {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    <span className="text-red-500 animate-pulse">:</span>
                    {new Date().toLocaleTimeString('en-US', { second: '2-digit' })}
                  </div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Live_Tactical_Clock</div>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Hotlines Section */}
          <div className="p-6 bg-slate-900/50 relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="bg-slate-800 text-slate-300 rounded-xl p-3 border border-slate-700 shadow-inner">
                  <FaBullhorn className="text-lg" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-200 uppercase tracking-widest">Tactical Hotlines</h2>
                  <p className="text-slate-500 text-[10px] font-mono uppercase">Direct_Channel_Authorization_Required</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { num: '911', label: 'NATIONAL_EMERGENCY', icon: <FaExclamationTriangle />, color: 'red' },
                  { num: '143', label: 'RED_CROSS_DIRECT', icon: <FaAmbulance />, color: 'blue' },
                  { num: '136', label: 'MMDA_METROBASE', icon: <FaMapMarkerAlt />, color: 'emerald' }
                ].map(h => (
                  <button
                    key={h.num}
                    onClick={() => window.open(`tel:${h.num}`, '_self')}
                    className="bg-slate-800/50 hover:bg-slate-700/80 border border-slate-700 p-3 rounded-xl transition-all group flex items-center gap-4"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-${h.color}-500/10 flex items-center justify-center text-${h.color}-500 group-hover:bg-${h.color}-500 group-hover:text-white transition-all`}>
                      {h.icon}
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-black text-white font-mono leading-none mb-1">{h.num}</div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{h.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Key Metrics Cards - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
          {[
            { 
              label: 'Active Incidents', 
              value: keyMetrics.activeIncidents.value, 
              trend: keyMetrics.activeIncidents.trend, 
              icon: <FaFire />, 
              color: 'red', 
              path: '/admin/incident-reports',
              sub: 'Requires immediate dispatch'
            },
            { 
              label: 'Shelter Status', 
              value: `${keyMetrics.sheltersAvailable.value}/${keyMetrics.sheltersAvailable.total}`, 
              occupancy: keyMetrics.sheltersAvailable.occupancy, 
              icon: <FaShieldAlt />, 
              color: 'blue', 
              path: '/admin/shelters',
              sub: `${keyMetrics.sheltersAvailable.occupancy}% Occupancy`
            },
            { 
              label: 'Hazard Zones', 
              value: keyMetrics.hazardZones.value, 
              active: keyMetrics.hazardZones.active, 
              icon: <FaSkullCrossbones />, 
              color: 'orange', 
              path: '/admin/hazards',
              sub: `${keyMetrics.hazardZones.active} Active threats`
            },
            { 
              label: 'Population', 
              value: keyMetrics.totalResidents.value.toLocaleString(), 
              icon: <FaUsers />, 
              color: 'emerald', 
              path: '/admin/user-management',
              sub: 'Registered citizens'
            },
            { 
              label: 'Response Time', 
              value: `${keyMetrics.responseTime.value}m`, 
              icon: <FaActivity />, 
              color: 'purple', 
              path: '/admin/analytics',
              sub: 'Average verification speed'
            },
            { 
              label: 'Weather Alert', 
              value: keyMetrics.weatherAlert.type, 
              icon: <FaWind />, 
              color: 'cyan', 
              path: '/admin/weather',
              sub: `Level: ${keyMetrics.weatherAlert.level.toUpperCase()}`
            }
          ].map((m, idx) => (
            <Link 
              key={idx} 
              to={m.path} 
              className={`bg-white rounded-2xl shadow-sm p-4 border border-slate-100 hover:shadow-xl transition-all duration-300 group relative overflow-hidden`}
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-${m.color}-500/5 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-150`} />
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className={`bg-${m.color}-50 text-${m.color}-600 rounded-xl p-2.5 group-hover:bg-${m.color}-600 group-hover:text-white transition-all`}>
                  {m.icon}
                </div>
                {m.trend !== undefined && (
                  <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${m.trend < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {m.trend < 0 ? <FaArrowDown /> : <FaArrowUp />}
                    {Math.abs(m.trend)}%
                  </div>
                )}
              </div>
              <div className="text-2xl font-black text-slate-900 mb-1 font-mono tracking-tight">{m.value}</div>
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.1em] mb-2">{m.label}</div>
              <div className="text-[9px] text-slate-400 font-medium italic">{m.sub}</div>
              {m.occupancy !== undefined && (
                <div className="w-full bg-slate-100 rounded-full h-1 mt-3 overflow-hidden">
                  <div 
                    className={`bg-${m.color}-500 h-1 rounded-full transition-all duration-500`} 
                    style={{ width: `${m.occupancy}%` }}
                  ></div>
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* Barangay Flood Levels Section */}
        <div className="mb-6 bg-[#0f172a] rounded-2xl shadow-2xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
              <div className="bg-blue-600/20 text-blue-400 rounded-xl p-2.5 border border-blue-500/20">
                <FaWater className="text-lg" />
              </div>
              Barangay Tactical Status
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Update_Frequency: 1M</span>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            </div>
          </div>
          
          {loadingLevels ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
               {[1,2,3,4,5,6].map(i => (
                 <div key={i} className="h-28 bg-slate-800/50 animate-pulse rounded-2xl border border-slate-700/50"></div>
               ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {barangayLevels.map((brgy, idx) => {
                const status = (brgy.status_level || 'safe').toLowerCase();
                let colorClass = 'emerald';
                if (status === 'critical') colorClass = 'red';
                else if (status === 'warning') colorClass = 'orange';
                else if (status === 'monitor') colorClass = 'yellow';

                return (
                  <div key={`brgy-status-${brgy.id || idx}`} className={`rounded-2xl p-4 border bg-slate-900/50 border-${colorClass}-500/20 hover:border-${colorClass}-500/50 transition-all duration-300 group`}>
                    <div className="flex items-center justify-between mb-3">
                       <div className={`p-1.5 rounded-lg bg-${colorClass}-500/10 text-${colorClass}-500`}>
                         <FaShieldAlt className="text-sm" />
                       </div>
                       {Number(brgy.flood_depth_cm) > 0 && (
                         <span className="text-[10px] font-black bg-white/5 px-2 py-1 rounded text-white border border-white/10 font-mono">
                           {brgy.flood_depth_cm}CM
                         </span>
                       )}
                    </div>
                    <div className="font-black text-sm mb-1 text-white truncate uppercase tracking-tight" title={brgy.barangay_name}>
                      {brgy.barangay_name}
                    </div>
                    <div className={`text-[9px] text-${colorClass}-400 font-black tracking-[0.2em] uppercase flex items-center justify-between`}>
                      <span>{status}</span>
                      {brgy.message && <FaInfoCircle className="text-[10px] opacity-40 group-hover:opacity-100 transition-opacity" title={brgy.message} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Main Content Area - Enhanced Layout & Responsive */}
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 min-h-[800px]">
          {/* Recent Incidents List - Enhanced */}
          <div className="w-full lg:col-span-1 h-[400px] lg:h-[600px] bg-white rounded-2xl shadow-xl p-5 border border-slate-100 order-2 lg:order-2 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                <div className="bg-slate-900 text-white rounded-xl p-2.5">
                  <FaList className="text-sm" />
                </div>
                Live Reports
              </h3>
              <Link to="/admin/incident-reports" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors">
                View_Matrix
              </Link>
            </div>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {recentIncidents.map((incident, index) => (
                <div key={`incident-item-${incident.id || index}`} onClick={() => { setSelectedIncident(incident); setIsViewingDetails(true); }} className="group p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-200 relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    incident.type === 'Flood' ? 'bg-blue-500' :
                    incident.type === 'Accident' ? 'bg-red-500' :
                    incident.type === 'Fire' ? 'bg-orange-500' : 'bg-slate-400'
                  }`} />
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-slate-900 text-xs uppercase tracking-tight mb-1">{incident.type}</div>
                      <div className="text-[11px] text-slate-500 mb-1 flex items-center gap-1 font-medium truncate">
                        <FaMapMarkerAlt className="text-[10px] text-slate-400" />
                        {incident.location}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono uppercase">
                        <FaCalendarAlt className="text-[10px]" />
                        {incident.time}
                      </div>
                    </div>
                    <div className="text-[9px] font-black bg-white px-2.5 py-1 rounded-full text-slate-600 uppercase tracking-widest shadow-sm border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all">
                      Active
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Map - Enhanced */}
          <div className="w-full lg:col-span-3 min-h-[400px] lg:h-[600px] bg-[#0f172a] rounded-2xl shadow-2xl p-4 border border-slate-800 order-1 lg:order-1 relative group">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                <div className="bg-red-600/20 text-red-500 rounded-xl p-2.5 border border-red-500/20">
                  <FaMapMarkerAlt className="text-sm" />
                </div>
                Geospatial Tactical Map
              </h3>
              <div className="flex items-center gap-4">
                </div>
              </div>
            </div>

            {/* Weather Controls Overlay (Admin) */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 mt-16">
              <div className="flex bg-slate-900/80 backdrop-blur-xl rounded-xl p-1 border border-white/10 shadow-2xl">
                <button 
                  onClick={() => setShowWindyRadar(!showWindyRadar)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${showWindyRadar ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <FaWind className={showWindyRadar ? 'animate-spin-slow' : ''} />
                  Windy Radar
                </button>
              </div>

              {!showWindyRadar && (
                <div className="flex bg-slate-900/80 backdrop-blur-xl rounded-xl p-1 border border-white/10 shadow-2xl gap-1">
                  {[
                    { id: 'none', label: 'OFF', icon: <FaTimes /> },
                    { id: 'wind_new', label: 'WIND', icon: <FaWind /> },
                    { id: 'precipitation_new', label: 'RAIN', icon: <FaWater /> },
                    { id: 'clouds_new', label: 'CLD', icon: <FaCloudSun /> }
                  ].map((layer) => (
                    <button
                      key={layer.id}
                      onClick={() => setWeatherLayer(layer.id as any)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${weatherLayer === layer.id ? 'bg-white/10 text-white border border-white/10' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      {layer.icon}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {showWindyRadar && (
              <div className="absolute inset-0 z-30 bg-black animate-in fade-in duration-500 rounded-2xl overflow-hidden">
                <iframe 
                  src={`https://embed.windy.com/embed2.html?lat=14.28&lon=121.41&zoom=8&level=surface&overlay=wind&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1`}
                  className="w-full h-full border-none"
                  title="Windy Radar Admin"
                />
                <button 
                  onClick={() => setShowWindyRadar(false)}
                  className="absolute top-4 right-4 z-40 bg-red-600 text-white p-2 rounded-full shadow-2xl hover:bg-red-500 transition-all border border-white/20"
                >
                  <FaTimes />
                </button>
              </div>
            )}

            <div className="h-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-inner relative">
              <MapboxMap
                {...viewState}
                onMove={(evt: any) => setViewState(evt.viewState)}
                mapStyle="mapbox://styles/mapbox/dark-v11"
                mapboxAccessToken={MAPBOX_TOKEN}
                style={{ height: '100%', width: '100%' }}
              >
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
                {/* Layer Controls Widget */}
                <div className="absolute right-4 top-4 z-10 bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700 p-4 min-w-[180px]">
                  <div className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4 border-b border-slate-800 pb-2">Tactical_Layers</div>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-[11px] font-black text-slate-300 group-hover:text-red-500 transition-colors uppercase tracking-tight">Active_Incidents</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-700 bg-slate-800 text-red-600 focus:ring-red-500/50 w-4 h-4"
                        checked={mapLayers.showIncidents} 
                        onChange={(e) => setMapLayers(v => ({ ...v, showIncidents: e.target.checked }))} 
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-[11px] font-black text-slate-300 group-hover:text-emerald-500 transition-colors uppercase tracking-tight">Shelter_Network</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500/50 w-4 h-4"
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
          </div>
        </div>

        {/* Enhanced Charts Section - Responsive */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
          {/* Incidents This Week - Bar Chart */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="bg-purple-100 text-purple-600 rounded-lg p-2">
                  <FaChartBar className="text-sm" />
                </div>
                Incidents This Week
              </h3>
              <div className="flex items-center gap-2">
                <select className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option>This Week</option>
                  <option>This Month</option>
                  <option>This Year</option>
                </select>
              </div>
            </div>
            <div className="h-64 md:h-72 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-3 md:p-4">
              <Bar data={incidentChartData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: 'top' as const,
                    labels: {
                      usePointStyle: true,
                      padding: 20,
                      font: {
                        size: 12,
                        weight: 500
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(0, 0, 0, 0.05)',
                    },
                    ticks: {
                      font: {
                        size: 11
                      }
                    }
                  },
                  x: {
                    grid: {
                      display: false,
                    },
                    ticks: {
                      font: {
                        size: 11
                      }
                    }
                  }
                }
              }} />
            </div>
          </div>

          {/* Incident Types - Doughnut Chart */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="bg-orange-100 text-orange-600 rounded-lg p-2">
                  <FaChartPie className="text-sm" />
                </div>
                Incident Types
              </h3>
            </div>
            <div className="h-64 md:h-72 flex items-center justify-center">
              <div className="w-full max-w-xs">
                <Doughnut data={incidentTypeData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom' as const,
                      labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                          size: 11,
                          weight: 500
                        }
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context: any) {
                          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                          const percentage = ((context.parsed / total) * 100).toFixed(1);
                          return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                      }
                    }
                  },
                  cutout: '60%',
                }} />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-center text-sm text-gray-600">
                Total incidents this month: <span className="font-bold text-gray-900">47</span>
              </div>
            </div>
          </div>
        </div>

        {/* Response Time Trend */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="bg-green-100 text-green-600 rounded-lg p-2">
                <FaChartLine className="text-sm" />
              </div>
              Response Time Trend
            </h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 text-xs md:text-sm">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Average Response Time</span>
              </div>
              <div className="flex items-center gap-2 text-xs md:text-sm">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Target Time</span>
              </div>
            </div>
          </div>
          <div className="h-56 md:h-64 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-3 md:p-4">
            <Line data={responseTimeData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  mode: 'index',
                  intersect: false,
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  titleColor: '#374151',
                  bodyColor: '#6B7280',
                  borderColor: '#E5E7EB',
                  borderWidth: 1,
                  cornerRadius: 8,
                  displayColors: true,
                  callbacks: {
                    label: function(context: any) {
                      return `${context.dataset.label}: ${context.parsed.y} minutes`;
                    }
                  }
                }
              },
              scales: {
                x: {
                  grid: {
                    display: false,
                  },
                  ticks: {
                    font: {
                      size: 11
                    }
                  }
                },
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                  },
                  ticks: {
                    font: {
                      size: 11
                    },
                    callback: function(value: any) {
                      return value + ' min';
                    }
                  }
                }
              },
              interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
              }
            }} />
          </div>
        </div>
      </div>
      {isViewingDetails && selectedIncident && (
        <ReportDetailsOverlay 
          incident={selectedIncident} 
          onClose={() => setIsViewingDetails(false)}
        />
      )}
    </>
  );
}

const ReportDetailsOverlay = ({ incident, onClose }: any) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-500 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Moderate': return 'bg-yellow-500 text-white';
      case 'Low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Verified': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a] flex flex-col md:flex-row animate-in fade-in duration-300 font-mono text-white">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-[110] transition-all"
      >
        <FaTimes className="text-xl" />
      </button>

      {/* Left: Media/Visual */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full relative bg-[#1c1c1e]">
        {incident.media ? (
          <img src={incident.media.startsWith('data:') ? incident.media : `/uploads/${incident.media}`} alt="Evidence" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#3a3a3c]">
            <FaWater className="text-[120px] mb-4 opacity-20" />
            <span className="text-lg tracking-widest uppercase opacity-50 font-bold">NO_VISUAL_DATA</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80" />
        <div className="absolute bottom-12 left-12">
          <span className={`px-4 py-1.5 rounded-full text-[12px] font-bold uppercase tracking-widest border ${getStatusColor(incident.status)}`}>
            {incident.status}
          </span>
          <h1 className="text-white text-5xl font-bold mt-4 tracking-tight leading-tight">{incident.type || 'Incident Report'}</h1>
          <p className="text-[#8e8e93] text-lg mt-2 max-w-md">{incident.location || 'Active Incident Zone'}</p>
        </div>
      </div>

      {/* Right: Data */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full bg-[#0a0a0a] p-12 overflow-y-auto custom-scrollbar flex flex-col">
        <div className="mb-12">
          <h3 className="text-[#f59e0b] font-bold text-sm tracking-[0.3em] uppercase mb-8">Incident_Metrics</h3>
          
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-[#2c2c2e]">
              <p className="text-[#8e8e93] text-[11px] font-bold uppercase tracking-widest mb-2">Severity_Index</p>
              <div className={`text-2xl font-bold px-4 py-1 rounded-lg inline-block ${getSeverityColor(incident.severity)}`}>
                {incident.severity || 'Moderate'}
              </div>
            </div>
            <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-[#2c2c2e]">
              <p className="text-[#8e8e93] text-[11px] font-bold uppercase tracking-widest mb-2">Report_Reference</p>
              <p className="text-white text-2xl font-mono">INC-{incident.id?.toString().padStart(5, '0') || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 flex-grow">
          <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden border border-[#2c2c2e]">
            <div className="p-4 bg-[#2c2c2e]/50 border-b border-[#2c2c2e] flex justify-between items-center">
              <span className="text-white text-[12px] font-bold tracking-widest uppercase">Field_Description</span>
              <span className="text-[#8e8e93] text-[10px]">{incident.time}</span>
            </div>
            <div className="p-6">
              <p className="text-white text-lg leading-relaxed italic">"{incident.description || 'No additional description provided by the reporter.'}"</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-[#1c1c1e] rounded-2xl p-6 border border-[#2c2c2e]">
                <p className="text-[#8e8e93] text-[11px] uppercase tracking-widest mb-1">Reporter</p>
                <p className="text-white text-[14px] font-bold">{incident.reporter_name || 'Anonymous'}</p>
                <p className="text-[#8e8e93] text-[10px] uppercase mt-1">{incident.reporter_role || 'Resident'}</p>
             </div>
             <div className="bg-[#1c1c1e] rounded-2xl p-6 border border-[#2c2c2e]">
                <p className="text-[#8e8e93] text-[11px] uppercase tracking-widest mb-1">Location_Coord</p>
                <p className="text-white text-[14px] font-bold">{Number(incident.lat).toFixed(4)}, {Number(incident.lng).toFixed(4)}</p>
             </div>
          </div>
        </div>

        <div className="mt-12 flex gap-4">
          <button
            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${incident.lat},${incident.lng}`, '_blank')}
            className="w-full py-4 bg-blue-600 text-white font-black text-[12px] tracking-[0.2em] rounded-xl hover:bg-blue-700 transition-all shadow-lg"
          >
            DISPATCH_COORDINATES
          </button>
        </div>
      </div>
    </div>
  );
};
