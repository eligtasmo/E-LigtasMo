import PageMeta from "../../components/common/PageMeta";
import { useEffect, useState, Suspense, lazy, useContext, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate, Link } from "react-router-dom";
import { FaBullhorn, FaInfoCircle, FaBox, FaCloudSun, FaMap, FaShieldAlt, FaExclamationTriangle, FaPhone, FaRoute, FaSun, FaCloud, FaCloudRain, FaBolt, FaSnowflake, FaTint, FaWind, FaThermometerHalf, FaClock, FaWater } from 'react-icons/fa';
import { FiAlertTriangle } from 'react-icons/fi';
import { AuthContext } from "../../context/AuthContext";
import { fetchWeatherPreferred } from "../../utils/weather";
import { apiFetch } from "../../utils/api";

// Lazy mini-map preview for map-first mode
const MiniMapPreview = lazy(() => import("../../components/saferoutes/MiniMapPreview"));

// Helpers
const getTimeAgo = (iso?: string) => {
  if (!iso) return "Just now";
  const d = new Date(iso);
  const t = d.getTime();
  if (isNaN(t)) return "Just now";
  const diff = Math.floor((Date.now() - t) / 1000);
  if (diff < 0) return "Just now";
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const days = Math.floor(h / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

// Metrics are derived below; keep lightweight defaults
const fetchMetrics = async () => ({
  activeIncidents: 0,
  sheltersAvailable: 0,
  sheltersTotal: 0,
  hazardZones: 4,
});

// Real incidents API (latest approved)
const fetchRecentIncidents = async () => {
  try {
    const res = await apiFetch('unified-incidents.php?status=Approved&limit=5');
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) return [];
    const rows = Array.isArray(data.data) ? data.data : (Array.isArray(data.incidents) ? data.incidents : []);
    return rows.map((incident: any) => ({
      id: incident.id,
      type: incident.type || 'Incident',
      location: incident.location_text || incident.address?.split(',')[0] || 'Unknown location',
      time: getTimeAgo(incident.time || incident.created_at || incident.datetime),
      severity: incident.severity || 'Moderate',
      status: incident.status || 'Approved',
      lat: Number(incident.lat) || 0,
      lng: Number(incident.lng) || 0,
    }));
  } catch {
    return [];
  }
};

// Preferred weather via custom API or OpenWeather fallback
const DEFAULT_LOCATION = { lat: 14.5995, lon: 120.9842 };

const fetchIncidentChartData = async () => ({ labels: [], datasets: [] });

// Custom house icons for shelters (same as admin)
const greenHouseIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiA3VjIwSDIyVjdMMTIgMloiIHN0cm9rZT0iIzI4YTc0NSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSIjMjhhNzQ1IiBmaWxsLW9wYWNpdHk9IjAuMiIvPgo8cGF0aCBkPSJNMTIgMTJIMjJWMjBIMTJWMjBaIiBzdHJva2U9IiMyOGE3NDUiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0iIzI4YTc0NSIgZmlsbC1vcGFjaXR5PSIwLjIiLz4KPHBhdGggZD0iTTIgMTJIMTJWMjBIMlYxMloiIHN0cm9rZT0iIzI4YTc0NSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSIjMjhhNzQ1IiBmaWxsLW9wYWNpdHk9IjAuMiIvPgo8L3N2Zz4K',
  iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40]
});
const yellowHouseIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiA3VjIwSDIyVjdMMTIgMloiIHN0cm9rZT0iI2ZmYzEwNyIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSIjZmZjMTA3IiBmaWxsLW9wYWNpdHk9IjAuMiIvPgo8cGF0aCBkPSJNMTIgMTJIMjJWMjBIMTJWMjBaIiBzdHJva2U9IiNmZmMxMDciIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0iI2ZmYzEwNyIgZmlsbC1vcGFjaXR5PSIwLjIiLz4KPHBhdGggZD0iTTIgMTJIMTJWMjBIMlYxMloiIHN0cm9rZT0iI2ZmYzEwNyIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSIjZmZjMTA3IiBmaWxsLW9wYWNpdHk9IjAuMiIvPgo8L3N2Zz4K',
  iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40]
});
const redHouseIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiA3VjIwSDIyVjdMMTIgMloiIHN0cm9rZT0iI2RjMzU0NSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSIjZGMzNTQ1IiBmaWxsLW9wYWNpdHk9IjAuMiIvPgo8cGF0aCBkPSJNMTIgMTJIMjJWMjBIMTJWMjBaIiBzdHJva2U9IiNkYzM1NDUiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0iI2RjMzU0NSIgZmlsbC1vcGFjaXR5PSIwLjIiLz4KPHBhdGggZD0iTTIgMTJIMTJWMjBIMlYxMloiIHN0cm9rZT0iI2RjMzU0NSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSIjZGMzNTQ1IiBmaWxsLW9wYWNpdHk9IjAuMiIvPgo8L3N2Zz4K',
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
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const [metrics, setMetrics] = useState({ activeIncidents: 0, sheltersAvailable: 0, sheltersTotal: 0, hazardZones: 0, shelterOccupancyPct: 0 });
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [shelters, setShelters] = useState<any[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [incidentChartData, setIncidentChartData] = useState<any>({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);
  const [homeMode, setHomeMode] = useState<string>(() => localStorage.getItem('resident_home_mode') || 'action-first');
  const [homeLoc, setHomeLoc] = useState<{lat: number; lon: number}>(DEFAULT_LOCATION);
  const [nearbyIncident, setNearbyIncident] = useState<any | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [manilaTime, setManilaTime] = useState<string>('');
  const [riskHistory, setRiskHistory] = useState<number[]>([]);
  const navigate = useNavigate();
  const WEATHER_API_KEY = (import.meta as any).env?.VITE_OPENWEATHER_API_KEY || (import.meta as any).env?.VITE_OPENWEATHERMAP_API_KEY;

  const nearestShelter = useMemo(() => {
    if (!shelters || shelters.length === 0) return null;
    const ref = homeLoc || DEFAULT_LOCATION;
    let best: any = null;
    let bestDist = Infinity;
    for (const s of shelters) {
      const lat = Number(s.lat);
      const lng = Number(s.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const d = haversineKm(ref.lat, ref.lon, lat, lng);
      if (d < bestDist) { best = s; bestDist = d; }
    }
    return best ? { shelter: best, distKm: bestDist } : null;
  }, [shelters, homeLoc.lat, homeLoc.lon]);

  const riskScore = useMemo(() => {
    let score = 0;
    const pop = typeof weather?.pop === 'number' ? weather.pop : 0;
    const wind = typeof weather?.wind === 'number' ? weather.wind : 0;
    score += pop * 0.6;
    score += Math.min(wind * 4, 40);
    if (nearbyIncident) {
      const sev = String(nearbyIncident.severity || '').toLowerCase();
      score += sev === 'critical' ? 30 : sev === 'high' ? 20 : 10;
    }
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [weather?.pop, weather?.wind, nearbyIncident]);

  const riskLevel = useMemo(() => {
    if (riskScore >= 80) return { label: 'Critical', color: 'red' };
    if (riskScore >= 60) return { label: 'High', color: 'amber' };
    if (riskScore >= 35) return { label: 'Medium', color: 'yellow' };
    return { label: 'Low', color: 'green' };
  }, [riskScore]);

  const riskDrivers = useMemo(() => {
    const parts: string[] = [];
    if (typeof weather?.pop === 'number') parts.push(`Rain ${weather.pop}%`);
    if (typeof weather?.wind === 'number') parts.push(`Wind ${weather.wind} m/s`);
    if (nearbyIncident?.severity) parts.push(`Incident ${nearbyIncident.severity}`);
    return parts.join(' • ');
  }, [weather?.pop, weather?.wind, nearbyIncident]);

  useEffect(() => {
    setRiskHistory((prev) => {
      const next = [...prev, riskScore];
      if (next.length > 50) next.shift();
      return next;
    });
  }, [riskScore]);

  const riskSparkPath = useMemo(() => {
    const h = 24;
    const w = 120;
    const n = riskHistory.length;
    if (n <= 1) return '';
    const step = w / (n - 1);
    let d = '';
    for (let i = 0; i < n; i++) {
      const x = i * step;
      const y = h - ((riskHistory[i] / 100) * h);
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return d;
  }, [riskHistory]);

  const sparkStroke = useMemo(() => {
    return riskLevel.color === 'red' ? '#ef4444' : riskLevel.color === 'amber' ? '#f59e0b' : riskLevel.color === 'yellow' ? '#f59e0b' : '#22c55e';
  }, [riskLevel.color]);

  // Fetch shelters from real API
  const fetchShelters = async () => {
    try {
      const response = await apiFetch('shelters-list.php');
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : (Array.isArray(data?.shelters) ? data.shelters : []);
    } catch {
      return [];
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const role = (user?.role || 'resident').toLowerCase();
      const brgy = (user as any)?.brgy_name || (user as any)?.barangay || '';
      let url = `list-announcements.php?audience=residents&limit=5`;
      if (brgy) {
        url += `&brgy=${encodeURIComponent(brgy)}`;
      }
      const res = await apiFetch(url, { headers: { 'X-Role': role } });
      const data = await res.json();
      if ((data?.success && Array.isArray(data.announcements)) || Array.isArray(data)) {
        const arr = Array.isArray(data.announcements) ? data.announcements : data;
        const rows = Array.isArray(arr) ? arr : [];
        return rows.map((a: any) => ({
          id: a.id ?? Date.now(),
          title: a.title ?? a.event ?? 'Announcement',
          message: a.message ?? a.description ?? '',
          type: a.type ?? 'info',
          date: a.date ?? a.start ?? new Date().toISOString(),
          sender: a.sender ?? a.sender_name ?? 'Admin',
          audience: a.audience ?? 'Residents'
        }));
      }
      return [];
    } catch {
      return [];
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    const [m, i, s, w, a, c, ann] = await Promise.all([
      fetchMetrics().catch(() => ({ activeIncidents: 0, sheltersAvailable: 0, sheltersTotal: 0, hazardZones: 0 })),
      fetchRecentIncidents().catch(() => []),
      fetchShelters().catch(() => []),
      fetchWeatherOpenMeteo(homeLoc).catch(() => null),
      Promise.resolve([]),
      fetchIncidentChartData().catch(() => ({ labels: [], datasets: [] })),
      fetchAnnouncements().catch(() => []),
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
    setAlerts(w?.alerts || []);
    setAnnouncements(ann || []);
    setLastUpdated(new Date());
    setIncidentChartData(c);
    // Compute nearby incident callout for Critical/High within 3km of homeLoc
    const criticalOrHigh = i.filter((inc: any) => inc.severity === 'Critical' || inc.severity === 'High');
    const withinRadius = criticalOrHigh
      .map((inc: any) => ({ ...inc, distKm: haversineKm(homeLoc.lat, homeLoc.lon, inc.lat, inc.lng) }))
      .filter((inc: any) => inc.distKm <= 3);
    setNearbyIncident(withinRadius.length > 0 ? withinRadius.sort((a: any, b: any) => a.distKm - b.distKm)[0] : null);
    setLoading(false);
  };

  function getWeatherIcon(iconCode?: string, size: string = "text-3xl") {
    const code = iconCode || '02d';
    const map: Record<string, React.ReactElement> = {
      '01d': <FaSun className={`${size} text-yellow-400`} />,
      '01n': <FaSun className={`${size} text-yellow-300`} />,
      '02d': <FaCloudSun className={`${size} text-yellow-300`} />,
      '02n': <FaCloudSun className={`${size} text-yellow-200`} />,
      '03d': <FaCloud className={`${size} text-gray-300`} />,
      '03n': <FaCloud className={`${size} text-gray-400`} />,
      '04d': <FaCloud className={`${size} text-gray-400`} />,
      '04n': <FaCloud className={`${size} text-gray-500`} />,
      '09d': <FaCloudRain className={`${size} text-blue-400`} />,
      '09n': <FaCloudRain className={`${size} text-blue-300`} />,
      '10d': <FaCloudRain className={`${size} text-blue-500`} />,
      '10n': <FaCloudRain className={`${size} text-blue-400`} />,
      '11d': <FaBolt className={`${size} text-purple-500`} />,
      '11n': <FaBolt className={`${size} text-purple-400`} />,
      '13d': <FaSnowflake className={`${size} text-blue-200`} />,
      '13n': <FaSnowflake className={`${size} text-blue-100`} />,
      '50d': <FaCloud className={`${size} text-gray-400`} />,
      '50n': <FaCloud className={`${size} text-gray-300`} />,
    };
    return map[code] || <FaCloudSun className={`${size} text-gray-300`} />;
  }

  useEffect(() => {
    let timer: any;
    const poll = async () => {
      try {
        const w = await fetchWeatherOpenMeteo(homeLoc);
        if (w) {
          setWeather(w);
          setAlerts(w?.alerts || []);
          setLastUpdated(new Date());
        }
      } catch {}
    };
    poll();
    timer = setInterval(poll, 5000);
    return () => { if (timer) clearInterval(timer); };
  }, [homeLoc.lat, homeLoc.lon]);

  useEffect(() => {
    setHomeLoc(DEFAULT_LOCATION);
  }, [user?.brgy_name]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [homeLoc.lat, homeLoc.lon]);

  useEffect(() => {
    const update = () => setManilaTime(new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila' }));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  // Persist home mode
  useEffect(() => {
    localStorage.setItem('resident_home_mode', homeMode);
  }, [homeMode]);

  return (
    <>
      <PageMeta
        title="Resident Dashboard - E-LigtasMo"
        description="Your personalized safety dashboard."
      />
      <div className="min-h-screen w-full bg-[#fcfcfd] px-4 py-8 lg:px-12 space-y-10">
        {/* Header / Weather Section */}
        <div className="bento-card overflow-hidden !rounded-[2.5rem]">
          <div className="bg-white p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-4 rounded-3xl bg-gray-50 border border-gray-100">
                  {getWeatherIcon(weather?.icon, "text-4xl")}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">Weather Now</h1>
                    <span className="capsule-chip bg-gray-100 text-gray-900 border border-gray-200">
                      {user?.brgy_name || 'Santa Cruz, Laguna'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-3">
                    <div className="text-5xl sm:text-6xl font-black text-black tracking-tighter">
                      {typeof weather?.temp === 'number' ? `${weather.temp}°C` : '—'}
                    </div>
                    <div className="text-sm sm:text-base text-gray-500 font-medium uppercase tracking-widest">
                      {weather?.desc || '—'}
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <div className="capsule-chip bg-gray-50 border border-gray-100 text-gray-700 flex items-center gap-2">
                      <FaThermometerHalf className="text-black opacity-40" />
                      <span>Feels {typeof weather?.feels_like === 'number' ? `${weather.feels_like}°C` : '—'}</span>
                    </div>
                    <div className="capsule-chip bg-gray-50 border border-gray-100 text-gray-700 flex items-center gap-2">
                      <FaTint className="text-black opacity-40" />
                      <span>{typeof weather?.humidity === 'number' ? `${weather.humidity}%` : '—'} Humidity</span>
                    </div>
                    <div className="capsule-chip bg-gray-50 border border-gray-100 text-gray-700 flex items-center gap-2">
                      <FaWind className="text-black opacity-40" />
                      <span>{typeof weather?.wind === 'number' ? `${weather.wind} m/s` : '—'} Wind</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Announcements Bar */}
        <div className="bg-gray-900 p-3 sm:p-4 border-t border-gray-800 rounded-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-amber-200">Announcements</h2>
            {((auth?.user?.role || '').toLowerCase() === 'admin' || (auth?.user?.role || '').toLowerCase() === 'brgy') ? (
              <Link to={(auth?.user?.role || '').toLowerCase() === 'admin' ? '/admin/announcements' : '/announcements'} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-md text-xs font-medium">
                <FaBullhorn size={14} /> Manage
              </Link>
            ) : (
              <Link to="/announcements" className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 px-2.5 py-1.5 rounded-md text-xs font-medium">
                <FaBullhorn size={14} /> View All
              </Link>
            )}
          </div>
          <div className="mt-2 space-y-1.5">
            {(announcements && announcements.length > 0) ? (
              (() => {
                const a = announcements[0];
                return (
                  <div className="flex items-start gap-2 bg-amber-900/30 border border-amber-700 rounded-lg p-2">
                    <FaBullhorn className="text-amber-300" size={14} />
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-amber-100">{a.title}</div>
                      <div className="text-[11px] text-amber-100/90 line-clamp-2">{a.message}</div>
                    </div>
                    <div className="text-[10px] text-amber-200/70 mt-0.5 whitespace-nowrap">{new Date(a.created_at || a.date).toLocaleString()}</div>
                  </div>
                );
              })()
            ) : (
              <div className="text-xs text-amber-100/80">No announcements yet.</div>
            )}
          </div>
        </div>

        {/* Weather Alerts / Announcements */}
        {alerts && alerts.length > 0 && (
          <div className="bg-white rounded-lg border border-yellow-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-yellow-800">Weather Alerts</h3>
              <span className="text-xs text-yellow-700">{alerts.length} active</span>
            </div>
            <div className="space-y-2">
              {alerts.slice(0,3).map((al: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                  <FaBullhorn className="text-yellow-600" size={16} />
                  <div>
                    <div className="text-xs font-semibold text-yellow-800">{al.event || 'Alert'}</div>
                    <div className="text-[11px] text-yellow-800/80 line-clamp-2">{al.description || ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Nearby Incident Callout */}
        {nearbyIncident && (
          <div className={`rounded-xl border p-4 shadow-sm flex items-start gap-3 ${
            nearbyIncident.severity === 'Critical' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <FaExclamationTriangle className={`${nearbyIncident.severity === 'Critical' ? 'text-red-600' : 'text-amber-600'}`} size={18} />
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900">
                Nearby incident: {nearbyIncident.type} at {nearbyIncident.location}
              </div>
              <div className="text-xs text-gray-700">Approximately {nearbyIncident.distKm.toFixed(1)} km away • {nearbyIncident.time}</div>
            </div>
            <Link to="/route-planner" className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-md">Navigate</Link>
          </div>
        )}
        

        {homeMode === 'map-first' && (
          <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4 shadow-sm">
            <Suspense fallback={<div className="h-48 bg-gray-100 animate-pulse rounded-lg" />}> 
              <MiniMapPreview />
            </Suspense>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { to: "/safe-routes", icon: <FaMap />, label: "Routes", sub: "View paths" },
            { to: "/shelters", icon: <FaShieldAlt />, label: "Shelters", sub: "Safe spaces" },
            { to: "/resident/report-incident", icon: <FaExclamationTriangle />, label: "Report", sub: "Alert community" },
            { to: "/route-planner", icon: <FaRoute />, label: "Planner", sub: "Plan route" },
            { to: "/weather", icon: <FaCloudSun />, label: "Weather", sub: "Forecast" },
            { to: "/resources", icon: <FaPhone />, label: "Emergency", sub: "Guides" },
          ].map((action, idx) => (
            <Link key={idx} to={action.to} className="bento-card p-6 flex flex-col items-center text-center gap-3 active:scale-95">
              <div className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-2xl text-black border border-gray-100 shadow-sm">
                {action.icon}
              </div>
              <div>
                <div className="font-bold text-black text-sm">{action.label}</div>
                <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">{action.sub}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Compact Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-xs text-gray-500">Active Incidents</div>
            <div className="text-xl font-bold text-gray-900">{recentIncidents.length}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-xs text-gray-500">Shelters Available</div>
            <div className="text-sm text-gray-900">{metrics.sheltersAvailable} / {metrics.sheltersTotal}</div>
            <div className="text-xs text-gray-600">{metrics.shelterOccupancyPct}% occupied</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-xs text-gray-500">Hazard Zones</div>
            <div className="text-xl font-bold text-gray-900">{metrics.hazardZones}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-xs text-gray-500">Weather</div>
            <div className="text-sm font-semibold text-gray-900">{weather ? weather.desc : '-'}</div>
          </div>
        </div>

        {/* Stats and Recent Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-black">Active Alerts</h3>
              <Link to="/notifications" className="text-sm font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-widest">See All</Link>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {recentIncidents.slice(0, 3).map((inc, idx) => (
                <div key={inc.id || idx} className="bento-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 flex items-center justify-center rounded-2xl flex-shrink-0 ${
                      inc.severity === 'Critical' ? 'bg-red-50 text-red-600' :
                      inc.severity === 'High' ? 'bg-orange-50 text-orange-600' :
                      'bg-gray-50 text-gray-900'
                    }`}>
                      <FiAlertTriangle size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-black text-lg">{inc.type}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-semibold text-gray-400">{inc.location}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span className="text-xs font-semibold text-gray-400">{inc.time}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`capsule-chip ${
                      inc.severity === 'Critical' ? 'bg-red-50 text-red-700 border border-red-100' :
                      inc.severity === 'High' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                      'bg-gray-50 text-gray-700 border border-gray-100'
                    }`}>
                      {inc.severity}
                    </span>
                    <Link to="/route-planner" className="p-3 bg-black text-white rounded-2xl hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-black/10">
                      <FaRoute size={18} />
                    </Link>
                  </div>
                </div>
              ))}
              {recentIncidents.length === 0 && (
                <div className="bento-card p-12 text-center">
                  <div className="text-gray-400 font-medium">No recent incidents reported.</div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <h3 className="text-xl font-black text-black">Risk Analysis</h3>
            <div className="bento-card p-8 bg-black text-white border-0 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between mb-8">
                <span className="text-sm font-bold opacity-60 uppercase tracking-widest leading-none">Overall Risk</span>
                <span className="text-xs font-black bg-white/20 px-3 py-1.5 rounded-full uppercase tracking-widest">{riskLevel.label}</span>
              </div>
              <div className="text-7xl font-black tracking-tighter mb-4">{riskScore}</div>
              <div className="h-4 w-full bg-white/10 rounded-full overflow-hidden mb-6 relative">
                 <div 
                   className={`h-full transition-all duration-1000 ease-out ${
                     riskLevel.color === 'red' ? 'bg-red-500' : 
                     riskLevel.color === 'amber' ? 'bg-orange-500' : 
                     'bg-green-500'
                   }`}
                   style={{ width: `${riskScore}%` }}
                 />
              </div>
              <p className="text-sm font-medium opacity-80 leading-relaxed">
                {riskDrivers || 'Your area is currently safe with low reported activity.'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Community Risk Level Footer */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-gray-900">Community Risk Level</div>
                  <div className="relative group">
                    <FaInfoCircle className="text-gray-400 text-xs" />
                    <div className="absolute left-0 mt-2 z-10 invisible group-hover:visible bg-white border border-gray-200 rounded-md shadow px-2 py-1 text-[11px] text-gray-700 whitespace-nowrap">
                      {riskDrivers || 'No risk drivers'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5 text-[11px]">
                  <button onClick={() => setHomeMode('action-first')} className={`${homeMode === 'action-first' ? 'bg-white shadow text-gray-900' : 'text-gray-600'} px-2 py-1 rounded`}>Actions</button>
                  <button onClick={() => setHomeMode('map-first')} className={`${homeMode === 'map-first' ? 'bg-white shadow text-gray-900' : 'text-gray-600'} px-2 py-1 rounded`}>Map</button>
                </div>
              </div>
              <div className="h-3 rounded-full bg-gray-100 mt-2">
                <div
                  className={`h-3 rounded-full ${riskLevel.color === 'red' ? 'bg-red-500' : riskLevel.color === 'amber' ? 'bg-amber-500' : riskLevel.color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${riskScore}%` }}
                />
              </div>
              <div className={`mt-2 text-xs font-semibold ${riskLevel.color === 'red' ? 'text-red-600' : riskLevel.color === 'amber' ? 'text-amber-600' : riskLevel.color === 'yellow' ? 'text-yellow-700' : 'text-green-700'}`}>{riskLevel.label}</div>
              <svg viewBox="0 0 120 24" className="w-full h-6 mt-2">
                <path d={riskSparkPath} stroke={sparkStroke} fill="none" strokeWidth="2" />
              </svg>
            </div>
            <div className="w-full lg:w-80 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-3">
              <div className="text-xs font-semibold text-blue-800 mb-1">Nearest Shelter</div>
              {nearestShelter ? (
                <div>
                  <div className="text-sm font-semibold text-gray-900">{nearestShelter.shelter?.name || nearestShelter.shelter?.title || 'Shelter'}</div>
                  <div className="text-xs text-gray-700">{nearestShelter.distKm.toFixed(1)} km away</div>
                  <div className="text-xs text-gray-600 mt-1">{(nearestShelter.shelter?.occupancy ?? 0)} / {(nearestShelter.shelter?.capacity ?? 0)} occupied</div>
                  <div className="mt-2 flex gap-2">
                    <Link to="/shelters" className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-md">Open Shelters</Link>
                    <Link to="/route-planner" className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-md">Route</Link>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-600">No shelters found nearby.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Haversine distance in km
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function fetchWeatherOpenMeteo(loc: { lat: number; lon: number }) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code&hourly=precipitation_probability,uv_index&daily=uv_index_max,precipitation_probability_mean&timezone=Asia%2FManila`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    const c = data.current || {};
    const info = mapOpenMeteoCode(Number(c.weather_code ?? 2));
    const h = data.hourly || {};
    const d = data.daily || {};
    const popHourly = Array.isArray(h.precipitation_probability) ? h.precipitation_probability : [];
    const uvHourly = Array.isArray(h.uv_index) ? h.uv_index : [];
    const popDailyMean = Array.isArray(d.precipitation_probability_mean) ? d.precipitation_probability_mean : [];
    const uvDailyMax = Array.isArray(d.uv_index_max) ? d.uv_index_max : [];
    const pop = popHourly.length ? popHourly[popHourly.length - 1] : (popDailyMean.length ? popDailyMean[0] : undefined);
    const uvi = uvHourly.length ? uvHourly[uvHourly.length - 1] : (uvDailyMax.length ? uvDailyMax[0] : undefined);
    return {
      temp: typeof c.temperature_2m === 'number' ? Math.round(c.temperature_2m) : undefined,
      feels_like: typeof c.apparent_temperature === 'number' ? Math.round(c.apparent_temperature) : undefined,
      desc: info.description,
      humidity: typeof c.relative_humidity_2m === 'number' ? c.relative_humidity_2m : undefined,
      wind: typeof c.wind_speed_10m === 'number' ? c.wind_speed_10m : undefined,
      pop: typeof pop === 'number' ? Math.round(pop) : undefined,
      uvi: typeof uvi === 'number' ? Math.round(uvi) : undefined,
      alerts: [],
      icon: info.icon,
    } as any;
  } catch {
    return null;
  }
}

function mapOpenMeteoCode(code: number): { main: string; description: string; icon: string } {
  const m: Record<number, { main: string; description: string; icon: string }> = {
    0: { main: 'Clear', description: 'Clear sky', icon: '01d' },
    1: { main: 'Clear', description: 'Mainly clear', icon: '02d' },
    2: { main: 'Clouds', description: 'Partly cloudy', icon: '03d' },
    3: { main: 'Clouds', description: 'Overcast', icon: '04d' },
    45: { main: 'Fog', description: 'Fog', icon: '50d' },
    48: { main: 'Fog', description: 'Depositing rime fog', icon: '50d' },
    51: { main: 'Drizzle', description: 'Light drizzle', icon: '09d' },
    53: { main: 'Drizzle', description: 'Moderate drizzle', icon: '09d' },
    55: { main: 'Drizzle', description: 'Dense drizzle', icon: '09d' },
    56: { main: 'Drizzle', description: 'Light freezing drizzle', icon: '09d' },
    57: { main: 'Drizzle', description: 'Dense freezing drizzle', icon: '09d' },
    61: { main: 'Rain', description: 'Slight rain', icon: '10d' },
    63: { main: 'Rain', description: 'Moderate rain', icon: '10d' },
    65: { main: 'Rain', description: 'Heavy rain', icon: '10d' },
    66: { main: 'Rain', description: 'Light freezing rain', icon: '10d' },
    67: { main: 'Rain', description: 'Heavy freezing rain', icon: '10d' },
    71: { main: 'Snow', description: 'Slight snow', icon: '13d' },
    73: { main: 'Snow', description: 'Moderate snow', icon: '13d' },
    75: { main: 'Snow', description: 'Heavy snow', icon: '13d' },
    77: { main: 'Snow', description: 'Snow grains', icon: '13d' },
    80: { main: 'Rain', description: 'Rain showers', icon: '10d' },
    81: { main: 'Rain', description: 'Rain showers', icon: '10d' },
    82: { main: 'Rain', description: 'Violent rain showers', icon: '11d' },
    85: { main: 'Snow', description: 'Snow showers', icon: '13d' },
    86: { main: 'Snow', description: 'Snow showers', icon: '13d' },
    95: { main: 'Thunderstorm', description: 'Thunderstorm', icon: '11d' },
    96: { main: 'Thunderstorm', description: 'Thunderstorm with hail', icon: '11d' },
    99: { main: 'Thunderstorm', description: 'Thunderstorm with hail', icon: '11d' },
  };
  return m[code] || { main: 'Clouds', description: 'Cloudy', icon: '03d' };
}
