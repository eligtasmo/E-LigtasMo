import PageMeta from "../../components/common/PageMeta";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, FormEvent, useMemo, useRef } from "react";
import { FaExclamationTriangle, FaCheckCircle, FaUsers, FaMapMarkerAlt, FaPlus, FaBullhorn, FaHome, FaTimes, FaWater, FaList } from "react-icons/fa";
import { FiMapPin, FiClock as FiClockIcon, FiChevronRight, FiSearch, FiFilter, FiRefreshCw } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { toast } from 'react-hot-toast';
import MapboxMap, { Marker, Popup, NavigationControl, FullscreenControl, Source, Layer } from '../../components/maps/MapboxMap';
import { apiFetch } from "../../utils/api";
import * as turf from '@turf/turf';
import TacticalMarker from "../../components/maps/TacticalMarker";
import { useGlobalMapContext } from "../../context/MapContext";

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN) as string | undefined;
const OWM_KEY = import.meta.env.VITE_OPENWEATHERMAP_API_KEY as string | undefined;

const BrgyHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [barangayLocation, setBarangayLocation] = useState<{lat: number, lng: number, address: string} | null>(null);

  useEffect(() => {
    if (user && (user as any).lat && (user as any).lng) {
      setBarangayLocation({
        lat: Number((user as any).lat),
        lng: Number((user as any).lng),
        address: `${user.brgy_name}, ${user.city || ''}, ${user.province || ''}`
      });
    }
  }, [user]);

  // Metrics and Data
  const [metrics, setMetrics] = useState({
    activeIncidents: 0,
    pendingApprovals: 0,
    shelterCapacity: "0/0",
    statusUpdatedBy: null as string | null
  });
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [hazards, setHazards] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [shelters, setShelters] = useState<any[]>([]);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [activeTab, setActiveTab] = useState('Pending');
  const [loadingData, setLoadingData] = useState(false);
  const [weatherLayer, setWeatherLayer] = useState<'none' | 'wind_new' | 'precipitation_new' | 'clouds_new'>('none');
  const [showWindyRadar, setShowWindyRadar] = useState(false);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const brgyName = user?.brgy_name || '';
      // Fetch all announcements for barangay
      const annUrl = `list-announcements.php?audience=all&limit=1000${brgyName ? `&brgy=${encodeURIComponent(brgyName)}` : ''}`;
      const resAnnouncements = await apiFetch(annUrl, { headers: { 'X-Role': 'brgy' } });
      const dataAnnouncements = await resAnnouncements.json();
      if (dataAnnouncements.success) setAnnouncements(dataAnnouncements.announcements || []);

      // Load Unified Incidents for metrics
      const resReports = await apiFetch(`unified-incidents.php?limit=1000`);
      const dataReports = await resReports.json();
      
      if (dataReports.success && Array.isArray(dataReports.data)) {
        const allData = dataReports.data;
        setRecentIncidents(allData); 
        
        // Calculate metrics
        const pending = allData.filter((r: any) => r.status.toUpperCase() === 'PENDING').length;
        const active = allData.filter((r: any) => ['ACTIVE', 'APPROVED', 'VERIFIED'].includes(r.status.toUpperCase())).length;
        
        setMetrics(prev => ({
          ...prev,
          activeIncidents: active,
          pendingApprovals: pending
        }));
      }

      try {
        const hazardsRes = await apiFetch('list-hazards.php');
        const hazardsData = await hazardsRes.json();
        setHazards(Array.isArray(hazardsData) ? hazardsData : []);
      } catch {
        setHazards([]);
      }

      // Load Shelters
      const resShelters = await apiFetch('shelters-list.php');
      const dataShelters = await resShelters.json();
      if (Array.isArray(dataShelters)) {
        setShelters(dataShelters);
        
        // Calculate Shelter Capacity Metric
        const totalCapacity = dataShelters.reduce((acc, curr) => acc + (Number(curr.capacity) || 0), 0);
        const totalOccupancy = dataShelters.reduce((acc, curr) => acc + (Number(curr.occupancy) || 0), 0);
        setMetrics(prev => ({
          ...prev,
          shelterCapacity: `${totalOccupancy}/${totalCapacity}`
        }));
      }

      // Load Barangay Status for Audit
      try {
        const brgyName = user?.brgy_name || user?.barangay || 'Poblacion I';
        const resStatus = await apiFetch(`barangay-status.php?barangay=${encodeURIComponent(brgyName)}`);
        const dataStatus = await resStatus.json();
        if (dataStatus.status === 'success' && dataStatus.data) {
          setMetrics(prev => ({
            ...prev,
            statusUpdatedBy: dataStatus.data.updated_by || null
          }));
        }
      } catch (e) {
        console.error("Error loading brgy status:", e);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-500 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Moderate': return 'bg-yellow-500 text-white';
      case 'Medium': return 'bg-yellow-500 text-white';
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

  const formatTime = (datetime: string) => {
    const date = new Date(datetime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
    return date.toLocaleDateString();
  };

  const handleReject = async (id: number) => {
    if (!confirm("Are you sure you want to reject this report?")) return;

    try {
      const res = await apiFetch("reject-incident-report.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id, 
          rejected_by: user?.username || "Barangay Official" 
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Report rejected");
        loadData();
      } else {
        toast.error(data.error || "Failed to reject report");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const handleResolve = async (id: number) => {
    if (!confirm("Are you sure you want to mark this report as RESOLVED? This means the flood has subsided.")) return;

    try {
      const res = await apiFetch("resolve-incident-report.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id, 
          resolved_by: user?.username || "Barangay Official" 
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Report resolved");
        loadData();
      } else {
        toast.error(data.error || "Failed to resolve report");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const handleApprove = async (id: number) => {
    if (!confirm("Are you sure you want to verify this report?")) return;
    
    try {
      const res = await apiFetch("approve-incident-report.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id, 
          approved_by: user?.username || "Barangay Official" 
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Report verified successfully");
        loadData(); // Reload data
      } else {
        toast.error(data.error || "Failed to verify report");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  // Derived state for filtered incidents
  const filteredIncidents = recentIncidents.filter(incident => {
    // 1. Tab Filter
    if (activeTab === 'Pending' && incident.status !== 'Pending') return false;
    if (activeTab === 'Verified' && incident.status !== 'Verified' && incident.status !== 'Approved') return false;
    if (activeTab === 'Resolved' && incident.status !== 'Resolved') return false;
    if (activeTab === 'Rejected' && incident.status !== 'Rejected') return false;

    // 2. Search Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const match = (
        (incident.description || '').toLowerCase().includes(term) ||
        (incident.barangay || '').toLowerCase().includes(term) ||
        (incident.location_text || '').toLowerCase().includes(term) ||
        (incident.type || 'Flood').toLowerCase().includes(term) ||
        String(incident.id).includes(term)
      );
      if (!match) return false;
    }

    // 3. Severity Filter
    if (filterSeverity !== 'all' && (incident.severity || 'Moderate') !== filterSeverity) return false;

    return true;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.time || b.created_at).getTime() - new Date(a.time || a.created_at).getTime();
    if (sortBy === 'oldest') return new Date(a.time || a.created_at).getTime() - new Date(b.time || b.created_at).getTime();
    return 0;
  });

  const counts = {
    All: recentIncidents.length,
    Pending: recentIncidents.filter(i => i.status === 'Pending').length,
    Verified: recentIncidents.filter(i => i.status === 'Verified' || i.status === 'Approved').length,
    Resolved: recentIncidents.filter(i => i.status === 'Resolved').length,
    Rejected: recentIncidents.filter(i => i.status === 'Rejected').length,
  };

  const [selectedIncident, setSelectedBrgyIncident] = useState<any | null>(null);
  const [selectedShelter, setSelectedBrgyShelter] = useState<any | null>(null);

  const { viewport: viewState, setViewport: setViewState, updateViewport } = useGlobalMapContext();
  const mapRef = useRef<any>(null);
  const [mapDebugOpen, setMapDebugOpen] = useState(false);
  const [mapLayers, setMapLayers] = useState({
    showIncidents: true,
    showShelters: true,
    showHazards: true
  });

  // Center on barangay location if available
  useEffect(() => {
    if (barangayLocation) {
      updateViewport({
        latitude: barangayLocation.lat,
        longitude: barangayLocation.lng,
        zoom: 14
      });
    }
  }, [barangayLocation]);

  const incidentGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: recentIncidents
      .filter(inc => ['VERIFIED', 'ACTIVE', 'APPROVED', 'RESOLVED'].includes((inc.status || '').toUpperCase()))
      .map(inc => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [Number(inc.lng), Number(inc.lat)]
        },
        properties: { ...inc }
      }))
  }), [recentIncidents]);

  const hazardGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: hazards
      .filter(h => Number.isFinite(Number((h as any).latitude ?? (h as any).lat)) && Number.isFinite(Number((h as any).longitude ?? (h as any).lng)))
      .map(h => {
        const lat = Number(h.latitude ?? h.lat);
        const lng = Number(h.longitude ?? h.lng);
        const severity = String(h.severity || 'low').toLowerCase();
        const severityIndex = severity === 'critical' ? 1 : severity === 'high' ? 0.8 : severity === 'medium' ? 0.55 : 0.35;
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [lng, lat]
          },
          properties: { ...h, severity, severity_index: severityIndex }
        };
      })
  }), [hazards]);

  const hazardCoverageGeoJSON = useMemo(() => {
    const features: any[] = [];
    for (const h of hazards as any[]) {
      const severityRaw = String(h?.severity || 'low').toLowerCase();
      const severity =
        severityRaw === 'critical' ? 'critical' :
        severityRaw === 'high' ? 'high' :
        severityRaw === 'moderate' || severityRaw === 'medium' ? 'medium' :
        severityRaw === 'low' ? 'low' :
        'low';
      const area = h?.area_geojson;
      if (area) {
        try {
          const parsed = typeof area === 'string' ? JSON.parse(area) : area;
          if (parsed?.type === 'Feature' && parsed?.geometry) {
            features.push({ ...parsed, properties: { ...(parsed.properties || {}), severity } });
            continue;
          }
          if (parsed?.type && parsed?.coordinates) {
            features.push({ type: 'Feature', geometry: parsed, properties: { severity } });
            continue;
          }
        } catch {}
      }
      const lat = Number(h?.latitude ?? h?.lat);
      const lng = Number(h?.longitude ?? h?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const radiusMeters = severity === 'critical' ? 350 : severity === 'high' ? 250 : severity === 'medium' ? 160 : 110;
      try {
        const poly = turf.circle([lng, lat], radiusMeters / 1000, { steps: 64, units: 'kilometers' }) as any;
        poly.properties = { severity };
        features.push(poly);
      } catch {}
    }
    return { type: 'FeatureCollection' as const, features };
  }, [hazards]);

  const floodCoverageGeoJSON = useMemo(() => {
    const features: any[] = [];
    for (const f of incidentGeoJSON.features as any[]) {
      const coords = f?.geometry?.coordinates;
      const severityRaw = String(f?.properties?.severity || 'medium').toLowerCase();
      const severity = severityRaw === 'critical' ? 'critical' : severityRaw === 'high' ? 'high' : severityRaw === 'moderate' || severityRaw === 'medium' ? 'medium' : severityRaw === 'low' ? 'low' : 'medium';
      const area = f?.properties?.area_geojson;
      if (area) {
        try {
          const parsed = typeof area === 'string' ? JSON.parse(area) : area;
          if (parsed?.type === 'Feature' && parsed?.geometry) {
            features.push({ ...parsed, properties: { ...(parsed.properties || {}), severity } });
            continue;
          }
          if (parsed?.type && parsed?.coordinates) {
            features.push({ type: 'Feature', geometry: parsed, properties: { severity } });
            continue;
          }
        } catch {}
      }
      if (!coords || coords.length !== 2) continue;
      const radiusMeters = severity === 'critical' ? 350 : severity === 'high' ? 250 : severity === 'medium' ? 160 : 110;
      try {
        const poly = turf.circle(coords, radiusMeters / 1000, { steps: 64, units: 'kilometers' }) as any;
        poly.properties = { severity };
        features.push(poly);
      } catch {}
    }
    return { type: 'FeatureCollection' as const, features };
  }, [incidentGeoJSON]);

  const mapDebug = useMemo(() => {
    const normalizeFeature = (raw: any) => {
      if (!raw) return null;
      const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
      if (!parsed) return null;
      if (parsed.type === 'Feature' && parsed.geometry) return parsed;
      if (parsed.type && parsed.coordinates) return { type: 'Feature', geometry: parsed, properties: {} };
      if (parsed.geometry && parsed.geometry.type && parsed.geometry.coordinates) return { type: 'Feature', geometry: parsed.geometry, properties: parsed.properties || {} };
      return null;
    };

    const hazardWithArea = (hazards || []).filter((h: any) => !!(h as any)?.area_geojson);
    const floodWithArea = (recentIncidents || []).filter((r: any) => !!(r as any)?.area_geojson);

    const latestHazard = hazardWithArea[0] || null;
    const latestFlood = floodWithArea[0] || null;
    const hazardFeat = latestHazard ? normalizeFeature((latestHazard as any).area_geojson) : null;
    const floodFeat = latestFlood ? normalizeFeature((latestFlood as any).area_geojson) : null;

    const hazardBbox = hazardFeat ? (() => { try { return turf.bbox(hazardFeat as any); } catch { return null; } })() : null;
    const floodBbox = floodFeat ? (() => { try { return turf.bbox(floodFeat as any); } catch { return null; } })() : null;

    return {
      hazards: (hazards || []).length,
      hazardsWithArea: hazardWithArea.length,
      floodReports: (recentIncidents || []).length,
      floodWithArea: floodWithArea.length,
      hazardCoverageFeatures: (hazardCoverageGeoJSON as any)?.features?.length ?? 0,
      floodCoverageFeatures: (floodCoverageGeoJSON as any)?.features?.length ?? 0,
      latestHazard: latestHazard
        ? { id: (latestHazard as any).id, type: (latestHazard as any).type, severity: (latestHazard as any).severity, bbox: hazardBbox }
        : null,
      latestFlood: latestFlood
        ? { id: (latestFlood as any).id, status: (latestFlood as any).status, severity: (latestFlood as any).severity, bbox: floodBbox }
        : null,
      view: { lat: viewState.latitude, lng: viewState.longitude, zoom: viewState.zoom, pitch: viewState.pitch },
    };
  }, [hazards, recentIncidents, hazardCoverageGeoJSON, floodCoverageGeoJSON, viewState]);


  return (
    <>
      <PageMeta
        title="Command Center - E-LigtasMo"
        description="Barangay Tactical Operations Dashboard."
      />
      <div className="flex flex-col gap-6 p-1 sm:p-2 font-jetbrains">
        {/* Tactical Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-black p-6 rounded-3xl text-white shadow-2xl border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <FaExclamationTriangle size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-black tracking-[0.3em] text-red-500 uppercase">Live Operations Active</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase leading-none mb-2">
              {user?.brgy_name || 'Barangay'} <span className="text-gray-500 text-xl font-medium tracking-normal">MDRRMO Console</span>
            </h1>
            <p className="text-gray-400 text-sm font-medium max-w-xl">
              Real-time disaster risk reduction and management oversight for the local command sector.
            </p>
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <button 
              onClick={loadData}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
            >
              <FiRefreshCw className={loadingData ? 'animate-spin' : ''} /> Refresh Sync
            </button>
            <Link 
              to="/barangay/report-incident"
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black tracking-widest uppercase text-xs shadow-lg shadow-red-600/20 transition-all active:scale-95 flex items-center gap-2"
            >
              <FaExclamationTriangle /> Declare Incident
            </Link>
          </div>
        </div>

        {/* Tactical Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-500/10 rounded-2xl">
                <FaWater className="text-yellow-600 dark:text-yellow-500 w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-yellow-600 dark:text-yellow-500 tracking-widest uppercase bg-yellow-50 dark:bg-yellow-500/10 px-2 py-1 rounded-md">Live</span>
            </div>
            <div className="relative z-10">
              <div className="text-4xl font-black tracking-tighter mb-1 tabular-nums">{metrics.activeIncidents}</div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Active Incident Reports</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-2xl">
                <FaCheckCircle className="text-blue-600 dark:text-blue-500 w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-500 tracking-widest uppercase bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-md">Critical</span>
            </div>
            <div className="relative z-10">
              <div className="text-4xl font-black tracking-tighter mb-1 tabular-nums">{metrics.pendingApprovals}</div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pending Verification</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-2xl">
                <FaHome className="text-green-600 dark:text-green-500 w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-green-600 dark:text-green-500 tracking-widest uppercase bg-green-50 dark:bg-green-500/10 px-2 py-1 rounded-md">Capacity</span>
            </div>
            <div className="relative z-10">
              <div className="text-4xl font-black tracking-tighter mb-1 tabular-nums">{metrics.shelterCapacity}</div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Shelter Occupancy</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-2xl">
                <FaBullhorn className="text-red-600 dark:text-red-500 w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-red-600 dark:text-red-500 tracking-widest uppercase bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-md">Broadcasting</span>
            </div>
            <div className="relative z-10">
              <div className="text-4xl font-black tracking-tighter mb-1 tabular-nums">{announcements.length}</div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Active Announcements</div>
            </div>
          </div>
        </div>

        {/* Emergency Alert Banner */}
        <div className="bg-red-600 p-4 rounded-2xl text-white shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center animate-bounce">
              <FaExclamationTriangle />
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                Emergency Dispatch Active
                {metrics.statusUpdatedBy && (
                  <span className="text-[8px] bg-white/20 px-2 py-0.5 rounded text-white/70">
                    BY: {metrics.statusUpdatedBy}
                  </span>
                )}
              </div>
              <div className="text-xs text-white/80">Immediate tactical response required for pending citizen reports.</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.open('tel:911')} className="px-4 py-2 bg-white text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all">Emergency 911</button>
            <button onClick={() => window.open('tel:143')} className="px-4 py-2 bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/30 transition-all">Red Cross 143</button>
          </div>
        </div>
        {/* Shelter Overview - Restricted to Admin Dashboard */}
        
        
        {/* High-Fidelity Tactical Command Center (Side-by-Side Map & Operational Command) */}
        <div className="flex flex-col lg:flex-row gap-6 min-h-[800px] lg:h-[750px] mb-8">
          
          {/* Operational Command Panel (Right side) */}
          <div className="w-full lg:w-1/3 flex flex-col h-[500px] lg:h-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden order-2 lg:order-2 relative">
            {!selectedIncident ? (
              <>
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest flex items-center gap-3">
                      <div className="bg-red-600 text-white rounded-xl p-2.5">
                        <FaList className="text-sm" />
                      </div>
                      Operational Command
                    </h2>
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Live_Feed
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search incident matrix..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        className="flex-1 appearance-none px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                        value={filterSeverity}
                        onChange={(e) => setFilterSeverity(e.target.value)}
                      >
                        <option value="all">All Severities</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Low">Low</option>
                      </select>
                      <select
                        className="flex-1 appearance-none px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                      >
                        <option value="newest">Latest_First</option>
                        <option value="oldest">Historical</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex bg-gray-100/50 p-1 m-4 rounded-2xl">
                  {['Pending', 'Verified', 'Resolved'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        activeTab === tab
                          ? 'bg-white text-red-600 shadow-sm border border-gray-200'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3 custom-scrollbar">
                  {(filteredIncidents || []).map((incident) => {
                    const uniqueKey = `${incident.source_table || 'inc'}-${incident.id}`;
                    return (
                      <div 
                        key={uniqueKey} 
                        onClick={() => setSelectedBrgyIncident(incident)} 
                        className="group bg-white rounded-2xl border border-gray-100 p-4 hover:border-red-500/50 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
                      >
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                          incident.severity === 'Critical' ? 'bg-red-600' :
                          incident.severity === 'High' ? 'bg-orange-500' :
                          incident.severity === 'Moderate' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`} />
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🌊</span>
                            <div>
                              <div className="text-[11px] font-black text-gray-900 uppercase tracking-tight">{incident.type || 'Flood'}</div>
                              <div className="text-[9px] font-mono text-gray-400">#REF-{incident.id}</div>
                            </div>
                          </div>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${getSeverityColor(incident.severity)}`}>
                            {incident.severity}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 font-medium mb-3 line-clamp-2">
                          {incident.location_text || 'Active Incident Zone'}
                        </p>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                          <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            <FiClockIcon className="text-red-500" />
                            {formatTime(incident.time || incident.created_at)}
                          </div>
                          <FiChevronRight className="text-gray-300 group-hover:text-red-500 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                  {filteredIncidents.length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-2xl">📡</div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Matrix_Clear_No_Reports</div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col h-full bg-[#0a0a0a] text-white animate-in slide-in-from-right duration-300">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#111111]">
                  <button onClick={() => setSelectedBrgyIncident(null)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors">
                    <FiChevronRight className="rotate-180" />
                    Back_to_Matrix
                  </button>
                  <div className="text-[10px] font-mono text-red-500">TACTICAL_DETAIL_VIEW</div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar-dark">
                  <div className="aspect-video bg-black relative overflow-hidden group">
                    {selectedIncident.media ? (
                      <img 
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost/eligtasmo-backend/'}${selectedIncident.media}`} 
                        alt="Incident" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gray-900/50">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                          <FaWater className="text-2xl text-blue-500 animate-pulse" />
                        </div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">No_Tactical_Imagery</span>
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest shadow-2xl ${getSeverityColor(selectedIncident.severity)}`}>
                        {selectedIncident.severity}_THREAT
                      </span>
                    </div>
                  </div>

                  <div className="p-8 space-y-8">
                    <div>
                      <div className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] mb-2">Operational_Report</div>
                      <h3 className="text-2xl font-black uppercase tracking-tight mb-2">{selectedIncident.type || 'Flood_Event'}</h3>
                      <div className="flex items-center gap-4 text-[11px] font-mono text-gray-500">
                        <div className="flex items-center gap-2">
                          <FiClockIcon className="text-red-500" />
                          {formatTime(selectedIncident.time || selectedIncident.created_at)}
                        </div>
                        <div className="flex items-center gap-2">
                          <FiMapPin className="text-blue-500" />
                          {selectedIncident.barangay || 'Area_Alpha'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Status_Registry</div>
                        <div className={`text-[11px] font-black uppercase ${selectedIncident.status === 'Pending' ? 'text-yellow-500' : 'text-emerald-500'}`}>
                          {selectedIncident.status}
                        </div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Report_Source</div>
                        <div className="text-[11px] font-black uppercase text-white truncate">
                          {selectedIncident.reporter_name || 'Citizen_Report'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <div className="w-4 h-[1px] bg-red-600" />
                        Sitrep_Narrative
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed font-medium bg-white/5 p-5 rounded-2xl border border-white/5">
                        {selectedIncident.description || 'No additional tactical data provided for this event.'}
                      </p>
                    </div>

                    <div>
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <div className="w-4 h-[1px] bg-blue-600" />
                        Target_Coordinates
                      </div>
                      <div className="text-xs text-gray-400 font-mono flex items-center gap-3">
                        <div className="p-3 bg-blue-600/10 rounded-xl">
                          <FiMapPin className="text-blue-500" />
                        </div>
                        {selectedIncident.location_text || 'Global_Positioning_Restricted'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-[#111111] border-t border-white/5">
                  <div className="grid grid-cols-2 gap-3">
                    {selectedIncident.status === 'Pending' ? (
                      <>
                        <button 
                          onClick={() => handleApprove(selectedIncident.id)}
                          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20"
                        >
                          <FaCheckCircle /> Verify
                        </button>
                        <button 
                          onClick={() => handleReject(selectedIncident.id)}
                          className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-900/20"
                        >
                          <FaTimes /> Reject
                        </button>
                      </>
                    ) : (selectedIncident.status === 'Verified' || selectedIncident.status === 'Approved' || selectedIncident.status === 'Active') ? (
                      <button 
                        onClick={() => handleResolve(selectedIncident.id)}
                        className="col-span-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20"
                      >
                        <FaCheckCircle /> Mark_Resolved
                      </button>
                    ) : (
                      <div className="col-span-2 py-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-500 bg-white/5 rounded-xl border border-white/5">
                        Operational_Complete
                      </div>
                    )}
                    {(selectedIncident.status !== 'Resolved' && selectedIncident.status !== 'Rejected') && (
                      <button 
                        onClick={() => navigate('/barangay/report-incident', { state: { prefill: selectedIncident, isEdit: true } })}
                        className="col-span-2 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Modify Intel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tactical Map Viewport (Main Center/Left) */}
          <div className="flex-1 min-h-[400px] lg:h-full bg-[#0f172a] rounded-3xl shadow-2xl border border-gray-800 overflow-hidden relative order-1 lg:order-1 group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent pointer-events-none z-10" />
            
            {/* Map Header Overlay */}
            <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
              <h2 className="text-lg font-black text-white uppercase tracking-[0.3em] flex items-center gap-3 drop-shadow-lg">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
                Live Tactical Map
              </h2>
              <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              </div>
            </div>

            {/* Weather Controls Overlay */}
            <div className="absolute top-6 right-6 z-20 flex flex-col gap-2">
              <div className="flex bg-black/60 backdrop-blur-xl rounded-2xl p-1 border border-white/10 shadow-2xl">
                <button 
                  onClick={() => setShowWindyRadar(!showWindyRadar)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${showWindyRadar ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <FaWind className={showWindyRadar ? 'animate-spin-slow' : ''} />
                  Windy Radar
                </button>
              </div>

              {!showWindyRadar && (
                <div className="flex flex-col bg-black/60 backdrop-blur-xl rounded-2xl p-2 border border-white/10 shadow-2xl gap-1">
                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest px-2 mb-1">Weather Layers</span>
                  {[
                    { id: 'none', label: 'None', icon: <FaTimes /> },
                    { id: 'wind_new', label: 'Wind', icon: <FaWind /> },
                    { id: 'precipitation_new', label: 'Rain', icon: <FaWater /> },
                    { id: 'clouds_new', label: 'Clouds', icon: <FaCloudSun /> }
                  ].map((layer) => (
                    <button
                      key={layer.id}
                      onClick={() => setWeatherLayer(layer.id as any)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${weatherLayer === layer.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      <span className={weatherLayer === layer.id ? 'text-blue-500' : ''}>{layer.icon}</span>
                      {layer.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {showWindyRadar && (
              <div className="absolute inset-0 z-30 bg-black animate-in fade-in duration-500">
                <iframe 
                  src={`https://embed.windy.com/embed2.html?lat=${barangayLocation?.lat || 14.28}&lon=${barangayLocation?.lng || 121.41}&zoom=8&level=surface&overlay=wind&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1`}
                  className="w-full h-full border-none"
                  title="Windy Radar"
                />
                <button 
                  onClick={() => setShowWindyRadar(false)}
                  className="absolute top-6 right-6 z-40 bg-red-600 text-white p-3 rounded-full shadow-2xl hover:bg-red-500 transition-all border border-white/20"
                >
                  <FaTimes />
                </button>
              </div>
            )}

            <MapboxMap
              ref={mapRef}
              {...viewState}
              onMove={(evt: any) => setViewState(evt.viewState)}
              mapStyle="mapbox://styles/mapbox/dark-v11"
              mapboxAccessToken={MAPBOX_TOKEN}
              style={{ width: '100%', height: '100%' }}
              maxPitch={85}
              onLoad={(e: any) => {
                try {
                  const map = e?.target?.getMap?.();
                  if (!map) return;
                  if (!map.getSource('mapbox-dem')) {
                    map.addSource('mapbox-dem', {
                      type: 'raster-dem',
                      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                      tileSize: 512,
                      maxzoom: 14,
                    } as any);
                  }
                  map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.2 } as any);
                } catch (err) {
                  console.error("Terrain load error:", err);
                }
              }}
            >
              <NavigationControl position="bottom-right" />
              <FullscreenControl position="bottom-right" />

              {weatherLayer !== 'none' && OWM_KEY && (
                <Source
                  id="owm-weather"
                  type="raster"
                  tiles={[`https://tile.openweathermap.org/map/${weatherLayer}/{z}/{x}/{y}.png?appid=${OWM_KEY}`]}
                  tileSize={256}
                >
                  <Layer
                    id="owm-layer"
                    type="raster"
                    paint={{ 'raster-opacity': 0.6 }}
                  />
                </Source>
              )}
              
              {/* Layer Controls Widget */}
              <div className="absolute right-6 top-6 z-20 bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 p-4 min-w-[180px]">
                <div className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4 border-b border-white/5 pb-2">Visual_Parameters</div>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-[10px] font-black text-slate-300 group-hover:text-red-500 transition-colors uppercase tracking-tight">Threat_Overlay</span>
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-700 bg-slate-800 text-red-600 focus:ring-red-500/50 w-3.5 h-3.5 transition-all"
                      checked={mapLayers.showHazards} 
                      onChange={(e) => setMapLayers(v => ({ ...v, showHazards: e.target.checked }))} 
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-[10px] font-black text-slate-300 group-hover:text-red-500 transition-colors uppercase tracking-tight">Incident_Vectors</span>
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-700 bg-slate-800 text-red-600 focus:ring-red-500/50 w-3.5 h-3.5 transition-all"
                      checked={mapLayers.showIncidents} 
                      onChange={(e) => setMapLayers(v => ({ ...v, showIncidents: e.target.checked }))} 
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-[10px] font-black text-slate-300 group-hover:text-emerald-500 transition-colors uppercase tracking-tight">Shelter_Network</span>
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500/50 w-3.5 h-3.5 transition-all"
                      checked={mapLayers.showShelters} 
                      onChange={(e) => setMapLayers(v => ({ ...v, showShelters: e.target.checked }))} 
                    />
                  </label>
                </div>
              </div>

              {/* Barangay Center Marker */}
              {barangayLocation && (
                <TacticalMarker
                  latitude={barangayLocation.lat}
                  longitude={barangayLocation.lng}
                  type="barangay"
                />
              )}

              {/* Hazard Heatmap Layer */}
              {mapLayers.showHazards && (
                <Source id="hazard-heat" type="geojson" data={hazardGeoJSON}>
                  <Layer
                    id="hazard-heat-layer"
                    type="heatmap"
                    paint={{
                      'heatmap-weight': ['get', 'severity_index'],
                      'heatmap-intensity': 1.2,
                      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 20, 14, 40, 16, 60],
                      'heatmap-opacity': 0.6,
                      'heatmap-color': [
                        'interpolate',
                        ['linear'],
                        ['heatmap-density'],
                        0, 'rgba(37,99,235,0)',
                        0.25, 'rgba(37,99,235,0.4)',
                        0.5, 'rgba(245,158,11,0.6)',
                        0.75, 'rgba(239,68,68,0.8)',
                        1, 'rgba(127,29,29,0.95)'
                      ]
                    }}
                  />
                </Source>
              )}
              
              {/* Hazard Pinpoint Markers */}
              {mapLayers.showHazards && hazards.map((h, idx) => (
                <TacticalMarker
                  key={`brgy-map-hazard-pin-${h.id || idx}`}
                  latitude={Number(h.latitude ?? h.lat)}
                  longitude={Number(h.longitude ?? h.lng)}
                  type="hazard"
                  onClick={e => {
                    e.originalEvent.stopPropagation();
                    // Optional: open hazard detail
                  }}
                />
              ))}

              {/* Incident Markers */}
              {mapLayers.showIncidents && recentIncidents
                .filter(inc => inc.status === 'Verified' || inc.status === 'Pending')
                .map((inc, idx) => (
                  <TacticalMarker
                    key={`brgy-map-inc-${inc.source_table || 'inc'}-${inc.id || idx}`}
                    latitude={Number(inc.lat)}
                    longitude={Number(inc.lng)}
                    type={inc.type || 'flood'}
                    onClick={e => {
                      e.originalEvent.stopPropagation();
                      setSelectedBrgyIncident(inc);
                    }}
                  />
                ))}

              {/* Shelter Markers */}
              {mapLayers.showShelters && shelters.map((s, idx) => (
                <TacticalMarker
                  key={`brgy-map-shelter-${s.id || idx}`}
                  latitude={Number(s.lat)}
                  longitude={Number(s.lng)}
                  type="shelter"
                  onClick={e => {
                    e.originalEvent.stopPropagation();
                    setSelectedBrgyShelter(s);
                  }}
                />
              ))}

              {/* Popups */}
              {selectedIncident && (
                <Popup
                  latitude={Number(selectedIncident.lat)}
                  longitude={Number(selectedIncident.lng)}
                  onClose={() => setSelectedBrgyIncident(null)}
                  closeButton={true}
                  anchor="bottom"
                  className="sentinel-popup"
                >
                  <div className="p-3 min-w-[200px] bg-[#0f172a] text-white">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl">🌊</span>
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-tight">{selectedIncident.type || 'Flood'}</div>
                        <div className="text-[9px] font-mono text-gray-400">#REF-{selectedIncident.id}</div>
                      </div>
                    </div>
                    <div className={`text-[9px] font-black px-2 py-0.5 rounded-full inline-block mb-3 uppercase tracking-widest ${getSeverityColor(selectedIncident.severity)}`}>
                      {selectedIncident.severity}
                    </div>
                    <p className="text-[10px] text-gray-400 mb-3 leading-relaxed font-medium">
                      {selectedIncident.location_text || 'Location Data Restricted'}
                    </p>
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <span className="text-[9px] font-mono text-gray-500 uppercase">{formatTime(selectedIncident.time || selectedIncident.created_at)}</span>
                      <button 
                        onClick={() => { /* Incident already selected, panel will focus */ }}
                        className="text-red-500 text-[9px] font-black uppercase tracking-widest hover:text-red-400 transition-colors"
                      >
                        Execute_Command
                      </button>
                    </div>
                  </div>
                </Popup>
              )}

              {selectedShelter && (
                <Popup
                  latitude={Number(selectedShelter.lat)}
                  longitude={Number(selectedShelter.lng)}
                  onClose={() => setSelectedBrgyShelter(null)}
                  closeButton={true}
                  anchor="bottom"
                >
                  <div className="p-3 min-w-[200px] bg-[#0f172a] text-white">
                    <div className="flex items-center gap-3 mb-2 text-emerald-500">
                      <FaHome className="text-lg" />
                      <div className="text-[11px] font-black uppercase tracking-tight">{selectedShelter.name}</div>
                    </div>
                    <div className={`text-[9px] font-black px-2 py-0.5 rounded-full inline-block mb-3 uppercase tracking-widest ${
                      ['full', 'closed'].includes((selectedShelter.status || '').toLowerCase()) ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {selectedShelter.status || 'Available'}
                    </div>
                    <div className="text-[10px] text-gray-400 mb-4 font-medium">{selectedShelter.address}</div>
                    <Link to={`/barangay/shelters/${selectedShelter.id}`} className="block w-full text-center bg-blue-600 text-white text-[10px] font-black py-2 rounded-xl uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20">
                      Manage_Asset
                    </Link>
                  </div>
                </Popup>
              )}
            </MapboxMap>
          </div>
        </div>

        {/* Existing grid links */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Link
            to="/barangay/resources"
            className="block rounded-lg bg-red-100 p-4 text-red-800 hover:bg-red-200"
          >
            📚 Emergency Guides
          </Link>
          <Link
            to="/barangay/report-incident"
            className="block rounded-lg bg-yellow-100 p-4 text-yellow-800 hover:bg-yellow-200"
          >
            🚨 Report Incident
          </Link>
          <Link
            to="/barangay/shelters"
            className="block rounded-lg bg-blue-100 p-4 text-blue-800 hover:bg-blue-200"
          >
            🏠 Shelter Management
          </Link>
        </div>
      </div>

    </>
  );
};

export default BrgyHome;
