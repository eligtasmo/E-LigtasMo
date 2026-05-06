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
  return "shelter"; // Using the string type as defined in TacticalMarker
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
        pitch: 0,
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
        pitch: 0,
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
        pitch: 0,
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
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-gray-50 font-jetbrains">
      {/* Map Section */}
      <div className="flex-1 relative min-h-[400px] lg:h-full z-0 overflow-hidden">
        <MapboxMap
          initialViewState={{
            latitude: 14.28,
            longitude: 121.42,
            zoom: 12
          }}
          mapStyle="mapbox://styles/mapbox/light-v11"
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
              style={{ opacity: 0.8, filter: 'drop-shadow(0 0 10px #3b82f6)' }}
            />
          )}

          {selectedShelter && (
            <Popup
              latitude={Number(selectedShelter.lat)}
              longitude={Number(selectedShelter.lng)}
              onClose={() => setSelectedShelter(null)}
              anchor="bottom"
              closeOnClick={false}
              className="custom-popup"
            >
              <div className="p-3 min-w-[200px] bg-white rounded-xl shadow-xl border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <FaHome className="text-blue-600 text-sm" />
                  </div>
                  <div>
                    <strong className="block text-gray-900 text-[13px] leading-tight font-bold">{selectedShelter.name}</strong>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${selectedShelter.status === 'available' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {selectedShelter.status}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-500">Occupancy</span>
                    <span className="font-bold text-gray-900">{selectedShelter.occupancy}/{selectedShelter.capacity}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${selectedShelter.occupancy >= selectedShelter.capacity ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(100, (selectedShelter.occupancy / selectedShelter.capacity) * 100)}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    const missionParams = `lat=${selectedShelter.lat}&lon=${selectedShelter.lng}&name=${encodeURIComponent(selectedShelter.name)}&autoStart=true`;
                    const expoLink = `exp://exp.host/@kaizendotexe/mobileligtas/--/route-planner?${missionParams}`;
                    navigator.clipboard.writeText(expoLink);
                    setShowToast('Mission link copied! Ready for mobile deployment.');
                    setTimeout(() => setShowToast(null), 3000);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-widest py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 9a3 3 0 100-2.684 3 3 0 000 2.684z" /></svg>
                  Share Mission
                </button>
              </div>
            </Popup>
          )}
        </MapboxMap>

        {/* Floating Search Bar */}
        <div className="absolute top-6 right-20 z-[10] w-72 md:w-80">
          <form onSubmit={handleSearch} className="flex shadow-2xl rounded-xl bg-white/95 backdrop-blur-md overflow-hidden border border-gray-200/50 transition-all focus-within:ring-2 focus-within:ring-blue-600/20">
            <div className="pl-4 flex items-center">
              <FaSearch className="text-gray-400 text-sm" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a location..."
              className="flex-1 px-3 py-3 text-[13px] outline-none bg-transparent text-gray-900 font-medium placeholder-gray-400"
            />
            <button 
              type="submit" 
              className="bg-blue-600 text-white px-4 hover:bg-blue-700 transition-colors flex items-center justify-center"
              disabled={isSearching}
            >
              {isSearching ? <FaSpinner className="animate-spin" /> : <FaCheckCircle className="text-sm" />}
            </button>
          </form>
          
          {searchResults.length > 0 && (
            <div className="mt-2 bg-white rounded-xl shadow-2xl max-h-64 overflow-y-auto border border-gray-100 custom-scrollbar divide-y divide-gray-50">
              {searchResults.map((result, idx) => (
                <div 
                  key={idx}
                  onClick={() => selectSearchResult(result)}
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <p className="font-bold text-[13px] text-gray-900">{result.text}</p>
                  <p className="text-[11px] text-gray-500 truncate">{result.place_name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Panel Section */}
      <div className="w-full lg:w-[400px] h-[500px] lg:h-full bg-gray-50 p-6 border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] overflow-y-auto custom-scrollbar font-jetbrains shrink-0 animate-in slide-in-from-right duration-500">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <FaHome className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-gray-900 font-bold text-xl tracking-tight">Active Shelters</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-[10px] text-gray-400 tracking-tight font-bold">Operational Nodes</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all"
          >
            <FaTimes className="text-xs" />
          </button>
        </div>

        {!form ? (
          <>
            {adding && (
              <div className="mb-4 bg-blue-50 text-blue-700 px-4 py-3 rounded-xl border border-blue-100 text-[12px] font-bold flex items-center gap-2 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                Awaiting map location selection...
              </div>
            )}
            <button
              className="w-full font-bold py-4 px-6 rounded-xl text-[11px] mb-4 transition-all flex items-center justify-center gap-3 shadow-xl bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98]"
              onClick={() => { setAdding(!adding); setEditId(null); setForm(null); }}
            >
              {adding ? <FaTimes className="text-sm" /> : <FaPlus className="text-sm" />}
              {adding ? "Cancel Operation" : "Register New Shelter"}
            </button>
            <div className="border-t border-gray-100 pt-4 flex-grow">
              <div className="mb-3 text-[10px] text-gray-400 font-bold">Export Data</div>
              <div className="flex flex-col gap-3 mb-6">
                <div className="flex gap-2">
                  <button
                    className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-900 font-bold px-3 py-3 rounded-xl text-[11px] tracking-widest border border-gray-100 transition-all shadow-sm active:scale-95"
                    onClick={() => {
                      if (shelters.length === 0) { setShowToast('No shelters to export.'); return; }
                      const ws = XLSX.utils.json_to_sheet(shelters);
                      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Shelters');
                      XLSX.writeFile(wb, `shelters_${new Date().toISOString().slice(0,10)}.xlsx`);
                    }}
                  >
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 16v-8m0 8l-4-4m4 4l4-4"/><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                    Export Excel
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-900 font-bold px-3 py-3 rounded-xl text-[11px] tracking-widest border border-gray-100 transition-all shadow-sm active:scale-95"
                    onClick={() => {
                      if (shelters.length === 0) { setShowToast('No shelters to export.'); return; }
                      const csvRows = [
                        ['Name', 'Address', 'Capacity', 'Occupancy', 'Status', 'Contact Person', 'Contact Number'].join(','),
                        ...shelters.map(s => [s.name, s.address, s.capacity, s.occupancy, s.status, s.contact_person, s.contact_number].map(v => `"${v ?? ''}"`).join(','))
                      ];
                      const link = document.createElement('a'); link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csvRows.join('\n'));
                      link.download = `shelters_${new Date().toISOString().slice(0,10)}.csv`; link.click();
                    }}
                  >
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 16v-8m0 8l-4-4m4 4l4-4"/><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                    CSV_DATA
                  </button>
                </div>
              </div>

              {showToast && (
                <div className="mb-4 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl border border-emerald-100 text-[11px] font-bold flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                  <FaCheckCircle /> {showToast}
                </div>
              )}

              <div className="mb-3 text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black">Active Facilities</div>
              <div className="flex flex-col gap-3">
                {shelters.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
                    <FaHome className="text-gray-200 text-4xl mx-auto mb-3" />
                    <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest">No Registered Facilities</p>
                  </div>
                ) : (
                  shelters.map((shelter) => {
                    const isFull = shelter.occupancy >= shelter.capacity;
                    const percent = Math.min(100, Math.round((shelter.occupancy / shelter.capacity) * 100));
                    return (
                      <div
                        key={shelter.id}
                        className={`group rounded-2xl flex flex-col bg-white border-2 transition-all cursor-pointer overflow-hidden ${selectedShelter?.id === shelter.id ? 'border-blue-600 shadow-xl shadow-blue-600/5' : 'border-gray-50 hover:border-gray-200'}`}
                        onClick={() => {
                          setSelectedShelter(shelter);
                          setIsViewingDetails(true);
                        }}
                      >
                        <div className="p-4">
                          <div className="flex items-center gap-3 w-full">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 transition-colors ${isFull ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                              <FaHome className="text-lg" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-[14px] text-gray-900 tracking-tight truncate">{shelter.name}</h3>
                              <p className="text-gray-400 text-[11px] font-medium truncate mt-0.5">{shelter.address}</p>
                            </div>
                            <span className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isFull ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                              {isFull ? 'FULL' : 'OPEN'}
                            </span>
                          </div>

                          <div className="mt-4 space-y-2">
                            <div className="flex justify-between items-center text-[11px] font-bold">
                              <span className="text-gray-400 uppercase tracking-widest">Occupancy Status</span>
                              <span className="text-gray-900">{percent}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-700 ${isFull ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${percent}%` }}></div>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-tighter pt-1">
                              <span>{shelter.occupancy} Active</span>
                              <span>{shelter.capacity} Total Slots</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex border-t border-gray-50 bg-gray-50/30">
                          {(user?.role === 'admin' || (user?.role === 'brgy' && shelter.created_brgy === user?.brgy_name)) ? (
                            <>
                              <button 
                                className="flex-1 py-3 flex items-center justify-center gap-2 hover:bg-white text-gray-600 hover:text-blue-600 transition-all text-[11px] font-black uppercase tracking-widest border-r border-gray-50" 
                                onClick={(e) => { e.stopPropagation(); handleEdit(shelter); }}
                              >
                                <FaPencilAlt className="text-[10px]" /> Update
                              </button>
                              <button 
                                className="flex-1 py-3 flex items-center justify-center gap-2 hover:bg-red-50 text-gray-600 hover:text-red-600 transition-all text-[11px] font-black uppercase tracking-widest" 
                                onClick={(e) => { e.stopPropagation(); if(window.confirm('Are you sure you want to decommission this facility?')) handleDelete(shelter.id!); }}
                              >
                                <FaTrash className="text-[10px]" /> Purge
                              </button>
                            </>
                          ) : (
                             <div className="flex-1 py-3 text-center text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] italic">
                                Tactical View Only
                             </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        ) : (
          <form className="flex flex-col gap-4 mt-2" onSubmit={e => e.preventDefault()}>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 mb-2">Facility Category</label>
                <select
                  className="w-full bg-white text-gray-900 border border-gray-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:ring-2 focus:ring-blue-600/20 transition-all appearance-none"
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

              <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 mb-2">Shelter Name</label>
                  <input
                    className="w-full bg-white text-gray-900 border border-gray-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:ring-2 focus:ring-blue-600/20"
                    name="name" value={form.name} onChange={handleFormChange} required placeholder="Enter facility name"
                  />
                </div>
                <div className="grid grid-cols-2 divide-x divide-gray-100">
                  <div className="p-4">
                    <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 mb-2">Capacity</label>
                    <input
                      type="number"
                      className="w-full bg-white text-gray-900 border border-gray-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:ring-2 focus:ring-blue-600/20"
                      name="capacity" value={String(form.capacity)} onChange={handleFormChange} required
                    />
                  </div>
                  <div className="p-4">
                    <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 mb-2">Occupancy</label>
                    <input
                      type="number"
                      className="w-full bg-white text-gray-900 border border-gray-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:ring-2 focus:ring-blue-600/20"
                      name="occupancy" value={String(form.occupancy)} onChange={handleFormChange} required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 mb-2">Primary Contact Person</label>
                    <input
                      className="w-full bg-white text-gray-900 border border-gray-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:ring-2 focus:ring-blue-600/20"
                      name="contact_person" value={form.contact_person} onChange={handleFormChange} placeholder="Full Name"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 mb-2">Emergency Hotline</label>
                    <input
                      className="w-full bg-white text-gray-900 border border-gray-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:ring-2 focus:ring-blue-600/20"
                      name="contact_number" value={form.contact_number} onChange={handleFormChange} placeholder="Phone Number"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 mb-3">Facility Status Override</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${form.status === 'available' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-100'}`}
                    onClick={() => handleFormChange({ target: { name: 'status', value: 'available' } } as any)}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${form.status === 'full' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-100'}`}
                    onClick={() => handleFormChange({ target: { name: 'status', value: 'full' } } as any)}
                  >
                    At Capacity
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-blue-400 mb-2">Verified Geolocation</label>
                <div className="relative">
                  <textarea
                    className="w-full bg-white/50 text-blue-900 border border-blue-100 rounded-xl px-4 py-3 text-[12px] font-bold outline-none resize-none opacity-80 cursor-not-allowed"
                    value={loadingAddress ? "Acquiring coordinates..." : form.address} readOnly rows={2}
                  />
                  <div className="absolute right-3 top-3">
                    <FaCheckCircle className="text-blue-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button 
                type="button" 
                onClick={handleSave} 
                className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black text-[12px] tracking-[0.2em] uppercase shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <FaCheckCircle className="text-lg" /> Complete
              </button>
              <button 
                type="button" 
                onClick={handleCancel} 
                className="flex-[0.6] bg-gray-100 text-gray-500 py-5 rounded-2xl font-black text-[12px] tracking-[0.2em] uppercase hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Full Details Overlay */}
      {isViewingDetails && selectedShelter && (
        <div className="absolute inset-0 z-50 bg-white flex flex-col lg:flex-row animate-in fade-in duration-500 font-jetbrains">
          {/* Close Button */}
          <button 
            onClick={() => setIsViewingDetails(false)}
            className="absolute top-8 right-8 w-14 h-14 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900 flex items-center justify-center z-[60] transition-all shadow-sm border border-gray-100"
          >
            <FaTimes className="text-xl" />
          </button>

          {/* Left Side: Visual Context */}
          <div className="w-full lg:w-[45%] h-1/2 lg:h-full relative bg-gray-50 flex items-center justify-center overflow-hidden">
            <div className="relative z-10 text-center px-12">
              <div className="w-24 h-24 rounded-3xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-600/30 mx-auto mb-8">
                <FaHome className="text-white text-4xl" />
              </div>
              <span className={`inline-block px-4 py-2 rounded-xl text-[12px] font-black uppercase tracking-[0.2em] mb-6 ${selectedShelter.status === 'available' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {selectedShelter.status} Status
              </span>
              <h1 className="text-gray-900 text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] mb-6">{selectedShelter.name}</h1>
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <FaSearch className="text-sm" />
                <p className="text-base font-bold tracking-tight">{selectedShelter.address}</p>
              </div>
            </div>
            
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
              <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600 blur-[120px]"></div>
              <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-600 blur-[120px]"></div>
            </div>
          </div>

          {/* Right Side: Operational Intelligence */}
          <div className="w-full lg:w-[55%] h-1/2 lg:h-full bg-white p-8 lg:p-16 overflow-y-auto custom-scrollbar flex flex-col">
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-10">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                <h3 className="text-gray-400 font-black text-[12px] tracking-[0.3em] uppercase">Intelligence Summary</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 transition-all hover:border-blue-200">
                  <div className="flex justify-between items-center mb-6">
                    <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.2em]">Live Utilization</p>
                    <span className="text-blue-600 font-black text-xl">{Math.min(100, Math.round((selectedShelter.occupancy / selectedShelter.capacity) * 100))}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full mb-6 overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${(selectedShelter.occupancy / selectedShelter.capacity) * 100}%` }} />
                  </div>
                  <p className="text-gray-900 text-3xl font-black tracking-tighter">{selectedShelter.occupancy} <span className="text-gray-300 text-xl font-medium">/ {selectedShelter.capacity}</span></p>
                  <p className="text-gray-500 text-[13px] font-medium mt-2">Active residents currently sheltered</p>
                </div>
                
                <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 transition-all hover:border-emerald-200">
                  <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.2em] mb-6">Resource Availability</p>
                  <p className="text-emerald-600 text-5xl font-black tracking-tighter mb-2">{selectedShelter.capacity - selectedShelter.occupancy}</p>
                  <p className="text-gray-900 text-lg font-bold">Unallocated Slots</p>
                  <p className="text-gray-500 text-[13px] font-medium mt-1 italic">Ready for immediate deployment</p>
                </div>
              </div>
            </div>

            <div className="space-y-6 flex-grow">
              <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
                <div className="p-5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-gray-900 text-[12px] font-black tracking-[0.2em] uppercase">Command Contacts</span>
                  <FaPhone className="text-blue-600 text-xs" />
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <p className="text-gray-400 text-[10px] uppercase tracking-[0.2em] font-black mb-2">Officer in Charge</p>
                    <p className="text-gray-900 text-xl font-bold">{selectedShelter.contact_person || 'Station Commander'}</p>
                    <p className="text-gray-400 text-[12px] mt-1">Verified Personnel</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10px] uppercase tracking-[0.2em] font-black mb-2">Hotline Connection</p>
                    <p className="text-blue-600 text-2xl font-black tracking-tight">{selectedShelter.contact_number || 'N/A'}</p>
                    <p className="text-gray-400 text-[12px] mt-1">24/7 Operations Line</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                   <p className="text-gray-400 text-[10px] uppercase tracking-[0.2em] font-black mb-2">Facility Logistics</p>
                   <div className="flex items-center gap-2">
                     <span className="text-gray-900 font-bold">{selectedShelter.created_by || 'ADMIN'}</span>
                     <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                     <span className="text-gray-500 font-medium">{selectedShelter.created_brgy || 'MAIN_HQ'}</span>
                   </div>
                </div>
                {(selectedShelter as any).category && (
                  <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                    <p className="text-gray-400 text-[10px] uppercase tracking-[0.2em] font-black mb-2">Classification</p>
                    <p className="text-blue-600 font-black text-sm uppercase tracking-widest">{(selectedShelter as any).category}</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                const role = (user?.role || '').toLowerCase();
                const base = role === 'admin' ? '/admin/admin-routes' : role === 'brgy' ? '/brgy/safe-routes' : '/route-planner';
                navigate(`${base}?end=${selectedShelter.lat},${selectedShelter.lng}`);
              }}
              className="mt-12 w-full py-6 bg-gray-900 text-white font-black text-[13px] tracking-[0.4em] rounded-3xl hover:bg-black transition-all shadow-2xl shadow-gray-900/20 active:scale-[0.98]"
            >
              DEPLOY MISSION ROUTE
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
      className={`w-full bg-white text-gray-900 border border-gray-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:ring-2 focus:ring-blue-600/20 ${readOnly ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
      name={name} value={value} onChange={onChange} readOnly={readOnly} required={required} type={type}
    />
  </div>
); 