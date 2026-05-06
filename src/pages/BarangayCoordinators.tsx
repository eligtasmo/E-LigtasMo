import React, { useState, useEffect } from 'react';
import PageMeta from "../components/common/PageMeta";
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaUser, FaSearch, FaFilter, FaExclamationTriangle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

interface BarangayAccount {
  brgy_id: number;
  brgy_name: string;
  lat: number;
  lng: number;
  address: string;
  contact: string;
  user_id: number | null;
  username: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
}

// Mapped interface for display
interface DisplayCoordinator {
  id: number;
  brgy_name: string;
  coordinator_name: string;
  coordinator_position: string;
  phone: string;
  email: string;
  address: string;
  status: 'active' | 'inactive' | 'pending' | 'rejected';
  emergency_contact: string;
  responsibilities: string[];
  last_updated: string;
}

const BarangayCoordinators: React.FC = () => {
  const { user } = useAuth();
  const [coordinators, setCoordinators] = useState<DisplayCoordinator[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await apiFetch('list-brgy-accounts.php');
      const data = await response.json();
      if (data.success && Array.isArray(data.brgys)) {
        // Filter only those with valid users if we only want "registered accounts"
        // User said "visible all the account of the registered brgy accounts".
        // So we filter where user_id is not null.
        const accounts = data.brgys
          .filter((b: BarangayAccount) => b.user_id !== null)
          .map((b: BarangayAccount) => ({
            id: b.user_id!,
            brgy_name: b.brgy_name,
            coordinator_name: b.username || 'Unknown',
            coordinator_position: 'Barangay Official', // Default
            phone: b.contact || 'N/A',
            email: b.email || 'N/A',
            address: b.address || `Lat: ${b.lat}, Lng: ${b.lng}`,
            status: (b.status || 'inactive').toLowerCase() as any,
            emergency_contact: b.contact || '911',
            responsibilities: ['Emergency Response', 'Community Coordination'],
            last_updated: new Date().toISOString()
          }));
        setCoordinators(accounts);
      }
    } catch (error) {
      console.error("Failed to fetch brgy accounts", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusUpdate = async (userId: number, action: 'approve' | 'reject') => {
    if (!confirm(`Are you sure you want to ${action} this account?`)) return;
    try {
      const res = await apiFetch('approve-brgy-account.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchData(); // Refresh list
      } else {
        alert(data.message || 'Action failed');
      }
    } catch (e) {
      alert('Error connecting to server');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  const handleCall = (phone: string) => {
    if (phone && phone !== 'N/A') window.open(`tel:${phone}`, '_self');
  };

  const handleEmail = (email: string) => {
    if (email && email !== 'N/A') window.open(`mailto:${email}`, '_self');
  };

  return (
    <>
      <PageMeta
        title="Barangay Coordinators | E-LigtasMo"
        description="Directory of registered brgy coordinators."
      />
      <div className="w-full font-jetbrains">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">
            Sector <span className="text-blue-600">Coordinators</span>
          </h1>
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest opacity-70">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-2 animate-pulse" />
            Registry_Database_Active • 24/7_Communication_Link
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coordinators.length === 0 && (
            <div className="col-span-full text-gray-400 text-center py-12 text-lg">No registered brgy coordinators found.</div>
          )}
          {coordinators.map(coordinator => (
            <div key={coordinator.id} className="tactical-container bg-white hover:shadow-xl transition-all duration-300 h-full flex flex-col group border-gray-100">
              <div className="p-6 flex flex-col h-full">
                {/* Header with status badge */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20 group-hover:bg-blue-600 transition-colors">
                      <FaUser className="text-white text-xl" />
                    </div>
                    <div>
                      <div className="font-black text-[13px] text-slate-900 uppercase tracking-tight leading-none mb-1.5">{coordinator.coordinator_name}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{coordinator.brgy_name}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                    coordinator.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    coordinator.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    'bg-red-50 text-red-600 border-red-100'
                  }`}>
                    {coordinator.status}
                  </span>
                </div>

                {/* Contact Information */}
                <div className="space-y-3 mb-6 flex-grow">
                  <div className="flex items-center gap-3 text-[11px] font-black text-slate-600 uppercase tracking-tighter">
                    <FaPhone className="text-blue-600 flex-shrink-0 text-[10px]" />
                    <span className="truncate">{coordinator.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-black text-slate-600 uppercase tracking-tighter">
                    <FaEnvelope className="text-blue-600 flex-shrink-0 text-[10px]" />
                    <span className="truncate">{coordinator.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-black text-slate-400 uppercase tracking-tighter opacity-80">
                    <FaMapMarkerAlt className="text-slate-300 flex-shrink-0 text-[10px]" />
                    <span className="line-clamp-2">{coordinator.address}</span>
                  </div>
                </div>

                {/* Emergency Contact Section - Redesigned */}
                <div className="bg-slate-900 rounded-xl p-4 mb-6 border border-white/5 shadow-xl shadow-slate-900/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-white font-black text-[9px] uppercase tracking-[0.2em]">Priority_Line</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-lg text-white tracking-tighter tabular-nums">{coordinator.emergency_contact}</span>
                    <button
                      onClick={() => handleCall(coordinator.emergency_contact)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-200 shadow-lg shadow-red-600/20"
                    >
                      Establish_Link
                    </button>
                  </div>
                </div>

                {/* Responsibilities */}
                <div className="mb-4">
                  <div className="font-semibold text-sm text-gray-700 mb-2">Responsibilities:</div>
                  <div className="flex flex-wrap gap-2">
                    {coordinator.responsibilities.map((resp, idx) => (
                      <span key={idx} className="bg-blue-50 text-blue-700 rounded-lg px-3 py-1 text-xs font-medium border border-blue-200">
                        {resp}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                {coordinator.status === 'pending' ? (
                  <div className="grid grid-cols-2 gap-3 mt-auto">
                    <button
                      onClick={() => handleStatusUpdate(coordinator.id, 'approve')}
                      className="tactical-btn-primary"
                    >
                      Authorize
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(coordinator.id, 'reject')}
                      className="tactical-btn-secondary bg-red-50 hover:bg-red-600 hover:text-white border-red-100 hover:border-red-600"
                    >
                      Decline
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 mt-auto">
                    <button
                      onClick={() => handleCall(coordinator.phone)}
                      className="tactical-btn-primary"
                    >
                      <FaPhone className="text-[10px]" />
                      Voice_Link
                    </button>
                    <button
                      onClick={() => handleEmail(coordinator.email)}
                      className="tactical-btn-secondary"
                    >
                      <FaEnvelope className="text-[10px]" />
                      Comm_Relay
                    </button>
                  </div>
                )}
                
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default BarangayCoordinators;
