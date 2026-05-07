import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline } from "react-leaflet";
import { DEFAULT_MAP_STATE, SANTA_CRUZ_BOUNDS_LEAFLET } from "../../constants/geo";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useAuth } from '../../context/AuthContext';
import { FaMapMarkerAlt } from 'react-icons/fa';
import * as XLSX from 'xlsx';

interface Incident {
  id: number;
  type: string;
  lat: number;
  lng: number;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  address: string;
  datetime: string;
  description: string;
  severity: 'Low' | 'Moderate' | 'High' | 'Critical';
  photo_url?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Resolved';
  reporter: string;
  contact: string;
  flood_level_cm?: number;
  allowed_vehicles?: string;
}

interface Barangay {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address: string;
  contact?: string;
  type?: string;
  added_by?: string;
}

const approvedIncidentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png', shadowSize: [41, 41]
});
const resolvedIncidentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png', shadowSize: [41, 41]
});
const brgyIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // house icon
  iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32],
});
const getIncidentIcon = (status: Incident['status']) => {
  switch (status) {
    case 'Approved': return approvedIncidentIcon;
    case 'Resolved': return resolvedIncidentIcon;
    default: return approvedIncidentIcon;
  }
};
const getStatusColor = (status: Incident['status']) => {
  switch (status) {
    case 'Approved': return 'bg-green-500 text-white';
    case 'Resolved': return 'bg-gray-500 text-white';
    default: return 'bg-gray-400 text-white';
  }
};

