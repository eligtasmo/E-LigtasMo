import PageMeta from "../../components/common/PageMeta";
import { Link } from "react-router-dom";
import { useState } from "react";
import { FaExclamationTriangle, FaCheckCircle, FaUsers, FaMapMarkerAlt, FaPlus, FaBullhorn, FaHome } from "react-icons/fa";

const BrgyHome = () => {
  // Placeholder data
  const [metrics] = useState({
    activeIncidents: 3,
    pendingApprovals: 2,
    shelterCapacity: "120/200",
  });
  const [recentIncidents] = useState([
    { id: 1, type: "Flood", status: "Pending", date: "2024-06-01" },
    { id: 2, type: "Fire", status: "Active", date: "2024-05-30" },
    { id: 3, type: "Landslide", status: "Resolved", date: "2024-05-28" },
  ]);
  const [announcements] = useState([
    { id: 1, message: "Flood alert in Zone 2!", date: "2024-06-01" },
    { id: 2, message: "Barangay meeting at 5pm.", date: "2024-05-30" },
  ]);
  const [shelters] = useState([
    { id: 1, name: "Barangay Hall Shelter", capacity: 100, occupancy: 75, status: "Available" },
    { id: 2, name: "Covered Court Shelter", capacity: 80, occupancy: 80, status: "Full" },
  ]);

  return (
    <>
      <PageMeta
        title="Welcome - E-LigtasMo"
        description="Barangay dashboard for updates, reports, and notifications."
      />
      <div className="px-4 py-6 md:px-8">
        <h1 className="text-2xl font-semibold mb-2">Welcome to E-LigtasMo</h1>
        <div className="mb-4 text-gray-600">Barangay dashboard for updates, reports, and notifications.</div>
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
            <FaExclamationTriangle className="text-yellow-500 text-2xl" />
            <div>
              <div className="text-lg font-bold">{metrics.activeIncidents}</div>
              <div className="text-xs text-gray-500">Active Incidents</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
            <FaCheckCircle className="text-blue-500 text-2xl" />
            <div>
              <div className="text-lg font-bold">{metrics.pendingApprovals}</div>
              <div className="text-xs text-gray-500">Pending Approvals</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
            <FaHome className="text-green-500 text-2xl" />
            <div>
              <div className="text-lg font-bold">{metrics.shelterCapacity}</div>
              <div className="text-xs text-gray-500">Shelter Capacity</div>
            </div>
          </div>
        </div>
        {/* Quick Actions */}
        <div className="mb-6 flex flex-wrap gap-4">
          <Link to="/barangay/report-incident" className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold shadow transition">
            <FaExclamationTriangle /> Report Incident
          </Link>
          <Link to="/barangay/shelters" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow transition">
            <FaHome /> Add Shelter
          </Link>
          <Link to="/barangay/announcements" className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold shadow transition">
            <FaBullhorn /> Send Announcement
          </Link>
        </div>
        {/* Emergency Contacts Quick Access */}
        <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-red-800">🚨 Emergency Contacts</h3>
              <p className="text-red-700 text-sm">Quick access to critical emergency numbers</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.open('tel:911', '_self')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Call 911
              </button>
              <button
                onClick={() => window.open('tel:143', '_self')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Red Cross 143
              </button>
              <button
                onClick={() => window.open('tel:136', '_self')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                MMDA 136
              </button>
            </div>
          </div>
        </div>
        {/* Recent Incidents */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Recent Incident Reports</h2>
          <div className="bg-white rounded-lg shadow divide-y">
            {recentIncidents.map((incident) => (
              <div key={incident.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <FaExclamationTriangle className="text-yellow-500" />
                  <div>
                    <div className="font-semibold">{incident.type}</div>
                    <div className="text-xs text-gray-400">{incident.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${incident.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : incident.status === 'Active' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{incident.status}</span>
                  <Link to={`/barangay/incident/${incident.id}`} className="text-blue-600 hover:underline text-xs font-semibold">View</Link>
                  {incident.status === 'Pending' && (
                    <button className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded px-2 py-1 font-semibold">Approve</button>
                  )}
                  {incident.status === 'Active' && (
                    <button className="text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded px-2 py-1 font-semibold">Mark Resolved</button>
                  )}
                </div>
              </div>
            ))}
            {recentIncidents.length === 0 && (
              <div className="px-4 py-6 text-gray-400 text-center">No recent incidents.</div>
            )}
          </div>
        </div>
        {/* Shelter Overview */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Shelter Overview</h2>
          <div className="bg-white rounded-lg shadow divide-y">
            {shelters.map((shelter) => (
              <div key={shelter.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-semibold">{shelter.name}</div>
                  <div className="text-xs text-gray-400">{shelter.occupancy}/{shelter.capacity} Occupied</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${shelter.status === 'Full' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{shelter.status}</span>
                  <Link to={`/barangay/shelters/${shelter.id}`} className="text-blue-600 hover:underline text-xs font-semibold">Edit</Link>
                </div>
              </div>
            ))}
            {shelters.length === 0 && (
              <div className="px-4 py-6 text-gray-400 text-center">No shelters found.</div>
            )}
          </div>
        </div>
        {/* Announcements */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Recent Announcements</h2>
          <div className="bg-white rounded-lg shadow divide-y">
            {announcements.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-semibold">{a.message}</div>
                  <div className="text-xs text-gray-400">{a.date}</div>
                </div>
                <Link to="/barangay/announcements" className="text-blue-600 hover:underline text-xs font-semibold">View</Link>
              </div>
            ))}
            {announcements.length === 0 && (
              <div className="px-4 py-6 text-gray-400 text-center">No announcements yet.</div>
            )}
          </div>
        </div>
        {/* Existing grid links */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Link
            to="/barangay/emergency-contacts"
            className="block rounded-lg bg-red-100 p-4 text-red-800 hover:bg-red-200"
          >
            📞 Emergency Contacts
          </Link>
          <Link
            to="/barangay/report-incident"
            className="block rounded-lg bg-yellow-100 p-4 text-yellow-800 hover:bg-yellow-200"
          >
            🚨 Report Incident
          </Link>
          <Link
            to="/barangay/shelters"
            className="block rounded-lg bg-blue-100 p-4 text-blue-800 hover:bg-blue-200"
          >
            🏠 Shelter Management
          </Link>
        </div>
      </div>
    </>
  );
};

export default BrgyHome;
