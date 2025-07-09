import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaMapMarkerAlt, FaUser, FaClock, FaInfoCircle, FaPhone } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface Incident {
  id: number;
  type: string;
  lat: number;
  lng: number;
  address: string;
  datetime: string;
  description: string;
  severity: string;
  photo_url?: string;
  reporter: string;
  contact: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Resolved';
  rejection_reason?: string;
  created_at: string;
}

const TABS = [
  { key: 'Pending', label: 'Pending' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Rejected', label: 'Rejected' },
];

export default function IncidentModerationView() {
  const [tab, setTab] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; incidentId: number | null }>({ open: false, incidentId: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost/eligtasmo/api/list-incidents.php?status=${tab}`);
      const data = await res.json();
      if (data.success) {
        setIncidents(data.incidents || []);
      } else {
        setIncidents([]);
      }
    } catch (err) {
      setIncidents([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIncidents();
    // eslint-disable-next-line
  }, [tab]);

  const handleApprove = async (id: number) => {
    setActionLoading(true);
    try {
      const res = await fetch('http://localhost/eligtasmo/api/update-incident-status.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'Approved' })
      });
      const data = await res.json();
      if (data.success) fetchIncidents();
    } catch {}
    setActionLoading(false);
  };

  const handleReject = async (id: number, reason: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('http://localhost/eligtasmo/api/update-incident-status.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'Rejected', rejectionReason: reason })
      });
      const data = await res.json();
      if (data.success) fetchIncidents();
    } catch {}
    setActionLoading(false);
    setRejectModal({ open: false, incidentId: null });
    setRejectionReason('');
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><FaInfoCircle className="text-blue-500" /> Incident Moderation</h2>
      <div className="flex gap-2 mb-4">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`px-4 py-1.5 rounded font-semibold transition text-base ${tab === t.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-100'}`}
            onClick={() => setTab(t.key as 'Pending' | 'Approved' | 'Rejected')}
            disabled={actionLoading}
          >
            {t.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : incidents.length === 0 ? (
        <div className="text-center text-gray-400">No incidents in this category.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {incidents.map(incident => (
            <div key={incident.id} className="shadow rounded-lg p-4 bg-white border border-gray-100">
              {/* Header Row */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <FaInfoCircle className="text-blue-400" />
                  <span className="font-bold text-lg text-gray-800">{incident.type}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${incident.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : incident.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{incident.status}</span>
                </div>
                <span className="text-xs text-gray-500 font-medium">{new Date(incident.datetime).toLocaleString()}</span>
              </div>
              {/* Description */}
              <div className="text-gray-700 text-base mb-2">{incident.description}</div>
              {/* Info Bar */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 bg-gray-50 rounded px-3 py-1 mb-2">
                <span className="flex items-center gap-1"><FaUser /> {incident.reporter}</span>
                <span className="flex items-center gap-1"><FaMapMarkerAlt /> {incident.lat.toFixed(5)}, {incident.lng.toFixed(5)}</span>
                <span className="flex items-center gap-1"><FaPhone /> {incident.contact}</span>
              </div>
              {/* Image */}
              {incident.photo_url && (
                <div className="mb-2">
                  <img src={incident.photo_url} alt="Incident" className="w-full max-h-40 object-cover rounded border border-gray-200" />
                </div>
              )}
              {/* Map */}
              <div className="mb-2 rounded-lg overflow-hidden border border-gray-200" style={{ height: 180 }}>
                <MapContainer center={[incident.lat, incident.lng]} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false} dragging={false} doubleClickZoom={false} zoomControl={false} attributionControl={false}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[incident.lat, incident.lng]} />
                </MapContainer>
              </div>
              {/* Rejection Reason */}
              {incident.status === 'Rejected' && incident.rejection_reason && (
                <div className="text-sm text-red-700 bg-red-50 rounded p-2 mb-2">Reason: {incident.rejection_reason}</div>
              )}
              {/* Button Bar */}
              {incident.status === 'Pending' && (
                <div className="flex gap-2 justify-end mt-2">
                  <button className="flex-1 max-w-[140px] flex items-center justify-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded transition" onClick={() => handleApprove(incident.id)} disabled={actionLoading}><FaCheck /> Approve</button>
                  <button className="flex-1 max-w-[140px] flex items-center justify-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded transition" onClick={() => setRejectModal({ open: true, incidentId: incident.id })} disabled={actionLoading}><FaTimes /> Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h4 className="font-bold text-lg mb-2">Reject Incident</h4>
            <textarea className="w-full border rounded p-2 mb-4" rows={3} placeholder="Reason for rejection..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300" onClick={() => setRejectModal({ open: false, incidentId: null })}>Cancel</button>
              <button className="px-4 py-2 rounded bg-red-600 text-white font-semibold hover:bg-red-700" onClick={() => {
                if (rejectModal.incidentId !== null) handleReject(rejectModal.incidentId, rejectionReason);
              }} disabled={!rejectionReason.trim() || actionLoading}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 