export default function IncidentDashboardView() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const { user } = useAuth();
  const [brgys, setBarangays] = useState<Barangay[]>([]);
  const [addingBrgy, setAddingBrgy] = useState(false);
  const [newBrgy, setNewBrgy] = useState<{lat: number, lng: number} | null>(null);
  const [brgyForm, setBrgyForm] = useState({ name: '', address: '', contact: '', type: 'Hall' });
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showToast, setShowToast] = useState<string | null>(null);

  // Quick date filters
  const setToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    setDateFrom(today);
    setDateTo(today);
  };
  const setThisWeek = () => {
    const now = new Date();
    const first = now.getDate() - now.getDay();
    const last = first + 6;
    const firstDay = new Date(now.setDate(first));
    const lastDay = new Date(now.setDate(last));
    setDateFrom(firstDay.toISOString().slice(0, 10));
    setDateTo(lastDay.toISOString().slice(0, 10));
  };
  const clearDates = () => { setDateFrom(""); setDateTo(""); };

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/list-incidents.php?status=Approved');
      const data = await response.json();
      if (data.success) {
        setIncidents(data.incidents || []);
      } else {
        setIncidents([]);
      }
    } catch (error) {
      setIncidents([]);
    }
    setLoading(false);
  };

  const fetchBarangays = async () => {
    try {
      const res = await fetch('/api/list-brgys.php');
      const data = await res.json();
      if (data.success) setBarangays(data.brgys || []);
      else setBarangays([]);
    } catch { setBarangays([]); }
  };

  useEffect(() => {
    fetchIncidents();
    fetchBarangays();
  }, []);

  const handleIncidentSelect = (incident: Incident) => {
    setSelectedIncident(incident);
    if (mapRef.current) {
      mapRef.current.flyTo([incident.lat, incident.lng], 15);
    }
  };

  const handleStatusChange = async (incidentId: number, newStatus: Incident['status']) => {
    if (!selectedIncident) return;
    setActionLoading(true);
    try {
      const response = await fetch('/api/update-incident-status.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: incidentId, status: newStatus })
      });
      const data = await response.json();
      if (data.success) {
        fetchIncidents();
        setSelectedIncident(null);
      }
    } catch (error) {}
    setActionLoading(false);
  };

  function MapClickHandler() {
    useMapEvents({
      click: (e) => {
        if (user && (user.role === 'admin' || user.role === 'brgy') && addingBrgy) {
          setNewBrgy({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      }
    });
    return null;
  }

  const handleBrgyFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrgy) return;
    try {
      const res = await fetch('/api/add-brgy.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...brgyForm, ...newBrgy, added_by: user?.full_name || user?.username || 'unknown' })
      });
      const data = await res.json();
      if (data.success) {
        setAddingBrgy(false);
        setNewBrgy(null);
        setBrgyForm({ name: '', address: '', contact: '', type: 'Hall' });
        fetchBarangays();
        alert('Barangay added!');
      } else {
        alert('Failed to add brgy: ' + (data.error || 'Unknown error'));
      }
    } catch {
      alert('Network error');
    }
  };

  // Filter incidents by date range
  const filteredIncidents = incidents.filter(incident => {
    if (!dateFrom && !dateTo) return true;
    const date = new Date(incident.datetime);
    if (dateFrom && date < new Date(dateFrom)) return false;
    if (dateTo && date > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  // Export helpers
  const exportCSV = () => {
    if (filteredIncidents.length === 0) {
      setShowToast('No incidents to export.');
      return;
    }
    const csvRows = [];
    const headers = [
      'Type', 'Address', 'Date/Time', 'Description', 'Severity', 'Status', 'Reporter', 'Contact'
    ];
    csvRows.push(headers.join(','));
    filteredIncidents.forEach(i => {
      csvRows.push([
        i.type, i.address, i.datetime, i.description, i.severity, i.status, i.reporter, i.contact
      ].map(val => `"${val ?? ''}"`).join(','));
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `incidents_${dateFrom || 'all'}_${dateTo || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowToast(`Exported ${filteredIncidents.length} incidents as CSV.`);
  };
  const exportExcel = () => {
    if (filteredIncidents.length === 0) {
      setShowToast('No incidents to export.');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(filteredIncidents.map(i => ({
      Type: i.type,
      Address: i.address,
      'Date/Time': i.datetime,
      Description: i.description,
      Severity: i.severity,
      Status: i.status,
      Reporter: i.reporter,
      Contact: i.contact
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Incidents');
    XLSX.writeFile(wb, `incidents_${dateFrom || 'all'}_${dateTo || 'all'}.xlsx`);
    setShowToast(`Exported ${filteredIncidents.length} incidents as Excel.`);
  };

  // Toast auto-hide
  useEffect(() => {
    if (showToast) {
      const t = setTimeout(() => setShowToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [showToast]);

  return (
    <div className="flex gap-4" style={{ height: "calc(100vh - 100px)" }}>
      {/* Sidebar */}
      <div className="w-full md:w-1/3 flex flex-col bg-white dark:bg-boxdark rounded-none md:rounded-lg shadow-none md:shadow-md md:min-h-[400px] p-0 md:p-4 border-r md:border-r-0 border-gray-100">
        <div className="p-4 md:p-0">
          <h2 className="text-xl font-bold mb-2 text-blue-700">Incident Command</h2>
          <div className="mb-4 text-xs text-gray-500">You can filter and export incident data for compliance, reporting, or archiving.</div>
          <div className="mb-4">
            <div className="font-semibold text-xs text-gray-700 mb-2 uppercase tracking-widest">Filters</div>
            <div className="bg-gray-50 dark:bg-boxdark-2 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col gap-2">
              <label className="text-xs font-medium text-gray-600 mb-1" htmlFor="date-from">Date Range</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex flex-row gap-2 items-center w-full sm:w-auto">
                  <input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="border rounded px-2 py-1 text-sm min-w-[120px] flex-1 focus:ring-2 focus:ring-blue-200"
                    placeholder="From"
                    aria-label="Date from"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="border rounded px-2 py-1 text-sm min-w-[120px] flex-1 focus:ring-2 focus:ring-blue-200"
                    placeholder="To"
                    aria-label="Date to"
                  />
                </div>
                <div className="flex flex-row gap-2 items-center w-full sm:w-auto">
                  <button className="text-xs px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 border border-gray-300 shadow-sm whitespace-nowrap w-full sm:w-auto transition-all" onClick={setToday} title="Today">Today</button>
                  <button className="text-xs px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 border border-gray-300 shadow-sm whitespace-nowrap w-full sm:w-auto transition-all" onClick={setThisWeek} title="This Week">This Week</button>
                  <button className="text-xs px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 border border-gray-300 shadow-sm whitespace-nowrap w-full sm:w-auto transition-all" onClick={clearDates} title="Clear">Clear</button>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded shadow text-xs"
                onClick={exportCSV}
                aria-label="Export as CSV"
                title="Export as CSV"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 16v-8m0 8l-4-4m4 4l4-4"/><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                CSV
              </button>
              <button
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-2 rounded shadow text-xs"
                onClick={exportExcel}
                aria-label="Export as Excel"
                title="Export as Excel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 16v-8m0 8l-4-4m4 4l4-4"/><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                Excel
              </button>
            </div>
            {showToast && (
              <div className="mt-2 text-xs text-green-700 bg-green-100 rounded px-2 py-1 shadow">{showToast}</div>
            )}
          </div>
          <div className="border-t pt-4">
            <div className="font-semibold text-xs text-gray-700 mb-2 uppercase tracking-widest">Incident Reports</div>
            {loading ? (
              <div className="text-gray-500">Loading...</div>
            ) : selectedIncident ? null : (
              <div className="flex-grow overflow-y-auto pr-2">
                {filteredIncidents.length === 0 && <div className="text-gray-500">No incidents reported yet.</div>}
                <div className="flex flex-col gap-2 mt-2">
                  {filteredIncidents.map((incident) => (
                    <div
                      key={incident.id}
                      className="p-3 bg-gray-50 dark:bg-boxdark-2 border dark:border-gray-700 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 transition-all shadow-sm flex flex-col gap-1"
                      onClick={() => handleIncidentSelect(incident)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{incident.type}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(incident.status)}`}>{incident.status}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{incident.address}</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300">Reported: {new Date(incident.datetime).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {selectedIncident && (
          <div className="p-4 md:p-0">
            <button 
              onClick={() => setSelectedIncident(null)}
              className="text-sm text-primary hover:underline mb-4"
            >
              &larr; Back to Incident List
            </button>
            <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{selectedIncident.type} Report</h3>
            {selectedIncident.photo_url && (
              <img src={selectedIncident.photo_url} alt="Incident" className="w-full h-auto rounded-lg mb-4 object-cover" />
            )}
            <div className="space-y-3 text-sm">
              <p><strong className="font-semibold text-gray-700 dark:text-gray-300">Location:</strong><br/> {selectedIncident.address}</p>
              <p><strong className="font-semibold text-gray-700 dark:text-gray-300">Date & Time:</strong><br/> {new Date(selectedIncident.datetime).toLocaleString()}</p>
              <p><strong className="font-semibold text-gray-700 dark:text-gray-300">Description:</strong><br/> {selectedIncident.description}</p>
              <p><strong className="font-semibold text-gray-700 dark:text-gray-300">Severity:</strong> {selectedIncident.severity}</p>
              <p><strong className="font-semibold text-gray-700 dark:text-gray-300">Reporter:</strong> {selectedIncident.reporter} ({selectedIncident.contact})</p>
            </div>
            <div className="mt-4 pt-4 border-t">
              <label className="block text-sm font-semibold mb-2 dark:text-gray-300">Update Status</label>
              <select 
                value={selectedIncident.status}
                onChange={(e) => handleStatusChange(selectedIncident.id, e.target.value as Incident['status'])}
                className="w-full p-2 border rounded-lg bg-white dark:bg-boxdark-2 dark:border-gray-600"
                disabled={actionLoading}
              >
                <option value="Approved">Approved</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>
        )}
      </div>
      {/* Map */}
      <div className="w-2/3 h-full rounded-lg shadow-md overflow-hidden relative">
        {user && (user.role === 'admin' || user.role === 'brgy') && !addingBrgy && (
          <button onClick={() => setAddingBrgy(true)} className="absolute z-10 top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 flex items-center gap-2">
            <FaMapMarkerAlt /> Add Barangay Pin
          </button>
        )}
        <MapContainer 
          ref={mapRef} 
          center={[DEFAULT_MAP_STATE.latitude, DEFAULT_MAP_STATE.longitude]} 
          zoom={DEFAULT_MAP_STATE.zoom} 
          minZoom={DEFAULT_MAP_STATE.minZoom}
          maxBounds={SANTA_CRUZ_BOUNDS_LEAFLET}
          attributionControl={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          {/* Incident Markers */}
          {incidents.map((incident) => {
            const hasStartEnd = (incident as any).start_lat && (incident as any).start_lng && (incident as any).end_lat && (incident as any).end_lng;
            if (hasStartEnd) {
              const positions = [
                [(incident as any).start_lat, (incident as any).start_lng],
                [(incident as any).end_lat, (incident as any).end_lng]
              ];
              return (
                <Polyline key={`incident-${incident.id}`} positions={positions} color="#f97316" weight={5} opacity={0.95}>
                  <Popup>
                    <strong>{incident.type}</strong><br />
                    Status: {incident.status}<br/>
                    {incident.type && incident.type.toLowerCase() === 'flood' && typeof incident.flood_level_cm !== 'undefined' && (
                      <><strong>Flood level:</strong> {incident.flood_level_cm} cm<br/></>
                    )}
                    {incident.allowed_vehicles && (
                      <><strong>Passable vehicles:</strong> {incident.allowed_vehicles}<br/></>
                    )}
                    Click any point on the line to see details
                  </Popup>
                </Polyline>
              );
            }
            return (
              <Marker 
                key={incident.id} 
                position={[incident.lat, incident.lng]} 
                icon={getIncidentIcon(incident.status)}
                eventHandlers={{
                  click: () => handleIncidentSelect(incident),
                }}
              >
                <Popup>
                  <strong>{incident.type}</strong><br />
                  Status: {incident.status}<br/>
                  {incident.type && incident.type.toLowerCase() === 'flood' && typeof incident.flood_level_cm !== 'undefined' && (
                    <><strong>Flood level:</strong> {incident.flood_level_cm} cm<br/></>
                  )}
                  {incident.allowed_vehicles && (
                    <><strong>Passable vehicles:</strong> {incident.allowed_vehicles}<br/></>
                  )}
                  Click to see details
                </Popup>
              </Marker>
            );
          })}
          {/* Barangay Markers */}
          {brgys.map((brgy) => (
            <Marker key={brgy.id} position={[brgy.lat, brgy.lng]} icon={brgyIcon}>
              <Popup>
                <strong>{brgy.name}</strong><br/>
                {brgy.type && <span>Type: {brgy.type}<br/></span>}
                {brgy.address}<br/>
                {brgy.contact && <span>Contact: {brgy.contact}<br/></span>}
                {brgy.added_by && <span className="text-xs text-gray-500">Added by: {brgy.added_by}</span>}
              </Popup>
            </Marker>
          ))}
          {/* Map click handler for adding brgy */}
          {user && (user.role === 'admin' || user.role === 'brgy') && addingBrgy && <MapClickHandler />}
          {/* New brgy marker preview */}
          {newBrgy && (
            <Marker position={[newBrgy.lat, newBrgy.lng]} icon={brgyIcon}>
              <Popup>New Barangay Location</Popup>
            </Marker>
          )}
        </MapContainer>
        {/* Add Barangay Form Modal */}
        {user && (user.role === 'admin' || user.role === 'brgy') && addingBrgy && newBrgy && (
          <div className="absolute z-20 top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-30">
            <form onSubmit={handleBrgyFormSubmit} className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h3 className="font-bold text-lg mb-2">Add Barangay Pin</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Name</label>
                  <input required className="w-full border rounded p-2" value={brgyForm.name} onChange={e => setBrgyForm(f => ({...f, name: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Type</label>
                  <input className="w-full border rounded p-2" value={brgyForm.type} onChange={e => setBrgyForm(f => ({...f, type: e.target.value}))} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1">Address</label>
                  <input required className="w-full border rounded p-2" value={brgyForm.address} onChange={e => setBrgyForm(f => ({...f, address: e.target.value}))} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1">Contact</label>
                  <input className="w-full border rounded p-2" value={brgyForm.contact} onChange={e => setBrgyForm(f => ({...f, contact: e.target.value}))} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300" onClick={() => { setAddingBrgy(false); setNewBrgy(null); }}>Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700">Add</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}