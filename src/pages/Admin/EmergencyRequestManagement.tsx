import React, { useEffect, useMemo, useState } from 'react';
import AdminEmergencyNavBar from '../../components/admin/AdminEmergencyNavBar';
import { apiFetch } from '../../utils/api';
import { FiMapPin, FiClock, FiUser, FiPhone, FiEdit2 } from 'react-icons/fi';
import PageMeta from "../../components/common/PageMeta";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_MAP_STATE, SANTA_CRUZ_BOUNDS_LEAFLET } from '../../constants/geo';

type Status = 'Received' | 'Dispatched' | 'Responding' | 'Resolved' | 'Documented';

interface IncidentRecord {
  id: number;
  type: string;
  address: string;
  description: string;
  datetime: string;
  lat?: number;
  lng?: number;
  status?: string;
}



function MapClickSetter({ onPick }: { onPick: (ll: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    }
  });
  return null;
}

const getMarkerIcon = (color: string): L.Icon => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="${color}" stroke="#333" stroke-width="1.5"/><circle cx="12.5" cy="12.5" r="5" fill="#fff"/></svg>`;
  const dataUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  return new L.Icon({ iconUrl: dataUrl, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] });
};

const EmergencyRequestManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'requests' | 'create'>('create');
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const [type, setType] = useState('Accident');
  const [callerName, setCallerName] = useState('');
  const [callerContact, setCallerContact] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState<number | ''>('');
  const [patientGender, setPatientGender] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [status, setStatus] = useState<Status>('Received');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [coords, setCoords] = useState<[number, number] | null>(null);
  

  const datetime = useMemo(() => new Date().toISOString().slice(0, 19).replace('T', ' '), []);

  

  // Fetch incidents for overview and counts
  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('list-incidents.php');
      const data = await res.json();
      if (data.success) setIncidents(data.incidents || []);
    } catch {
      void 0;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIncidents(); }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('erequest_draft');
      if (raw) {
        const d = JSON.parse(raw);
        setType(d.type ?? 'Accident');
        setCallerName(d.callerName ?? '');
        setCallerContact(d.callerContact ?? '');
        setPatientName(d.patientName ?? '');
        setPatientAge(d.patientAge ?? '');
        setPatientGender(d.patientGender ?? '');
        setAddress(d.address ?? '');
        setDescription(d.description ?? '');
        setSeverity(d.severity ?? 'medium');
        setStatus((d.status as Status) ?? 'Received');
        if (Array.isArray(d.coords) && d.coords.length === 2) {
          const a = [Number(d.coords[0]), Number(d.coords[1])];
          if (Number.isFinite(a[0]) && Number.isFinite(a[1])) setCoords(a as [number, number]);
        }
        
      }
    } catch (_e) { void _e; }
  }, []);

  useEffect(() => {
    const payload = { type, callerName, callerContact, patientName, patientAge, patientGender, address, description, severity, status, coords };
    try { localStorage.setItem('erequest_draft', JSON.stringify(payload)); } catch (_e) { void _e; }
  }, [type, callerName, callerContact, patientName, patientAge, patientGender, address, description, severity, status, coords]);

  

  const counts = useMemo(() => {
    const total = incidents.length;
    const resolved = incidents.filter(i => (i.status || '').toLowerCase() === 'resolved').length;
    const active = total - resolved;
    return { total, active, resolved };
  }, [incidents]);

  

  

  const requiredMissing = useMemo(() => {
    const missing: Record<string, boolean> = {};
    missing.callerName = !callerName.trim();
    missing.callerContact = !callerContact.trim();
    missing.address = !address.trim();
    missing.description = !description.trim();
    missing.coords = !coords;
    return missing;
  }, [callerName, callerContact, address, description, coords]);

  const canSubmit = useMemo(() => {
    return !requiredMissing.callerName && !requiredMissing.callerContact && !requiredMissing.address && !requiredMissing.description && !requiredMissing.coords;
  }, [requiredMissing]);

  

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    if (!canSubmit) {
      setToast({ kind: 'error', text: 'Please complete the required fields.' });
      return;
    }
  try {
    const payload = {
      type,
      address,
      datetime,
      description: `${description}\nPatient: ${patientName || 'N/A'} | Age: ${patientAge || 'N/A'} | Gender: ${patientGender || 'N/A'}\nStatus: ${status}`,
      severity,
      reporter: callerName,
      contact: callerContact,
      lat: coords ? coords[0] : undefined,
      lng: coords ? coords[1] : undefined,
    };
      

      const res = await apiFetch('report-incident.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setToast({ kind: 'success', text: 'Emergency request submitted.' });
        setType('Accident');
        setCallerName('');
        setCallerContact('');
        setPatientName('');
        setPatientAge('');
        setPatientGender('');
        setAddress('');
        setDescription('');
        setSeverity('medium');
        setStatus('Received');
        setCoords(null);
        try { localStorage.removeItem('erequest_draft'); } catch (_e) { void _e; }
        fetchIncidents();
        setActiveTab('requests');
        setSubmitAttempted(false);
      } else {
        setToast({ kind: 'error', text: data.error || 'Failed to submit' });
      }
    } catch {
      setToast({ kind: 'error', text: 'Submission failed' });
    }
  };

  

  return (
    <div className="tactical-page">
      <PageMeta title="Emergency Intake | E-LigtasMo" description="Direct emergency request processing and registry oversight." />
      
      <div className="tactical-container">
        <AdminEmergencyNavBar active={activeTab} onChange={setActiveTab} counts={counts} />

        {toast && (
          <div className={`mt-8 p-6 rounded-3xl border flex items-center justify-between shadow-2xl animate-in slide-in-from-top duration-300 ${
            toast.kind === 'success' ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-600/20' : 
            toast.kind === 'error' ? 'bg-rose-600 border-rose-500 text-white shadow-rose-600/20' : 
            'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-widest">{toast.text}</span>
            </div>
            <button className="text-[10px] font-black uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity" onClick={() => setToast(null)}>Dismiss</button>
          </div>
        )}

        {activeTab === 'create' && (
          <div className="mt-8 space-y-8">
            <div className="tactical-header">
              <div className="tactical-status-pill mb-4">
                <div className="tactical-status-dot bg-rose-500 animate-pulse" />
                <span>INTAKE_CHANNEL: PRIORITY</span>
              </div>
              <h2 className="tactical-title">Emergency Request Form</h2>
              <p className="tactical-subtitle">Initiate official emergency response log and tactical dispatch sequence.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-1 space-y-8">
                <div className="tactical-card p-10">
                  <div className="space-y-6">
                    <div>
                      <label className="tactical-label">Emergency_Type_Ref</label>
                      <select 
                        className="tactical-input w-full appearance-none pr-10"
                        value={type} 
                        onChange={e => setType(e.target.value)}
                      >
                        <option>Accident</option>
                        <option>Fire</option>
                        <option>Flood</option>
                        <option>Health Emergency</option>
                        <option>Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="tactical-label">Criticality_Level</label>
                      <div className="flex gap-3">
                        {['low', 'medium', 'high'].map((s) => (
                          <button
                            key={s}
                            onClick={() => setSeverity(s)}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${
                              severity === s 
                              ? s === 'high' ? 'bg-rose-600 text-white border-rose-600 shadow-rose-600/20' :
                                s === 'medium' ? 'bg-amber-500 text-white border-amber-500 shadow-amber-500/20' :
                                'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20'
                              : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 space-y-6 border-t border-slate-100">
                      <div>
                        <label className="tactical-label">Reporter_Ident</label>
                        <div className="relative">
                          <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            className={`tactical-input w-full pl-12 ${submitAttempted && requiredMissing.callerName ? 'border-rose-500 bg-rose-50/10' : ''}`}
                            value={callerName} 
                            onChange={e => setCallerName(e.target.value)} 
                            placeholder="Full_Legal_Name" 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="tactical-label">Contact_Comms</label>
                        <div className="relative">
                          <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="tel" 
                            className={`tactical-input w-full pl-12 ${submitAttempted && requiredMissing.callerContact ? 'border-rose-500 bg-rose-50/10' : ''}`}
                            value={callerContact} 
                            onChange={e => setCallerContact(e.target.value)} 
                            placeholder="09XX-XXX-XXXX" 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      <label className="tactical-label">Patient_Demographics</label>
                      <div className="grid grid-cols-2 gap-4">
                        <input 
                          placeholder="Name" 
                          className="tactical-input w-full"
                          value={patientName} 
                          onChange={e => setPatientName(e.target.value)} 
                        />
                        <input 
                          placeholder="Age" 
                          type="number" 
                          className="tactical-input w-full"
                          value={patientAge} 
                          onChange={e => setPatientAge(e.target.value ? Number(e.target.value) : '')} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="tactical-card p-10">
                   <div className="space-y-6">
                      <div>
                        <label className="tactical-label">Sector_Deployment_Target</label>
                        <div className="relative">
                          <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            className={`tactical-input w-full pl-12 ${submitAttempted && requiredMissing.address ? 'border-rose-500 bg-rose-50/10' : ''}`}
                            value={address} 
                            onChange={e => setAddress(e.target.value)} 
                            placeholder="Physical_Address_Reference" 
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest tabular-nums">
                          {coords ? `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}` : 'Wait_For_Map_Pick'}
                        </span>
                        <div className="flex gap-2">
                          <button 
                            className="tactical-button-ghost py-1.5 px-3 text-[9px] bg-white" 
                            onClick={() => {
                              if (!navigator.geolocation) return;
                              navigator.geolocation.getCurrentPosition((pos) => {
                                const { latitude, longitude } = pos.coords;
                                setCoords([latitude, longitude]);
                              });
                            }}
                          >
                            GPS_SYNC
                          </button>
                          <button className="tactical-button-ghost py-1.5 px-3 text-[9px] bg-white hover:text-rose-600" onClick={() => setCoords(null)}>RESET</button>
                        </div>
                      </div>
                   </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-8">
                <div className="tactical-card p-4 h-[600px] flex flex-col">
                  <div className="flex-1 rounded-3xl overflow-hidden border border-slate-100">
                    <MapContainer 
                      center={coords || [DEFAULT_MAP_STATE.latitude, DEFAULT_MAP_STATE.longitude]} 
                      zoom={coords ? 17 : DEFAULT_MAP_STATE.zoom} 
                      minZoom={DEFAULT_MAP_STATE.minZoom}
                      maxBounds={SANTA_CRUZ_BOUNDS_LEAFLET}
                      zoomControl={false} 
                      attributionControl={false}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                      {coords && (
                        <Marker position={coords} icon={getMarkerIcon('#dc2626')}>
                          <Popup>Sector_Reference</Popup>
                        </Marker>
                      )}
                      <MapClickSetter onPick={(ll) => setCoords(ll)} />
                      <ZoomControl position="bottomright" />
                    </MapContainer>
                  </div>
                  <div className="mt-4 px-6 py-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className={`w-2.5 h-2.5 rounded-full ${coords ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {coords ? 'Coordinate_Reference_Set' : 'Select_Mission_Point_On_Map'}
                      </span>
                    </div>
                    {submitAttempted && requiredMissing.coords && (
                      <div className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
                        Mandatory_Selection
                      </div>
                    )}
                  </div>
                </div>

                <div className="tactical-card p-10">
                   <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="tactical-label">Incident_Intelligence</label>
                          <textarea 
                            rows={4} 
                            className={`tactical-input w-full p-4 h-32 resize-none ${submitAttempted && requiredMissing.description ? 'border-rose-500 bg-rose-50/10' : ''}`}
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            placeholder="Field_Intelligence_Summary..." 
                          />
                        </div>
                        <div className="space-y-6">
                           <div>
                             <label className="tactical-label">Log_Timestamp</label>
                             <div className="flex items-center gap-4 px-6 py-4 bg-blue-50 rounded-2xl border border-blue-100">
                               <FiClock className="text-blue-600 text-lg" />
                               <span className="text-[12px] font-black text-blue-900 uppercase tracking-widest tabular-nums">{datetime}</span>
                             </div>
                           </div>
                           <button 
                            onClick={handleSubmit} 
                            disabled={!canSubmit} 
                            className="tactical-button-accent w-full h-16 text-sm shadow-2xl"
                          >
                            <FiEdit2 className="text-lg" /> Initiate_Emergency_Log
                          </button>
                        </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="mt-8 space-y-8">
            <div className="tactical-header">
              <div className="tactical-status-pill mb-4">
                <div className="tactical-status-dot bg-blue-500 animate-pulse" />
                <span>REGISTRY_ACCESS: GRANTED</span>
              </div>
              <h2 className="tactical-title">Emergency Registry</h2>
              <p className="tactical-subtitle">Comprehensive database of active and historical emergency signatures.</p>
            </div>

            <div className="tactical-table-wrapper overflow-hidden">
              <div className="divide-y divide-slate-100">
                {incidents.length === 0 ? (
                  <div className="p-32 text-center">
                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em]">Zero_Target_Matches_In_Registry</span>
                  </div>
                ) : incidents.map((i) => (
                  <div key={i.id} className="p-8 flex items-center gap-10 hover:bg-slate-50/50 transition-all group">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-2xl group-hover:bg-blue-600 transition-colors">
                      <FiEdit2 className="text-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="text-[13px] font-black text-slate-900 uppercase tracking-tight">REF_{i.id}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                        <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest">{i.type}</span>
                      </div>
                      <div className="text-[12px] text-slate-600 font-bold uppercase tracking-tight truncate opacity-80 mb-2">{i.address}</div>
                      <div className="flex items-center gap-3">
                        <FiClock className="text-slate-400 text-xs" />
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest tabular-nums">{i.datetime}</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                        (i.status || '').toLowerCase() === 'resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-500/10' :
                        (i.status || '').toLowerCase() === 'responding' ? 'bg-amber-50 text-amber-600 border-amber-100 shadow-amber-500/10' :
                        'bg-blue-50 text-blue-600 border-blue-100 shadow-blue-500/10'
                      }`}>
                        {i.status || 'Received'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyRequestManagement;
