import React, { useEffect, useMemo, useState } from 'react';
import AdminEmergencyNavBar from '../../components/admin/AdminEmergencyNavBar';
import { apiFetch } from '../../utils/api';
import { FiMapPin, FiClock, FiUser, FiPhone, FiEdit2 } from 'react-icons/fi';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
    <div className="w-full font-jetbrains">
      <AdminEmergencyNavBar active={activeTab} onChange={setActiveTab} counts={counts} />
      {toast && (
        <div className={`mx-4 lg:mx-6 mt-4 p-4 rounded-xl border flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300 ${
          toast.kind === 'success' ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-600/20' : 
          toast.kind === 'error' ? 'bg-red-600 border-red-500 text-white shadow-red-600/20' : 
          'bg-slate-900 border-slate-800 text-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-widest">{toast.text}</span>
          </div>
          <button className="text-[10px] font-black uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity" onClick={() => setToast(null)}>Dismiss</button>
        </div>
      )}

      {activeTab === 'create' && (
        <div className="w-full p-4 lg:p-6">
          <div className="mb-6">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
              <div className="w-1.5 h-6 bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.4)]" />
              Emergency Request Form
            </h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1.5 opacity-70">Log_Field_Incident • Primary_Intake_Module</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white tactical-container border-gray-100 p-5 shadow-xl shadow-slate-900/5 animate-pop">
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Emergency_Type</label>
                  <select className="w-full h-11 rounded-xl border border-gray-100 bg-gray-50/50 px-4 text-[11px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                    value={type} onChange={e => setType(e.target.value)}>
                    <option>Accident</option>
                    <option>Fire</option>
                    <option>Flood</option>
                    <option>Health Emergency</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Threat_Level</label>
                  <div className="flex gap-2">
                    {['low', 'medium', 'high'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSeverity(s)}
                        className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                          severity === s 
                          ? s === 'high' ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/20' :
                            s === 'medium' ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20' :
                            'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20'
                          : 'bg-white text-slate-400 border-gray-100 hover:bg-gray-50'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Caller_Identification</label>
                    <div className="relative">
                      <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                      <input className={`w-full h-11 pl-10 pr-4 rounded-xl bg-gray-50/50 text-[11px] font-black uppercase tracking-widest border focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${submitAttempted && requiredMissing.callerName ? 'border-red-500 focus:border-red-500 bg-red-50/10' : 'border-gray-100 focus:border-blue-500'}`}
                        value={callerName} onChange={e => setCallerName(e.target.value)} placeholder="Full_Name" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Comm_Link</label>
                    <div className="relative">
                      <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                      <input type="tel" className={`w-full h-11 pl-10 pr-4 rounded-xl bg-gray-50/50 text-[11px] font-black uppercase tracking-widest border focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${submitAttempted && requiredMissing.callerContact ? 'border-red-500 focus:border-red-500 bg-red-50/10' : 'border-gray-100 focus:border-blue-500'}`}
                        value={callerContact} onChange={e => setCallerContact(e.target.value)} placeholder="09XX-XXX-XXXX" />
                    </div>
                  </div>
                </div>
                <div className="pt-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Patient_Profile</label>
                  <div className="grid grid-cols-5 gap-2">
                    <input placeholder="Name" className="col-span-3 h-11 rounded-xl border border-gray-100 bg-gray-50/50 px-4 text-[11px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={patientName} onChange={e => setPatientName(e.target.value)} />
                    <input placeholder="Age" type="number" className="col-span-2 h-11 rounded-xl border border-gray-100 bg-gray-50/50 px-4 text-[11px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={patientAge} onChange={e => setPatientAge(e.target.value ? Number(e.target.value) : '')} />
                  </div>
                </div>
                <div className="pt-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Sector_Location</label>
                  <div className="relative mb-3">
                    <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                    <input className={`w-full h-11 pl-10 pr-4 rounded-xl bg-gray-50/50 text-[11px] font-black uppercase tracking-widest border focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${submitAttempted && requiredMissing.address ? 'border-red-500 focus:border-red-500 bg-red-50/10' : 'border-gray-100 focus:border-blue-500'}`}
                      value={address} onChange={e => setAddress(e.target.value)} placeholder="Physical_Address_Reference" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {coords ? `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}` : 'Wait_For_Map_Pick'}
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-2 py-1 rounded-lg bg-white border border-gray-100 text-[9px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all" onClick={() => {
                        if (!navigator.geolocation) return;
                        navigator.geolocation.getCurrentPosition((pos) => {
                          const { latitude, longitude } = pos.coords;
                          setCoords([latitude, longitude]);
                        });
                      }}>GPS_Sync</button>
                      <button className="px-2 py-1 rounded-lg bg-white border border-gray-100 text-[9px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all" onClick={() => setCoords(null)}>Reset</button>
                    </div>
                  </div>
                </div>
                <div className="pt-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Mission_Timeline</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-blue-50/30 rounded-xl border border-blue-100/50">
                    <FiClock className="text-blue-600 text-sm" />
                    <span className="text-[11px] font-black text-blue-900 uppercase tracking-widest">{datetime}</span>
                  </div>
                </div>
                <div className="pt-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Incident_Intelligence</label>
                  <textarea rows={4} className={`w-full rounded-xl bg-gray-50/50 px-4 py-3 text-[11px] font-black uppercase tracking-widest border focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${submitAttempted && requiredMissing.description ? 'border-red-500 focus:border-red-500 bg-red-50/10' : 'border-gray-100 focus:border-blue-500'}`}
                    value={description} onChange={e => setDescription(e.target.value)} placeholder="Field_Intelligence_Summary..." />
                </div>
                
                <div className="pt-4">
                  <button 
                    onClick={handleSubmit} 
                    disabled={!canSubmit} 
                    className={`w-full flex items-center justify-center gap-3 h-14 rounded-xl font-black text-[12px] uppercase tracking-[0.2em] transition-all shadow-xl ${
                      canSubmit 
                      ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20 hover:scale-[1.02]' 
                      : 'bg-gray-100 text-slate-300 cursor-not-allowed border border-gray-100'
                    }`}
                  >
                    <FiEdit2 className="text-lg" /> Initiate_Emergency_Log
                  </button>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 bg-white tactical-container border-gray-100 p-3 shadow-xl shadow-slate-900/5 animate-pop flex flex-col">
              <div className="flex-1 rounded-xl overflow-hidden border border-gray-50">
                <MapContainer center={coords || [14.28, 121.41]} zoom={coords ? 17 : 13} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap contributors &copy; CARTO" />
                  {coords && (
                    <Marker position={coords} icon={getMarkerIcon('#dc2626')}>
                      <Popup>Sector_Reference</Popup>
                    </Marker>
                  )}
                  <MapClickSetter onPick={(ll) => setCoords(ll)} />
                  <ZoomControl position="bottomright" />
                </MapContainer>
              </div>
              <div className="mt-3 px-4 py-3 bg-gray-50/50 rounded-xl flex items-center justify-between border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${coords ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {coords ? 'Coordinate_Reference_Set' : 'Select_Mission_Point_On_Map'}
                  </span>
                </div>
                {submitAttempted && requiredMissing.coords && (
                  <div className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                    <FiAlertTriangle /> Mandatory_Selection
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="w-full p-4 lg:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                <div className="w-1.5 h-6 bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]" />
                Emergency Registry
              </h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1.5 opacity-70">Log_Field_Database • Tactical_Overview</p>
            </div>
            {loading && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Syncing...</span>
              </div>
            )}
          </div>
          <div className="bg-white tactical-container border-gray-100 overflow-hidden shadow-xl shadow-slate-900/5 animate-pop">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {incidents.length === 0 && (
                <div className="p-12 text-center">
                  <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">Zero_Target_Matches_In_Registry</span>
                </div>
              )}
              {incidents.map((i) => (
                <div key={i.id} className="p-5 flex items-center gap-6 hover:bg-gray-50/50 transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-lg shadow-slate-900/20 group-hover:bg-blue-600 transition-colors">
                    <FiAlertTriangle className="text-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight">REF_{i.id}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-200" />
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{i.type}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-black uppercase tracking-tight truncate opacity-80 mb-1">{i.address}</div>
                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                      <FiClock className="text-[10px]" /> {i.datetime}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                      (i.status || '').toLowerCase() === 'resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      (i.status || '').toLowerCase() === 'responding' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-blue-50 text-blue-600 border-blue-100'
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
  );
};

export default EmergencyRequestManagement;
