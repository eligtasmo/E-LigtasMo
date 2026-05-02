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
    <div className="w-full">
      <AdminEmergencyNavBar active={activeTab} onChange={setActiveTab} counts={counts} />
      {toast && (
        <div className={`mx-4 lg:mx-6 mt-3 rounded-lg border px-3 py-2 text-sm flex items-center gap-2 ${
          toast.kind === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : toast.kind === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <span>{toast.text}</span>
          <button className="ml-auto text-xs underline" onClick={() => setToast(null)}>Dismiss</button>
        </div>
      )}

      {activeTab === 'create' && (
        <div className="w-full">
          <h2 className="text-lg font-semibold mb-4">Emergency Request Form</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow animate-pop">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type of Emergency</label>
                  <select className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    value={type} onChange={e => setType(e.target.value)}>
                    <option>Accident</option>
                    <option>Fire</option>
                    <option>Flood</option>
                    <option>Health Emergency</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Severity</label>
                  <select className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={severity} onChange={e => setSeverity(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Caller Name</label>
                    <div className="flex items-center gap-2">
                      <FiUser className="text-gray-500" />
                      <input className={`flex-1 rounded-md bg-white dark:bg-gray-900 px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${submitAttempted && requiredMissing.callerName ? 'border-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-700 focus:border-blue-500'}`}
                        value={callerName} onChange={e => setCallerName(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Caller Contact</label>
                    <div className="flex items-center gap-2">
                      <FiPhone className="text-gray-500" />
                      <input type="tel" className={`flex-1 rounded-md bg-white dark:bg-gray-900 px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${submitAttempted && requiredMissing.callerContact ? 'border-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-700 focus:border-blue-500'}`}
                        value={callerContact} onChange={e => setCallerContact(e.target.value)} placeholder="09xxxxxxxxx or +639xxxxxxxxx" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Patient Details</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Name" className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={patientName} onChange={e => setPatientName(e.target.value)} />
                    <input placeholder="Age" type="number" className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={patientAge} onChange={e => setPatientAge(e.target.value ? Number(e.target.value) : '')} />
                    <select className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={patientGender} onChange={e => setPatientGender(e.target.value)}>
                      <option value="">Gender</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                    
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Location Address</label>
                  <div className="flex items-center gap-2">
                    <FiMapPin className="text-gray-500" />
                    <input className={`flex-1 rounded-md bg-white dark:bg-gray-900 px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${submitAttempted && requiredMissing.address ? 'border-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-700 focus:border-blue-500'}`}
                      value={address} onChange={e => setAddress(e.target.value)} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                    <div>{coords ? `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}` : 'Pick a point on the map'}</div>
                    <div className="flex items-center gap-2">
                      <button className="px-2 py-1 rounded-md border border-gray-300" onClick={() => {
                        if (!navigator.geolocation) return;
                        navigator.geolocation.getCurrentPosition((pos) => {
                          const { latitude, longitude } = pos.coords;
                          setCoords([latitude, longitude]);
                        });
                      }}>Use my location</button>
                      <button className="px-2 py-1 rounded-md border border-gray-300" onClick={() => setCoords(null)}>Clear</button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time of Incident</label>
                  <div className="flex items-center gap-2 text-sm">
                    <FiClock className="text-gray-500" />
                    <span>{datetime}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Short Description</label>
                  <textarea rows={4} className={`w-full rounded-md bg-white dark:bg-gray-900 px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${submitAttempted && requiredMissing.description ? 'border-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-700 focus:border-blue-500'}`}
                    value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                
                <div className="flex justify-end gap-2">
                  <button onClick={handleSubmit} disabled={!canSubmit} className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm ${canSubmit ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}>
                    <FiEdit2 size={16} /> Submit Request
                  </button>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 hover:shadow-md transition-shadow animate-pop">
              <div className="h-[360px] rounded-md overflow-hidden">
                <MapContainer center={coords || [14.5995, 120.9842]} zoom={coords ? 15 : 12} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap contributors &copy; CARTO" />
                  {coords && (
                    <Marker position={coords} icon={getMarkerIcon('#ef4444')}>
                      <Popup>Selected Location</Popup>
                    </Marker>
                  )}
                  <MapClickSetter onPick={(ll) => setCoords(ll)} />
                  <ZoomControl position="bottomright" />
                </MapContainer>
              </div>
              {submitAttempted && requiredMissing.coords && (
                <div className="px-3 py-2 mt-2 rounded-md bg-red-50 text-red-700 border border-red-200 text-xs">Select a location on the map</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="w-full">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Emergency Requests</h2>
            {loading && <span className="text-sm text-gray-500">Loading…</span>}
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow animate-pop">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {incidents.length === 0 && (
                <div className="p-4 text-sm text-gray-500">No requests found.</div>
              )}
              {incidents.map((i) => (
                <div key={i.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-sm font-medium">#{i.id} • {i.type}</div>
                    <div className="text-xs text-gray-600">{i.address}</div>
                    <div className="text-xs text-gray-500">{i.datetime}</div>
                  </div>
                  <div className="text-xs flex items-center gap-2">
                    <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-700">{i.status || 'Pending'}</span>
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
