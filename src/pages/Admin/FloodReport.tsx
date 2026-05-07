import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import { 
  FaWater, FaUser, FaMapMarkerAlt, FaClock, FaCheck, FaTimes, 
  FaFilter, FaImages, FaEye, FaSpinner, FaInfoCircle, FaCamera, FaCheckCircle
} from "react-icons/fa";
import { FiMapPin, FiClock as FiClockIcon, FiChevronRight, FiRefreshCw, FiSearch } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import MapboxMap, { Marker, Popup, NavigationControl, FullscreenControl, Source, Layer, MapProvider } from '../../components/maps/MapboxMap';
import TacticalMarker from '../../components/maps/TacticalMarker';
import { SantaCruzMapboxOutline } from '../../components/maps/SantaCruzOutline';
import { useMap } from 'react-map-gl';
import { apiFetch } from "../../utils/api";
import { DEFAULT_MAP_STATE } from "../../constants/geo";

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
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredReports = useMemo(() => {
    return reports.filter(r => 
      (r.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.location_text || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.brgy || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.reporter_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reports, searchTerm]);

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
    <div className="tactical-page !h-[calc(100vh-72px)] overflow-hidden">
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
                latitude: DEFAULT_MAP_STATE.latitude,
                longitude: DEFAULT_MAP_STATE.longitude,
                zoom: DEFAULT_MAP_STATE.zoom
              }}
              minZoom={DEFAULT_MAP_STATE.minZoom}
              maxBounds={DEFAULT_MAP_STATE.maxBounds}
              mapStyle="mapbox://styles/mapbox/light-v11"
              mapboxAccessToken={MAPBOX_TOKEN}
              onLoad={(e: any) => setMapInstance(e.target)}
              style={{ width: '100%', height: '100%' }}
            >
              <NavigationControl position="top-right" />
              <FullscreenControl position="top-right" />
              <SantaCruzMapboxOutline />
              
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
            <div className="absolute bottom-8 left-8 p-6 bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200 z-10 select-none shadow-2xl min-w-[200px]">
              <div className="tactical-status-pill mb-4 border-slate-200">
                <div className="tactical-status-dot bg-blue-600 animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                <span>Environmental Monitoring</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Critical Zone', color: 'bg-rose-600' },
                  { label: 'High Alert', color: 'bg-orange-600' },
                  { label: 'Moderate Risk', color: 'bg-amber-500' },
                  { label: 'Minor Water', color: 'bg-emerald-500' }
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.color} shadow-[0_0_5px_currentColor]`} />
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Unified Sidebar (Right) */}
          <div className="tactical-panel animate-in slide-in-from-right duration-500">
            {selectedReport ? (
              /* Inspection Node View */
              <div className="flex flex-col h-full animate-in fade-in slide-in-from-right duration-300">
                <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Selected Report</span>
                  <button onClick={() => setSelectedReport(null)} className="text-[9px] font-bold text-blue-600 uppercase">Back</button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                  {/* Evidence Visuals */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                     <div className="px-3 py-1.5 bg-gray-50/30 border-b border-gray-100 flex justify-between items-center">
                       <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Evidence</span>
                       {getMediaUrls(selectedReport).length > 1 && (
                         <div className="flex gap-2">
                           <button onClick={() => setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : getMediaUrls(selectedReport).length - 1))} className="text-gray-400 hover:text-blue-600 transition-colors">
                             <FiChevronRight className="rotate-180" size={10} />
                           </button>
                           <button onClick={() => setCurrentImageIndex(prev => (prev < getMediaUrls(selectedReport).length - 1 ? prev + 1 : 0))} className="text-gray-400 hover:text-blue-600 transition-colors">
                             <FiChevronRight size={10} />
                           </button>
                         </div>
                       )}
                     </div>
                    
                    {getMediaUrls(selectedReport).length > 0 ? (
                      <div className="aspect-video bg-slate-100 relative">
                        <img 
                          src={getMediaUrls(selectedReport)[currentImageIndex]} 
                          alt="Evidence" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-slate-900/80 rounded text-[7px] font-black text-white">
                          {currentImageIndex + 1} / {getMediaUrls(selectedReport).length}
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-50 flex flex-col items-center justify-center text-gray-300">
                        <FaCamera size={16} className="opacity-20 mb-1" />
                        <span className="text-[7px] font-black tracking-widest uppercase">No_Intel</span>
                      </div>
                    )}
                  </div>

                  {/* Tactical Parameters */}
                  <div className="space-y-2">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                        <div className="p-3">
                          <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Type</label>
                          <span className={`text-[11px] font-bold uppercase tracking-tight ${getSeverityStyle(selectedReport.severity).split(' ')[0]}`}>{selectedReport.severity}</span>
                        </div>
                        <div className="p-3">
                          <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Status</label>
                          <span className="text-[11px] font-bold text-slate-900 uppercase">{selectedReport.status}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                        <div className="p-3">
                          <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Coordinates</label>
                          <span className="text-[10px] font-bold text-slate-600 truncate block">
                            {Number(selectedReport.lat).toFixed(5)}, {Number(selectedReport.lng).toFixed(5)}
                          </span>
                        </div>
                        <div className="p-3">
                          <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Timestamp</label>
                          <span className="text-[10px] font-bold text-slate-600">
                            {new Date(selectedReport.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                      </div>
                      <div className="p-3">
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Reporter</label>
                        <div className="flex items-center gap-2">
                           <div className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center">
                              <FaUser size={10} className="text-blue-600" />
                           </div>
                           <span className="text-[11px] font-bold text-slate-900 uppercase truncate">{selectedReport.reporter_name || 'Anonymous'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Intel Notes */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-20" />
                      <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Description</label>
                      <p className="text-[11px] text-slate-600 font-semibold leading-tight italic">
                        "{selectedReport.description || 'Zero field intel.'}"
                      </p>
                    </div>
                  </div>

                  {/* Actions Area */}
                   <div className="space-y-2 pt-2">
                     {selectedReport.status === 'Pending' ? (
                       <div className="grid grid-cols-2 gap-2">
                         <button 
                           onClick={() => handleAction(selectedReport.id, 'approve')}
                           className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all shadow-lg shadow-blue-500/20"
                         >Verify</button>
                         <button 
                           onClick={() => handleAction(selectedReport.id, 'reject')}
                           className="py-3 bg-white border border-gray-100 hover:bg-red-50 hover:text-red-600 rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all"
                         >Reject</button>
                       </div>
                     ) : selectedReport.status === 'Verified' && (user?.role === 'admin' || user?.brgy_name === selectedReport.brgy) ? (
                       <button 
                         onClick={() => handleAction(selectedReport.id, 'resolve')}
                         className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] tracking-widest uppercase shadow-lg shadow-emerald-500/20"
                       >Resolve Report</button>
                     ) : (
                       <div className="py-4 text-center border border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                         <span className="text-[9px] text-gray-300 font-bold tracking-widest uppercase">Archived</span>
                       </div>
                     )}
                   </div>
                </div>
              </div>
            ) : (
              /* Tactical Feed View */
              <div className="flex flex-col h-full animate-in fade-in slide-in-from-right duration-300">
                <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Command Center</span>
                  <button onClick={() => fetchReports()} className="text-gray-400 hover:text-blue-600 transition-colors">
                    <FiRefreshCw size={10} className={loading ? 'animate-spin' : ''} />
                  </button>
                </div>

                <div className="p-[10px] border-b border-gray-100 space-y-3">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                    <input 
                      type="text" 
                      placeholder="Search label"
                      className="w-full bg-gray-50 text-[10px] font-bold border-none outline-none py-2.5 pl-9 rounded-xl"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex bg-gray-100 rounded-xl p-0.5 overflow-x-auto no-scrollbar">
                     {(['All', 'Pending', 'Verified', 'Rejected', 'Resolved'] as const).map(tab => (
                       <button
                         key={tab}
                         onClick={() => setFilterStatus(tab)}
                         className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold tracking-widest transition-all uppercase ${
                           filterStatus === tab 
                           ? 'bg-white text-slate-900 shadow-sm' 
                           : 'text-gray-400 hover:text-gray-600'
                         }`}
                       >
                         {tab}
                       </button>
                     ))}
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                  {loading && filteredReports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-300 gap-2">
                      <FaSpinner className="animate-spin text-sm" />
                      <span className="text-[9px] font-bold tracking-widest uppercase">Syncing...</span>
                    </div>
                  ) : filteredReports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-200">
                      <FaInfoCircle size={20} className="mb-2 opacity-20" />
                      <span className="text-[9px] font-bold tracking-widest uppercase text-center px-4">No tactical hazards detected</span>
                    </div>
                  ) : (
                    filteredReports.map(r => (
                      <button 
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
                        className={`w-full text-left bg-white rounded-2xl border transition-all overflow-hidden ${
                          (selectedReport as any)?.id === r.id
                          ? 'border-blue-600 shadow-lg shadow-blue-500/10' 
                          : 'border-gray-100 hover:border-gray-200 shadow-sm'
                        }`}
                      >
                        <div className="p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${getSeverityStyle(r.severity)}`}>
                              {r.severity}
                            </span>
                            <span className="text-[8px] font-bold text-gray-300">#SCT_{r.id}</span>
                          </div>
                          
                          <h3 className="text-[12px] font-bold text-slate-900 uppercase tracking-tight truncate mb-1">Flood Alert</h3>
                          
                          <div className="flex items-center gap-1.5 text-gray-400 mb-3">
                            <FaMapMarkerAlt size={8} className="shrink-0 text-blue-600" />
                            <span className="text-[9px] truncate font-semibold uppercase tracking-tight">{r.location_text || `Coord: ${Number(r.lat).toFixed(4)}, ${Number(r.lng).toFixed(4)}`}</span>
                          </div>

                          <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-widest pt-2 border-t border-gray-50">
                            <div className="flex items-center gap-1.5">
                              <FaClock size={8} className="text-gray-300" />
                              <span>{new Date(r.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                            </div>
                            <span className="text-blue-600">{r.brgy}</span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </MapProvider>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.15); }
      `}</style>
    </div>
  );
};

export default FloodReport;
