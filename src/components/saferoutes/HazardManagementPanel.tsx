import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit3, FiAlertTriangle, FiMapPin, FiClock, FiUser, FiX, FiCheck, FiExternalLink } from 'react-icons/fi';
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
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #6366f1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #4f46e5);
        }
      `}</style>
      <div className="w-full flex flex-col z-10 relative overflow-hidden">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 p-3 rounded-t-xl">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <div>
            <h1 className="text-sm font-medium text-gray-800">Hazard Management</h1>
            <p className="text-gray-600 text-xs">Monitor & Respond to Hazards</p>
          </div>
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded border text-xs">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
            <span className="font-medium text-gray-700">Hazard System</span>
          </div>
          <div className="text-gray-600">
            {(Array.isArray(hazards) ? hazards : []).filter(h => h.status === 'active').length} active hazard{(Array.isArray(hazards) ? hazards : []).filter(h => h.status === 'active').length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="mt-2 p-2 bg-white rounded border border-gray-200">
          <div className="flex items-center justify-between gap-2">
            {isHazardDrawing && hazardDrawTool === 'segment' ? (
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={!!snapToRoadEnabled}
                  onChange={(e) => setSnapToRoadEnabled(e.target.checked)}
                  className="accent-blue-600"
                />
                Snap to road
              </label>
            ) : (
              <div className="text-xs font-semibold text-gray-700">Hazard settings</div>
            )}
            <div className="text-[11px] font-semibold text-gray-700">
              {severityLabel} • {previewRadiusM}m
            </div>
          </div>
          <div className="mt-2">
            <input
              type="range"
              min={0}
              max={3}
              step={1}
              value={severityIndex}
              onChange={(e) => {
                const v = Number(e.target.value);
                setDraftSeverity(v === 0 ? 'low' : v === 1 ? 'medium' : v === 2 ? 'high' : 'critical');
              }}
              className="w-full"
            />
            <div className="mt-1 flex justify-between text-[10px] text-gray-500 font-semibold">
              <span>Low</span>
              <span>Moderate</span>
              <span>High</span>
              <span>Critical</span>
            </div>
          </div>
        </div>
        
        {/* Status Filter Buttons */}
        <div className="flex gap-1 mt-2 mb-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              statusFilter === 'all' 
                ? 'bg-gray-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              statusFilter === 'active' 
                ? 'bg-red-600 text-white' 
                : 'bg-red-50 text-red-600 hover:bg-red-100'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('monitoring')}
            className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              statusFilter === 'monitoring' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
            }`}
          >
            Monitoring
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              statusFilter === 'resolved' 
                ? 'bg-green-600 text-white' 
                : 'bg-green-50 text-green-600 hover:bg-green-100'
            }`}
          >
            Resolved
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            onClick={handleNavigateToIncidentReport}
            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded-md transition-colors flex items-center gap-1"
            title="Go to Incident Reports"
          >
            <FiExternalLink className="text-sm" />
            <span className="text-xs">Reports</span>
          </button>
          {!isHazardDrawing ? (
            <button
              onClick={() => {
                onSelectHazard(null);
                onResetHazardDraft();
                setHazardDrawTool('segment');
                setIsHazardDrawing(true);
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1.5 rounded-md transition-colors flex items-center gap-1"
              title="Create new hazard"
            >
              <FiPlus className="text-sm" />
              <span className="text-xs">Create</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onResetHazardDraft();
                setIsHazardDrawing(false);
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1.5 rounded-md transition-colors flex items-center gap-1"
              title="Cancel drawing"
            >
              <FiX className="text-sm" />
              <span className="text-xs">Cancel</span>
            </button>
          )}
        </div>
      </div>

      {isHazardDrawing ? (
        <div className="bg-blue-50 p-3 mt-0 rounded w-full">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FiMapPin className="text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  {hazardDrawTool === 'polygon' ? 'Draw hazard area' : 'Mark hazard on road'}
                </p>
                <p className="text-xs text-blue-600">
                  {hazardDrawTool === 'polygon' ? 'Tap points around the affected zone.' : 'Tap start point then end point.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-blue-100">
              <button
                type="button"
                onClick={() => {
                  setHazardDrawTool('segment');
                  onResetHazardDraft();
                  setIsHazardDrawing(true);
                }}
                className={`px-2 py-1 rounded-md text-xs font-semibold ${hazardDrawTool === 'segment' ? 'bg-blue-600 text-white' : 'text-blue-700 hover:bg-blue-50'}`}
              >
                Path
              </button>
              <button
                type="button"
                onClick={() => {
                  setHazardDrawTool('polygon');
                  onResetHazardDraft();
                  setIsHazardDrawing(true);
                }}
                className={`px-2 py-1 rounded-md text-xs font-semibold ${hazardDrawTool === 'polygon' ? 'bg-blue-600 text-white' : 'text-blue-700 hover:bg-blue-50'}`}
              >
                Area
              </button>
            </div>
          </div>

          {hazardDrawTool === 'segment' ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${hazardStart ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-xs text-gray-700">Start</span>
                  {hazardStart ? (
                    <button
                      onClick={() => setActiveHazardInput('start')}
                      className={`text-xs px-2 py-1 rounded ${
                        activeHazardInput === 'start'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {activeHazardInput === 'start' ? 'Active' : 'Edit'}
                    </button>
                  ) : null}
                </div>
                {hazardStart ? (
                  <span className="text-xs text-gray-500">
                    {hazardStart[0].toFixed(4)}, {hazardStart[1].toFixed(4)}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${hazardEnd ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-xs text-gray-700">End</span>
                  {hazardEnd ? (
                    <button
                      onClick={() => setActiveHazardInput('end')}
                      className={`text-xs px-2 py-1 rounded ${
                        activeHazardInput === 'end'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {activeHazardInput === 'end' ? 'Active' : 'Edit'}
                    </button>
                  ) : null}
                </div>
                {hazardEnd ? (
                  <span className="text-xs text-gray-500">
                    {hazardEnd[0].toFixed(4)}, {hazardEnd[1].toFixed(4)}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex gap-2">
                {(hazardStart || hazardEnd) ? (
                  <button
                    onClick={onResetHazardDraft}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-1.5 px-3 rounded text-sm font-medium transition-colors"
                  >
                    Clear
                  </button>
                ) : null}
                {hazardStart && hazardEnd ? (
                  <button
                    onClick={() => setIsHazardFormOpen(true)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded text-sm font-medium transition-colors"
                  >
                    Continue
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <div className="text-xs text-gray-700 font-semibold">
                Tap points: {hazardPolygonCount}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={onUndoHazardPolygon}
                  className="bg-white border border-blue-100 hover:bg-blue-50 text-blue-700 py-1.5 px-2 rounded text-xs font-semibold transition-colors disabled:opacity-50"
                  disabled={hazardPolygonCount === 0}
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={onFinishHazardPolygon}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-2 rounded text-xs font-semibold transition-colors disabled:opacity-50"
                  disabled={hazardPolygonCount < 3}
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={onResetHazardDraft}
                  className="bg-gray-600 hover:bg-gray-700 text-white py-1.5 px-2 rounded text-xs font-semibold transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Hazards List */}
        <div className="flex-grow overflow-y-auto overflow-x-hidden px-2 pb-3 custom-scrollbar">
        {(() => {
          const filteredHazards = statusFilter === 'all' 
            ? hazards 
            : hazards.filter(h => h.status === statusFilter);
          
          // Sort hazards by most recent first (prefer created_at, fallback to datetime)
          const sortedHazards = [...filteredHazards].sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : (a.datetime ? new Date(a.datetime).getTime() : 0);
            const dateB = b.created_at ? new Date(b.created_at).getTime() : (b.datetime ? new Date(b.datetime).getTime() : 0);
            return dateB - dateA;
          });
          
          return sortedHazards.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <FiAlertTriangle className="text-3xl text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">
                {statusFilter === 'all' ? 'No hazards reported' : `No ${statusFilter} hazards`}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {statusFilter === 'all' ? 'Click the + button to add a hazard' : `Switch to "All" to see other hazards`}
              </p>
            </div>
          ) : (
            <div className="space-y-2 mt-4">
              {sortedHazards.map((hazard) => {
              const HazardIcon = getHazardIcon(hazard.type);
              const isSelected = selectedHazard?.id === hazard.id;
              
              return (
                <div
                  key={hazard.id}
                  className={`border border-gray-200 rounded-lg p-2.5 hover:shadow-md transition-shadow cursor-pointer ${
                    isSelected ? 'ring-2 ring-red-500 bg-red-50' : 'bg-white'
                  }`}
                  onClick={() => onSelectHazard(isSelected ? null : hazard)}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div 
                        className="p-1.5 rounded text-white"
                        style={{ backgroundColor: getHazardColor(hazard.type) }}
                      >
                        <HazardIcon className="text-xs" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">
                          {HAZARD_TYPES.find(t => t.value === hazard.type)?.label || hazard.type}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="px-1.5 py-0.5 text-xs font-medium rounded text-white"
                            style={{ backgroundColor: SEVERITY_COLORS[hazard.severity] }}
                          >
                            {hazard.severity.toUpperCase()}
                          </span>
                          <span
                            className="px-1.5 py-0.5 text-xs font-medium rounded text-white"
                            style={{ backgroundColor: STATUS_COLORS[hazard.status] }}
                          >
                            {hazard.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-1.5">
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <FiMapPin className="text-xs" />
                      <span className="break-words">{hazard.location || hazard.address}</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 break-words">
                      {hazard.description}
                    </p>
                 </div>

                  {/* Allowed Vehicle Modes (view-only in card) */}
                  <div className="mt-2">
                    <div className="text-xs text-gray-700 font-medium mb-1">Allowed vehicles</div>
                    <div className="grid grid-cols-5 gap-1">
                      {[
                        { key: 'driving-car', label: 'Car', Icon: FaCar },
                        { key: 'driving-car', label: 'Motor', Icon: FaMotorcycle },
                        { key: 'cycling-regular', label: 'Bike', Icon: FaBicycle },
                        { key: 'foot-walking', label: 'Walk', Icon: FaWalking },
                        { key: 'driving-hgv', label: 'Truck', Icon: FaBus },
                      ].map(({ key, label, Icon }) => {
                        const selected = Array.isArray(hazard.allowed_modes) && hazard.allowed_modes.includes(key);
                        return (
                          <div
                            key={label}
                            className={`${selected ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'} px-1.5 py-1 rounded text-xs flex items-center justify-center gap-1`}
                          >
                            <Icon className="text-xs" />
                            <span>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      {Array.isArray(hazard.allowed_modes) && hazard.allowed_modes.length > 0
                        ? `Allowed: ${hazard.allowed_modes.map(m => {
                            if (m === 'driving-car') return 'Car/Motor';
                            if (m === 'cycling-regular') return 'Bike';
                            if (m === 'foot-walking') return 'Walk';
                            if (m === 'driving-hgv') return 'Truck';
                            return m;
                          }).join(', ')}`
                        : 'No vehicles allowed (fully restricted)'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <div className="flex items-center gap-1">
                      <FiClock className="text-xs" />
                      <span>
                        {hazard.datetime 
                          ? new Date(hazard.datetime).toLocaleDateString()
                          : hazard.created_at 
                            ? new Date(hazard.created_at).toLocaleDateString()
                            : 'No date'
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FiUser className="text-xs" />
                      <span>{hazard.reportedBy || hazard.reported_by || hazard.reporter || 'Unknown'}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1.5 pt-1.5 border-t border-gray-100">
                    {hazard.status === 'active' && (
                      <button 
                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsResolved(hazard.id);
                        }}
                      >
                        <FaCheck className="text-xs" />
                        Mark as Done
                      </button>
                    )}
                    
                    {hazard.status !== 'resolved' && (
                      <button 
                        className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(hazard);
                        }}
                      >
                        <FiEdit3 className="text-xs" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
        })()}
      </div>



      {/* Hazard Form Modal */}
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
    </>
  );
};

export default HazardManagementPanel;
