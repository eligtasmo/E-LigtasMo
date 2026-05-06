import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import { 
  FaWater, FaUser, FaMapMarkerAlt, FaClock, FaCheck, FaTimes, 
  FaFilter, FaImages, FaEye, FaSpinner, FaInfoCircle, FaCamera, FaCheckCircle
} from "react-icons/fa";
import { FiMapPin, FiClock as FiClockIcon, FiChevronRight, FiRefreshCw } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import MapboxMap, { Marker, Popup, NavigationControl, FullscreenControl, Source, Layer, MapProvider } from '../../components/maps/MapboxMap';
import TacticalMarker from '../../components/maps/TacticalMarker';
import { useMap } from 'react-map-gl';
import { apiFetch } from "../../utils/api";

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN) as string | undefined;

type FloodReportType = {
  id: number;
  lat: number;
  lng: number;
  severity: string;
  status: "Pending" | "Verified" | "Rejected" | "Resolved";
  description: string;
  time: string;
  barangay: string;
  reporter_name?: string;
  reporter_contact?: string;
  reporter_email?: string;
  media_path?: string;
  media_paths?: string[];
  location_text?: string;
  area_geojson?: any;
};

const FloodReport: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [reports, setReports] = useState<FloodReportType[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<FloodReportType | null>(null);
  const [filterStatus, setFilterStatus] = useState<"All" | "Pending" | "Verified" | "Rejected" | "Resolved">("Pending");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const flyToReport = (lat: number, lng: number) => {
    if (mapInstance) {
      mapInstance.flyTo({
        center: [lng, lat],
        zoom: 17,
        duration: 2000,
        essential: true,
        padding: { left: 0, right: 0, top: 0, bottom: 0 }
      });
    }
  };

  const [isEditingSeverity, setIsEditingSeverity] = useState(false);

  const handleUpdateSeverity = async (id: number, newSeverity: string) => {
    try {
      setActionLoading(id);
      const res = await apiFetch('update-incident-report.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, severity: newSeverity })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`SEVERITY_UPDATED: ${newSeverity.toUpperCase()}`);
        setIsEditingSeverity(false);
        fetchReports();
        if (selectedReport) setSelectedReport({...selectedReport, severity: newSeverity});
      } else {
        toast.error(data.error || "Update rejected");
      }
    } catch (err) {
      toast.error("Comms failure during triage");
    } finally {
      setActionLoading(null);
    }
  };

  const calculateCentroid = (points: [number, number][]): [number, number] => {
    if (!points || points.length === 0) return [0, 0];
    const lat = points.reduce((acc, p) => acc + p[0], 0) / points.length;
    const lng = points.reduce((acc, p) => acc + p[1], 0) / points.length;
    return [lat, lng];
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const statusParam = filterStatus !== "All" ? `&status=${filterStatus}` : "";
      const res = await fetch(`/api/list-incident-reports.php?limit=1000&all_time=true${statusParam}&_t=${Date.now()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setReports(data);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, [filterStatus]);

  const handleAction = async (id: number, action: 'approve' | 'reject' | 'resolve') => {
    const endpointMap = {
      approve: "/api/approve-incident-report.php",
      reject: "/api/reject-incident-report.php",
      resolve: "/api/resolve-incident-report.php"
    };

    const confirmMsg = action === 'approve' ? "Verify this report?" : 
                       action === 'reject' ? "Reject this report?" : 
                       "Mark as resolved?";
    
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(endpointMap[action], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id, 
          [action === 'approve' ? 'approved_by' : action === 'reject' ? 'rejected_by' : 'resolved_by']: user?.username || "Official" 
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Report ${action}d`);
        fetchReports();
        setSelectedReport(null);
      }
    } catch (error) {
      toast.error("Action failed");
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'border-red-500/50 text-red-500 bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
      case 'High': return 'border-orange-500/50 text-orange-500 bg-orange-500/10';
      case 'Moderate': return 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10';
      case 'Low': return 'border-green-500/50 text-green-500 bg-green-500/10';
      default: return 'border-gray-500/50 text-gray-500 bg-gray-500/10';
    }
  };

  const getMediaUrls = (report: FloodReportType) => {
    const urls: string[] = [];
    if (report.media_paths && Array.isArray(report.media_paths)) {
      report.media_paths.forEach(p => urls.push(`/uploads/${p}`));
    } else if (report.media_path) {
      urls.push(`/uploads/${report.media_path}`);
    }
    return urls;
  };

  return (
    <div className="h-[calc(100vh-72px)] w-full bg-black overflow-hidden font-mono">
      <PageMeta 
        title="Tactical Flood Oversight" 
        description="Monitor and manage flood reports across all barangays." 
      />
      <MapProvider>
        <div className="flex h-full w-full overflow-hidden">
          {/* Map Section */}
          <div className="flex-1 relative h-full z-0">
            <MapboxMap
              initialViewState={{
                latitude: 14.28,
                longitude: 121.41,
                zoom: 13
              }}
              mapStyle="mapbox://styles/mapbox/dark-v11"
              mapboxAccessToken={MAPBOX_TOKEN}
              onLoad={(e: any) => setMapInstance(e.target)}
              style={{ width: '100%', height: '100%' }}
            >
              <NavigationControl position="top-right" />
              <FullscreenControl position="top-right" />
              
              {reports.map((report) => (
                <TacticalMarker
                  key={report.id}
                  latitude={Number(report.lat)}
                  longitude={Number(report.lng)}
                  type="hazard"
                  status={report.severity.toLowerCase()}
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setSelectedReport(report);
                  }}
                />
              ))}
            </MapboxMap>

            {/* Map Legend/Overlay */}
            <div className="absolute bottom-6 left-6 p-4 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 z-10 select-none">
              <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Live_Monitor
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Critical_Zone', color: 'bg-red-500' },
                  { label: 'High_Alert', color: 'bg-orange-500' },
                  { label: 'Moderate_Flood', color: 'bg-yellow-500' },
                  { label: 'Minor_Water', color: 'bg-green-500' }
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Unified Sidebar (Right) */}
          <div className="w-[400px] bg-[#1c1c1e] border-l border-white/5 flex flex-col h-full shrink-0 z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.3)] overflow-hidden">
            {selectedReport ? (
              /* Inspection Node View */
              <div className="flex flex-col h-full animate-in fade-in slide-in-from-right duration-300">
                <div className="p-4 border-b border-white/5 relative bg-[#2c2c2e]">
                  <button 
                    onClick={() => setSelectedReport(null)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-all border border-white/5"
                  >
                    <FaTimes size={14} />
                  </button>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <h2 className="text-blue-500 font-black text-base tracking-tighter uppercase italic">Flood_Inspection</h2>
                  </div>
                  <p className="text-gray-500 text-[8px] tracking-[0.2em] font-black uppercase mt-0.5">
                    Ref_ID: {selectedReport.id}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                  {/* Evidence Carousel */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[8px] text-gray-500 uppercase font-black tracking-[0.2em]">Intel_Visuals</span>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : getMediaUrls(selectedReport).length - 1))}
                          className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 text-gray-500"
                        >
                          <FiChevronRight className="rotate-180" />
                        </button>
                        <button 
                          onClick={() => setCurrentImageIndex(prev => (prev < getMediaUrls(selectedReport).length - 1 ? prev + 1 : 0))}
                          className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 text-gray-500"
                        >
                          <FiChevronRight />
                        </button>
                      </div>
                    </div>
                    
                    {getMediaUrls(selectedReport).length > 0 ? (
                      <div className="aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/5 relative group shadow-2xl">
                        <img 
                          src={getMediaUrls(selectedReport)[currentImageIndex]} 
                          alt="Flood Evidence" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-black tracking-widest text-blue-500 border border-white/10">
                          {currentImageIndex + 1}/{getMediaUrls(selectedReport).length}
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-2xl bg-white/5 border border-dashed border-white/10 flex flex-col items-center justify-center text-gray-700">
                        <FaCamera size={24} className="mb-2 opacity-10" />
                        <span className="text-[9px] font-black tracking-widest uppercase opacity-40">Zero_Visual_Intel</span>
                      </div>
                    )}
                  </div>

                  {/* Data Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 shadow-inner group relative">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[7px] text-gray-500 uppercase font-black tracking-widest block">Severity</span>
                        <button 
                          onClick={() => setIsEditingSeverity(!isEditingSeverity)}
                          className="text-[8px] text-blue-500 hover:underline font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {isEditingSeverity ? 'Cancel' : 'Triage'}
                        </button>
                      </div>
                      {isEditingSeverity ? (
                        <div className="flex gap-1 mt-1">
                          {['Low', 'Moderate', 'High'].map((s) => (
                            <button
                              key={s}
                              onClick={() => handleUpdateSeverity(selectedReport.id, s)}
                              className={`flex-1 py-1 rounded text-[8px] font-black uppercase transition-all ${
                                selectedReport.severity === s 
                                ? getSeverityStyle(s)
                                : 'bg-white/5 text-gray-500 hover:bg-white/10'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className={`text-xs font-black uppercase ${getSeverityStyle(selectedReport.severity).split(' ')[0]}`}>
                          {selectedReport.severity}
                        </p>
                      )}
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
                      <span className="text-[7px] text-gray-500 uppercase font-black tracking-widest block mb-1">Status</span>
                      <p className="text-xs font-black text-white uppercase">{selectedReport.status}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 col-span-2 flex items-center gap-4 shadow-inner">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                        <FaUser className="text-blue-500 text-sm" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[7px] text-gray-500 uppercase font-black tracking-widest block leading-none mb-1">Reporter</span>
                        <p className="text-xs font-black text-white uppercase truncate">{selectedReport.reporter_name || 'Anonymous'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Field Notes */}
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden shadow-inner">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-40" />
                    <span className="text-[7px] text-gray-500 uppercase font-black tracking-widest mb-2 block">Intelligence_Notes</span>
                    <p className="text-[11px] text-gray-400 leading-relaxed font-medium italic">
                      "{selectedReport.description || 'No additional field intelligence recorded for this sector.'}"
                    </p>
                  </div>

                  {/* Actions Area */}
                  <div className="pt-2 pb-6">
                    {selectedReport.status === 'Pending' ? (
                      <div className="flex bg-blue-600 rounded-2xl overflow-hidden divide-x divide-black/10 border border-blue-600 shadow-2xl">
                        <button 
                          onClick={() => handleAction(selectedReport.id, 'approve')}
                          className="flex-1 py-5 flex flex-col items-center justify-center hover:bg-black/5 transition-all group"
                        >
                          <FaCheckCircle className="text-white text-xl mb-1 group-hover:scale-110 transition-transform" />
                          <span className="text-white font-black text-[10px] tracking-widest uppercase">VERIFY</span>
                        </button>
                        <button 
                          onClick={() => handleAction(selectedReport.id, 'reject')}
                          className="flex-1 py-5 flex flex-col items-center justify-center hover:bg-black/5 transition-all group"
                        >
                          <FaTimes className="text-white text-xl mb-1 group-hover:scale-110 transition-transform" />
                          <span className="text-white font-black text-[10px] tracking-widest uppercase">REJECT</span>
                        </button>
                      </div>
                    ) : selectedReport.status === 'Verified' ? (
                      <button 
                        onClick={() => handleAction(selectedReport.id, 'resolve')}
                        className="w-full py-5 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-[11px] tracking-[0.4em] uppercase shadow-2xl transition-all flex flex-col items-center justify-center gap-1 group"
                      >
                        <FaCheckCircle className="text-white text-xl group-hover:scale-110 transition-transform" />
                        RESOLVE_EVENT
                      </button>
                    ) : (
                      <div className="py-5 text-center border border-white/5 rounded-2xl bg-white/5 shadow-inner">
                        <span className="text-[9px] text-gray-500 uppercase font-black tracking-[0.3em]">ARCHIVED_LOG</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Tactical Feed View */
              <div className="flex flex-col h-full animate-in fade-in slide-in-from-right duration-300">
                <div className="p-6 border-b border-white/5 bg-[#2c2c2e] flex justify-between items-center">
                  <div>
                    <h1 className="text-white font-black text-xl tracking-tighter uppercase italic flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                      ENVIRONMENTAL_INTEL
                    </h1>
                    <p className="text-gray-500 text-[9px] tracking-[0.4em] mt-1 font-bold uppercase">Multi-Hazard Monitor</p>
                  </div>
                  <button 
                    onClick={() => fetchReports()}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#f59e0b] border border-white/5 group transition-all"
                  >
                    <FiRefreshCw className={`group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="grid grid-cols-5 p-1 bg-black/40 border-b border-white/5">
                  {(['All', 'Pending', 'Verified', 'Rejected', 'Resolved'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setFilterStatus(tab)}
                      className={`py-3 text-[7px] font-black uppercase tracking-widest transition-all ${
                        filterStatus === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-white'
                      }`}
                    >
                      {tab.slice(0, 4)}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/10 p-4 space-y-3">
                  {loading && reports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-700">
                      <FaSpinner className="animate-spin text-xl mb-4" />
                      <span className="text-[9px] font-black tracking-[0.5em] uppercase">Syncing_Data</span>
                    </div>
                  ) : reports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-800 italic">
                      <FaInfoCircle className="text-xl mb-3 opacity-20" />
                      <span className="text-[9px] font-black tracking-widest uppercase text-center px-6">Zero_Target_Matches_In_Sector</span>
                    </div>
                  ) : (
                    reports.map(r => (
                      <div 
                        key={r.id}
                        onClick={() => {
                          setSelectedReport(r);
                          setCurrentImageIndex(0);
                          if (r.area_geojson) {
                            const geojson = typeof r.area_geojson === 'string' ? JSON.parse(r.area_geojson) : r.area_geojson;
                            if (geojson?.geometry?.coordinates) {
                              const points = geojson.geometry.coordinates[0].map((p: any) => [p[1], p[0]]);
                              const [lat, lng] = calculateCentroid(points);
                              flyToReport(lat, lng);
                            }
                          } else {
                            flyToReport(Number(r.lat), Number(r.lng));
                          }
                        }}
                        className={`px-5 py-4 cursor-pointer border-l-4 transition-all relative rounded-2xl ${
                          (selectedReport as any)?.id === r.id
                          ? 'bg-blue-600/10 border-blue-600 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]' 
                          : 'bg-white/5 border-transparent border-b border-white/[0.02] hover:bg-white/[0.08]'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${getSeverityStyle(r.severity)}`}>
                            {r.severity}
                          </span>
                          <span className="text-[8px] text-gray-600 font-mono">#{r.id}</span>
                        </div>
                        <h3 className="text-sm font-black text-white uppercase tracking-tight truncate mb-1">Flood_Event</h3>
                        <div className="flex items-center gap-1.5 text-gray-500 mb-2">
                          <FaMapMarkerAlt className="text-[9px] shrink-0" />
                          <span className="text-[10px] truncate uppercase font-bold tracking-tighter">{r.location_text || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] opacity-40 font-bold uppercase">
                          <div className="flex items-center gap-1.5">
                            <FaClock className="shrink-0" />
                            <span>{new Date(r.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <span className="text-blue-500 font-black">{r.barangay}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </MapProvider>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
};

export default FloodReport;
