import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useAuth } from '../../context/AuthContext';
import { FaMapMarkerAlt, FaUser, FaPhone, FaHome, FaUsers, FaEdit, FaPlus } from 'react-icons/fa';

interface Barangay {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address: string;
  contact?: string;
  type?: string;
  head?: string;
  capacity?: number;
  notes?: string;
  added_by?: string;
  added_at?: string;
}

const barangayIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32],
});

export default function BarangayMapView() {
  const { user } = useAuth();
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [addingBrgy, setAddingBrgy] = useState(false);
  const [editingBrgy, setEditingBrgy] = useState<Barangay | null>(null);
  const [newBrgy, setNewBrgy] = useState<{lat: number, lng: number} | null>(null);
  const [brgyForm, setBrgyForm] = useState({ name: '', address: '', contact: '', type: 'Hall', head: '', capacity: '', notes: '' });
  const mapRef = useRef<L.Map | null>(null);

  const fetchBarangays = async () => {
    try {
      const res = await fetch('http://localhost/eligtasmo/api/list-barangays.php');
      const data = await res.json();
      if (data.success) setBarangays(data.barangays || []);
      else setBarangays([]);
    } catch { setBarangays([]); }
  };
  useEffect(() => { fetchBarangays(); }, []);

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
    if (!newBrgy && !editingBrgy) return;
    try {
      const payload = {
        ...brgyForm,
        ...((newBrgy && { lat: newBrgy.lat, lng: newBrgy.lng }) || (editingBrgy && { lat: editingBrgy.lat, lng: editingBrgy.lng })),
        added_by: user?.full_name || user?.username || 'unknown',
        id: editingBrgy?.id,
      };
      const url = editingBrgy ? `http://localhost/eligtasmo/api/update-barangay.php` : `http://localhost/eligtasmo/api/add-barangay.php`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setAddingBrgy(false);
        setNewBrgy(null);
        setEditingBrgy(null);
        setBrgyForm({ name: '', address: '', contact: '', type: 'Hall', head: '', capacity: '', notes: '' });
        fetchBarangays();
        alert(editingBrgy ? 'Barangay updated!' : 'Barangay added!');
      } else {
        alert('Failed to save barangay: ' + (data.error || 'Unknown error'));
      }
    } catch {
      alert('Network error');
    }
  };

  return (
    <div className="flex gap-4" style={{ height: 'calc(100vh - 100px)' }}>
      {/* Left Panel */}
      <div className="w-1/3 min-w-[320px] max-w-sm flex flex-col p-4 bg-white rounded-lg shadow-md h-full">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><FaMapMarkerAlt className="text-blue-500" /> Barangay Map</h2>
        {/* Persistent instruction if no pins */}
        {barangays.length === 0 && !addingBrgy && !editingBrgy && (
          <div className="bg-white rounded-xl shadow border p-5 mb-4">
            <div className="mb-2 text-lg font-bold">Barangay Pin Management</div>
            <div className="mb-1">
              <span className="text-blue-600 font-semibold">No barangay pins yet. Click below to add one!</span>
            </div>
            {user && (user.role === 'admin' || user.role === 'brgy') && (
              <button
                type="button"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition mt-4"
                onClick={() => setAddingBrgy(true)}
              >
                Add Barangay Pin
              </button>
            )}
          </div>
        )}
        {/* Add/Edit Form */}
        {(addingBrgy && newBrgy) || editingBrgy ? (
          <div className="bg-white rounded-lg shadow border p-4 mb-4">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">{editingBrgy ? <FaEdit /> : <FaPlus />} {editingBrgy ? 'Edit Barangay' : 'Add Barangay Pin'}</h3>
            {addingBrgy && !newBrgy && (
              <div className="bg-white rounded-xl shadow border p-5 mb-4">
                <div className="mb-2 text-lg font-bold">Barangay Pin Management</div>
                <div className="mb-1">
                  <span className="text-blue-600 font-semibold cursor-pointer">Choose a location on the map to add a barangay pin.</span>
                </div>
                <div className="text-gray-600 mb-6 text-sm">
                  Click 'Add Barangay Pin' then click on the map to add a new barangay location.
                </div>
                <button
                  type="button"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
                  onClick={() => { setAddingBrgy(false); setNewBrgy(null); setBrgyForm({ name: '', address: '', contact: '', type: 'Hall', head: '', capacity: '', notes: '' }); }}
                >
                  Cancel Add
                </button>
              </div>
            )}
            {(newBrgy || editingBrgy) && (
              <form onSubmit={handleBrgyFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Name</label>
                  <input required className="w-full border rounded p-2" value={brgyForm.name} onChange={e => setBrgyForm(f => ({...f, name: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Type</label>
                  <select className="w-full border rounded p-2" value={brgyForm.type} onChange={e => setBrgyForm(f => ({...f, type: e.target.value}))}>
                    <option>Hall</option>
                    <option>Outpost</option>
                    <option>Evacuation Center</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Head/Coordinator</label>
                  <input className="w-full border rounded p-2" value={brgyForm.head} onChange={e => setBrgyForm(f => ({...f, head: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Contact</label>
                  <input className="w-full border rounded p-2" value={brgyForm.contact} onChange={e => setBrgyForm(f => ({...f, contact: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Capacity</label>
                  <input type="number" min="0" className="w-full border rounded p-2" value={brgyForm.capacity} onChange={e => setBrgyForm(f => ({...f, capacity: e.target.value}))} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Address</label>
                  <textarea required className="w-full border rounded p-2" value={brgyForm.address} onChange={e => setBrgyForm(f => ({...f, address: e.target.value}))} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Notes/Description</label>
                  <textarea className="w-full border rounded p-2" value={brgyForm.notes} onChange={e => setBrgyForm(f => ({...f, notes: e.target.value}))} />
                </div>
                <div className="md:col-span-2 flex gap-2 justify-end mt-2">
                  <button type="button" className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 font-semibold" onClick={() => { setAddingBrgy(false); setEditingBrgy(null); setNewBrgy(null); setBrgyForm({ name: '', address: '', contact: '', type: 'Hall', head: '', capacity: '', notes: '' }); }}>Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700">{editingBrgy ? 'Save Changes' : 'Add'}</button>
                </div>
              </form>
            )}
          </div>
        ) : null}
        {/* Barangay List */}
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-md font-semibold mb-2">Barangay Locations</h3>
          {barangays.length === 0 ? (
            <div className="text-gray-400">No barangay pins yet.</div>
          ) : (
            <ul className="space-y-3">
              {barangays.map(brgy => (
                <li key={brgy.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50 shadow-sm flex flex-col gap-1">
                  <div className="flex items-center gap-2 font-semibold text-blue-700"><FaHome /> {brgy.name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1"><FaMapMarkerAlt /> {brgy.address}</div>
                  {brgy.head && <div className="text-xs text-gray-500 flex items-center gap-1"><FaUser /> {brgy.head}</div>}
                  {brgy.contact && <div className="text-xs text-gray-500 flex items-center gap-1"><FaPhone /> {brgy.contact}</div>}
                  {brgy.capacity && <div className="text-xs text-gray-500 flex items-center gap-1"><FaUsers /> Capacity: {brgy.capacity}</div>}
                  {brgy.notes && <div className="text-xs text-gray-400 italic">{brgy.notes}</div>}
                  <div className="flex gap-2 mt-1">
                    <button className="text-xs text-blue-600 hover:underline flex items-center gap-1" onClick={() => { setEditingBrgy(brgy); setBrgyForm({ name: brgy.name, address: brgy.address, contact: brgy.contact || '', type: brgy.type || 'Hall', head: brgy.head || '', capacity: brgy.capacity?.toString() || '', notes: brgy.notes || '' }); setNewBrgy({ lat: brgy.lat, lng: brgy.lng }); }}><FaEdit /> View/Edit</button>
                  </div>
                  {brgy.added_by && <div className="text-xs text-gray-400">Added by: {brgy.added_by}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {/* Map */}
      <div className="flex-1 h-full rounded-xl shadow-lg bg-white overflow-hidden relative">
        <MapContainer ref={mapRef} center={[14.28, 121.42]} zoom={10} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap contributors &copy; CARTO" />
          {/* Barangay Markers */}
          {barangays.map((brgy) => (
            <Marker key={brgy.id} position={[brgy.lat, brgy.lng]} icon={barangayIcon}>
              <Popup>
                <strong>{brgy.name}</strong><br/>
                {brgy.type && <span>Type: {brgy.type}<br/></span>}
                {brgy.address}<br/>
                {brgy.contact && <span>Contact: {brgy.contact}<br/></span>}
                {brgy.head && <span>Head: {brgy.head}<br/></span>}
                {brgy.capacity && <span>Capacity: {brgy.capacity}<br/></span>}
                {brgy.notes && <span>Notes: {brgy.notes}<br/></span>}
                {brgy.added_by && <span className="text-xs text-gray-500">Added by: {brgy.added_by}</span>}
              </Popup>
            </Marker>
          ))}
          {/* Map click handler for adding brgy */}
          {user && (user.role === 'admin' || user.role === 'brgy') && addingBrgy && <MapClickHandler />}
          {/* New brgy marker preview */}
          {newBrgy && (
            <Marker position={[newBrgy.lat, newBrgy.lng]} icon={barangayIcon}>
              <Popup>New Barangay Location</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
} 