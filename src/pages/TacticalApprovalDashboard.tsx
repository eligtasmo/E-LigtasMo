import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaExclamationTriangle, FaCheckCircle, FaTimes, FaMapMarkerAlt, 
  FaInfoCircle, FaClock, FaUser, FaPhoneAlt, FaPlus, FaFilter, FaSearch, FaSpinner, FaCamera
} from 'react-icons/fa';
import { FiChevronRight, FiMaximize2, FiExternalLink, FiRefreshCw, FiMapPin, FiSearch } from 'react-icons/fi';
import PageMeta from "../components/common/PageMeta";
import MapboxMap, { Marker, Popup, NavigationControl, FullscreenControl, MapProvider } from '../components/maps/MapboxMap';
import TacticalMarker from '../components/maps/TacticalMarker';
import { SantaCruzMapboxOutline } from '../components/maps/SantaCruzOutline';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { useGlobalMapContext } from '../context/MapContext';
import { useMap } from 'react-map-gl';
import { DEFAULT_MAP_STATE } from '../constants/geo';

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN) as string | undefined;

interface UnifiedIncident {
  id: number;
  type: string;
  lat: number;
  lng: number;
  severity: string;
  status: string;
  description: string;
  time: string;
  brgy: string;
  reporter: string;
  location_text: string;
  media_urls: string[];
  source_table: string;
}

const TacticalApprovalDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<UnifiedIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<UnifiedIncident | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'ACTIVE' | 'RESOLVED' | 'REJECTED'>('PENDING');
  const { viewport: viewState, setViewport: setViewState } = useGlobalMapContext();
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mapInstance, setMapInstance] = useState<any>(null);

  const flyToIncident = (lat: number, lng: number) => {
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

  const handleUpdateSeverity = async (id: number, sourceTable: string, newSeverity: string) => {
    try {
      setActionLoading(id);
      const endpoint = sourceTable === 'incident_reports' ? 'update-incident-report.php' : 'update-hazard.php';
      
      // For hazards, we might need the actual hazard ID if it's already approved. 
      // But for now, let's assume we can update the source incident too if the API supports it.
      // Actually, update-hazard.php uses 'id'. 
      // Let's check if the sourceTable is 'hazards' (it's not in UnifiedIncident currently).
      
      const payload = sourceTable === 'incident_reports' 
        ? { id, severity: newSeverity }
        : { id, severity: newSeverity }; // update-hazard.php or update-incident? 
        
      // Let's use a more robust way: if it's an incident, it might need update-hazard.php if it's approved, 
      // or we need a new api for incidents. 
      // Given the current api list, update-hazard.php is the most flexible for severity.
      
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.success || data.id) {
        toast.success(`Severity Updated: ${newSeverity}`);
        setIsEditingSeverity(false);
        fetchIncidents();
        if (selectedIncident) setSelectedIncident({...selectedIncident, severity: newSeverity});
      } else {
        toast.error(data.error || "Update rejected");
      }
    } catch (err) {
      toast.error("Comms failure during update");
    } finally {
      setActionLoading(null);
    }
  };

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      // Fetching all non-rejected incidents for tactical awareness
      const res = await apiFetch('unified-incidents.php?limit=500');
      const json = await res.json();
      if (json.success) {
        setIncidents(json.data || []);
      }
    } catch (err) {
      console.error("Error fetching incidents:", err);
      toast.error("Failed to sync with tactical server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedIncident]);

  const filteredIncidents = useMemo<UnifiedIncident[]>(() => {
    return incidents.filter(inc => {
      const status = (inc.status || '').toUpperCase();
      const matchesTab = 
        activeTab === 'PENDING' ? status === 'PENDING' :
        activeTab === 'ACTIVE' ? (status === 'ACTIVE' || status === 'APPROVED' || status === 'VERIFIED') :
        activeTab === 'RESOLVED' ? status === 'RESOLVED' :
        status === 'REJECTED';
      
      const matchesSearch = 
        (inc.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inc.location_text || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inc.reporter || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesTab && matchesSearch;
    });
  }, [incidents, activeTab, searchTerm]);

  const handleAction = async (id: number, action: 'approve' | 'reject' | 'resolve', source: string) => {
    setActionLoading(id);
    try {
      let endpoint = '';
      if (source === 'incident_reports') {
        endpoint = action === 'approve' ? 'approve-incident-report.php' : 
                   action === 'reject' ? 'reject-incident-report.php' : 'resolve-incident-report.php';
      } else {
        // Standard incidents API
        endpoint = 'update-incident-status.php'; // Assuming this exists or we use specific ones
      }

      // Note: We might need to unify the update endpoints too, but for now let's try to match existing logic
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          status: action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Resolved',
          [action === 'approve' ? 'approved_by' : action === 'reject' ? 'rejected_by' : 'resolved_by']: user?.username || 'Official'
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`Operational status updated: ${action.toUpperCase()}`);
        fetchIncidents();
        if (selectedIncident?.id === id) setSelectedIncident(null);
      } else {
        toast.error(data.error || "Update failed");
      }
    } catch (err) {
      toast.error("Network communication error");
    } finally {
      setActionLoading(null);
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'moderate': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="tactical-page-map">
      <PageMeta title="Command Center | E-LigtasMo" description="Real-time incident oversight and tactical approval dashboard." />
      
      <div className="flex flex-col lg:flex-row h-full overflow-hidden">
        {/* Main View: Map (Left) */}
        <div className="flex-1 relative min-h-[400px] lg:h-full">
          <MapProvider>
            <MapboxMap
              {...viewState}
              onMove={(evt: any) => setViewState(evt.viewState)}
              minZoom={DEFAULT_MAP_STATE.minZoom}
              maxBounds={DEFAULT_MAP_STATE.maxBounds}
              onLoad={(e: any) => setMapInstance(e.target)}
              mapboxAccessToken={MAPBOX_TOKEN}
              mapStyle="mapbox://styles/mapbox/light-v11"
              pitch={0}
              bearing={0}
              style={{ width: '100%', height: '100%' }}
            >
              {incidents.filter(inc => (inc.status || '').toUpperCase() !== 'REJECTED').map(inc => (
                <TacticalMarker
                  key={`${inc.source_table}-${inc.id}`}
                  latitude={Number(inc.lat)}
                  longitude={Number(inc.lng)}
                  type={inc.type}
                  status={inc.status}
                  onClick={() => {
                    setSelectedIncident(inc);
                    flyToIncident(Number(inc.lat), Number(inc.lng));
                  }}
                />
              ))}
              <NavigationControl position="top-right" />
              <FullscreenControl position="top-right" />
              <SantaCruzMapboxOutline />
            </MapboxMap>
          </MapProvider>
        </div>

        <div className="tactical-panel animate-in slide-in-from-right duration-500">
          {selectedIncident ? (
            /* Inspection Node View */
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right duration-300">
              <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Report Details</span>
                <button onClick={() => setSelectedIncident(null)} className="text-[9px] font-bold text-blue-600 uppercase">Back</button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {/* Evidence Visuals */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                   <div className="px-3 py-1.5 bg-gray-50/30 border-b border-gray-100 flex justify-between items-center">
                     <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Evidence</span>
                     {selectedIncident.media_urls.length > 1 && (
                       <div className="flex gap-2">
                         <button onClick={() => setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : selectedIncident.media_urls.length - 1))} className="text-gray-400 hover:text-blue-600 transition-colors">
                           <FiChevronRight className="rotate-180" size={10} />
                         </button>
                         <button onClick={() => setCurrentImageIndex(prev => (prev < selectedIncident.media_urls.length - 1 ? prev + 1 : 0))} className="text-gray-400 hover:text-blue-600 transition-colors">
                           <FiChevronRight size={10} />
                         </button>
                       </div>
                     )}
                   </div>
                  
                  {selectedIncident.media_urls.length > 0 ? (
                    <div className="aspect-video bg-slate-100 relative">
                      <img 
                        src={selectedIncident.media_urls[currentImageIndex].startsWith('data:') 
                          ? selectedIncident.media_urls[currentImageIndex] 
                          : `/${selectedIncident.media_urls[currentImageIndex]}`} 
                        alt="Evidence" 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-slate-900/80 rounded text-[7px] font-black text-white">
                        {currentImageIndex + 1} / {selectedIncident.media_urls.length}
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
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Severity</label>
                        <span className={`text-[11px] font-bold uppercase tracking-tight ${getSeverityStyle(selectedIncident.severity).split(' ')[0]}`}>{selectedIncident.severity}</span>
                      </div>
                      <div className="p-3">
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Type</label>
                        <span className="text-[11px] font-bold text-slate-900 uppercase">{selectedIncident.type}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                      <div className="p-3">
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Coordinates</label>
                        <span className="text-[10px] font-bold text-slate-600 truncate block">
                          {Number(selectedIncident.lat).toFixed(5)}, {Number(selectedIncident.lng).toFixed(5)}
                        </span>
                      </div>
                      <div className="p-3">
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Timestamp</label>
                        <span className="text-[10px] font-bold text-slate-600">
                          {new Date(selectedIncident.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Reporter</label>
                      <div className="flex items-center gap-2">
                         <div className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center">
                            <FaUser size={10} className="text-blue-600" />
                         </div>
                         <span className="text-[11px] font-bold text-slate-900 uppercase truncate">{selectedIncident.reporter || 'Anonymous'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Intel Notes */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-20" />
                    <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Description</label>
                    <p className="text-[11px] text-slate-600 font-semibold leading-tight italic">
                      "{selectedIncident.description || 'Zero field intel.'}"
                    </p>
                  </div>
                </div>

                {/* Operations Area */}
                 <div className="space-y-2 pt-2">
                   {selectedIncident.status.toUpperCase() === 'PENDING' ? (
                     <div className="grid grid-cols-2 gap-2">
                       <button 
                         onClick={() => {
                           const path = user?.role === 'admin' ? '/admin/report-incident' : '/brgy/report-incident';
                           navigate(path, { state: { prefill: selectedIncident, isVerify: true } });
                         }}
                         className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all shadow-lg shadow-blue-500/20"
                       >Verify</button>
                       <button 
                         onClick={() => { if (window.confirm("Reject report?")) handleAction(selectedIncident.id, 'reject', selectedIncident.source_table); }}
                         className="py-3 bg-white border border-gray-100 hover:bg-red-50 hover:text-red-600 rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all"
                       >Reject</button>
                     </div>
                   ) : (['ACTIVE', 'APPROVED', 'VERIFIED'].includes(selectedIncident.status.toUpperCase())) && (user?.role === 'admin' || user?.brgy_name === selectedIncident.brgy) ? (
                     <div className="flex flex-col gap-2">
                       <button 
                         onClick={() => handleAction(selectedIncident.id, 'resolve', selectedIncident.source_table)}
                         className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] tracking-widest uppercase shadow-lg shadow-emerald-500/20"
                       >Resolve Report</button>
                       <button 
                         onClick={() => {
                           const path = user?.role === 'admin' ? '/admin/report-incident' : '/brgy/report-incident';
                           navigate(path, { state: { prefill: selectedIncident, isEdit: true } });
                         }}
                         className="w-full py-3 bg-white border border-gray-100 hover:bg-gray-50 text-slate-600 rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all"
                       >Edit Report</button>
                     </div>
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
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Command Center</span>
                <button onClick={fetchIncidents} className="text-gray-400 hover:text-blue-600 transition-colors">
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
                   {(['PENDING', 'ACTIVE', 'RESOLVED', 'REJECTED'] as const).map(tab => (
                     <button
                       key={tab}
                       onClick={() => setActiveTab(tab)}
                       className={`flex-1 py-1.5 px-2 rounded-lg text-[9px] font-bold tracking-widest transition-all uppercase ${
                         activeTab === tab 
                         ? 'bg-white text-slate-900 shadow-sm' 
                         : 'text-gray-400 hover:text-gray-600'
                       }`}
                     >
                       {tab.toLowerCase()}
                     </button>
                   ))}
                 </div>
              </div>

              {/* Sidebar Feed */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                {loading && incidents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-300 gap-2">
                    <FaSpinner className="animate-spin text-sm" />
                    <span className="text-[8px] font-black tracking-widest uppercase">Syncing...</span>
                  </div>
                ) : filteredIncidents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-200">
                    <FaInfoCircle size={20} className="mb-2 opacity-20" />
                    <span className="text-[8px] font-black tracking-widest uppercase text-center px-4">No tactical signatures detected</span>
                  </div>
                ) : (
                  filteredIncidents.map(inc => (
                    <button 
                      key={`${inc.source_table}-${inc.id}`}
                      onClick={() => {
                        setSelectedIncident(inc);
                        flyToIncident(Number(inc.lat), Number(inc.lng));
                      }}
                      className="w-full text-left bg-white rounded-2xl border transition-all overflow-hidden border-gray-100 hover:border-gray-200 shadow-sm"
                    >
                      <div className="p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${getSeverityStyle(inc.severity)}`}>
                            {inc.severity}
                          </span>
                          <span className="text-[8px] font-bold text-gray-300">#SCT_{inc.id}</span>
                        </div>
                        
                        <h3 className="text-[12px] font-bold text-slate-900 uppercase tracking-tight truncate mb-1">{inc.type}</h3>
                        
                        <div className="flex items-center gap-1.5 text-gray-400 mb-3">
                          <FaMapMarkerAlt size={8} className="shrink-0" />
                          <span className="text-[9px] truncate font-semibold uppercase tracking-tight">{inc.location_text}</span>
                        </div>

                        <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-widest pt-2 border-t border-gray-50">
                          <div className="flex items-center gap-1.5">
                            <FaClock size={8} className="text-gray-300" />
                            <span>{new Date(inc.time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                          </div>
                          <span className="text-blue-600">{(inc.reporter || 'Anonymous').split(' ')[0]}</span>
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

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.15); }
      `}</style>
    </div>
  );
};

export default TacticalApprovalDashboard;
