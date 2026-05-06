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
  brgy: string;
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
    <div className="h-[calc(100vh-72px)] w-full bg-white overflow-hidden font-jetbrains">
      <PageMeta 
        title="Tactical Environmental Oversight" 
        description="Monitor and manage environmental hazards across all sectors." 
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
              mapStyle="mapbox://styles/mapbox/light-v11"
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
            <div className="absolute bottom-6 left-6 p-4 bg-white/90 backdrop-blur-md tactical-container border-gray-100 z-10 select-none shadow-2xl min-w-[180px]">
              <div className="text-[10px] font-black text-blue-600 tracking-[0.2em] mb-3 flex items-center gap-2 uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                Live_Monitor
              </div>
              <div className="space-y-2.5">
                {[
                  { label: 'Critical_Zone', color: 'bg-red-600' },
                  { label: 'High_Alert', color: 'bg-orange-600' },
                  { label: 'Moderate_Flood', color: 'bg-amber-600' },
                  { label: 'Minor_Water', color: 'bg-emerald-600' }
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${item.color} shadow-[0_0_5px_currentColor]`} />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Unified Sidebar (Right) */}
          <div className="w-[400px] bg-gray-50 border-l border-gray-100 flex flex-col h-full shrink-0 z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] overflow-hidden">
            {selectedReport ? (
              /* Inspection Node View */
              <div className="flex flex-col h-full animate-in fade-in slide-in-from-right duration-300">
                <div className="tactical-card-header bg-gray-50/50 p-4! border-b!">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <h2 className="text-slate-900 font-black text-sm uppercase tracking-widest">Environmental Intel</h2>
                    </div>
                    <p className="text-slate-400 text-[9px] tracking-widest font-black uppercase mt-1 opacity-70">
                      Sector_Ref: {selectedReport.id}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedReport(null)}
                    className="w-8 h-8 rounded-lg bg-white hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-slate-400 transition-all border border-gray-100 shadow-sm"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                  {/* Evidence Carousel */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] text-slate-400 uppercase font-black tracking-[0.2em]">Visual_Evidence</span>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : getMediaUrls(selectedReport).length - 1))}
                          className="w-7 h-7 rounded-lg bg-white flex items-center justify-center hover:bg-gray-50 text-slate-400 border border-gray-100 shadow-sm transition-all"
                        >
                          <FiChevronRight className="rotate-180 text-xs" />
                        </button>
                        <button 
                          onClick={() => setCurrentImageIndex(prev => (prev < getMediaUrls(selectedReport).length - 1 ? prev + 1 : 0))}
                          className="w-7 h-7 rounded-lg bg-white flex items-center justify-center hover:bg-gray-50 text-slate-400 border border-gray-100 shadow-sm transition-all"
                        >
                          <FiChevronRight className="text-xs" />
                        </button>
                      </div>
                    </div>
                    
                    {getMediaUrls(selectedReport).length > 0 ? (
                      <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-200 relative group shadow-inner">
                        <img 
                          src={getMediaUrls(selectedReport)[currentImageIndex]} 
                          alt="Flood Evidence" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute bottom-3 right-3 px-2 py-1 bg-slate-900/80 backdrop-blur-md rounded-lg text-[9px] font-black tracking-widest text-white border border-white/10">
                          {currentImageIndex + 1}/{getMediaUrls(selectedReport).length}
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-xl bg-gray-50/50 border border-dashed border-gray-200 flex flex-col items-center justify-center text-slate-300">
                        <FaCamera size={20} className="mb-2 opacity-20" />
                        <span className="text-[9px] font-black tracking-[0.3em] uppercase opacity-40">Zero_Visual_Intel</span>
                      </div>
                    )}
                  </div>

                  {/* Data Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-white tactical-container border-gray-100 shadow-sm group relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest block">Threat_Level</span>
                        <button 
                          onClick={() => setIsEditingSeverity(!isEditingSeverity)}
                          className="text-[8px] text-blue-600 hover:text-blue-700 font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {isEditingSeverity ? 'Cancel' : 'Triage'}
                        </button>
                      </div>
                      {isEditingSeverity ? (
                        <div className="flex flex-col gap-1.5 mt-1">
                          {['Low', 'Moderate', 'High'].map((s) => (
                            <button
                              key={s}
                              onClick={() => handleUpdateSeverity(selectedReport.id, s)}
                              className={`w-full py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${
                                selectedReport.severity === s 
                                ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                                : 'bg-white text-slate-400 hover:bg-gray-50 border-gray-100'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className={`text-[11px] font-black uppercase tracking-widest ${getSeverityStyle(selectedReport.severity).split(' ')[0]}`}>
                          {selectedReport.severity}
                        </p>
                      )}
                    </div>
                    <div className="p-4 bg-white tactical-container border-gray-100 shadow-sm">
                      <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-2">Mission_Status</span>
                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{selectedReport.status}</p>
                    </div>
                    <div className="p-4 bg-white tactical-container border-gray-100 col-span-2 flex items-center gap-4 shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
                        <FaUser className="text-sm" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest block leading-none mb-1.5">Intel_Source</span>
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate">{selectedReport.reporter_name || 'Anonymous_Unit'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Field Notes */}
                  <div className="p-5 bg-white tactical-container border-gray-100 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 opacity-20" />
                    <span className="text-[8px] text-slate-400 uppercase font-black tracking-[0.2em] mb-3 block">Sector_Intelligence</span>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-black uppercase tracking-tight italic opacity-90">
                      "{selectedReport.description || 'No_Additional_Tactical_Notes_Recorded_For_This_Sector'}"
                    </p>
                  </div>

                  {/* Actions Area */}
                  <div className="pt-2 pb-6">
                    {selectedReport.status === 'Pending' ? (
                      <div className="flex bg-slate-900 rounded-xl overflow-hidden border border-white/5 shadow-2xl">
                        <button 
                          onClick={() => handleAction(selectedReport.id, 'approve')}
                          className="flex-1 py-4 flex flex-col items-center justify-center hover:bg-emerald-600 transition-all group"
                        >
                          <FaCheckCircle className="text-white text-lg mb-1.5 group-hover:scale-110 transition-transform" />
                          <span className="text-white font-black text-[9px] tracking-[0.3em] uppercase">Verify_Intel</span>
                        </button>
                        <div className="w-[1px] bg-white/10" />
                        <button 
                          onClick={() => handleAction(selectedReport.id, 'reject')}
                          className="flex-1 py-4 flex flex-col items-center justify-center hover:bg-red-600 transition-all group"
                        >
                          <FaTimes className="text-white text-lg mb-1.5 group-hover:scale-110 transition-transform" />
                          <span className="text-white font-black text-[9px] tracking-[0.3em] uppercase">Decline_Report</span>
                        </button>
                      </div>
                    ) : selectedReport.status === 'Verified' ? (
                      <button 
                        onClick={() => handleAction(selectedReport.id, 'resolve')}
                        className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] tracking-[0.4em] uppercase shadow-2xl transition-all flex flex-col items-center justify-center gap-1.5 group border border-emerald-500/20"
                      >
                        <FaCheckCircle className="text-white text-xl group-hover:scale-110 transition-transform" />
                        Resolve_Sector_Mission
                      </button>
                    ) : (
                      <div className="py-5 text-center border border-gray-100 rounded-xl bg-gray-50 shadow-inner">
                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-[0.4em]">Archived_Mission_Log</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Tactical Feed View */
              <div className="flex flex-col h-full animate-in fade-in slide-in-from-right duration-300">
                <div className="tactical-card-header bg-white p-6! border-b!">
                  <div>
                    <h1 className="text-slate-900 font-black text-lg tracking-tighter flex items-center gap-3 uppercase">
                      <div className="w-1.5 h-6 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]" />
                      Environmental Intel
                    </h1>
                    <p className="text-slate-400 text-[10px] tracking-[0.2em] mt-1.5 font-black uppercase opacity-70">Mission_Threat_Monitor</p>
                  </div>
                  <button 
                    onClick={() => fetchReports()}
                    className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-white flex items-center justify-center text-blue-600 border border-gray-100 group transition-all shadow-sm hover:shadow-md"
                  >
                    <FiRefreshCw className={`text-sm group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="grid grid-cols-5 p-1 bg-gray-50/50 border-b border-gray-100">
                  {(['All', 'Pending', 'Verified', 'Rejected', 'Resolved'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setFilterStatus(tab)}
                      className={`py-3 text-[8px] font-black uppercase tracking-widest transition-all ${
                        filterStatus === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {tab.slice(0, 4)}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/50 p-4 space-y-3">
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
                        className={`px-5 py-4 cursor-pointer border-l-4 transition-all relative tactical-container ${
                          (selectedReport as any)?.id === r.id
                          ? 'bg-white border-blue-600 shadow-xl ring-1 ring-blue-600/10' 
                          : 'bg-white border-transparent hover:border-gray-200 hover:bg-gray-50 shadow-sm border border-gray-100'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${getSeverityStyle(r.severity)}`}>
                            {r.severity}
                          </span>
                          <span className="text-[9px] text-slate-400 font-black tracking-widest opacity-60">REF_{r.id}</span>
                        </div>
                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest truncate mb-2">Flood_Detection_Event</h3>
                        <div className="flex items-center gap-2 text-slate-500 mb-3">
                          <FaMapMarkerAlt className="text-[10px] shrink-0 text-blue-600" />
                          <span className="text-[10px] truncate uppercase font-black tracking-tight">{r.location_text || `COORD_${r.lat.toFixed(4)}_${r.lng.toFixed(4)}`}</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-black uppercase tracking-widest border-t border-gray-50 pt-3">
                          <div className="flex items-center gap-2">
                            <FaClock className="shrink-0 text-slate-300" />
                            <span>{new Date(r.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                          </div>
                          <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-black tracking-tighter">{r.brgy}</span>
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }
      `}</style>
    </div>
  );
};

export default FloodReport;
