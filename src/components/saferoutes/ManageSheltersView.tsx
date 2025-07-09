import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FaCheckCircle, FaTimesCircle, FaPhone, FaPencilAlt, FaTrash } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';

// Using a new, cleaner house icon that matches the requested style
const greenHouseIcon = new L.Icon({
    iconUrl: 'https://img.icons8.com/material-rounded/48/28a745/home.png',
    iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40]
});

const yellowHouseIcon = new L.Icon({
    iconUrl: 'https://img.icons8.com/material-rounded/48/ffc107/home.png',
    iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40]
});

const redHouseIcon = new L.Icon({
    iconUrl: 'https://img.icons8.com/material-rounded/48/dc3545/home.png',
    iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40]
});


type ShelterForm = {
  id?: number;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  occupancy: number;
  status: "available" | "full";
  contact_person: string;
  contact_number: string;
  address: string;
  category?: string;
  photo?: string;
  photoName?: string;
  photoType?: string;
  created_by?: string;
  created_brgy?: string;
};

function AddShelterOnMap({ onAdd, enabled }: { onAdd: (latlng: { lat: number; lng: number }) => void, enabled: boolean }) {
  useMapEvents({
    click(e) {
      if (enabled) onAdd(e.latlng);
    }
  });
  return null;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'E-LigtasMo/1.0' } });
    const data = await response.json();
    return data?.display_name || '';
  } catch (error) {
    return '';
  }
}

const getShelterIcon = (shelter: { occupancy: number; capacity: number }) => {
  if (shelter.capacity === 0) return yellowHouseIcon; // Default case for no capacity
  const percentage = shelter.occupancy / shelter.capacity;
  if (percentage >= 1) return redHouseIcon;
  if (percentage >= 0.8) return yellowHouseIcon;
  return greenHouseIcon;
};

