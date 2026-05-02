import { useState, useEffect, useRef } from "react";
import MapboxMap, { Marker, Popup, NavigationControl, FullscreenControl } from "../maps/MapboxMap";
import { useAuth } from '../../context/AuthContext';
import { FaMapMarkerAlt, FaUser, FaPhoneAlt, FaHome, FaUsers, FaEdit, FaPlus, FaTimes } from 'react-icons/fa';
import TacticalMarker from "../maps/TacticalMarker";
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
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [addingBrgy, setAddingBrgy] = useState(false);
  const [editingBrgy, setEditingBrgy] = useState<Barangay | null>(null);
  const [newBrgy, setNewBrgy] = useState<{lat: number, lng: number} | null>(null);
  const [brgyForm, setBrgyForm] = useState({ name: '', contact: '', type: 'Hall' });
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const mapRef = useRef<any>(null);

  const { viewport: viewState, setViewport: setViewState } = useGlobalMapContext();

  const fetchBarangays = async () => {
    try {
      const res = await apiFetch('list-barangays.php');
      const data = await res.json();
      if (data.success) setBarangays(data.barangays || []);
      else setBarangays([]);
    } catch { setBarangays([]); }
  };
  useEffect(() => { fetchBarangays(); }, []);

  // Center map on user's barangay when available
  useEffect(() => {
    if (user?.brgy_name && barangays.length > 0) {
      const match = barangays.find(b => (b.name || '').toLowerCase() === (user.brgy_name || '').toLowerCase());
      if (match) {
        setViewState(prev => ({
          ...prev,
          latitude: Number(match.lat),
          longitude: Number(match.lng),
          zoom: 14
        }));
      }
    }
  }, [barangays, user?.brgy_name]);

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
    <div className="flex h-full w-full overflow-hidden bg-[#0a0a0a] font-mono">
      {/* Map Section */}
      <div className="flex-1 relative h-full z-0 overflow-hidden">
        <MapboxMap
          {...viewState}
          onMove={(evt: any) => setViewState(evt.viewState)}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          mapboxAccessToken={MAPBOX_TOKEN}
          onClick={handleMapClick}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-right" />
          <FullscreenControl position="top-right" />
          
          {/* Barangay Markers */}
          {barangays.map((brgy) => (
            <TacticalMarker
              key={brgy.id}
              latitude={Number(brgy.lat)}
              longitude={Number(brgy.lng)}
              type={brgy.type || 'barangay'}
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
              <div className="w-[180px] font-mono">
                <div className="w-full h-24 bg-gray-100 rounded-lg mb-3 overflow-hidden shadow-sm">
                   <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80" alt="Location Preview" className="w-full h-full object-cover" />
                </div>
                <strong className="text-[13px] block mb-1 text-gray-900 leading-tight">{selectedBrgy.name}</strong>
                {selectedBrgy.type && <div className="text-[10px] text-gray-500 font-bold tracking-wide uppercase">{selectedBrgy.type}</div>}
                <div className="text-[10px] text-gray-400 mt-1 leading-tight">{selectedBrgy.address}</div>
                {selectedBrgy.contact && <div className="text-[10px] text-gray-600 mt-3 pt-2 border-t border-gray-100">TEL: <span className="font-semibold text-gray-900">{selectedBrgy.contact}</span></div>}
                {selectedBrgy.head && <div className="text-[10px] text-gray-600 mt-0.5">HEAD: <span className="font-semibold text-gray-900">{selectedBrgy.head}</span></div>}
                <div className="text-[9px] text-[#f59e0b] mt-3 border-t border-gray-100 pt-2 tracking-widest font-bold">
                   LAT: {Number(selectedBrgy.lat).toFixed(6)}<br />
                   LNG: {Number(selectedBrgy.lng).toFixed(6)}
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

      {/* Right Panel Section */}
      <div className="w-[420px] h-full bg-[#1c1c1e] p-6 border-l border-white/5 flex flex-col z-20 shadow-2xl overflow-y-auto custom-scrollbar font-mono shrink-0 animate-in slide-in-from-right duration-500">
        <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-[#f59e0b] font-bold text-xl tracking-wider">BARANGAY_MAP</h2>
              <p className="text-[#8e8e93] text-[12px] mt-0.5 tracking-widest uppercase">Location_Operations</p>
            </div>
            {user && (user.role === 'admin' || user.role === 'brgy') && !addingBrgy && !editingBrgy && (
                <div className="w-10 h-10 rounded-xl bg-[#2c2c2e] border border-white/5 flex items-center justify-center cursor-pointer hover:bg-[#3a3a3c] transition-all hover:scale-105" onClick={() => setAddingBrgy(true)} title="Add Pin">
                    <FaPlus className="text-[#f59e0b] text-sm" />
                </div>
            )}
        </div>
        
        {/* Persistent instruction if no pins */}
        {barangays.length === 0 && !addingBrgy && !editingBrgy && (
          <div className="bg-[#2c2c2e] rounded-2xl border border-[#3a3a3c] p-6 mb-6">
            <div className="mb-2 text-[10px] text-[#8e8e93] font-black uppercase tracking-[0.2em]">Asset_Inventory</div>
            <div className="text-white text-[13px] leading-relaxed">
              No tactical assets deployed. Initiate pin placement to establish monitoring zones.
            </div>
            {user && (user.role === 'admin' || user.role === 'brgy') && (
              <button
                type="button"
                className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-black py-3 rounded-xl transition-all mt-6 text-[11px] tracking-[0.2em] uppercase shadow-lg shadow-amber-950/20"
                onClick={() => setAddingBrgy(true)}
              >
                INITIALIZE_PIN
              </button>
            )}
          </div>
        )}
        {/* Add/Edit Form */}
        {(addingBrgy || editingBrgy) && (
          <div className="bg-[#2c2c2e] rounded-2xl border border-white/5 overflow-hidden mb-6 animate-in zoom-in-95 duration-300">
            <div className="p-4 border-b border-white/5 bg-[#1c1c1e]">
              <h3 className="font-black text-[11px] tracking-[0.2em] uppercase text-white flex items-center gap-3">
                <div className="bg-amber-500/10 p-2 rounded-lg">
                  {editingBrgy ? <FaEdit className="text-[#f59e0b]" /> : <FaPlus className="text-[#f59e0b]" />} 
                </div>
                {editingBrgy ? 'Modify_Deployment' : 'New_Asset_Deployment'}
              </h3>
            </div>
            {addingBrgy && !newBrgy && (
              <div className="p-6">
                <div className="mb-2 text-[10px] text-[#8e8e93] font-black uppercase tracking-[0.2em]">Target_Acquisition</div>
                <div className="text-[#f59e0b] font-black text-[14px] mb-2 animate-pulse">Awaiting map selection...</div>
                <div className="text-gray-400 mb-6 text-[12px] leading-relaxed">Engage the map viewport to pinpoint the strategic location of the new asset.</div>
                <button
                  type="button"
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-black py-3 rounded-xl transition-all text-[11px] tracking-[0.2em] uppercase border border-white/10"
                  onClick={() => { setAddingBrgy(false); setNewBrgy(null); setBrgyForm({ name: '', contact: '', type: 'Hall' }); }}
                >
                  ABORT_DEPLOYMENT
                </button>
              </div>
            )}
            {(newBrgy || editingBrgy) && (
              <form onSubmit={handleBrgyFormSubmit} className="flex flex-col">
                <div className="p-4 border-b border-white/5">
                  <label className="block text-[10px] font-black text-[#8e8e93] uppercase tracking-[0.2em] mb-2">Identifier_Name</label>
                  <input required placeholder="Enter asset name..." className="w-full bg-[#1c1c1e] text-white border border-white/5 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-amber-500/50 transition-colors" value={brgyForm.name} onChange={e => setBrgyForm(f => ({...f, name: e.target.value}))} />
                </div>
                <div className="grid grid-cols-2 divide-x divide-white/5 border-b border-white/5">
                  <div className="p-4">
                    <label className="block text-[10px] font-black text-[#8e8e93] uppercase tracking-[0.2em] mb-2">Asset_Type</label>
                    <select className="w-full bg-[#1c1c1e] text-white border border-white/5 rounded-xl px-3 py-3 text-[12px] outline-none cursor-pointer focus:border-amber-500/50 transition-colors" value={brgyForm.type} onChange={e => setBrgyForm(f => ({...f, type: e.target.value}))}>
                      <option>Hall</option>
                      <option>Outpost</option>
                      <option>Evacuation Center</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="p-4">
                    <label className="block text-[10px] font-black text-[#8e8e93] uppercase tracking-[0.2em] mb-2">Comms_Line</label>
                    <input placeholder="Phone / Radio" className="w-full bg-[#1c1c1e] text-white border border-white/5 rounded-xl px-4 py-3 text-[12px] outline-none focus:border-amber-500/50 transition-colors" value={brgyForm.contact} onChange={e => setBrgyForm(f => ({...f, contact: e.target.value}))} />
                  </div>
                </div>
                <div className="flex divide-x divide-white/5 bg-[#1c1c1e]">
                  <button type="button" className="flex-1 py-4 text-[#8e8e93] hover:text-white hover:bg-white/5 transition-all text-[11px] font-black uppercase tracking-[0.2em]" onClick={() => { setAddingBrgy(false); setEditingBrgy(null); setNewBrgy(null); setBrgyForm({ name: '', contact: '', type: 'Hall' }); }}>Cancel</button>
                  <button type="submit" className="flex-1 py-4 text-[#34c759] hover:bg-emerald-500/10 transition-all text-[11px] font-black uppercase tracking-[0.2em]">{editingBrgy ? 'Update_Data' : 'Confirm_Pin'}</button>
                </div>
              </form>
            )}
          </div>
        )}
        {/* Barangay List or Detail View */}
        <div className="flex-1 overflow-y-auto pt-2 custom-scrollbar pr-1">
          {selectedBrgy && isViewingDetails ? (
            <div className="flex flex-col animate-in slide-in-from-right duration-300">
              {/* Back Header */}
              <button 
                onClick={() => setIsViewingDetails(false)}
                className="flex items-center gap-2 text-[#8e8e93] hover:text-white transition-colors mb-6 group"
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-white/10">
                  <FaPlus className="rotate-45 text-[10px]" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Exit_Focus_Mode</span>
              </button>

              {/* Detail Header */}
              <div className="relative h-48 rounded-2xl overflow-hidden mb-6 border border-white/5">
                <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80" alt="Barangay" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1e] to-transparent"></div>
                <div className="absolute bottom-4 left-4">
                  <span className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest border border-amber-500/30 mb-2 inline-block">
                    {selectedBrgy.type || 'HALL'}
                  </span>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none">{selectedBrgy.name}</h3>
                </div>
              </div>

              {/* Data Matrix */}
              <div className="space-y-4">
                <div className="bg-[#2c2c2e] rounded-2xl border border-white/5 p-4">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[#1c1c1e] border border-white/5 flex items-center justify-center">
                        <FaMapMarkerAlt className="text-amber-500" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-[#8e8e93] uppercase tracking-[0.2em]">Tactical_Location</div>
                        <div className="text-white text-[13px] font-medium leading-tight mt-0.5">{selectedBrgy.address}</div>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                      <div>
                        <div className="text-[10px] font-black text-[#8e8e93] uppercase tracking-[0.2em]">Latitude</div>
                        <div className="text-white text-[13px] font-mono mt-1">{Number(selectedBrgy.lat).toFixed(6)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-[#8e8e93] uppercase tracking-[0.2em]">Longitude</div>
                        <div className="text-white text-[13px] font-mono mt-1">{Number(selectedBrgy.lng).toFixed(6)}</div>
                      </div>
                   </div>
                </div>

                <div className="bg-[#2c2c2e] rounded-2xl border border-white/5 p-4">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[#1c1c1e] border border-white/5 flex items-center justify-center">
                        <FaPhoneAlt className="text-amber-500" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-[#8e8e93] uppercase tracking-[0.2em]">Comms_Channel</div>
                        <div className="text-white text-[13px] font-medium leading-tight mt-0.5">{selectedBrgy.contact || 'SECURE_LINE_PENDING'}</div>
                      </div>
                   </div>
                </div>

                <div className="bg-[#2c2c2e] rounded-2xl border border-white/5 p-4">
                   <div className="text-[10px] font-black text-[#8e8e93] uppercase tracking-[0.2em] mb-3">Operational_Meta</div>
                   <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="text-[11px] text-white/60 font-bold uppercase tracking-wider">Asset_ID</span>
                        <span className="text-[11px] text-white font-mono bg-white/5 px-2 py-0.5 rounded">BRGY-{selectedBrgy.id}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="text-[11px] text-white/60 font-bold uppercase tracking-wider">Added_By</span>
                        <span className="text-[11px] text-white uppercase tracking-tight">{selectedBrgy.added_by || 'SYS_INIT'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-[11px] text-white/60 font-bold uppercase tracking-wider">Deployed</span>
                        <span className="text-[11px] text-white">{selectedBrgy.created_at || 'T-MINUS_UNKNOWN'}</span>
                      </div>
                   </div>
                </div>

                {user && (user.role === 'admin' || (user.role === 'brgy' && user.brgy_name === selectedBrgy.name)) && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setEditingBrgy(selectedBrgy); setBrgyForm({ name: selectedBrgy.name, contact: selectedBrgy.contact || '', type: selectedBrgy.type || 'Hall' }); setIsViewingDetails(false); }}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all"
                    >
                      EDIT_TACTICAL_DATA
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to decommission the tactical asset: ${selectedBrgy.name}?`)) {
                          handleDeleteBrgy(selectedBrgy.id);
                        }
                      }}
                      className="w-12 h-12 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl flex items-center justify-center transition-all"
                    >
                      <FaPlus className="rotate-45" />
                    </button>
                  </div>
                )}
                
                {/* Audit Trail */}
                <div className="mt-8 pt-6 border-t border-white/5">
                   <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[9px] uppercase tracking-[0.2em]">
                         <span className="text-[#8e8e93]">Registered_By</span>
                         <span className="text-white">{selectedBrgy.added_by || 'ARCHIVAL'}</span>
                      </div>
                      {selectedBrgy.updated_by && (
                        <div className="flex justify-between items-center text-[9px] uppercase tracking-[0.2em]">
                           <span className="text-[#8e8e93]">Last_Update_By</span>
                           <span className="text-amber-500">{selectedBrgy.updated_by}</span>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-[1px] flex-1 bg-white/5"></div>
                <span className="text-[10px] font-black text-[#3a3a3c] uppercase tracking-[0.3em]">Deployed_Assets</span>
                <div className="h-[1px] flex-1 bg-white/5"></div>
              </div>
              {barangays.length === 0 ? (
                <div className="text-[#8e8e93] text-[12px] font-medium text-center py-10 italic">No assets registered in the database.</div>
              ) : (
                <ul className="space-y-3">
                  {barangays.map(brgy => (
                    <li key={brgy.id} className="group rounded-2xl flex flex-col bg-[#2c2c2e] border border-white/5 hover:border-amber-500/30 transition-all overflow-hidden shadow-xl">
                      <div className="p-4">
                        <div className="flex items-center gap-4 w-full cursor-pointer" onClick={() => {
                          setSelectedBrgy(brgy);
                          setIsViewingDetails(true);
                          setViewState(prev => ({ ...prev, latitude: Number(brgy.lat), longitude: Number(brgy.lng), zoom: 15, transitionDuration: 1200 }));
                        }}>
                          <div className="w-12 h-12 rounded-xl bg-[#1c1c1e] border border-white/5 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                            <FaHome className="text-[#f59e0b] text-xl" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-black text-[14px] text-white tracking-wide truncate uppercase">{brgy.name}</h3>
                            <p className="text-[#8e8e93] text-[11px] mt-1 truncate font-medium">{brgy.address}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center px-4 py-2 bg-[#1c1c1e]/50 text-[9px] text-[#8e8e93] font-black uppercase tracking-widest border-t border-white/5">
                        <div className="truncate pr-2">Comms: <span className="text-white ml-1">{brgy.contact || 'N/A'}</span></div>
                        <div className="truncate text-amber-500/70">{brgy.type || 'HALL'}</div>
                      </div>
                      <div className="flex bg-[#1c1c1e]">
                        <button className="flex-1 py-3 flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white transition-all text-[10px] font-black uppercase tracking-[0.2em]" onClick={() => { 
                          setSelectedBrgy(brgy);
                          setIsViewingDetails(true);
                          setViewState(prev => ({ ...prev, latitude: Number(brgy.lat), longitude: Number(brgy.lng), zoom: 15, transitionDuration: 1200 }));
                        }}>
                          <FaEdit className="text-[#f59e0b]" /> View_Tactical_Data
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
