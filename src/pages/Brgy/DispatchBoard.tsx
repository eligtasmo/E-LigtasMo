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
    <div className="px-4 lg:px-8 py-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><FiShield /> Barangay Dispatch Board</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-2">Run ID</th>
                  <th className="text-left p-2">Team</th>
                  <th className="text-left p-2">Dispatched</th>
                  <th className="text-left p-2">Notes</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r, idx) => (
                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="p-2">{r.run_id || r.id || '-'}</td>
                    <td className="p-2">{r.team_assigned || '-'}</td>
                    <td className="p-2 flex items-center gap-1"><FiClock /> {r.dispatched_at || r.created_at || '-'}</td>
                    <td className="p-2">{r.notes || '-'}</td>
                    <td className="p-2">
                      <button className="text-blue-600 hover:underline" onClick={() => { setSelectedRun(r); setMapOpen(true); }}>View Map</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {mapOpen && selectedRun && (
            <div className="fixed inset-0 z-[999]">
              <div className="absolute inset-0 bg-black/40" onClick={() => setMapOpen(false)} />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[96%] max-w-2xl bg-white rounded-xl border border-gray-200 shadow-2xl">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="text-base font-semibold">Dispatch Destination</div>
                  <button className="text-gray-600 hover:text-gray-900" onClick={() => setMapOpen(false)}>Close</button>
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
