import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit3, FiAlertTriangle, FiMapPin, FiClock, FiUser, FiX, FiCheck, FiExternalLink, FiChevronRight } from 'react-icons/fi';
import { FaExclamationTriangle, FaRoad, FaWater, FaFire, FaSnowflake, FaWind, FaMapMarkerAlt, FaPhone, FaEnvelope, FaCalendarAlt, FaCheck, FaCar, FaMotorcycle, FaWalking, FaBicycle, FaBus } from 'react-icons/fa';
import HazardFormModal from './HazardFormModal';

interface Hazard {
  id: number | string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  address?: string;
  description: string;
  reportedBy?: string;
  reportedAt?: string;
  reported_by?: string;
  status: 'active' | 'resolved' | 'monitoring';
  coordinates?: [number, number];
  lat?: number;
  lng?: number;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  datetime?: string;
  created_at?: string;
  updated_at?: string;
  reporter?: string;
  contact?: string;
  email?: string;
  photo_url?: string;
  brgy?: string;
  allowed_modes?: string[] | null;
}

interface HazardManagementPanelProps {
  hazards: Hazard[];
  snapToRoadEnabled: boolean;
  setSnapToRoadEnabled: (enabled: boolean) => void;
  draftSeverity: 'low' | 'medium' | 'high' | 'critical';
  setDraftSeverity: (severity: 'low' | 'medium' | 'high' | 'critical') => void;
  isHazardDrawing: boolean;
  setIsHazardDrawing: (drawing: boolean) => void;
  hazardDrawTool: 'segment' | 'polygon';
  setHazardDrawTool: (tool: 'segment' | 'polygon') => void;
  previewLineGeojson?: any;
  previewAreaGeojson?: any;
  hazardPolygonCount: number;
  onUndoHazardPolygon: () => void;
  onFinishHazardPolygon: () => void;
  onResetHazardDraft: () => void;
  defaultReporter: string;
  defaultContact: string;
  defaultEmail: string;
  defaultLocation: string;
  defaultAddress: string;
  onAddHazard: (hazard: Omit<Hazard, 'id'>) => void | Promise<void>;
  onEditHazard: (id: number | string, hazard: Partial<Hazard>) => void | Promise<void>;
  onDeleteHazard: (id: number | string) => void;
  onSelectHazard: (hazard: Hazard | null) => void;
  selectedHazard: Hazard | null;
  hazardStart: [number, number] | null;
  hazardEnd: [number, number] | null;
  activeHazardInput: 'start' | 'end';
  setActiveHazardInput: (input: 'start' | 'end') => void;
  setHazardStart: (location: [number, number] | null) => void;
  setHazardEnd: (location: [number, number] | null) => void;
  isHazardFormOpen: boolean;
  setIsHazardFormOpen: (open: boolean) => void;
}

const HAZARD_TYPES = [
  { value: 'Flood', label: '🌊 Flood', icon: FaWater, color: '#3b82f6' },
  { value: 'Fire', label: '🔥 Fire', icon: FaFire, color: '#ef4444' },
  { value: 'Landslide', label: '⛰️ Landslide', icon: FaExclamationTriangle, color: '#f59e0b' },
  { value: 'Accident', label: '🚗 Accident', icon: FaExclamationTriangle, color: '#dc2626' },
  { value: 'Blocked Road', label: '🚧 Blocked Road', icon: FaRoad, color: '#6b7280' },
  { value: 'Earthquake', label: '🌍 Earthquake', icon: FaExclamationTriangle, color: '#8b5cf6' },
  { value: 'Other', label: '📋 Other', icon: FiAlertTriangle, color: '#10b981' }
];

const SEVERITY_LEVELS = [
  { value: 'Low', label: '🟢 Low', color: '#10b981' },
  { value: 'Medium', label: '🟡 Medium', color: '#f59e0b' },
  { value: 'High', label: '🟠 High', color: '#ef4444' },
  { value: 'Critical', label: '🔴 Critical', color: '#dc2626' }
];

const SEVERITY_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#dc2626',
  Low: '#10b981',
  Medium: '#f59e0b',
  High: '#ef4444',
  Critical: '#dc2626'
};

const STATUS_COLORS = {
  active: '#ef4444',
  monitoring: '#f59e0b',
  resolved: '#10b981'
};

