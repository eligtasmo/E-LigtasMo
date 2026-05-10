import { useState, useEffect, useRef } from "react";
import MapboxMap, { Popup, NavigationControl, FullscreenControl } from "../maps/MapboxMap";
import TacticalMarker from "../maps/TacticalMarker";
import { SantaCruzMapboxOutline } from '../maps/SantaCruzOutline';
import { FaCheckCircle, FaTimesCircle, FaPhone, FaPencilAlt, FaTrash, FaHome, FaTimes, FaCamera, FaPlus, FaSearch, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { isPointInSantaCruz } from "../../utils/geoValidation";

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
  const [selectedBarangay, setSelectedBarangay] = useState<string>("");
  const [barangays, setBarangays] = useState<any[]>([]);
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
        const url = `shelters-list.php${selectedBarangay ? `?barangay=${encodeURIComponent(selectedBarangay)}` : ''}`;
        const response = await apiFetch(url);
        const data = await response.json();
        setShelters(data);
      } catch (error) {
        console.error("Failed to fetch shelters:", error);
      }
    };
    fetchShelters();
  }, [user, selectedBarangay]);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'mmdrmo') {
      const fetchBrgys = async () => {
        try {
          const res = await apiFetch('list-barangays.php');
          const data = await res.json();
          if (data.success) setBarangays(data.barangays || []);
        } catch (e) {}
      };
      fetchBrgys();
    }
  }, [user]);

  const handleMapClick = async (latlng: { lat: number; lng: number }) => {
    if (!adding) return;
    if (!isPointInSantaCruz(latlng.lat, latlng.lng)) {
      alert("Pinpoint restricted to Santa Cruz, Laguna area only.");
      return;
    }
    setLoadingAddress(true);
    const address = await reverseGeocode(latlng.lat, latlng.lng);
    setForm({
      name: "", lat: latlng.lat, lng: latlng.lng, capacity: 100, occupancy: 0,
      status: "available", contact_person: "", contact_number: "", address,
      created_by: user?.username || "", created_brgy: selectedBarangay || user?.brgy_name || ""
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
      created_by: user?.username || "", created_brgy: selectedBarangay || user?.brgy_name || ""
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
          <SantaCruzMapboxOutline />
          
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
        <div className="absolute top-6 left-6 z-[10] w-[400px] max-w-[90%]">
          <form onSubmit={handleSearch} className="flex shadow-2xl rounded-2xl bg-white/95 backdrop-blur-md overflow-hidden border border-slate-200/50 transition-all focus-within:ring-4 focus-within:ring-slate-900/10">
            <div className="pl-5 flex items-center">
              <FaSearch className="text-slate-400 text-sm" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a tactical location..."
              className="flex-1 px-4 py-3.5 text-[13px] outline-none bg-transparent text-slate-900 font-bold placeholder-slate-400"
            />
            <button 
              type="submit" 
              className="bg-slate-900 text-white px-6 hover:bg-slate-800 transition-all flex items-center justify-center active:scale-95"
              disabled={isSearching}
            >
              {isSearching ? <FaSpinner className="animate-spin text-sm" /> : <FaCheckCircle className="text-sm" />}
            </button>
          </form>
          
          {searchResults.length > 0 && (
            <div className="mt-2 bg-white rounded-xl shadow-2xl max-h-64 overflow-y-auto border border-slate-100 custom-scrollbar divide-y divide-slate-50">
              {searchResults.map((result, idx) => (
                <div 
                  key={idx}
                  onClick={() => selectSearchResult(result)}
                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <p className="font-bold text-[13px] text-slate-900">{result.text}</p>
                  <p className="text-[11px] text-slate-500 truncate">{result.place_name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Panel Section */}
      {/* Floating Panel Section */}
      <div className="tactical-panel p-5 animate-in slide-in-from-right duration-500" style={{outline:'1px solid rgba(0,0,0,0.08)',background:'#f8fafc'}}>
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20">
              <FaHome className="text-white text-xs" />
            </div>
            <h2 className="text-slate-900 font-bold text-[13px] tracking-tight">Shelters</h2>
          </div>
          <button 
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-all"
          >
            <FaTimes className="text-xs" />
          </button>
        </div>

        <div className="space-y-3 custom-scrollbar overflow-y-auto pr-1">
          {!form ? (
            <>
              {adding && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-[10px] font-bold text-blue-600 uppercase tracking-widest animate-pulse">
                  Awaiting Map selection...
                </div>
              )}
              
              {(user?.role === 'admin' || user?.role === 'mmdrmo') && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-3" style={{outline:'1px solid rgba(0,0,0,0.08)'}}>
                  <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">Sector Filtering</span>
                    <FaSearch className="text-slate-500 text-[10px]" />
                  </div>
                  <div className="p-3">
                    <select 
                      className="w-full text-[11px] font-bold bg-slate-50 border-none outline-none p-2 rounded-lg cursor-pointer text-slate-900"
                      value={selectedBarangay}
                      onChange={(e) => setSelectedBarangay(e.target.value)}
                    >
                      <option value="">ALL SECTORS (GLOBAL)</option>
                      {barangays.map(b => (
                        <option key={b.id} value={b.name}>{b.name.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              
              <button
                className="w-full font-bold py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700 active:scale-95"
                onClick={() => { setAdding(!adding); setEditId(null); setForm(null); }}
              >
                {adding ? <FaTimes size={10} /> : <FaPlus size={10} />}
                {adding ? "Cancel" : "Add New Shelter"}
              </button>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden" style={{outline:'1px solid rgba(0,0,0,0.08)'}}>
                <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Export Options</span>
                </div>
                <div className="grid grid-cols-2 divide-x divide-gray-100">
                  <button
                    className="p-3 flex items-center justify-center gap-2 hover:bg-gray-50 transition-all group"
                    onClick={() => {
                      if (shelters.length === 0) return;
                      const ws = XLSX.utils.json_to_sheet(shelters);
                      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Shelters');
                      XLSX.writeFile(wb, `shelters_${new Date().toISOString().slice(0,10)}.xlsx`);
                    }}
                  >
                    <span className="text-[9px] font-bold text-slate-900 uppercase tracking-widest group-hover:text-blue-600">Export XLSX</span>
                  </button>
                  <button
                    className="p-3 flex items-center justify-center gap-2 hover:bg-gray-50 transition-all group"
                    onClick={() => {
                      if (shelters.length === 0) return;
                      const csvRows = [
                        ['Name', 'Address', 'Capacity', 'Occupancy', 'Status', 'Contact Person', 'Contact Number'].join(','),
                        ...shelters.map(s => [s.name, s.address, s.capacity, s.occupancy, s.status, s.contact_person, s.contact_number].map(v => `"${v ?? ''}"`).join(','))
                      ];
                      const link = document.createElement('a'); link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csvRows.join('\n'));
                      link.download = `shelters_${new Date().toISOString().slice(0,10)}.csv`; link.click();
                    }}
                  >
                    <span className="text-[9px] font-bold text-slate-900 uppercase tracking-widest group-hover:text-emerald-600">Export CSV</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="px-1 pt-2">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Shelter List</span>
                </div>
                {shelters.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest italic">No shelters found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {shelters.map((shelter) => {
                      const isFull = shelter.occupancy >= shelter.capacity;
                      const percent = Math.min(100, Math.round((shelter.occupancy / shelter.capacity) * 100));
                      return (
                        <div
                          key={shelter.id}
                          className={`bg-white rounded-2xl border transition-all cursor-pointer overflow-hidden ${selectedShelter?.id === shelter.id ? 'border-blue-600 shadow-lg' : 'border-gray-200 hover:border-gray-300 shadow-sm'}`}
                          onClick={() => {
                            setSelectedShelter(shelter);
                            setIsViewingDetails(true);
                          }}
                        >
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isFull ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                  <FaHome className="text-sm" />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-[12px] font-bold text-slate-900 uppercase tracking-tight truncate">{shelter.name}</h3>
                                  <p className="text-[9px] font-bold text-slate-500 truncate">{shelter.address}</p>
                                </div>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${isFull ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {isFull ? 'FULL' : 'OPEN'}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest">
                                <span className="text-slate-500">Saturation</span>
                                <span className={isFull ? 'text-red-500' : 'text-blue-600'}>{percent}%</span>
                              </div>
                              <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-700 ${isFull ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${percent}%` }}></div>
                              </div>
                              <div className="flex justify-between text-[8px] font-bold text-gray-300 uppercase tracking-tighter">
                                <span>{shelter.occupancy} Active</span>
                                <span>{shelter.capacity} Limit</span>
                              </div>
                            </div>
                          </div>

                          {(user?.role === 'admin' || (user?.role === 'brgy' && shelter.created_brgy === user?.brgy_name)) && (
                            <div className="flex divide-x divide-gray-100 border-t border-gray-50">
                              <button 
                                className="flex-1 py-2 text-[9px] font-bold text-slate-900 uppercase tracking-widest hover:bg-gray-50"
                                onClick={(e) => { e.stopPropagation(); handleEdit(shelter); }}
                              >Modify</button>
                              <button 
                                className="flex-1 py-2 text-[9px] font-bold text-red-500 uppercase tracking-widest hover:bg-red-50"
                                onClick={(e) => { e.stopPropagation(); if(window.confirm('Purge facility?')) handleDelete(shelter.id!); }}
                              >Purge</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <form className="space-y-3" onSubmit={e => e.preventDefault()}>
               <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden" style={{outline:'1px solid rgba(0,0,0,0.08)'}}>
                  <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">{editId ? 'Modify Intelligence' : 'Node Acquisition'}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    <div className="p-3">
                      <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Facility Name</label>
                      <input required className="w-full text-[11px] font-bold bg-gray-50 border-none outline-none p-2 rounded-lg" name="name" value={form.name} onChange={handleFormChange} />
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-gray-100">
                      <div className="p-3">
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Classification</label>
                        <select className="w-full text-[11px] font-bold uppercase bg-gray-50 border-none outline-none p-2 rounded-lg cursor-pointer" name="category" value={form.category || ''} onChange={handleFormChange}>
                          <option value="">TYPE</option>
                          <option value="School">School</option>
                          <option value="Gym">Gym</option>
                          <option value="Church">Church</option>
                          <option value="Barangay Hall">Hall</option>
                          <option value="Covered Court">Court</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="p-3">
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Status</label>
                        <select className="w-full text-[11px] font-bold uppercase bg-gray-50 border-none outline-none p-2 rounded-lg cursor-pointer" name="status" value={form.status} onChange={handleFormChange}>
                          <option value="available">OPEN</option>
                          <option value="full">FULL</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-gray-100">
                      <div className="p-3">
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Capacity</label>
                        <input type="number" className="w-full text-[11px] font-bold bg-gray-50 border-none outline-none p-2 rounded-lg" name="capacity" value={String(form.capacity)} onChange={handleFormChange} />
                      </div>
                      <div className="p-3">
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Occupancy</label>
                        <input type="number" className="w-full text-[11px] font-bold bg-gray-50 border-none outline-none p-2 rounded-lg" name="occupancy" value={String(form.occupancy)} onChange={handleFormChange} />
                      </div>
                    </div>
                    <div className="p-3">
                      <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Contact Officer</label>
                      <input className="w-full text-[11px] font-bold bg-gray-50 border-none outline-none p-2 rounded-lg" name="contact_person" value={form.contact_person} onChange={handleFormChange} />
                    </div>
                    <div className="p-3">
                      <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Hotline</label>
                      <input className="w-full text-[11px] font-bold bg-gray-50 border-none outline-none p-2 rounded-lg" name="contact_number" value={form.contact_number} onChange={handleFormChange} />
                    </div>
                    {(user?.role === 'admin' || user?.role === 'mmdrmo') && (
                      <div className="p-3">
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Jurisdictional Assignment (Barangay)</label>
                        <select 
                          className="w-full text-[11px] font-bold uppercase bg-gray-50 border-none outline-none p-2 rounded-lg cursor-pointer" 
                          name="created_brgy" 
                          value={form.created_brgy || ''} 
                          onChange={handleFormChange}
                        >
                          <option value="">SELECT BARANGAY</option>
                          {barangays.map(b => (
                            <option key={b.id} value={b.name}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="flex divide-x divide-gray-100 border-t border-gray-100">
                    <button onClick={handleCancel} className="flex-1 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-gray-50">Abort</button>
                    <button onClick={handleSave} className="flex-1 py-3 text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:bg-blue-50">Deploy</button>
                  </div>
               </div>
            </form>
          )}
        </div>
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
                <h3 className="text-slate-500 font-bold text-[12px] tracking-[0.3em] uppercase">Intelligence Summary</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 transition-all hover:border-blue-200">
                  <div className="flex justify-between items-center mb-6">
                    <p className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.2em]">Live Utilization</p>
                    <span className="text-blue-600 font-black text-xl">{Math.min(100, Math.round((selectedShelter.occupancy / selectedShelter.capacity) * 100))}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full mb-6 overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${(selectedShelter.occupancy / selectedShelter.capacity) * 100}%` }} />
                  </div>
                  <p className="text-gray-900 text-3xl font-black tracking-tighter">{selectedShelter.occupancy} <span className="text-gray-300 text-xl font-medium">/ {selectedShelter.capacity}</span></p>
                  <p className="text-gray-500 text-[13px] font-medium mt-2">Active residents currently sheltered</p>
                </div>
                
                <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 transition-all hover:border-emerald-200">
                  <p className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-6">Resource Availability</p>
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
                    <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold mb-2">Officer in Charge</p>
                    <p className="text-gray-900 text-xl font-bold">{selectedShelter.contact_person || 'Station Commander'}</p>
                    <p className="text-gray-400 text-[12px] mt-1">Verified Personnel</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold mb-2">Hotline Connection</p>
                    <p className="text-blue-600 text-2xl font-black tracking-tight">{selectedShelter.contact_number || 'N/A'}</p>
                    <p className="text-gray-400 text-[12px] mt-1">24/7 Operations Line</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                   <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold mb-2">Facility Logistics</p>
                   <div className="flex items-center gap-2">
                     <span className="text-gray-900 font-bold">{selectedShelter.created_by || 'ADMIN'}</span>
                     <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                     <span className="text-gray-500 font-medium">{selectedShelter.created_brgy || 'MAIN_HQ'}</span>
                   </div>
                </div>
                {(selectedShelter as any).category && (
                  <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                    <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold mb-2">Classification</p>
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
      {showToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl border border-white/10 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-3">
            <FaCheckCircle className="text-emerald-500" />
            <span className="text-[12px] font-bold tracking-wider uppercase">{showToast}</span>
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
    {label && <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">{label}</label>}
    <input
      className={`w-full bg-white text-gray-900 border border-gray-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:ring-2 focus:ring-blue-600/20 ${readOnly ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
      name={name} value={value} onChange={onChange} readOnly={readOnly} required={required} type={type}
    />
  </div>
); 