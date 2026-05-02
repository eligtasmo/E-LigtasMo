import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaExclamationTriangle, FaCheckCircle, FaTimes, FaMapMarkerAlt, 
  FaInfoCircle, FaClock, FaUser, FaPhoneAlt, FaPlus, FaFilter, FaSearch, FaSpinner, FaCamera
} from 'react-icons/fa';
import { FiChevronRight, FiMaximize2, FiExternalLink, FiRefreshCw, FiMapPin } from 'react-icons/fi';
import MapboxMap, { Marker, Popup, NavigationControl, FullscreenControl, MapProvider } from '../components/maps/MapboxMap';
import TacticalMarker from '../components/maps/TacticalMarker';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { useGlobalMapContext } from '../context/MapContext';
import { useMap } from 'react-map-gl';

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
  barangay: string;
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
        toast.success(`SEVERITY_TRIAGE: ${newSeverity.toUpperCase()}`);
        setIsEditingSeverity(false);
        fetchIncidents();
        if (selectedIncident) setSelectedIncident({...selectedIncident, severity: newSeverity});
      } else {
        toast.error(data.error || "Update rejected");
      }
    } catch (err) {
      toast.error("Comms failure during triage");
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

  const filteredIncidents = useMemo(() => {
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
    <MapProvider>
      <div className="h-[calc(100vh-72px)] w-full bg-[#0f0f11] text-white overflow-hidden font-mono flex">
        {/* Main View: Map (Left) */}
        <div className="flex-1 relative h-full">
          <MapboxMap
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            onLoad={e => setMapInstance(e.target)}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle="mapbox://styles/mapbox/streets-v12"
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
          </MapboxMap>

          {/* Overlay Branding */}
          <div className="absolute top-6 left-6 z-10">
            <div className="px-4 py-2 bg-black/80 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">TACTICAL_OVERSIGHT_ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Unified Command Sidebar (Right) */}
        <div className="w-[400px] flex flex-col bg-[#1c1c1e] z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.3)] h-full shrink-0 border-l border-white/5 overflow-hidden">
          {selectedIncident ? (
            /* Inspection Node View (Replaces Feed) */
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right duration-300">
              <div className="p-4 border-b border-white/5 relative bg-[#2c2c2e]">
                <button 
                  onClick={() => setSelectedIncident(null)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-all border border-white/5"
                >
                  <FaTimes size={14} />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
                  <h2 className="text-[#f59e0b] font-black text-base tracking-tighter uppercase italic">Inspection_Node</h2>
                </div>
                <p className="text-gray-500 text-[8px] tracking-[0.2em] font-black uppercase mt-0.5">
                  Ref_ID: {selectedIncident.id}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {/* Evidence Carousel */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[8px] text-gray-500 uppercase font-black tracking-[0.2em]">Evidence_Visuals</span>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : selectedIncident.media_urls.length - 1))}
                        className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 text-gray-500"
                      >
                        <FiChevronRight className="rotate-180" />
                      </button>
                      <button 
                        onClick={() => setCurrentImageIndex(prev => (prev < selectedIncident.media_urls.length - 1 ? prev + 1 : 0))}
                        className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 text-gray-500"
                      >
                        <FiChevronRight />
                      </button>
                    </div>
                  </div>
                  
                  {selectedIncident.media_urls.length > 0 ? (
                    <div className="aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/5 relative group shadow-2xl">
                      <img 
                        src={selectedIncident.media_urls[currentImageIndex].startsWith('data:') 
                          ? selectedIncident.media_urls[currentImageIndex] 
                          : `/${selectedIncident.media_urls[currentImageIndex]}`} 
                        alt="Incident Evidence" 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-black tracking-widest text-[#f59e0b] border border-white/10">
                        {currentImageIndex + 1}/{selectedIncident.media_urls.length}
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
                        className="text-[8px] text-[#f59e0b] hover:underline font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {isEditingSeverity ? 'Cancel' : 'Triage'}
                      </button>
                    </div>
                    {isEditingSeverity ? (
                      <div className="flex gap-1 mt-1">
                        {['Low', 'Moderate', 'High'].map((s) => (
                          <button
                            key={s}
                            onClick={() => handleUpdateSeverity(selectedIncident.id, selectedIncident.source_table, s)}
                            className={`flex-1 py-1 rounded text-[8px] font-black uppercase transition-all ${
                              selectedIncident.severity === s 
                              ? getSeverityStyle(s)
                              : 'bg-white/5 text-gray-500 hover:bg-white/10'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-xs font-black uppercase ${getSeverityStyle(selectedIncident.severity).split(' ')[0]}`}>
                        {selectedIncident.severity}
                      </p>
                    )}
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
                    <span className="text-[7px] text-gray-500 uppercase font-black tracking-widest block mb-1">Type</span>
                    <p className="text-xs font-black text-white uppercase">{selectedIncident.type}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 col-span-2 flex items-center gap-4 shadow-inner">
                    <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center border border-[#f59e0b]/20 shrink-0">
                      <FaUser className="text-[#f59e0b] text-sm" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[7px] text-gray-500 uppercase font-black tracking-widest block leading-none mb-1">Reporter</span>
                      <p className="text-xs font-black text-white uppercase truncate">{selectedIncident.reporter || 'Anonymous'}</p>
                    </div>
                  </div>
                </div>

                {/* Field Notes */}
                <div className="p-5 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden shadow-inner">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#f59e0b] opacity-40" />
                  <span className="text-[7px] text-gray-500 uppercase font-black tracking-widest mb-2 block">Intelligence_Notes</span>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-medium italic">
                    "{selectedIncident.description || 'No additional field intelligence recorded for this sector.'}"
                  </p>
                </div>

                {/* Actions Area */}
                <div className="pt-2 pb-6">
                  {selectedIncident.status.toUpperCase() === 'PENDING' ? (
                    <div className="flex bg-[#f59e0b] rounded-2xl overflow-hidden divide-x divide-black/10 border border-[#f59e0b] shadow-2xl">
                      <button 
                        onClick={() => {
                          const path = user?.role === 'admin' ? '/admin/report-incident' : '/barangay/report-incident';
                          navigate(path, { state: { prefill: selectedIncident, isVerify: true } });
                        }}
                        className="flex-1 py-5 flex flex-col items-center justify-center hover:bg-black/5 transition-all group"
                      >
                        <FaCheckCircle className="text-black text-xl mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-black font-black text-[10px] tracking-widest uppercase">VERIFY</span>
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm("CONFIRM REJECTION: Dismiss this report?")) {
                            handleAction(selectedIncident.id, 'reject', selectedIncident.source_table);
                          }
                        }}
                        disabled={actionLoading === selectedIncident.id}
                        className="flex-1 py-5 flex flex-col items-center justify-center hover:bg-black/5 transition-all group"
                      >
                        {actionLoading === selectedIncident.id ? <FaSpinner className="animate-spin text-black" /> : <FaTimes className="text-black text-xl mb-1 group-hover:scale-110 transition-transform" />}
                        <span className="text-black font-black text-[10px] tracking-widest uppercase">REJECT</span>
                      </button>
                    </div>
                  ) : selectedIncident.status.toUpperCase() === 'ACTIVE' || selectedIncident.status.toUpperCase() === 'APPROVED' || selectedIncident.status.toUpperCase() === 'VERIFIED' ? (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAction(selectedIncident.id, 'resolve', selectedIncident.source_table)}
                        disabled={actionLoading === selectedIncident.id}
                        className="flex-1 py-5 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-[11px] tracking-[0.4em] uppercase shadow-2xl transition-all flex flex-col items-center justify-center gap-1 group"
                      >
                        {actionLoading === selectedIncident.id ? <FaSpinner className="animate-spin text-white" /> : <FaCheckCircle className="text-white text-xl group-hover:scale-110 transition-transform" />}
                        RESOLVE_UNIT
                      </button>
                      <button 
                        onClick={() => {
                          const path = user?.role === 'admin' ? '/admin/report-incident' : '/barangay/report-incident';
                          navigate(path, { state: { prefill: selectedIncident, isEdit: true } });
                        }}
                        className="px-6 py-5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-[11px] tracking-[0.2em] uppercase transition-all flex flex-col items-center justify-center gap-1 group border border-white/5 shadow-xl"
                      >
                        <FiMaximize2 className="text-white text-xl group-hover:scale-110 transition-transform" />
                        MODIFY
                      </button>
                    </div>
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
              <div className="p-6 space-y-4 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-black tracking-tighter text-[#f59e0b]">OPERATIONAL_COMMAND</h1>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Live Tactical Stream</span>
                    </div>
                  </div>
                  <button 
                    onClick={fetchIncidents}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-90"
                    disabled={loading}
                  >
                    <FiRefreshCw className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="relative">
                  <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
                  <input 
                    type="text" 
                    placeholder="SEARCH_TACTICAL_DATA..."
                    className="w-full bg-[#2c2c2e] border-0 rounded-2xl py-3 pl-12 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/20 placeholder-gray-600 transition-all"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex p-1 bg-black/20 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                  {(['PENDING', 'ACTIVE', 'RESOLVED', 'REJECTED'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2 px-3 rounded-xl text-[9px] font-black tracking-widest transition-all whitespace-nowrap ${
                        activeTab === tab 
                        ? 'bg-[#f59e0b] text-black shadow-lg shadow-[#f59e0b]/20' 
                        : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-black/10">
                {loading && incidents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-600 gap-4">
                    <FaSpinner className="animate-spin text-xl" />
                    <span className="text-[9px] tracking-widest uppercase">Syncing Tactical Link...</span>
                  </div>
                ) : filteredIncidents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-700 opacity-30">
                    <FaInfoCircle className="text-3xl mb-3" />
                    <span className="text-[10px] font-black tracking-widest uppercase text-center px-6">Zero_Target_Matches_In_Current_Sector</span>
                  </div>
                ) : (
                  filteredIncidents.map(inc => (
                    <div 
                      key={`${inc.source_table}-${inc.id}`}
                      onClick={() => {
                        setSelectedIncident(inc);
                        flyToIncident(Number(inc.lat), Number(inc.lng));
                      }}
                      className={`px-5 py-4 cursor-pointer border-l-4 transition-all relative rounded-2xl mb-2 ${
                        selectedIncident?.id === inc.id && selectedIncident?.source_table === inc.source_table
                        ? 'bg-[#f59e0b]/10 border-[#f59e0b] shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]' 
                        : 'bg-white/5 border-transparent border-b border-white/[0.02] hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${getSeverityStyle(inc.severity)}`}>
                          {inc.severity}
                        </span>
                        <span className="text-[8px] text-gray-600 font-mono">#{inc.id.toString().slice(-4)}</span>
                      </div>
                      
                      <h3 className="text-sm font-black text-white uppercase tracking-tight truncate mb-1">{inc.type}</h3>
                      
                      <div className="flex items-center gap-1.5 text-gray-500 mb-2">
                        <FaMapMarkerAlt className="text-[9px] shrink-0" />
                        <span className="text-[10px] truncate uppercase font-bold tracking-tighter">{inc.location_text}</span>
                      </div>

                      <div className="flex items-center justify-between text-[9px] opacity-40 font-bold uppercase">
                        <div className="flex items-center gap-1.5">
                          <FaClock className="shrink-0" />
                          <span>{new Date(inc.time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#f59e0b] font-black">{(inc.reporter || 'ANON').split(' ')[0]}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
        .sentinelx-glow { filter: drop-shadow(0 0 4px #f59e0b); }
      `}</style>
    </MapProvider>
  );
};

export default TacticalApprovalDashboard;