export default function ManageSheltersView() {
  const { user } = useAuth();
  const [shelters, setShelters] = useState<ShelterForm[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<ShelterForm | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [selectedShelterId, setSelectedShelterId] = useState<number | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);

  useEffect(() => {
    const fetchShelters = async () => {
      try {
        const response = await fetch('/api/shelters-list.php');
        const data = await response.json();
        setShelters(data);
      } catch (error) {
        console.error("Failed to fetch shelters:", error);
      }
    };
    fetchShelters();
  }, []);

  const handleMapClick = async (latlng: { lat: number; lng: number }) => {
    if (!adding) return;
    setLoadingAddress(true);
    const address = await reverseGeocode(latlng.lat, latlng.lng);
    setForm({
      name: "", lat: latlng.lat, lng: latlng.lng, capacity: 100, occupancy: 0,
      status: "available", contact_person: "", contact_number: "", address,
      created_by: user?.username || "", created_brgy: user?.brgy_name || ""
    });
    setAdding(false);
    setLoadingAddress(false);
  };

  const handleEdit = async (shelter: any) => {
    if (shelter.id !== undefined) setEditId(shelter.id);
    setLoadingAddress(true);
    const address = await reverseGeocode(shelter.lat, shelter.lng);
    setForm({ ...shelter, address });
    setLoadingAddress(false);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!form) return;
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "capacity" || name === "occupancy" ? Number(value) : value
    });
  };

  const handleSave = async () => {
    if (!form) return;
    try {
      if (editId !== null && editId !== undefined) {
        // Update existing shelter
        const response = await fetch('/api/shelters-update.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, id: editId })
        });
        const updatedShelter = await response.json();
        setShelters(shelters.map(s => (s.id !== undefined && s.id === editId) ? updatedShelter : s));
        setEditId(null);
      } else {
        // Add new shelter
        const response = await fetch('/api/shelters-add.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        const newShelter = await response.json();
        setShelters([...shelters, newShelter]);
      }
      setForm(null);
    } catch (error) {
      console.error("Failed to save shelter:", error);
      alert("Error: Could not save shelter to the database.");
    }
  };

  const handleCancel = () => {
    setForm(null); setAdding(false); setEditId(null);
  };

  const handleDelete = async (id: number) => {
    if (id !== undefined) {
      try {
        await fetch('/api/shelters-delete.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        setShelters(shelters.filter(s => s.id !== id));
      } catch (error) {
        console.error("Failed to delete shelter:", error);
        alert("Error: Could not delete shelter from the database.");
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 h-full md:h-[calc(100vh-100px)]">
      {/* Sidebar */}
      <div className="w-full md:w-1/3 flex flex-col p-4 bg-white dark:bg-boxdark rounded-none md:rounded-lg shadow-none md:shadow-md md:min-h-[400px]">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Shelter Management</h2>
        {!form ? (
          <>
            {adding && (
              <div className="mb-4 text-blue-600 font-semibold">Choose a location on the map to add a shelter.</div>
            )}
            <div className="mb-4 text-gray-600 dark:text-gray-400">Click 'Add Shelter' then click on the map to add a new shelter location.</div>
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg text-base md:text-lg mb-4 transition"
              onClick={() => { setAdding(!adding); setEditId(null); setForm(null); }}
            >
              {adding ? "Cancel Add" : "Add New Shelter"}
            </button>
            <div className="border-t pt-4 flex-grow overflow-y-auto">
              <div className="mb-2 text-xs text-gray-500">You can export shelter data for compliance, reporting, or archiving.</div>
              <div className="flex flex-row flex-wrap gap-2 mb-2 justify-between items-center">
                <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Existing Shelters ({shelters.length})</h3>
                <div className="flex gap-2">
                  <button
                    className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded shadow text-xs"
                    onClick={() => {
                      if (shelters.length === 0) { setShowToast('No shelters to export.'); return; }
                      const csvRows = [];
                      const headers = [
                        'Name', 'Address', 'Capacity', 'Occupancy', 'Status', 'Contact Person', 'Contact Number', 'Created By', 'Barangay'
                      ];
                      csvRows.push(headers.join(','));
                      shelters.forEach(shelter => {
                        csvRows.push([
                          shelter.name, shelter.address, shelter.capacity, shelter.occupancy, shelter.status, shelter.contact_person, shelter.contact_number, shelter.created_by, shelter.created_brgy
                        ].map(val => `"${val ?? ''}"`).join(','));
                      });
                      const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement('a');
                      link.setAttribute('href', encodedUri);
                      link.setAttribute('download', `shelters_${new Date().toISOString().slice(0,10)}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      setShowToast(`Exported ${shelters.length} shelters as CSV.`);
                    }}
                    aria-label="Export as CSV"
                    title="Export as CSV"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 16v-8m0 8l-4-4m4 4l4-4"/><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                    CSV
                  </button>
                  <button
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-2 rounded shadow text-xs"
                    onClick={() => {
                      if (shelters.length === 0) { setShowToast('No shelters to export.'); return; }
                      const ws = XLSX.utils.json_to_sheet(shelters.map(shelter => ({
                        Name: shelter.name,
                        Address: shelter.address,
                        Capacity: shelter.capacity,
                        Occupancy: shelter.occupancy,
                        Status: shelter.status,
                        'Contact Person': shelter.contact_person,
                        'Contact Number': shelter.contact_number,
                        'Created By': shelter.created_by,
                        Barangay: shelter.created_brgy
                      })));
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Shelters');
                      XLSX.writeFile(wb, `shelters_${new Date().toISOString().slice(0,10)}.xlsx`);
                      setShowToast(`Exported ${shelters.length} shelters as Excel.`);
                    }}
                    aria-label="Export as Excel"
                    title="Export as Excel"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 16v-8m0 8l-4-4m4 4l4-4"/><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                    Excel
                  </button>
                </div>
              </div>
              {showToast && (
                <div className="mb-2 text-xs text-green-700 bg-green-100 rounded px-2 py-1 shadow">{showToast}</div>
              )}
              <div className="flex flex-col gap-4 mt-4">
                {shelters.map((shelter, idx) => {
                  const isFull = shelter.occupancy >= shelter.capacity;
                  const percent = Math.min(100, Math.round((shelter.occupancy / shelter.capacity) * 100));
                  return (
                    <div
                      key={shelter.id}
                      className={`shadow-md rounded-xl p-4 flex flex-col gap-2 bg-white border transition cursor-pointer ${selectedShelterId === shelter.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'}`}
                      onClick={() => {
                        if (typeof shelter.id === 'number') setSelectedShelterId(shelter.id);
                        if (mapRef.current) {
                          mapRef.current.flyTo([shelter.lat, shelter.lng], 16, { animate: true, duration: 1.5 });
                        }
                      }}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-1 gap-2">
                        <div>
                          <h3 className="font-bold text-base md:text-lg text-gray-800">{shelter.name}</h3>
                          <p className="text-gray-600 text-xs md:text-sm mt-0.5">{shelter.address}</p>
                        </div>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isFull ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                          >
                          {isFull ? <FaTimesCircle className="text-red-500" /> : <FaCheckCircle className="text-green-500" />}
                          {isFull ? 'Full' : 'Available'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-gray-700">
                        <FaPhone className="text-gray-400" />
                        <span className="font-semibold">{shelter.contact_person}</span>
                        <span>({shelter.contact_number})</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs md:text-sm">
                        <span>Capacity:</span>
                        <span className="font-bold">{shelter.occupancy}/{shelter.capacity}</span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden mx-2">
                          <div className={`h-2 rounded-full ${isFull ? 'bg-red-400' : 'bg-green-400'}`} style={{ width: `${percent}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-500">{percent}%</span>
                      </div>
                      {shelter.created_by && (
                        <div className="text-xs text-gray-500 mt-1">
                          Created by: <span className="font-semibold">{shelter.created_by}</span> {shelter.created_brgy && (<span>({shelter.created_brgy})</span>)}
                        </div>
                      )}
                      <div className="flex gap-2 justify-end mt-2">
                        <button className="flex items-center gap-1 px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-semibold rounded shadow-sm transition text-xs md:text-sm" onClick={() => handleEdit(shelter)}>
                          <FaPencilAlt /> Edit
                        </button>
                        {(user?.role === 'admin' || (user?.role === 'brgy' && shelter.created_by === user?.username)) && (
                          <button className="flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded shadow-sm transition text-xs md:text-sm" onClick={() => handleDelete(shelter.id)}>
                            <FaTrash /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <form className="flex flex-col gap-4 mt-2 h-full bg-gray-50 dark:bg-boxdark-2 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-6 max-w-xl mx-auto" onSubmit={e => e.preventDefault()}>
            <h3 className="text-2xl font-bold text-blue-700 mb-2">{editId !== null ? "Edit Shelter" : "Add New Shelter"}</h3>
            <div className="flex-grow overflow-y-auto pr-2 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Shelter Type/Category</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-200"
                  name="category"
                  value={form.category || ''}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Select Type</option>
                  <option value="School">School</option>
                  <option value="Gym">Gym</option>
                  <option value="Church">Church</option>
                  <option value="Barangay Hall">Barangay Hall</option>
                  <option value="Covered Court">Covered Court</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Photo</label>
                {!form.photo ? (
                  <div>
                    <input
                      id="shelter-photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setForm(f => f ? { ...f, photo: reader.result as string, photoName: file.name, photoType: file.type } : f);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition cursor-pointer"
                      onClick={() => document.getElementById('shelter-photo-upload')?.click()}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"/><polyline points="7 10 12 5 17 10"/><line x1="12" y1="5" x2="12" y2="17"/></svg>
                      Upload Photo
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-2 bg-gray-100 border rounded px-2 py-1">
                    <span className="text-sm font-medium text-gray-700">{form.photoName || 'Photo selected'}</span>
                    <span className="text-xs text-gray-500">{form.photoType || ''}</span>
                    <button
                      type="button"
                      className="ml-auto text-gray-400 hover:text-red-500 text-lg px-2"
                      onClick={() => setForm(f => f ? { ...f, photo: undefined, photoName: undefined, photoType: undefined } : f)}
                      aria-label="Remove photo"
                    >
                      &times;
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Shelter Name</label>
                <InputField label="" name="name" value={form.name} onChange={handleFormChange} required/>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Capacity</label>
                  <InputField label="" name="capacity" type="number" value={String(form.capacity)} onChange={handleFormChange} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Occupancy</label>
                  <InputField label="" name="occupancy" type="number" value={String(form.occupancy)} onChange={handleFormChange} required />
                </div>
              </div>
              <hr className="my-2 border-gray-200" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Contact Person</label>
                  <InputField label="" name="contact_person" value={form.contact_person} onChange={handleFormChange} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Contact Number</label>
                  <InputField label="" name="contact_number" value={form.contact_number} onChange={handleFormChange} />
                </div>
              </div>
              <hr className="my-2 border-gray-200" />
              <div>
                <label className="block text-sm font-semibold mb-1">Status</label>
                <select className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-200" name="status" value={form.status} onChange={handleFormChange} required>
                  <option value="available">Available</option>
                  <option value="full">Full</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Address</label>
                <InputField label="" name="address" value={loadingAddress ? "Loading address..." : form.address} onChange={() => {}} readOnly />
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-2 mt-6 pt-4 border-t">
              <button type="button" onClick={handleSave} className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 text-lg font-semibold flex items-center justify-center gap-2 shadow transition-all">
                <FaCheckCircle className="inline-block" /> Save
              </button>
              <button type="button" className="flex-1 bg-gray-400 text-white px-4 py-3 rounded-lg hover:bg-gray-500 text-lg font-semibold flex items-center justify-center gap-2 shadow transition-all" onClick={handleCancel}>
                <FaTimesCircle className="inline-block" /> Cancel
              </button>
            </div>
          </form>
        )}
      </div>
      {/* Map */}
      <div className="w-full md:w-2/3 h-[300px] md:h-full rounded-lg shadow-md overflow-hidden mt-4 md:mt-0">
        <MapContainer center={[14.28, 121.42]} zoom={9} style={{ height: "100%", width: "100%" }} ref={mapRef}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          />
          <AddShelterOnMap onAdd={handleMapClick} enabled={adding} />
          {shelters.map((shelter) => (
            <Marker key={shelter.id} position={[shelter.lat, shelter.lng]} icon={getShelterIcon(shelter)}>
              <Popup>
                <div>
                  <strong>{shelter.name}</strong><br />
                  Capacity: {shelter.occupancy}/{shelter.capacity}<br />
                  Status: {shelter.status}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

// Helper for form fields to avoid repetition
const InputField = ({ label, name, value, onChange, readOnly = false, required = false, type = "text" }: 
  { label: string, name: string, value: string, onChange: (e: any) => void, readOnly?: boolean, required?: boolean, type?: string }
) => (
  <div>
    <label className="block text-xs font-semibold mb-1 dark:text-gray-300">{label}</label>
    <input
      className={`w-full border rounded px-2 py-1 ${readOnly ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : 'dark:bg-gray-800 dark:border-gray-600 dark:text-white'}`}
      name={name} value={value} onChange={onChange} readOnly={readOnly} required={required} type={type}
    />
  </div>
); 