const HazardManagementPanel: React.FC<HazardManagementPanelProps> = ({
  hazards,
  snapToRoadEnabled,
  setSnapToRoadEnabled,
  draftSeverity,
  setDraftSeverity,
  isHazardDrawing,
  setIsHazardDrawing,
  hazardDrawTool,
  setHazardDrawTool,
  previewLineGeojson,
  previewAreaGeojson,
  hazardPolygonCount,
  onUndoHazardPolygon,
  onFinishHazardPolygon,
  onResetHazardDraft,
  defaultReporter,
  defaultContact,
  defaultEmail,
  defaultLocation,
  defaultAddress,
  onAddHazard,
  onEditHazard,
  onDeleteHazard,
  onSelectHazard,
  selectedHazard,
  hazardStart,
  hazardEnd,
  activeHazardInput,
  setActiveHazardInput,
  setHazardStart,
  setHazardEnd,
  isHazardFormOpen,
  setIsHazardFormOpen
}) => {
  const navigate = useNavigate();
  const [editingHazard, setEditingHazard] = useState<Hazard | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'monitoring' | 'resolved'>('all');

  const handleAddHazard = async (hazard: Omit<Hazard, 'id'>) => {
    await onAddHazard(hazard);
    setIsHazardFormOpen(false);
  };

  const handleUpdateHazard = async (hazard: Omit<Hazard, 'id'>) => {
    if (editingHazard) {
      await onEditHazard(editingHazard.id, hazard);
      setIsHazardFormOpen(false);
      setEditingHazard(null);
    }
  };

  const handleEdit = (hazard: Hazard) => {
    setEditingHazard(hazard);
    setIsHazardFormOpen(true);
  };

  const handleMarkAsResolved = (id: number | string) => {
    onEditHazard(id, { status: 'resolved' });
  };

  const handleCloseModal = () => {
    setIsHazardFormOpen(false);
    setEditingHazard(null);
    onResetHazardDraft();
    setIsHazardDrawing(false);
  };

  const handleNavigateToIncidentReport = () => {
    navigate('/admin/incident-reports');
  };

  const getHazardIcon = (type: string) => {
    const hazardType = HAZARD_TYPES.find(t => t.value === type);
    return hazardType ? hazardType.icon : FiAlertTriangle;
  };

  const getHazardColor = (type: string) => {
    const hazardType = HAZARD_TYPES.find(t => t.value === type);
    return hazardType ? hazardType.color : '#6b7280';
  };

  const severityIndex = draftSeverity === 'low' ? 0 : draftSeverity === 'medium' ? 1 : draftSeverity === 'high' ? 2 : 3;
  const severityLabel = draftSeverity === 'low' ? 'Low' : draftSeverity === 'medium' ? 'Moderate' : draftSeverity === 'high' ? 'High' : 'Critical';
  const previewRadiusM = draftSeverity === 'critical' ? 350 : draftSeverity === 'high' ? 250 : draftSeverity === 'medium' ? 160 : 110;

  return (
    <div className="flex flex-col h-full font-jetbrains">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/20">
              <FiAlertTriangle className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-gray-900 font-black text-lg tracking-tight uppercase">Search</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] text-slate-500 tracking-tight font-bold uppercase">Live Surveillance</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleNavigateToIncidentReport}
              className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-slate-500 hover:bg-gray-100 hover:text-gray-900 transition-all shadow-sm"
              title="Incident Reports"
            >
              <FiExternalLink />
            </button>
            {!isHazardDrawing ? (
              <button
                onClick={() => {
                  onSelectHazard(null);
                  onResetHazardDraft();
                  setHazardDrawTool('segment');
                  setIsHazardDrawing(true);
                }}
                className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
                title="Create New Hazard"
              >
                <FiPlus />
              </button>
            ) : (
              <button
                onClick={() => {
                  onResetHazardDraft();
                  setIsHazardDrawing(false);
                }}
                className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-white shadow-lg shadow-gray-900/20 hover:bg-black transition-all active:scale-95"
                title="Cancel Drawing"
              >
                <FiX />
              </button>
            )}
          </div>
        </div>

        {/* Hazard System Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Active Status</p>
            <p className="text-gray-900 font-black text-xl">
              {(Array.isArray(hazards) ? hazards : []).filter(h => h.status === 'active').length}
              <span className="text-red-600 ml-1">!!</span>
            </p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Grid Mode</p>
            <p className="text-blue-600 font-black text-[13px] uppercase tracking-tight">Tactical-V2</p>
          </div>
        </div>

        {/* Drawing Controls (Conditional) */}
        {isHazardDrawing && (
          <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 mb-6 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Aquisition Mode</span>
              </div>
              <div className="flex bg-white rounded-lg p-1 border border-blue-100">
                <button
                  type="button"
                  onClick={() => { setHazardDrawTool('segment'); onResetHazardDraft(); }}
                  className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${hazardDrawTool === 'segment' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-400 hover:text-blue-600'}`}
                >Path</button>
                <button
                  type="button"
                  onClick={() => { setHazardDrawTool('polygon'); onResetHazardDraft(); }}
                  className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${hazardDrawTool === 'polygon' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-400 hover:text-blue-600'}`}
                >Area</button>
              </div>
            </div>

            {hazardDrawTool === 'segment' ? (
              <div className="space-y-4">
                <div className="bg-white/50 rounded-xl p-3 border border-blue-100/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black text-blue-400 uppercase">Input Node [A]</span>
                    <span className={`text-[9px] font-bold ${hazardStart ? 'text-emerald-600' : 'text-slate-500'}`}>{hazardStart ? 'LOCKED' : 'PENDING'}</span>
                  </div>
                  {hazardStart && hazardStart.length >= 2 && (
                    <p className="text-[11px] font-bold text-blue-900 truncate opacity-70">
                      {hazardStart[0].toFixed(5)}, {hazardStart[1].toFixed(5)}
                    </p>
                  )}
                </div>
                <div className="bg-white/50 rounded-xl p-3 border border-blue-100/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black text-blue-400 uppercase">Input Node [B]</span>
                    <span className={`text-[9px] font-bold ${hazardEnd ? 'text-emerald-600' : 'text-slate-500'}`}>{hazardEnd ? 'LOCKED' : 'PENDING'}</span>
                  </div>
                  {hazardEnd && hazardEnd.length >= 2 && (
                    <p className="text-[11px] font-bold text-blue-900 truncate opacity-70">
                      {hazardEnd[0].toFixed(5)}, {hazardEnd[1].toFixed(5)}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button onClick={onResetHazardDraft} className="flex-1 py-3 rounded-xl bg-white border border-blue-100 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all">Reset</button>
                  <button onClick={() => setIsHazardFormOpen(true)} disabled={!hazardStart || !hazardEnd} className="flex-[2] py-3 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20">Finalize</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-blue-900">Vertices Placed: <span className="font-black text-blue-600">{hazardPolygonCount}</span></p>
                  <span className="text-[9px] font-bold text-blue-400 italic">Min 3 req.</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <button onClick={onUndoHazardPolygon} disabled={hazardPolygonCount === 0} className="py-3 rounded-xl bg-white border border-blue-100 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all disabled:opacity-30">Undo</button>
                   <button onClick={onFinishHazardPolygon} disabled={hazardPolygonCount < 3} className="py-3 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-30">Lock Area</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Severity Configuration */}
        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
           <div className="flex items-center justify-between mb-4">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Impact Radius</p>
              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white`} style={{ backgroundColor: SEVERITY_COLORS[draftSeverity] }}>
                {draftSeverity}
              </span>
           </div>
           <input
              type="range" min={0} max={3} step={1}
              value={severityIndex}
              onChange={(e) => {
                const v = Number(e.target.value);
                setDraftSeverity(v === 0 ? 'low' : v === 1 ? 'medium' : v === 2 ? 'high' : 'critical');
              }}
              className="w-full accent-gray-900 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between mt-3 text-[8px] font-bold text-slate-500 uppercase tracking-tighter">
               <span>Minor</span>
               <span>Moderate</span>
               <span>Severe</span>
               <span>Critical</span>
            </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-6">
           {['all', 'active', 'monitoring', 'resolved'].map((status) => (
             <button
               key={status}
               onClick={() => setStatusFilter(status as any)}
               className={`flex-1 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${statusFilter === status ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' : 'bg-gray-50 text-slate-500 hover:text-gray-900 border border-gray-100'}`}
             >
               {status}
             </button>
           ))}
        </div>
      </div>

      {/* Hazards List Section */}
      <div className="flex-1 overflow-y-auto pr-1 -mr-1 custom-scrollbar space-y-4">
        {(() => {
          const filteredHazards = statusFilter === 'all' 
            ? hazards 
            : (hazards || []).filter(h => h.status === statusFilter);
          
          const sortedHazards = [...filteredHazards].sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : (a.datetime ? new Date(a.datetime).getTime() : 0);
            const dateB = b.created_at ? new Date(b.created_at).getTime() : (b.datetime ? new Date(b.datetime).getTime() : 0);
            return dateB - dateA;
          });
          
          return sortedHazards.length === 0 ? (
            <div className="py-20 text-center">
               <div className="w-16 h-16 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4">
                  <FiAlertTriangle className="text-gray-200 text-2xl" />
               </div>
               <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">No Records Found</p>
            </div>
          ) : (
            sortedHazards.map((hazard) => {
              const HazardIcon = getHazardIcon(hazard.type);
              const isSelected = selectedHazard?.id === hazard.id;
              
              return (
                <div
                  key={hazard.id}
                  onClick={() => onSelectHazard(isSelected ? null : hazard)}
                  className={`group rounded-3xl border-2 transition-all cursor-pointer overflow-hidden p-5 ${isSelected ? 'bg-white border-blue-600 shadow-xl' : 'bg-white border-gray-50 hover:border-gray-200 shadow-sm'}`}
                >
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: getHazardColor(hazard.type) }}>
                           <HazardIcon />
                        </div>
                        <div>
                           <h4 className="text-gray-900 font-black text-sm uppercase tracking-tight truncate max-w-[140px]">{hazard.type}</h4>
                           <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: SEVERITY_COLORS[hazard.severity] }}>{hazard.severity}</span>
                              <div className="w-1 h-1 rounded-full bg-gray-200" />
                              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: STATUS_COLORS[hazard.status] }}>{hazard.status}</span>
                           </div>
                        </div>
                     </div>
                     <button className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-50 text-slate-500 group-hover:bg-gray-100'}`}>
                        <FiChevronRight className={`transition-transform duration-300 ${isSelected ? 'rotate-90' : ''}`} />
                     </button>
                  </div>

                  <div className="space-y-3 mb-5">
                     <div className="flex items-start gap-2">
                        <FiMapPin className="text-slate-500 mt-0.5 shrink-0" />
                        <p className="text-[11px] font-bold text-slate-600 leading-tight">{hazard.location || hazard.address}</p>
                     </div>
                     <p className="text-[12px] text-gray-900 leading-relaxed font-medium line-clamp-2">{hazard.description}</p>
                  </div>

                  {/* Actions (visible when selected or on hover) */}
                  <div className={`flex gap-2 pt-4 border-t border-gray-50 transition-all ${isSelected ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}>
                     {hazard.status === 'active' && (
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleMarkAsResolved(hazard.id); }}
                         className="flex-1 py-3 rounded-xl bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2"
                       >
                         <FiCheck /> Resolve
                       </button>
                     )}
                     <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(hazard); }}
                        className="flex-1 py-3 rounded-xl bg-gray-50 text-gray-900 text-[10px] font-black uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all flex items-center justify-center gap-2 border border-gray-100"
                      >
                        <FiEdit3 /> Edit
                     </button>
                  </div>
                </div>
              );
            })
          );
        })()}
      </div>

      <HazardFormModal
        isOpen={isHazardFormOpen}
        onClose={handleCloseModal}
        onSubmit={editingHazard ? handleUpdateHazard : handleAddHazard}
        initialData={editingHazard as any}
        isEditing={!!editingHazard}
        hazardStart={hazardStart}
        hazardEnd={hazardEnd}
        previewLineGeojson={previewLineGeojson}
        previewAreaGeojson={previewAreaGeojson}
        draftSeverity={draftSeverity}
        setDraftSeverity={setDraftSeverity}
        defaultReporter={defaultReporter}
        defaultContact={defaultContact}
        defaultEmail={defaultEmail}
        defaultLocation={defaultLocation}
        defaultAddress={defaultAddress}
      />
    </div>
  );
};

export default HazardManagementPanel;
