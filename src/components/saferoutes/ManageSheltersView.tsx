import { useState, useEffect, useRef } from "react";
import MapboxMap, { Popup, NavigationControl, FullscreenControl } from "../maps/MapboxMap";
import TacticalMarker from "../maps/TacticalMarker";
import { FaCheckCircle, FaTimesCircle, FaPhone, FaPencilAlt, FaTrash, FaHome, FaTimes, FaCamera, FaPlus, FaSearch, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/api";

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN) as string | undefined;


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
  created_by?: string;
  created_brgy?: string;
};



async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data?.features?.[0]?.place_name || '';
  } catch (error) {
    console.error("Geocoding failed:", error);
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
  const [selectedShelter, setSelectedShelter] = useState<ShelterForm | null>(null);
  const navigate = useNavigate();
  const [showToast, setShowToast] = useState<string | null>(null);
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const mapRef = useRef<any>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const fetchShelters = async () => {
      try {
        const response = await apiFetch('shelters-list.php');
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
    
    // Smooth zoom to the picked location
    if (mapRef.current) {
      mapRef.current.getMap().flyTo({
        center: [latlng.lng, latlng.lat],
        zoom: 17,
        pitch: 45,
        duration: 1500
      });
    }

    setAdding(false);
    setLoadingAddress(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&country=ph&proximity=121.4167,14.2833`;
      const response = await fetch(url);
      const data = await response.json();
      setSearchResults(data.features || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result: any) => {
    const [lng, lat] = result.center;
    
    // Fly to location
    if (mapRef.current) {
      mapRef.current.getMap().flyTo({
        center: [lng, lat],
        zoom: 17,
        pitch: 45,
        duration: 1500
      });
    }

    // Drop a pinpoint for the new shelter
    setForm({
      name: "", lat: lat, lng: lng, capacity: 100, occupancy: 0,
      status: "available", contact_person: "", contact_number: "", 
      address: result.place_name,
      created_by: user?.username || "", created_brgy: user?.brgy_name || ""
    });

    setSearchResults([]);
    setSearchQuery("");
  };

  const handleEdit = async (shelter: any) => {
    if (shelter.id !== undefined) setEditId(shelter.id);
    setLoadingAddress(true);
    const address = await reverseGeocode(shelter.lat, shelter.lng);
    setForm({ ...shelter, address });
    
    // Zoom to existing shelter being edited
    if (mapRef.current) {
      mapRef.current.getMap().flyTo({
        center: [Number(shelter.lng), Number(shelter.lat)],
        zoom: 17,
        pitch: 45,
        duration: 1500
      });
    }
    setLoadingAddress(false);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!form) return;
    const { name, value } = e.target;
    if (!form) return;

    let updatedValue: any = value;
    let extraUpdates: any = {};

    if (name === "capacity") {
      updatedValue = Number(value);
      if (form.occupancy > updatedValue) {
        extraUpdates.occupancy = updatedValue;
      }
      // Auto status
      extraUpdates.status = (extraUpdates.occupancy ?? form.occupancy) >= updatedValue ? 'full' : 'available';
    } else if (name === "occupancy") {
      updatedValue = Math.min(Number(value), form.capacity);
      // Auto status
      extraUpdates.status = updatedValue >= form.capacity ? 'full' : 'available';
    }

    setForm({
      ...form,
      [name]: updatedValue,
      ...extraUpdates
    });
  };

  const handleSave = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      alert("Please enter shelter name.");
      return;
    }
    if (form.capacity <= 0) {
      alert("Please enter a valid capacity.");
      return;
    }
    if (!form.address) {
      alert("Please select a location on the map.");
      return;
    }
    try {
      if (editId !== null && editId !== undefined) {
        // Update existing shelter
        const response = await apiFetch('shelters-update.php', {
          method: 'POST',
          body: JSON.stringify({ ...form, id: editId })
        });
        const updatedShelter = await response.json();
        if (updatedShelter.error) throw new Error(updatedShelter.error);
        setShelters(shelters.map(s => (s.id !== undefined && s.id === editId) ? updatedShelter : s));
        setEditId(null);
      } else {
        // Add new shelter
        const response = await apiFetch('shelters-add.php', {
          method: 'POST',
          body: JSON.stringify(form)
        });
        const newShelter = await response.json();
        if (newShelter.error) throw new Error(newShelter.error);
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
        const res = await apiFetch('shelters-delete.php', {
          method: 'POST',
          body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setShelters(shelters.filter(s => s.id !== id));
      } catch (error) {
        console.error("Failed to delete shelter:", error);
        alert("Error: Could not delete shelter from the database.");
      }
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0a0a0a] font-mono">
      {/* Map Section */}
      <div className="flex-1 relative h-full z-0 overflow-hidden">
        <MapboxMap
          initialViewState={{
            latitude: 14.28,
            longitude: 121.42,
            zoom: 12
          }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={MAPBOX_TOKEN}
          onClick={(e: any) => {
            if (adding && e.lngLat) {
              handleMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
            }
          }}
          style={{ width: '100%', height: '100%' }}
          ref={mapRef}
        >
          <NavigationControl position="top-right" />
          <FullscreenControl position="top-right" />
          
          {shelters.map((shelter) => (
            <TacticalMarker 
              key={shelter.id} 
              latitude={Number(shelter.lat)} 
              longitude={Number(shelter.lng)}
              type="shelter"
              status={shelter.status}
              onClick={(e: any) => {
                e.originalEvent.stopPropagation();
                setSelectedShelter(shelter);
              }}
            />
          ))}

          {/* Draft Marker for new/editing shelter */}
          {form && !editId && (
            <TacticalMarker 
              latitude={Number(form.lat)} 
              longitude={Number(form.lng)}
              type="shelter"
              status="available"
              style={{ opacity: 0.8, filter: 'drop-shadow(0 0 10px #f59e0b)' }}
            />
          )}

          {selectedShelter && (
            <Popup
              latitude={Number(selectedShelter.lat)}
              longitude={Number(selectedShelter.lng)}
              onClose={() => setSelectedShelter(null)}
              anchor="bottom"
              closeOnClick={false}
            >
              <div className="p-2 min-w-[150px]">
                <strong className="block text-gray-800 text-base mb-1">{selectedShelter.name}</strong>
                <div className="text-sm text-gray-600">
                  <p>Capacity: {selectedShelter.occupancy}/{selectedShelter.capacity}</p>
                  <p>Status: {selectedShelter.status}</p>
                </div>
                <button
                  onClick={() => {
                    const role = (user?.role || '').toLowerCase();
                    const base = role === 'admin' ? '/admin/admin-routes' : role === 'brgy' ? '/barangay/safe-routes' : '/route-planner';
                    navigate(`${base}?end=${selectedShelter.lat},${selectedShelter.lng}`);
                  }}
                  className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                >
                  Follow Safe Route
                </button>
              </div>
            </Popup>
          )}
        </MapboxMap>

        {/* Floating Search Bar */}
        <div className="absolute top-6 right-20 z-[10] w-72 md:w-80">
          <form onSubmit={handleSearch} className="flex shadow-xl rounded-xl bg-[#1c1c1e]/90 backdrop-blur-md overflow-hidden border border-white/10 transition-all focus-within:ring-2 focus-within:ring-[#f59e0b]/50">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search location..."
              className="flex-1 px-4 py-2.5 text-sm outline-none bg-transparent text-white placeholder-gray-500"
            />
            <button 
              type="submit" 
              className="bg-[#f59e0b] text-black px-4 hover:bg-[#f59e0b]/90 transition-colors flex items-center justify-center"
              disabled={isSearching}
            >
              {isSearching ? <FaSpinner className="animate-spin" /> : <FaSearch />}
            </button>
          </form>
          
          {searchResults.length > 0 && (
            <div className="mt-2 bg-[#1c1c1e] rounded-xl shadow-2xl max-h-64 overflow-y-auto border border-white/10 custom-scrollbar">
              {searchResults.map((result, idx) => (
                <div 
                  key={idx}
                  onClick={() => selectSearchResult(result)}
                  className="px-4 py-3 text-sm text-gray-300 hover:bg-[#f59e0b]/10 hover:text-white cursor-pointer border-b border-white/5 last:border-b-0 transition-colors"
                >
                  <p className="font-bold text-[13px]">{result.text}</p>
                  <p className="text-[11px] text-gray-500 truncate">{result.place_name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Dark Panel Section */}
      <div className="w-[420px] h-full bg-[#1c1c1e] p-6 border-l border-white/5 flex flex-col z-20 shadow-2xl overflow-y-auto custom-scrollbar font-mono shrink-0 animate-in slide-in-from-right duration-500">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-[#f59e0b] font-bold text-xl tracking-wider">SHELTER_OPS</h2>
            <p className="text-white text-[13px] mt-1 tracking-widest">Active Status</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#2c2c2e] flex items-center justify-center cursor-pointer hover:bg-[#3a3a3c] transition-colors">
            <FaTimes className="text-[#8e8e93] text-sm" />
          </div>
        </div>

        {!form ? (
          <>
            {adding && (
              <div className="mb-4 text-[#f59e0b] font-semibold text-[13px]">Awaiting map selection...</div>
            )}
            <button
              className="w-full font-bold py-4 px-6 rounded-xl text-[12px] tracking-[0.2em] mb-4 transition-all flex items-center justify-center gap-3 shadow-lg bg-[#f59e0b] text-black shadow-[#f59e0b]/10 hover:bg-[#f59e0b]/90"
              onClick={() => { setAdding(!adding); setEditId(null); setForm(null); }}
            >
              {adding ? <FaTimes className="text-sm" /> : <FaPlus className="text-sm" />}
              {adding ? "CANCEL_ADD" : "NEW_SHELTER"}
            </button>
            <div className="border-t border-[#3a3a3c] pt-4 flex-grow">
              <div className="mb-3 text-[11px] text-[#8e8e93] uppercase tracking-wider font-bold">Export Data</div>
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex gap-2">
                  <button
                    className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-black font-bold px-3 py-3 rounded-xl text-[11px] tracking-widest transition-colors shadow-sm"
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
                    className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-black font-bold px-3 py-3 rounded-xl text-[11px] tracking-widest transition-colors shadow-sm"
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
              <div className="flex flex-col gap-3 mt-4">
                {shelters.map((shelter, idx) => {
                  const isFull = shelter.occupancy >= shelter.capacity;
                  const percent = Math.min(100, Math.round((shelter.occupancy / shelter.capacity) * 100));
                  return (
                    <div
                      key={shelter.id}
                      className={`rounded-lg flex flex-col bg-[#2c2c2e] border transition-all cursor-pointer overflow-hidden ${selectedShelter?.id === shelter.id ? 'border-[#f59e0b]' : 'border-transparent hover:border-[#3a3a3c]'}`}
                      onClick={() => {
                        setSelectedShelter(shelter);
                        setIsViewingDetails(true);
                      }}
                    >
                      <div className="p-2">
                        <div className="flex items-center gap-2 w-full">
                          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
                            <FaHome className="text-black text-[12px]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-[13px] text-white tracking-wide truncate">{shelter.name}</h3>
                            <p className="text-[#8e8e93] text-[10px] mt-0.5 truncate">{shelter.address}</p>
                          </div>
                          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isFull ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {isFull ? 'FULL' : 'AVAIL'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="px-3 py-1.5 bg-[#2c2c2e] flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-[10px] text-[#8e8e93]">
                          <div className="truncate pr-2">Capacity: <span className="text-white ml-1 font-mono">{shelter.occupancy}/{shelter.capacity}</span></div>
                          <div className="truncate">Contact: <span className="text-white ml-1">{shelter.contact_person || 'N/A'}</span></div>
                        </div>
                        <div className="w-full h-1 bg-[#3a3a3c] rounded-full overflow-hidden mb-1">
                           <div className={`h-full ${isFull ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>

                      <div className="flex">
                        {(user?.role === 'admin' || (user?.role === 'brgy' && shelter.created_brgy === user?.brgy_name)) ? (
                          <>
                            <button className="flex-1 py-2 flex items-center justify-center gap-1.5 bg-[#e5e5ea] hover:bg-white text-black transition-colors text-[11px] font-bold" onClick={(e) => { e.stopPropagation(); handleEdit(shelter); }}>
                              <FaPencilAlt /> Edit
                            </button>
                            <button className="flex-1 py-2 flex items-center justify-center gap-1.5 hover:bg-red-500/20 text-red-500 transition-colors text-[11px] font-bold" onClick={(e) => { e.stopPropagation(); if(window.confirm('Decommission this facility?')) handleDelete(shelter.id!); }}>
                              <FaTrash /> Delete
                            </button>
                          </>
                        ) : (
                           <div className="flex-1 py-2 text-center text-[10px] text-[#8e8e93] font-bold uppercase tracking-widest italic bg-[#2c2c2e]">
                              Read Only Access
                           </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <form className="flex flex-col gap-4 mt-2 bg-[#1c1c1e] text-white" onSubmit={e => e.preventDefault()}>
            <div className="space-y-4">
              <div className="bg-[#2c2c2e] rounded-xl overflow-hidden p-3 border border-[#3a3a3c]">
                <label className="block text-[10px] uppercase tracking-wider font-bold text-[#8e8e93] mb-2">Shelter Category</label>
                <select
                  className="w-full bg-[#3a3a3c] text-white border-none rounded-lg px-3 py-2 text-[13px] outline-none"
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

              <div className="bg-[#2c2c2e] rounded-xl overflow-hidden p-3 border border-[#3a3a3c]">
              </div>

              <div className="bg-[#2c2c2e] rounded-xl overflow-hidden border border-[#3a3a3c]">
                <div className="p-3 border-b border-[#3a3a3c]">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#8e8e93] mb-1">Shelter Name</label>
                  <InputField label="" name="name" value={form.name} onChange={handleFormChange} required/>
                </div>
                <div className="grid grid-cols-2 divide-x divide-[#3a3a3c]">
                  <div className="p-3">
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#8e8e93] mb-1">Capacity</label>
                    <InputField label="" name="capacity" type="number" value={String(form.capacity)} onChange={handleFormChange} required />
                  </div>
                  <div className="p-3">
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#8e8e93] mb-1">Occupancy</label>
                    <InputField label="" name="occupancy" type="number" value={String(form.occupancy)} onChange={handleFormChange} required />
                  </div>
                </div>
              </div>

              <div className="bg-[#2c2c2e] rounded-xl overflow-hidden border border-[#3a3a3c] grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#3a3a3c]">
                <div className="p-3">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#8e8e93] mb-1">Contact Person</label>
                  <InputField label="" name="contact_person" value={form.contact_person} onChange={handleFormChange} />
                </div>
                <div className="p-3">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#8e8e93] mb-1">Contact Number</label>
                  <InputField label="" name="contact_number" value={form.contact_number} onChange={handleFormChange} />
                </div>
              </div>

              <div className="bg-[#2c2c2e] rounded-xl overflow-hidden border border-[#3a3a3c]">
                <div className="p-3 border-b border-[#3a3a3c]">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#8e8e93] mb-2">Status</label>
                  <div className="flex divide-x divide-[#3a3a3c] rounded-lg overflow-hidden border border-[#3a3a3c]">
                    <button
                      type="button"
                      className={`flex-1 py-2 text-[13px] font-bold transition-all ${form.status === 'available' ? 'bg-[#10b981] text-white shadow-lg shadow-[#10b981]/20' : 'bg-[#2c2c2e] text-[#8e8e93] hover:bg-[#3a3a3c]'}`}
                      onClick={() => handleFormChange({ target: { name: 'status', value: 'available' } } as any)}
                    >
                      Available
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-2 text-[13px] font-bold transition-all ${form.status === 'full' ? 'bg-[#ef4444] text-white shadow-lg shadow-[#ef4444]/20' : 'bg-[#2c2c2e] text-[#8e8e93] hover:bg-[#3a3a3c]'}`}
                      onClick={() => handleFormChange({ target: { name: 'status', value: 'full' } } as any)}
                    >
                      Full
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#8e8e93] mb-1">Address</label>
                  <InputField label="" name="address" value={loadingAddress ? "Loading address..." : form.address} onChange={() => {}} readOnly />
                </div>
              </div>
            </div>

            <div className="flex bg-[#f59e0b] rounded-xl overflow-hidden divide-x divide-black/10 mt-2 border border-[#f59e0b] shadow-lg shadow-[#f59e0b]/5">
              <button type="button" onClick={handleSave} className="flex-1 py-4 flex flex-col items-center justify-center hover:bg-black/5 transition-colors group">
                <FaCheckCircle className="text-black text-xl mb-1 transition-colors" />
                <span className="text-black font-bold text-[11px] tracking-widest uppercase">SUBMIT</span>
              </button>
              <button type="button" onClick={handleCancel} className="flex-1 py-4 flex flex-col items-center justify-center hover:bg-black/5 transition-colors group">
                <FaTimesCircle className="text-black text-xl mb-1 transition-colors" />
                <span className="text-black font-bold text-[11px] tracking-widest uppercase">CANCEL</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Full Details Overlay (Instead of Map/Panel) */}
      {isViewingDetails && selectedShelter && (
        <div className="absolute inset-0 z-50 bg-[#0a0a0a] flex flex-col md:flex-row animate-in fade-in duration-300">
          {/* Close Button */}
          <button 
            onClick={() => setIsViewingDetails(false)}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-[60] transition-all"
          >
            <FaTimes className="text-xl" />
          </button>

          {/* Left Side: Photo/Visuals */}
          <div className="w-full md:w-1/2 h-1/2 md:h-full relative bg-[#1c1c1e]">
                <div className="w-full h-full flex flex-col items-center justify-center text-[#3a3a3c]">
                  <FaHome className="text-[120px] mb-4 opacity-20" />
                  <span className="text-lg font-mono tracking-widest uppercase opacity-50">NO_VISUAL_DATA_REQUIRED</span>
                </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80" />
            <div className="absolute bottom-12 left-12">
              <span className={`px-4 py-1.5 rounded-full text-[12px] font-bold uppercase tracking-widest ${selectedShelter.status === 'available' ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                {selectedShelter.status}
              </span>
              <h1 className="text-white text-5xl font-bold mt-4 tracking-tight leading-tight">{selectedShelter.name}</h1>
              <p className="text-[#8e8e93] text-lg mt-2 max-w-md font-mono">{selectedShelter.address}</p>
            </div>
          </div>

          {/* Right Side: Data/Ops */}
          <div className="w-full md:w-1/2 h-1/2 md:h-full bg-[#0a0a0a] p-12 overflow-y-auto custom-scrollbar flex flex-col">
            <div className="mb-12">
              <h3 className="text-[#f59e0b] font-bold text-sm tracking-[0.3em] uppercase mb-8">Operational_Data</h3>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-[#2c2c2e]">
                  <p className="text-[#8e8e93] text-[11px] font-bold uppercase tracking-widest mb-2">Occupancy_Rate</p>
                  <p className="text-white text-3xl font-mono">{Math.min(100, Math.round((selectedShelter.occupancy / selectedShelter.capacity) * 100))}%</p>
                  <div className="w-full h-1.5 bg-[#2c2c2e] rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${(selectedShelter.occupancy / selectedShelter.capacity) * 100}%` }} />
                  </div>
                </div>
                <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-[#2c2c2e]">
                  <p className="text-[#8e8e93] text-[11px] font-bold uppercase tracking-widest mb-2">Net_Capacity</p>
                  <p className="text-white text-3xl font-mono">{selectedShelter.occupancy} / {selectedShelter.capacity}</p>
                  <p className="text-[#8e8e93] text-[12px] mt-2 italic">{selectedShelter.capacity - selectedShelter.occupancy} slots remaining</p>
                </div>
              </div>
            </div>

            <div className="space-y-6 flex-grow">
              <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden border border-[#2c2c2e]">
                <div className="p-4 bg-[#2c2c2e]/50 border-b border-[#2c2c2e]">
                  <span className="text-white text-[12px] font-bold tracking-widest uppercase">Contact_Protocol</span>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-[#8e8e93] text-[11px] uppercase tracking-widest mb-1">Personnel_In_Charge</p>
                    <p className="text-white text-lg">{selectedShelter.contact_person || 'System Administrator'}</p>
                  </div>
                  <div>
                    <p className="text-[#8e8e93] text-[11px] uppercase tracking-widest mb-1">Direct_Hotline</p>
                    <p className="text-[#f59e0b] text-2xl font-mono font-bold">{selectedShelter.contact_number || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#1c1c1e] rounded-2xl p-6 border border-[#2c2c2e]">
                   <p className="text-[#8e8e93] text-[11px] uppercase tracking-widest mb-1">Deployed_By</p>
                   <p className="text-white text-[14px]">{selectedShelter.created_by || 'ARCHIVAL'} / {selectedShelter.created_brgy || 'UNKNOWN'}</p>
                </div>
                {(selectedShelter as any).updated_by && (
                  <div className="bg-[#1c1c1e] rounded-2xl p-6 border border-[#2c2c2e]">
                    <p className="text-[#8e8e93] text-[11px] uppercase tracking-widest mb-1">Last_Update_By</p>
                    <p className="text-amber-500 text-[14px] font-bold">{(selectedShelter as any).updated_by} / {(selectedShelter as any).updated_brgy}</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                const role = (user?.role || '').toLowerCase();
                const base = role === 'admin' ? '/admin/admin-routes' : role === 'brgy' ? '/barangay/safe-routes' : '/route-planner';
                navigate(`${base}?end=${selectedShelter.lat},${selectedShelter.lng}`);
              }}
              className="mt-12 w-full py-5 bg-[#f59e0b] text-black font-black text-[14px] tracking-[0.3em] rounded-2xl hover:bg-[#f59e0b]/90 transition-all shadow-lg shadow-[#f59e0b]/20"
            >
              INITIATE_ROUTING_SEQUENCE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper for form fields to avoid repetition
const InputField = ({ label, name, value, onChange, readOnly = false, required = false, type = "text" }: 
  { label: string, name: string, value: string, onChange: (e: any) => void, readOnly?: boolean, required?: boolean, type?: string }
) => (
  <div>
    {label && <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">{label}</label>}
    <input
      className={`w-full bg-[#3a3a3c] text-white border-none rounded-lg px-3 py-2 text-[13px] outline-none ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
      name={name} value={value} onChange={onChange} readOnly={readOnly} required={required} type={type}
    />
  </div>
); 