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
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Registered Barangay Coordinators</h1>
          <p className="text-gray-500">Directory of all registered brgy accounts and their locations.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coordinators.length === 0 && (
            <div className="col-span-full text-gray-400 text-center py-12 text-lg">No registered brgy coordinators found.</div>
          )}
          {coordinators.map(coordinator => (
            <div key={coordinator.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 h-full flex flex-col">
              <div className="p-6 flex flex-col h-full">
                {/* Header with status badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <FaUser className="text-blue-600 text-xl" />
                    </div>
                    <div>
                      <div className="font-bold text-lg text-gray-900">{coordinator.coordinator_name}</div>
                      <div className="text-sm text-gray-500">{coordinator.brgy_name} - {coordinator.coordinator_position}</div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                    coordinator.status === 'active' ? 'bg-green-100 text-green-700' :
                    coordinator.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {coordinator.status}
                  </span>
                </div>

                {/* Contact Information */}
                <div className="space-y-3 mb-4 flex-grow">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <FaPhone className="text-gray-400 flex-shrink-0" />
                    <span className="line-clamp-1">{coordinator.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <FaEnvelope className="text-gray-400 flex-shrink-0" />
                    <span className="line-clamp-1">{coordinator.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <FaMapMarkerAlt className="text-gray-400 flex-shrink-0" />
                    <span className="line-clamp-2">{coordinator.address}</span>
                  </div>
                </div>

                {/* Emergency Contact Section - Redesigned */}
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-red-100 p-2 rounded-full">
                      <FaExclamationTriangle className="text-red-500 text-sm" />
                    </div>
                    <span className="text-red-700 font-semibold text-sm">Emergency Contact</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg text-red-800">{coordinator.emergency_contact}</span>
                    <button
                      onClick={() => handleCall(coordinator.emergency_contact)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs font-semibold transition-colors duration-200 flex items-center gap-1"
                    >
                      <FaPhone className="text-xs" /> Call
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
                      className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md transform hover:scale-[1.02]"
                    >
                      <span className="relative">Approve</span>
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(coordinator.id, 'reject')}
                      className="group relative overflow-hidden bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md transform hover:scale-[1.02]"
                    >
                      <span className="relative">Reject</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 mt-auto">
                    <button
                      onClick={() => handleCall(coordinator.phone)}
                      className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md transform hover:scale-[1.02]"
                    >
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
                      <FaPhone className="text-sm relative" />
                      <span className="relative">Call</span>
                    </button>
                    <button
                      onClick={() => handleEmail(coordinator.email)}
                      className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md transform hover:scale-[1.02]"
                    >
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
                      <FaEnvelope className="text-sm relative" />
                      <span className="relative">Email</span>
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
