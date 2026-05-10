import { useState, useEffect, useRef } from "react";
import MapboxMap, { Marker, Popup, NavigationControl, FullscreenControl, Source, Layer } from "../maps/MapboxMap";
import { SANTA_CRUZ_OUTLINE } from '../../constants/geo';
import { useAuth } from '../../context/AuthContext';
import { FaMapMarkerAlt, FaUser, FaPhoneAlt, FaHome, FaUsers, FaEdit, FaPlus, FaTimes, FaSearch, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import TacticalMarker from "../maps/TacticalMarker";
import { SantaCruzMapboxOutline } from "../maps/SantaCruzOutline";
import { useGlobalMapContext } from '../../context/MapContext';

import { apiFetch } from "../../utils/api";

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN) as string | undefined;

interface Barangay {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address: string;
  contact?: string;
  type?: string;
  head?: string;
  notes?: string;
  added_by?: string;
  updated_by?: string;
  added_at?: string;
}

const SANTA_CRUZ_BOUNDS: [[number, number], [number, number]] = [
  [121.35, 14.20], // Southwest [lng, lat]
  [121.50, 14.35]  // Northeast [lng, lat]
];

export default function BarangayMapView() {
  const { user } = useAuth();
  const [brgys, setBarangays] = useState<Barangay[]>([]);
  const [addingBrgy, setAddingBrgy] = useState(false);
  const [editingBrgy, setEditingBrgy] = useState<Barangay | null>(null);
  const [newBrgy, setNewBrgy] = useState<{lat: number, lng: number} | null>(null);
  const [brgyForm, setBrgyForm] = useState({ name: '', contact: '', type: 'Hall' });
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const mapRef = useRef<any>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { viewport: viewState, setViewport: setViewState, updateViewport } = useGlobalMapContext();

  const fetchBarangays = async () => {
    try {
      const res = await apiFetch('list-barangays.php');
      const data = await res.json();
      if (data.success) setBarangays(data.brgys || []);
      else setBarangays([]);
    } catch { setBarangays([]); }
  };
  useEffect(() => { fetchBarangays(); }, []);

  // Center map on user's brgy when available
  useEffect(() => {
    if (user?.brgy_name && brgys.length > 0) {
      const match = brgys.find(b => (b.name || '').toLowerCase() === (user.brgy_name || '').toLowerCase());
      if (match) {
        updateViewport({
          latitude: Number(match.lat),
          longitude: Number(match.lng),
          zoom: 14
        });
      }
    }
  }, [brgys, user?.brgy_name]);

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
    updateViewport({ latitude: lat, longitude: lng, zoom: 17 });
    if (addingBrgy) {
      setNewBrgy({ lat, lng });
    }
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleMapClick = (e: any) => {
    if (user && (user.role === 'admin' || user.role === 'brgy') && addingBrgy) {
      const { lng, lat } = e.lngLat;
      setNewBrgy({ lat, lng });
    }
  };

  const handleBrgyFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrgy && !editingBrgy) return;
    try {
      const payload = {
        ...brgyForm,
        address: 'Santa Cruz, Laguna', // Default address since field is removed
        head: '',
        notes: '',
        ...((newBrgy && { lat: newBrgy.lat, lng: newBrgy.lng }) || (editingBrgy && { lat: editingBrgy.lat, lng: editingBrgy.lng })),
        id: editingBrgy?.id,
      };
      const endpoint = editingBrgy ? 'update-barangay.php' : 'add-barangay.php';
      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setAddingBrgy(false);
        setNewBrgy(null);
        setEditingBrgy(null);
        setBrgyForm({ name: '', contact: '', type: 'Hall' });
        fetchBarangays();
        alert(editingBrgy ? 'Barangay updated!' : 'Barangay added!');
      } else {
        alert('Failed to save: ' + (data.error || 'Unauthorized'));
      }
    } catch {
      alert('Network error');
    }
  };

  const handleDeleteBrgy = async (id: number) => {
    try {
      const res = await apiFetch('delete-barangay.php', {
        method: 'POST',
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        fetchBarangays();
        setSelectedBrgy(null);
        setIsViewingDetails(false);
      } else {
        alert('Deletion failed: ' + (data.error || 'Unauthorized'));
      }
    } catch {
      alert('Network error');
    }
  };

  const [selectedBrgy, setSelectedBrgy] = useState<Barangay | null>(null);

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-gray-50 font-jetbrains">
      {/* Map Section */}
      <div className="flex-1 relative min-h-[400px] lg:h-full z-0 overflow-hidden">
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

        <MapboxMap
          {...viewState}
          onMove={(evt: any) => setViewState(evt.viewState)}
          mapStyle="mapbox://styles/mapbox/light-v11"
          pitch={0}
          bearing={0}
          mapboxAccessToken={MAPBOX_TOKEN}
          onClick={handleMapClick}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-right" />
          <FullscreenControl position="top-right" />
          
          {/* Santa Cruz Outline */}
          <SantaCruzMapboxOutline />
          
          {/* Barangay Markers */}
          {brgys.map((brgy) => (
            <TacticalMarker
              key={brgy.id}
              latitude={Number(brgy.lat)}
              longitude={Number(brgy.lng)}
              type={brgy.type || 'brgy'}
              onClick={e => {
                e.originalEvent.stopPropagation();
                setSelectedBrgy(brgy);
              }}
            />
          ))}

          {/* Popups */}
          {selectedBrgy && (
              <Popup
              className="tactical-bubble-popup"
              latitude={Number(selectedBrgy.lat)}
              longitude={Number(selectedBrgy.lng)}
              onClose={() => setSelectedBrgy(null)}
              closeButton={true}
              anchor="bottom"
              offset={[0, -32]}
            >
              <div className="w-[180px] font-jetbrains">
                <div className="w-full h-24 bg-gray-100 rounded-lg mb-3 overflow-hidden shadow-sm">
                   <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80" alt="Location Preview" className="w-full h-full object-cover" />
                </div>
                <strong className="text-[13px] block mb-1 text-gray-900 leading-tight">{selectedBrgy.name}</strong>
                {selectedBrgy.type && <div className="text-[10px] text-gray-500 font-black tracking-wide uppercase">{selectedBrgy.type}</div>}
                <div className="text-[10px] text-gray-400 mt-1 leading-tight">{selectedBrgy.address}</div>
                {selectedBrgy.contact && <div className="text-[10px] text-gray-600 mt-3 pt-2 border-t border-gray-100">TEL: <span className="font-bold text-blue-600">{selectedBrgy.contact}</span></div>}
                <div className="text-[9px] text-blue-600 mt-3 border-t border-gray-100 pt-2 tracking-widest font-black uppercase">
                   COORD: {Number(selectedBrgy.lat).toFixed(4)}, {Number(selectedBrgy.lng).toFixed(4)}
                </div>
              </div>
            </Popup>
          )}

          {/* New brgy marker preview */}
          {newBrgy && (
            <TacticalMarker
              latitude={newBrgy.lat}
              longitude={newBrgy.lng}
              type="hazard"
            />
          )}
        </MapboxMap>
      </div>

      {/* Floating Panel Section */}
      <div className="tactical-panel p-5 animate-in slide-in-from-right duration-500" style={{outline:'1px solid rgba(0,0,0,0.08)',background:'#f8fafc'}}>
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20">
              <FaMapMarkerAlt className="text-white text-xs" />
            </div>
            <h2 className="text-slate-900 font-bold text-[13px] tracking-tight">Barangay Assets</h2>
          </div>
        </div>

        <div className="space-y-3 custom-scrollbar overflow-y-auto pr-1">
          {(!addingBrgy && !editingBrgy) ? (
            <>
              {user && (user.role === 'admin' || user.role === 'brgy') && (
                <button
                  className="w-full font-bold py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700 active:scale-95"
                  onClick={() => { setAddingBrgy(true); setEditingBrgy(null); setNewBrgy(null); }}
                >
                  <FaPlus size={10} /> Add New Asset
                </button>
              )}

              <div className="space-y-2">
                <div className="px-1 pt-2">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Deployed Assets</span>
                </div>
                {brgys.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest italic">No assets registered</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {brgys.map((brgy) => (
                      <div
                        key={brgy.id}
                        className={`bg-white rounded-2xl border transition-all cursor-pointer overflow-hidden ${selectedBrgy?.id === brgy.id ? 'border-blue-600 shadow-lg' : 'border-gray-200 hover:border-gray-300 shadow-sm'}`}
                        onClick={() => {
                          setSelectedBrgy(brgy);
                          updateViewport({ latitude: Number(brgy.lat), longitude: Number(brgy.lng), zoom: 15 });
                        }}
                      >
                        <div className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
                              <FaHome className="text-sm" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-[12px] font-bold text-slate-900 uppercase tracking-tight truncate">{brgy.name}</h3>
                              <p className="text-[9px] font-bold text-slate-500 truncate">{brgy.address}</p>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600">
                              {brgy.type || 'Hall'}
                            </span>
                          </div>
                          
                          {brgy.contact && (
                            <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest">
                              <span className="text-slate-500">Comms:</span>
                              <span className="text-slate-900">{brgy.contact}</span>
                            </div>
                          )}
                        </div>

                        {(user?.role === 'admin' || (user?.role === 'brgy' && brgy.added_by === user?.username)) && (
                          <div className="flex divide-x divide-gray-100 border-t border-gray-50">
                            <button 
                              className="flex-1 py-2 text-[9px] font-bold text-slate-900 uppercase tracking-widest hover:bg-gray-50"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setEditingBrgy(brgy); 
                                setBrgyForm({ name: brgy.name, contact: brgy.contact || '', type: brgy.type || 'Hall' }); 
                              }}
                            >Modify</button>
                            <button 
                              className="flex-1 py-2 text-[9px] font-bold text-red-500 uppercase tracking-widest hover:bg-red-50"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                if(window.confirm('Purge asset?')) handleDeleteBrgy(brgy.id!); 
                              }}
                            >Purge</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <form className="space-y-3" onSubmit={handleBrgyFormSubmit}>
               {addingBrgy && !newBrgy && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-[10px] font-bold text-blue-600 uppercase tracking-widest animate-pulse">
                  Awaiting Map selection...
                </div>
               )}
               <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden" style={{outline:'1px solid rgba(0,0,0,0.08)'}}>
                  <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">{editingBrgy ? 'Modify Asset' : 'Node Acquisition'}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    <div className="p-3">
                      <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Asset Name</label>
                      <input required className="w-full text-[11px] font-bold bg-gray-50 border-none outline-none p-2 rounded-lg" name="name" value={brgyForm.name} onChange={e => setBrgyForm(f => ({...f, name: e.target.value}))} />
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-gray-100">
                      <div className="p-3">
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Classification</label>
                        <select className="w-full text-[11px] font-bold uppercase bg-gray-50 border-none outline-none p-2 rounded-lg cursor-pointer" name="type" value={brgyForm.type} onChange={e => setBrgyForm(f => ({...f, type: e.target.value}))}>
                          <option value="Hall">Hall</option>
                          <option value="Outpost">Outpost</option>
                          <option value="Evacuation Center">Evacuation Center</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="p-3">
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Comms Line</label>
                        <input className="w-full text-[11px] font-bold bg-gray-50 border-none outline-none p-2 rounded-lg" name="contact" value={brgyForm.contact} onChange={e => setBrgyForm(f => ({...f, contact: e.target.value}))} />
                      </div>
                    </div>
                  </div>
                  <div className="flex divide-x divide-gray-100 border-t border-gray-100">
                    <button type="button" onClick={() => { setAddingBrgy(false); setEditingBrgy(null); setNewBrgy(null); setBrgyForm({ name: '', contact: '', type: 'Hall' }); }} className="flex-1 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-gray-50">Abort</button>
                    <button type="submit" className="flex-1 py-3 text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:bg-blue-50">Deploy</button>
                  </div>
               </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
