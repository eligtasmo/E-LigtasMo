import { useState, useEffect, useRef } from "react";
import MapboxMap, { Marker, Popup, NavigationControl, FullscreenControl, Source, Layer } from "../maps/MapboxMap";
import { SANTA_CRUZ_OUTLINE } from '../../constants/geo';
import { useAuth } from '../../context/AuthContext';
import { FaMapMarkerAlt, FaUser, FaPhoneAlt, FaHome, FaUsers, FaEdit, FaPlus, FaTimes } from 'react-icons/fa';
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

  const { viewport: viewState, setViewport: setViewState, updateViewport } = useGlobalMapContext();

  const fetchBarangays = async () => {
    try {
      const res = await apiFetch('list-brgys.php');
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
      const endpoint = editingBrgy ? 'update-brgy.php' : 'add-brgy.php';
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
      const res = await apiFetch('delete-brgy.php', {
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

      {/* Right Panel Section */}
      <div className="w-full lg:w-[400px] h-[500px] lg:h-full bg-gray-50 p-6 border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] overflow-y-auto custom-scrollbar font-jetbrains shrink-0 animate-in slide-in-from-right duration-500">
        <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-[#f59e0b] font-bold text-xl tracking-tight">Barangay Assets</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
                <span className="text-[10px] text-gray-400 tracking-tight font-bold">Tactical Oversight</span>
              </div>
            </div>
            {user && (user.role === 'admin' || user.role === 'brgy') && !addingBrgy && !editingBrgy && (
                <button 
                  className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95" 
                  onClick={() => setAddingBrgy(true)}
                >
                    <FaPlus className="text-white text-sm" />
                </button>
            )}
        </div>
        
        {/* Persistent instruction if no pins */}
        {brgys.length === 0 && !addingBrgy && !editingBrgy && (
          <div className="bg-gray-50 rounded-3xl border border-gray-200 p-6 mb-6 shadow-sm">
            <div className="mb-2 text-[8px] text-gray-400 font-black uppercase tracking-[0.2em]">Asset Inventory</div>
            <p className="text-gray-600 text-xs font-bold leading-relaxed">
              No tactical assets deployed. Initiate pin placement to establish monitoring zones.
            </p>
            {user && (user.role === 'admin' || user.role === 'brgy') && (
              <button
                type="button"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all mt-6 text-[10px] tracking-widest uppercase shadow-xl shadow-blue-500/20"
                onClick={() => setAddingBrgy(true)}
              >
                Initialize Pin
              </button>
            )}
          </div>
        )}

        {/* Add/Edit Form */}
        {(addingBrgy || editingBrgy) && (
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden mb-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-black text-[10px] tracking-widest text-gray-900 uppercase flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
                  {editingBrgy ? <FaEdit className="text-white" /> : <FaPlus className="text-white" />} 
                </div>
                {editingBrgy ? 'Modify_Deployment' : 'New_Deployment'}
              </h3>
            </div>
            {addingBrgy && !newBrgy && (
              <div className="p-6">
                <div className="mb-2 text-[8px] text-blue-600 font-black tracking-widest uppercase">Target Acquisition</div>
                <div className="text-gray-900 font-black text-sm mb-2 animate-pulse uppercase">Awaiting map selection...</div>
                <p className="text-gray-500 mb-6 text-[11px] leading-relaxed font-bold">Engage the map viewport to pinpoint the strategic location of the new asset.</p>
                <button
                  type="button"
                  className="w-full bg-gray-50 hover:bg-gray-100 text-gray-500 font-black py-4 rounded-2xl transition-all text-[10px] tracking-widest uppercase border border-gray-200"
                  onClick={() => { setAddingBrgy(false); setNewBrgy(null); setBrgyForm({ name: '', contact: '', type: 'Hall' }); }}
                >
                  Abort Deployment
                </button>
              </div>
            )}
            {(newBrgy || editingBrgy) && (
              <form onSubmit={handleBrgyFormSubmit} className="flex flex-col">
                <div className="p-4 border-b border-gray-50">
                  <label className="block text-[8px] font-black text-gray-400 tracking-widest uppercase mb-2">Identifier Name</label>
                  <input required placeholder="Enter asset name..." className="w-full bg-gray-50 text-gray-900 border border-gray-100 rounded-xl px-4 py-3.5 text-xs font-bold outline-none focus:border-blue-500/50 transition-colors" value={brgyForm.name} onChange={e => setBrgyForm(f => ({...f, name: e.target.value}))} />
                </div>
                <div className="grid grid-cols-2 divide-x divide-gray-50 border-b border-gray-50">
                  <div className="p-4">
                    <label className="block text-[8px] font-black text-gray-400 tracking-widest uppercase mb-2">Asset Type</label>
                    <select className="w-full bg-gray-50 text-gray-900 border border-gray-100 rounded-xl px-3 py-3.5 text-[10px] font-black uppercase outline-none cursor-pointer focus:border-blue-500/50 transition-colors" value={brgyForm.type} onChange={e => setBrgyForm(f => ({...f, type: e.target.value}))}>
                      <option>Hall</option>
                      <option>Outpost</option>
                      <option>Evacuation Center</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="p-4">
                    <label className="block text-[8px] font-black text-gray-400 tracking-widest uppercase mb-2">Comms Line</label>
                    <input placeholder="Phone / Radio" className="w-full bg-gray-50 text-gray-900 border border-gray-100 rounded-xl px-4 py-3.5 text-xs font-bold outline-none focus:border-blue-500/50 transition-colors" value={brgyForm.contact} onChange={e => setBrgyForm(f => ({...f, contact: e.target.value}))} />
                  </div>
                </div>
                <div className="flex divide-x divide-gray-100 bg-gray-50">
                  <button type="button" className="flex-1 py-5 text-gray-400 hover:text-gray-900 hover:bg-white transition-all text-[10px] font-black uppercase tracking-widest" onClick={() => { setAddingBrgy(false); setEditingBrgy(null); setNewBrgy(null); setBrgyForm({ name: '', contact: '', type: 'Hall' }); }}>Cancel</button>
                  <button type="submit" className="flex-1 py-5 text-blue-600 hover:bg-blue-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">{editingBrgy ? 'Update_Data' : 'Confirm_Pin'}</button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Barangay List or Detail View */}
        <div className="flex-1 overflow-y-auto pt-2 custom-scrollbar">
          {selectedBrgy && isViewingDetails ? (
            <div className="flex flex-col animate-in slide-in-from-right duration-300">
              {/* Back Header */}
              <button 
                onClick={() => setIsViewingDetails(false)}
                className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors mb-6 group"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center group-hover:bg-gray-100">
                  <FaPlus className="rotate-45 text-[10px]" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Exit_Focus_Mode</span>
              </button>

              {/* Detail Header */}
              <div className="relative h-48 rounded-3xl overflow-hidden mb-6 border border-gray-100 shadow-xl">
                <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80" alt="Barangay" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
                <div className="absolute bottom-5 left-5">
                  <span className="px-2 py-1 rounded-lg bg-blue-600 text-white text-[8px] font-black tracking-widest uppercase mb-2 inline-block shadow-lg shadow-blue-500/20">
                    {selectedBrgy.type || 'Hall'}
                  </span>
                  <h3 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">{selectedBrgy.name}</h3>
                </div>
              </div>

              {/* Data Matrix */}
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-3xl border border-gray-100 p-5 shadow-sm">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                        <FaMapMarkerAlt className="text-blue-600 text-xl" />
                      </div>
                      <div>
                        <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Tactical Location</div>
                        <div className="text-gray-900 text-sm font-bold leading-tight mt-0.5">{selectedBrgy.address}</div>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4 pt-5 border-t border-gray-200/50">
                      <div>
                        <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Latitude</div>
                        <div className="text-blue-600 text-xs font-black mt-1 uppercase">{Number(selectedBrgy.lat).toFixed(6)}</div>
                      </div>
                      <div>
                        <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Longitude</div>
                        <div className="text-blue-600 text-xs font-black mt-1 uppercase">{Number(selectedBrgy.lng).toFixed(6)}</div>
                      </div>
                   </div>
                </div>

                <div className="bg-gray-50 rounded-3xl border border-gray-100 p-5 shadow-sm">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                        <FaPhoneAlt className="text-blue-600 text-lg" />
                      </div>
                      <div>
                        <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Comms Channel</div>
                        <div className="text-gray-900 text-sm font-black mt-0.5">{selectedBrgy.contact || 'Secure line pending'}</div>
                      </div>
                   </div>
                </div>

                {user && (user.role === 'admin' || (user.role === 'brgy' && user.brgy_name === selectedBrgy.name)) && (
                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => { setEditingBrgy(selectedBrgy); setBrgyForm({ name: selectedBrgy.name, contact: selectedBrgy.contact || '', type: selectedBrgy.type || 'Hall' }); setIsViewingDetails(false); }}
                      className="flex-1 bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all shadow-xl"
                    >
                      Modify Tactical Data
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to decommission the tactical asset: ${selectedBrgy.name}?`)) {
                          handleDeleteBrgy(selectedBrgy.id);
                        }
                      }}
                      className="w-14 h-14 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-2xl flex items-center justify-center transition-all shadow-sm"
                    >
                      <FaPlus className="rotate-45" />
                    </button>
                  </div>
                )}
                
                {/* Audit Trail */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                   <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center text-[9px] tracking-widest uppercase font-black">
                         <span className="text-gray-400">Registered By</span>
                         <span className="text-gray-900">{selectedBrgy.added_by || 'Archival'}</span>
                      </div>
                      {selectedBrgy.updated_by && (
                        <div className="flex justify-between items-center text-[9px] tracking-widest uppercase font-black">
                           <span className="text-gray-400">Last Update By</span>
                           <span className="text-blue-600">{selectedBrgy.updated_by}</span>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-[1px] flex-1 bg-gray-100"></div>
                <span className="text-[10px] font-black text-gray-400 tracking-[0.3em] uppercase">Deployed Assets</span>
                <div className="h-[1px] flex-1 bg-gray-100"></div>
              </div>
              {brgys.length === 0 ? (
                <div className="text-gray-400 text-xs font-bold text-center py-10 italic">No assets registered in the database.</div>
              ) : (
                <div className="space-y-4">
                  {brgys.map(brgy => (
                    <div 
                      key={brgy.id} 
                      className="group rounded-3xl flex flex-col bg-white border border-gray-100 hover:border-blue-600/30 transition-all overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 duration-300"
                    >
                      <div className="p-5">
                        <div className="flex items-center gap-5 w-full cursor-pointer" onClick={() => {
                          setSelectedBrgy(brgy);
                          setIsViewingDetails(true);
                          updateViewport({ latitude: Number(brgy.lat), longitude: Number(brgy.lng), zoom: 15 });
                        }}>
                          <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                            <FaHome className="text-blue-600 text-2xl" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-black text-sm text-gray-900 tracking-tight uppercase truncate">{brgy.name}</h3>
                            <p className="text-gray-500 text-[11px] mt-1 truncate font-bold">{brgy.address}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center px-5 py-3 bg-gray-50/50 text-[9px] text-gray-400 font-black tracking-widest uppercase border-t border-gray-50">
                        <div className="truncate pr-2">Comms: <span className="text-gray-900 ml-1">{brgy.contact || 'N/A'}</span></div>
                        <div className="truncate text-blue-600">{brgy.type || 'Hall'}</div>
                      </div>
                      <button 
                        className="w-full py-4 flex items-center justify-center gap-3 bg-white hover:bg-blue-600 hover:text-white text-gray-900 transition-all text-[10px] font-black uppercase tracking-widest border-t border-gray-50" 
                        onClick={() => { 
                          setSelectedBrgy(brgy);
                          setIsViewingDetails(true);
                          updateViewport({ latitude: Number(brgy.lat), longitude: Number(brgy.lng), zoom: 15 });
                        }}
                      >
                        <FaEdit className="group-hover:text-white" /> View Tactical Data
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
