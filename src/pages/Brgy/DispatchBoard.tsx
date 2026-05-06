import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { FiShield, FiClock } from 'react-icons/fi';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const BrgyDispatchBoard: React.FC = () => {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [searchParams] = useSearchParams();

  const loadRuns = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('list-sop-runs.php');
      const data = await res.json();
      setRuns(Array.isArray(data) ? data : data?.runs || data?.sop_runs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  useEffect(() => {
    const ridParam = searchParams.get('runId');
    if (!ridParam) return;
    const ridNum = Number(ridParam);
    if (!Number.isFinite(ridNum)) return;
    const found = runs.find((r) => Number(r.run_id ?? r.id) === ridNum);
    if (found) {
      setSelectedRun(found);
      setMapOpen(true);
    }
  }, [runs, searchParams]);

  return (
    <div className="px-4 lg:px-8 py-8 font-jetbrains">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <div className="bg-emerald-600 text-white rounded-xl p-2.5">
            <FiShield className="text-sm" />
          </div>
          Barangay Dispatch Board
        </h2>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 tracking-wide uppercase">Run ID</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 tracking-wide uppercase">Team Assigned</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 tracking-wide uppercase">Dispatched At</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 tracking-wide uppercase">Operational Notes</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 tracking-wide uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r, idx) => (
                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 font-mono text-xs">{r.run_id || r.id || '-'}</td>
                    <td className="px-4 py-4 font-bold text-gray-900">{r.team_assigned || '-'}</td>
                    <td className="px-4 py-4 flex items-center gap-2 text-gray-500"><FiClock className="text-emerald-500" /> {r.dispatched_at || r.created_at || '-'}</td>
                    <td className="px-4 py-4 text-gray-600 italic font-medium">{r.notes || '-'}</td>
                    <td className="px-4 py-4 text-right">
                      <button 
                        className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-sm shadow-blue-900/10"
                        onClick={() => { setSelectedRun(r); setMapOpen(true); }}
                      >
                        View Map
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {mapOpen && selectedRun && (
            <div className="fixed inset-0 z-[999]">
              <div className="absolute inset-0 bg-black/40" onClick={() => setMapOpen(false)} />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[96%] max-w-2xl bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <div className="text-lg font-bold tracking-tight">Dispatch Destination</div>
                  <button className="text-gray-400 hover:text-gray-900 p-2" onClick={() => setMapOpen(false)}>
                    <FiClock className="rotate-45" />
                  </button>
                </div>
                <div className="p-4">
                  {selectedRun.destination_lat && selectedRun.destination_lng ? (
                    <div className="h-80 rounded-lg overflow-hidden border">
                      <MapContainer center={[Number(selectedRun.destination_lat), Number(selectedRun.destination_lng)]} zoom={15} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap contributors &copy; CARTO" />
                        <Marker position={[Number(selectedRun.destination_lat), Number(selectedRun.destination_lng)]} />
                      </MapContainer>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">No destination set for this run.</div>
                  )}
                </div>
                {selectedRun.destination_lat && selectedRun.destination_lng && (
                  <div className="p-3 border-t border-gray-200 flex items-center justify-between text-xs">
                    <span>{Number(selectedRun.destination_lat).toFixed(6)}, {Number(selectedRun.destination_lng).toFixed(6)}</span>
                    <button className="px-2 py-1 rounded border border-gray-300" onClick={async () => {
                      try { await navigator.clipboard.writeText(`${Number(selectedRun.destination_lat).toFixed(6)}, ${Number(selectedRun.destination_lng).toFixed(6)}`); } catch {}
                    }}>Copy</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BrgyDispatchBoard;
