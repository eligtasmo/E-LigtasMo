import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { FiShield, FiClock, FiPlus, FiActivity, FiRefreshCw, FiMaximize2, FiX, FiNavigation, FiZap } from 'react-icons/fi';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_MAP_STATE, SANTA_CRUZ_BOUNDS_LEAFLET } from '../../constants/geo';
import PageMeta from "../../components/common/PageMeta";

const BrgyDispatchBoard: React.FC = () => {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [searchParams] = useSearchParams();

  const loadRuns = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('list-sop-runs.php');
      const data = await res.json();
      setRuns(Array.isArray(data) ? data : data?.runs || data?.sop_runs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  useEffect(() => {
    const ridParam = searchParams.get('runId');
    if (!ridParam) return;
    const ridNum = Number(ridParam);
    if (!Number.isFinite(ridNum)) return;
    const found = runs.find((r) => Number(r.run_id ?? r.id) === ridNum);
    if (found) {
      setSelectedRun(found);
      setMapOpen(true);
    }
  }, [runs, searchParams]);

  return (
    <div className="tactical-page">
      <PageMeta title="Dispatch Board | E-LigtasMo" description="Monitor and manage sector-wide emergency dispatch operations." />
      
      <div className="tactical-container">
        {/* Header Section */}
        <div className="tactical-header">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <div className="tactical-status-pill mb-4">
                <div className="tactical-status-dot bg-emerald-500 animate-pulse" />
                <span>DISPATCH_COMMS: ACTIVE</span>
              </div>
              <h1 className="tactical-title">Brgy. Dispatch Board</h1>
              <p className="tactical-subtitle">Real-time tracking of emergency responders, resources, and mission logs.</p>
            </div>

            <div className="flex items-center gap-3">
              <button className="tactical-button-accent h-12 px-6">
                <FiPlus /> DEPLOY_NEW_UNIT
              </button>
            </div>
          </div>
        </div>

        {/* Global Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { label: 'Active_Missions', value: '08', color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Units_In_Field', value: '14', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Pending_Signals', value: '03', color: 'text-rose-600', bg: 'bg-rose-50' }
          ].map((stat, i) => (
            <div key={i} className="tactical-card group hover:translate-y-[-2px] transition-all">
              <div className="tactical-card-body flex items-center justify-between p-8">
                <div>
                  <span className="tactical-label mb-1">{stat.label}</span>
                  <div className={`text-3xl font-black tabular-nums tracking-tighter ${stat.color}`}>{stat.value}</div>
                </div>
                <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center border border-current/10 shadow-sm transition-transform group-hover:scale-110`}>
                  <FiActivity size={24} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dispatch Matrix */}
        <div className="tactical-card">
          <div className="tactical-card-header px-8 py-6 border-b border-slate-100 flex justify-between items-center">
             <div className="flex items-center gap-3">
                <div className="tactical-icon-container w-8 h-8 bg-blue-50 text-blue-600">
                   <FiNavigation size={16} />
                </div>
                <span className="tactical-label mb-0">Active_Dispatch_Matrix</span>
             </div>
             <button 
                onClick={loadRuns}
                disabled={loading}
                className="tactical-icon-container hover:bg-slate-900 hover:text-white transition-all shadow-sm"
             >
                <FiRefreshCw className={loading ? 'animate-spin' : ''} size={16} />
             </button>
          </div>
          <div className="tactical-table-wrapper">
            <table className="tactical-table">
              <thead>
                <tr>
                  <th className="tactical-th">Unit_Identifier</th>
                  <th className="tactical-th">Assignment_Target</th>
                  <th className="tactical-th">Operational_Status</th>
                  <th className="tactical-th">Last_Link_Update</th>
                  <th className="tactical-th text-right">Mission_Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center">
                       <div className="flex flex-col items-center gap-4 opacity-30">
                          <FiZap size={40} className="text-slate-400" />
                          <span className="text-[10px] font-black uppercase tracking-[0.4em]">Zero_Active_Units_In_Field</span>
                       </div>
                    </td>
                  </tr>
                ) : runs.map((r, i) => (
                  <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="tactical-td">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shadow-lg">
                           {String(r.team_assigned || 'RES').substring(0, 3).toUpperCase()}
                        </div>
                        <div className="font-black text-slate-900 uppercase tracking-tight">#{r.run_id || r.id}</div>
                      </div>
                    </td>
                    <td className="tactical-td">
                      <div className="font-bold text-slate-600 uppercase tracking-tight text-[11px] truncate max-w-[300px]">
                        {r.notes || 'No mission directives set'}
                      </div>
                    </td>
                    <td className="tactical-td">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                        (r.status_label || r.status) === 'completed' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {r.status_label || r.status || 'DEPLOYED'}
                      </span>
                    </td>
                    <td className="tactical-td">
                       <div className="flex items-center gap-2 text-slate-400">
                          <FiClock size={12} />
                          <span className="text-[10px] font-black uppercase tracking-widest tabular-nums">
                            {new Date(r.dispatched_at || r.created_at).toLocaleString('en-PH', { hour12: false })}
                          </span>
                       </div>
                    </td>
                    <td className="tactical-td text-right">
                      <button 
                        className="tactical-button-ghost py-2 px-4 text-[9px] bg-white border-slate-200 hover:border-blue-600 hover:text-blue-600"
                        onClick={() => { setSelectedRun(r); setMapOpen(true); }}
                      >
                        <FiMaximize2 /> VIEW_TACTICAL
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Status */}
        <div className="pt-12 flex justify-between items-center border-t border-slate-200">
           <div className="flex items-center gap-3">
              <FiShield className="text-slate-300" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Secure Dispatch Link Active</span>
           </div>
           <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">
              Registry v4.2.0 • Last sync {new Date().toLocaleTimeString()}
           </div>
        </div>
      </div>

      {/* Tactical Map Modal */}
      {mapOpen && selectedRun && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center z-[2000] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <div className="flex items-center gap-3 mb-2">
                   <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tactical_Overlay: Active</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Mission_Control_Registry: #{selectedRun.run_id || selectedRun.id}</h2>
              </div>
              <button 
                onClick={() => setMapOpen(false)} 
                className="w-14 h-14 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-rose-600 transition-all flex items-center justify-center shadow-sm hover:shadow-lg active:scale-95"
              >
                <FiX size={24} />
              </button>
            </div>
            
            <div className="flex-grow relative bg-slate-100 min-h-[400px]">
              {selectedRun.destination_lat && selectedRun.destination_lng ? (
                <MapContainer 
                  center={[Number(selectedRun.destination_lat), Number(selectedRun.destination_lng)]} 
                  zoom={16} 
                  minZoom={DEFAULT_MAP_STATE.minZoom}
                  maxBounds={SANTA_CRUZ_BOUNDS_LEAFLET}
                  attributionControl={false}
                  zoomControl={false}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                  <Marker position={[Number(selectedRun.destination_lat), Number(selectedRun.destination_lng)]} />
                </MapContainer>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-400">
                  <FiNavigation size={48} className="opacity-20" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">No_Target_Coordinates_Locked</span>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target_Coordinates</span>
                <span className="text-sm font-black text-slate-900 tabular-nums">
                  {selectedRun.destination_lat ? `${Number(selectedRun.destination_lat).toFixed(6)}, ${Number(selectedRun.destination_lng).toFixed(6)}` : 'UNKNOWN'}
                </span>
              </div>
              <div className="flex gap-4">
                 <button 
                    onClick={async () => {
                      if (!selectedRun.destination_lat) return;
                      try { await navigator.clipboard.writeText(`${selectedRun.destination_lat}, ${selectedRun.destination_lng}`); toast.success('COORDINATES_COPIED'); } catch {}
                    }}
                    className="tactical-button-ghost bg-white"
                 >
                    COPY_IDENT
                 </button>
                 <button className="tactical-button-accent shadow-blue-600/20">
                    REDEPLOY_UNIT
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrgyDispatchBoard;
