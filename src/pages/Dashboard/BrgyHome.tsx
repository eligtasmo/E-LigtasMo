import PageMeta from "../../components/common/PageMeta";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, FormEvent, useMemo, useRef } from "react";
import { FaExclamationTriangle, FaCheckCircle, FaUsers, FaMapMarkerAlt, FaPlus, FaBullhorn, FaHome, FaTimes, FaWater, FaList, FaWind, FaCloudSun, FaShieldAlt } from "react-icons/fa";
import { FiMapPin, FiClock as FiClockIcon, FiChevronRight, FiSearch, FiFilter, FiRefreshCw } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { toast } from 'react-hot-toast';
import MapboxMap, { Marker, Popup, NavigationControl, FullscreenControl, Source, Layer } from '../../components/maps/MapboxMap';
import { apiFetch } from "../../utils/api";
import * as turf from '@turf/turf';
import TacticalMarker from "../../components/maps/TacticalMarker";
import { useGlobalMapContext } from "../../context/MapContext";
import SantaCruzOutline from "../../components/maps/SantaCruzOutline";
import { DEFAULT_MAP_STATE } from "../../constants/geo";

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN) as string | undefined;
const OWM_KEY = import.meta.env.VITE_OPENWEATHERMAP_API_KEY as string | undefined;

const BrgyHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [brgyLocation, setBarangayLocation] = useState<{lat: number, lng: number, address: string} | null>(null);

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
      // Fetch all announcements for brgy
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
        const brgyName = user?.brgy_name || user?.brgy || 'Poblacion I';
        const resStatus = await apiFetch(`brgy-status.php?brgy=${encodeURIComponent(brgyName)}`);
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
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
    if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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
        (incident.brgy || '').toLowerCase().includes(term) ||
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

  // Center on brgy location if available
  useEffect(() => {
    if (brgyLocation) {
      updateViewport({
        latitude: brgyLocation.lat,
        longitude: brgyLocation.lng,
        zoom: 14
      });
    }
  }, [brgyLocation]);

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
      <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden font-inter bg-slate-950 text-white flex">
        
        {/* Absolute Map Background */}
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <MapboxMap
              ref={mapRef}
              {...viewState}
              onMove={(evt: any) => setViewState(evt.viewState)}
              minZoom={DEFAULT_MAP_STATE.minZoom}
              maxBounds={DEFAULT_MAP_STATE.maxBounds}
              pitch={0}
              bearing={0}
              mapStyle="mapbox://styles/mapbox/light-v11"
              mapboxAccessToken={MAPBOX_TOKEN}
              style={{ width: '100%', height: '100%' }}
              onLoad={(e: any) => {
                const map = e?.target?.getMap?.();
                if (map) {
                   map.setTerrain(null);
                }
              }}
            >
              <SantaCruzOutline />
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
              <div className="absolute right-6 top-6 z-20 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 p-4 min-w-[180px]">
                <div className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4 border-b border-gray-100 pb-2">Visual_Parameters</div>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-[10px] font-black text-gray-600 group-hover:text-red-500 transition-colors uppercase tracking-tight">Threat_Overlay</span>
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 bg-gray-50 text-red-600 focus:ring-red-500/50 w-3.5 h-3.5 transition-all"
                      checked={mapLayers.showHazards} 
                      onChange={(e) => setMapLayers(v => ({ ...v, showHazards: e.target.checked }))} 
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-[10px] font-black text-gray-600 group-hover:text-red-500 transition-colors uppercase tracking-tight">Incident_Vectors</span>
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 bg-gray-50 text-red-600 focus:ring-red-500/50 w-3.5 h-3.5 transition-all"
                      checked={mapLayers.showIncidents} 
                      onChange={(e) => setMapLayers(v => ({ ...v, showIncidents: e.target.checked }))} 
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-[10px] font-black text-gray-600 group-hover:text-emerald-500 transition-colors uppercase tracking-tight">Shelter_Network</span>
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 bg-gray-50 text-emerald-600 focus:ring-emerald-500/50 w-3.5 h-3.5 transition-all"
                      checked={mapLayers.showShelters} 
                      onChange={(e) => setMapLayers(v => ({ ...v, showShelters: e.target.checked }))} 
                    />
                  </label>
                </div>
              </div>

              {/* Barangay Center Marker */}
              {brgyLocation && (
                <TacticalMarker
                  latitude={brgyLocation.lat}
                  longitude={brgyLocation.lng}
                  type="brgy"
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
                    <Link to={`/brgy/shelters/${selectedShelter.id}`} className="block w-full text-center bg-blue-600 text-white text-[10px] font-black py-2 rounded-xl uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20">
                      Manage_Asset
                    </Link>
                  </div>
                </Popup>
              )}
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
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                  <span className="text-[10px] font-semibold tracking-wider text-blue-400 uppercase">Sector Command Active</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white leading-none">
                  {user?.brgy_name || 'Barangay'}
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
                  <Link 
                    to="/brgy/report-incident"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                  >
                    <FaPlus /> Report
                  </Link>
               </div>
            </div>
          </div>

          {/* Main Interface Area */}
          <div className="flex-1 flex gap-4 min-h-0 relative">
             {/* Sidebar: Metrics & Incident List */}
             <div className={`w-full lg:w-[380px] flex flex-col gap-4 pointer-events-auto transition-transform duration-500 ease-out ${selectedIncident ? '-translate-x-full lg:translate-x-0 lg:opacity-100 opacity-0' : 'translate-x-0 opacity-100'}`}>
                
                {/* Floating Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl flex items-center gap-3">
                    <div className="p-2.5 bg-red-500/20 rounded-xl border border-red-500/20"><FaExclamationTriangle className="text-red-400 text-lg" /></div>
                    <div>
                      <div className="text-2xl font-bold leading-none text-white">{metrics.activeIncidents}</div>
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider mt-1">Active Alerts</div>
                    </div>
                  </div>
                  <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/20"><FaHome className="text-emerald-400 text-lg" /></div>
                    <div>
                      <div className="text-2xl font-bold leading-none text-white">{metrics.shelterCapacity}</div>
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider mt-1">Shelters</div>
                    </div>
                  </div>
                </div>

                {/* Incident List Panel */}
                <div className="flex-1 flex flex-col bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                  <div className="p-5 border-b border-white/5 bg-white/5">
                     <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 text-white"><FaList className="text-slate-400" /> Incident Matrix</h2>
                     <div className="flex bg-slate-950/50 p-1.5 rounded-xl border border-white/5">
                        {['Pending', 'Verified', 'Resolved'].map((tab) => (
                          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${activeTab === tab ? 'bg-slate-800 text-white shadow-md border border-white/10' : 'text-slate-400 hover:text-slate-200'}`}>
                            {tab}
                          </button>
                        ))}
                     </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                     {(filteredIncidents || []).map((incident) => (
                        <div key={`${incident.source_table || 'inc'}-${incident.id}`} onClick={() => setSelectedBrgyIncident(incident)} className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 p-4 rounded-2xl cursor-pointer transition-all flex flex-col gap-2 relative overflow-hidden">
                           <div className={`absolute left-0 top-0 bottom-0 w-1 ${incident.severity === 'Critical' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : incident.severity === 'High' ? 'bg-orange-500' : incident.severity === 'Moderate' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                           <div className="flex justify-between items-start pl-2">
                              <div>
                                 <div className="text-sm font-bold text-white flex items-center gap-1.5 mb-1">{incident.type || 'Incident'}</div>
                                 <div className="text-[10px] text-slate-400 flex items-center gap-1"><FiMapPin className="text-slate-500 shrink-0" /> <span className="truncate max-w-[180px]">{incident.location_text || 'Location Unspecified'}</span></div>
                              </div>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${getSeverityColor(incident.severity)}`}>{incident.severity}</span>
                           </div>
                           <div className="flex justify-between items-center pl-2 pt-3 mt-1 border-t border-white/5">
                              <div className="text-[9px] text-slate-500 flex items-center gap-1"><FiClockIcon /> {formatTime(incident.time || incident.created_at)}</div>
                              <FiChevronRight className="text-slate-500 group-hover:text-white transition-colors" />
                           </div>
                        </div>
                     ))}
                     {filteredIncidents.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-3">
                           <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-slate-500"><FaCheckCircle className="text-xl" /></div>
                           <div className="text-[11px] font-medium text-slate-400">No active reports for this status.</div>
                        </div>
                     )}
                  </div>
                </div>
             </div>

             {/* Slide-in Detail Panel */}
             <div className={`absolute inset-y-0 right-0 w-full lg:w-[450px] bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col overflow-hidden ${selectedIncident ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-12 opacity-0 pointer-events-none scale-95'}`}>
                {selectedIncident && (
                   <>
                      {/* Header */}
                      <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                         <button onClick={() => setSelectedBrgyIncident(null)} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">
                            <FiChevronRight className="rotate-180" /> Close
                         </button>
                         <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Intelligence Report</span>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar">
                         {/* Media */}
                         <div className="aspect-[16/9] bg-slate-950 relative">
                            {selectedIncident.media ? (
                              <img src={`${import.meta.env.VITE_API_URL || 'http://localhost/eligtasmo-backend/'}${selectedIncident.media}`} className="w-full h-full object-cover opacity-90" />
                            ) : (
                              <div className="flex flex-col items-center justify-center w-full h-full gap-3 bg-slate-900">
                                <FaWater className="text-slate-700 text-4xl" />
                                <span className="text-[10px] font-medium text-slate-500">No Imagery Provided</span>
                              </div>
                            )}
                            <div className="absolute top-4 left-4"><span className={`text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg ${getSeverityColor(selectedIncident.severity)}`}>{selectedIncident.severity} Threat</span></div>
                         </div>
                         
                         {/* Info */}
                         <div className="p-6 flex flex-col gap-6">
                            <div>
                               <h3 className="text-2xl font-bold text-white mb-2">{selectedIncident.type || 'Flood Event'}</h3>
                               <p className="text-xs text-slate-400 flex items-center gap-1.5"><FiMapPin className="text-blue-400" /> {selectedIncident.location_text || 'Location Unspecified'}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                               <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                  <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1.5">Status Registry</div>
                                  <div className={`text-xs font-bold ${selectedIncident.status === 'Pending' ? 'text-yellow-400' : 'text-emerald-400'}`}>{selectedIncident.status}</div>
                               </div>
                               <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                  <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1.5">Reporter</div>
                                  <div className="text-xs font-semibold text-white truncate">{selectedIncident.reporter_name || 'Citizen Report'}</div>
                               </div>
                            </div>

                            <div>
                               <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                 <div className="w-4 h-[1px] bg-slate-600" />
                                 Situation Narrative
                               </div>
                               <p className="text-sm text-slate-300 leading-relaxed bg-white/5 p-5 rounded-2xl border border-white/5">
                                 {selectedIncident.description || 'No additional narrative provided.'}
                               </p>
                            </div>
                         </div>
                      </div>
                      
                      {/* Action Footer */}
                      <div className="p-5 bg-slate-900 border-t border-white/10">
                         <div className="grid grid-cols-2 gap-3">
                            {selectedIncident.status === 'Pending' ? (
                               <>
                                  <button onClick={() => handleApprove(selectedIncident.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-[11px] font-bold shadow-lg shadow-emerald-900/50 flex justify-center items-center gap-2 transition-all"><FaCheckCircle/> Verify Threat</button>
                                  <button onClick={() => handleReject(selectedIncident.id)} className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-[11px] font-bold flex justify-center items-center gap-2 transition-all"><FaTimes/> Reject</button>
                               </>
                            ) : (
                               <button onClick={() => handleResolve(selectedIncident.id)} className="col-span-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-[11px] font-bold shadow-lg shadow-blue-900/50 flex justify-center items-center gap-2 transition-all"><FaCheckCircle/> Mark as Resolved</button>
                            )}
                         </div>
                      </div>
                   </>
                )}
             </div>
          </div>

          {/* Bottom Bar: Ticker & Nav */}
          <div className="flex gap-4 pointer-events-auto">
            <div className="flex-1 bg-red-500/20 backdrop-blur-xl rounded-2xl p-4 shadow-2xl flex items-center gap-4 overflow-hidden border border-red-500/30">
               <div className="bg-red-500 text-white px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-widest shrink-0 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]">Active Broadcast</div>
               <div className="text-xs font-semibold text-red-100 truncate">Tactical dispatch systems are live. Awaiting verification of pending citizen reports in your sector.</div>
            </div>
            
            <div className="flex gap-2">
              <Link to="/brgy/resources" className="bg-slate-900/60 backdrop-blur-xl border border-white/10 text-slate-300 hover:text-white px-6 flex items-center rounded-2xl text-[11px] font-semibold shadow-2xl transition-all hover:bg-white/10">Guides</Link>
              <Link to="/brgy/shelters" className="bg-slate-900/60 backdrop-blur-xl border border-white/10 text-slate-300 hover:text-white px-6 flex items-center rounded-2xl text-[11px] font-semibold shadow-2xl transition-all hover:bg-white/10">Shelters</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BrgyHome;
