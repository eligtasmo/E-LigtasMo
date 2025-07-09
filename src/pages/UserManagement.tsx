import React, { useEffect, useState } from "react";
import * as XLSX from 'xlsx';
import { FaSearch, FaTimes } from 'react-icons/fa';

interface User {
  id: number;
  username: string;
  full_name: string;
  brgy_name: string;
  city: string;
  province: string;
  email: string;
  contact_number: string;
  role: string;
  status: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'approvals' | 'users'>('approvals');
  const [showToast, setShowToast] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterBrgy, setFilterBrgy] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`http://localhost/eligtasmo/api/list-users.php?status=`, {
        credentials: "include"
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        setError("Invalid JSON from server");
        setLoading(false);
        return;
      }
      if (data.success) {
        setUsers(data.users);
      } else {
        setError(data.message || "Failed to fetch users");
      }
    } catch (err) {
      setError("Server error. Please try again later.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateStatus = async (user_id: number, status: "approved" | "rejected") => {
    setActionLoading(user_id);
    try {
      await fetch("http://localhost/eligtasmo/api/update-user-status.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, status }),
        credentials: "include"
      });
      fetchUsers();
    } catch (err) {
      setError("Failed to update user status.");
    }
    setActionLoading(null);
  };

  // Split users into pending and others
  const pendingUsers = users.filter(u => u.status === "pending");
  const otherUsers = users.filter(u => u.status !== "pending");

  // Get unique barangays, roles, statuses for dropdowns
  const barangays = Array.from(new Set(users.map(u => u.brgy_name).filter(Boolean)));
  const roles = Array.from(new Set(users.map(u => u.role).filter(Boolean)));
  const statuses = Array.from(new Set(users.map(u => u.status).filter(Boolean)));

  // Filtered users
  const filteredUsers = (activeTab === 'approvals' ? pendingUsers : otherUsers).filter(u => {
    const matchesSearch =
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesBrgy = !filterBrgy || u.brgy_name === filterBrgy;
    const matchesRole = !filterRole || u.role === filterRole;
    const matchesStatus = !filterStatus || u.status === filterStatus;
    return matchesSearch && matchesBrgy && matchesRole && matchesStatus;
  });

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>
      {error && <div className="text-error-500 mb-2">{error}</div>}

      {/* Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-6 justify-between">
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded-t-md border-b-2 font-semibold focus:outline-none transition-colors ${activeTab === 'approvals' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 bg-gray-100'}`}
            onClick={() => setActiveTab('approvals')}
          >
            Approvals
          </button>
          <button
            className={`px-4 py-2 rounded-t-md border-b-2 font-semibold focus:outline-none transition-colors ${activeTab === 'users' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 bg-gray-100'}`}
            onClick={() => setActiveTab('users')}
          >
            All Users
          </button>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded shadow text-xs"
            onClick={() => {
              const data = (activeTab === 'users' ? otherUsers : pendingUsers);
              if (data.length === 0) { setShowToast('No users to export.'); return; }
              const csvRows = [];
              const headers = [
                'Username', 'Full Name', 'Barangay', 'City', 'Province', 'Email', 'Contact', 'Role', 'Status'
              ];
              csvRows.push(headers.join(','));
              data.forEach(u => {
                csvRows.push([
                  u.username, u.full_name, u.brgy_name, u.city, u.province, u.email, u.contact_number, u.role, u.status
                ].map(val => `"${val ?? ''}"`).join(','));
              });
              const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement('a');
              link.setAttribute('href', encodedUri);
              link.setAttribute('download', `users_${activeTab}_${new Date().toISOString().slice(0,10)}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              setShowToast(`Exported ${data.length} users as CSV.`);
            }}
            aria-label="Export as CSV"
            title="Export as CSV"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 16v-8m0 8l-4-4m4 4l4-4"/><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
            CSV
          </button>
          <button
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-2 rounded shadow text-xs"
            onClick={() => {
              const data = (activeTab === 'users' ? otherUsers : pendingUsers);
              if (data.length === 0) { setShowToast('No users to export.'); return; }
              const ws = XLSX.utils.json_to_sheet(data.map(u => ({
                Username: u.username,
                'Full Name': u.full_name,
                Barangay: u.brgy_name,
                City: u.city,
                Province: u.province,
                Email: u.email,
                Contact: u.contact_number,
                Role: u.role,
                Status: u.status
              })));
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Users');
              XLSX.writeFile(wb, `users_${activeTab}_${new Date().toISOString().slice(0,10)}.xlsx`);
              setShowToast(`Exported ${data.length} users as Excel.`);
            }}
            aria-label="Export as Excel"
            title="Export as Excel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 16v-8m0 8l-4-4m4 4l4-4"/><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
            Excel
          </button>
        </div>
      </div>
      {showToast && (
        <div className="mb-2 text-xs text-green-700 bg-green-100 rounded px-2 py-1 shadow">{showToast}</div>
      )}

      {/* Search and Filter Bar */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative">
          <input
            type="text"
            className="border rounded-lg px-3 py-2 pl-8 text-sm w-48"
            placeholder="Search user..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          {search && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500" onClick={() => setSearch('')}><FaTimes /></button>
          )}
        </div>
        <select className="border rounded-lg px-3 py-2 text-sm" value={filterBrgy} onChange={e => setFilterBrgy(e.target.value)}>
          <option value="">All Barangays</option>
          {barangays.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">All Roles</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-sm font-semibold"
          onClick={() => { setSearch(''); setFilterBrgy(''); setFilterRole(''); setFilterStatus(''); }}
        >
          Clear Filters
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'approvals' && (
        <section>
          <h2 className="text-xl font-semibold mb-2">Pending Approvals</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Username</th>
                  <th className="p-2 border">Full Name</th>
                  <th className="p-2 border">Barangay</th>
                  <th className="p-2 border">City</th>
                  <th className="p-2 border">Province</th>
                  <th className="p-2 border">Email</th>
                  <th className="p-2 border">Contact</th>
                  <th className="p-2 border">Role</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="text-center p-4">Loading...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={10} className="text-center p-4">No users found.</td></tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="p-2 border">{u.username || "N/A"}</td>
                      <td className="p-2 border">{u.full_name || "N/A"}</td>
                      <td className="p-2 border">{u.brgy_name || "N/A"}</td>
                      <td className="p-2 border">{u.city || "N/A"}</td>
                      <td className="p-2 border">{u.province || "N/A"}</td>
                      <td className="p-2 border">{u.email || "N/A"}</td>
                      <td className="p-2 border">{u.contact_number || "N/A"}</td>
                      <td className="p-2 border">{u.role || "N/A"}</td>
                      <td className="p-2 border capitalize">{u.status || "N/A"}</td>
                      <td className="p-2 border">
                        <button
                          className="px-2 py-1 bg-green-500 text-white rounded mr-2 disabled:opacity-50"
                          disabled={actionLoading === u.id}
                          onClick={() => updateStatus(u.id, "approved")}
                        >
                          {actionLoading === u.id ? "..." : "Approve"}
                        </button>
                        <button
                          className="px-2 py-1 bg-red-500 text-white rounded disabled:opacity-50"
                          disabled={actionLoading === u.id}
                          onClick={() => updateStatus(u.id, "rejected")}
                        >
                          {actionLoading === u.id ? "..." : "Reject"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'users' && (
        <section>
          <h2 className="text-xl font-semibold mb-2">All Users</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Username</th>
                  <th className="p-2 border">Full Name</th>
                  <th className="p-2 border">Barangay</th>
                  <th className="p-2 border">City</th>
                  <th className="p-2 border">Province</th>
                  <th className="p-2 border">Email</th>
                  <th className="p-2 border">Contact</th>
                  <th className="p-2 border">Role</th>
                  <th className="p-2 border">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center p-4">Loading...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={9} className="text-center p-4">No users found.</td></tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="p-2 border">{u.username || "N/A"}</td>
                      <td className="p-2 border">{u.full_name || "N/A"}</td>
                      <td className="p-2 border">{u.brgy_name || "N/A"}</td>
                      <td className="p-2 border">{u.city || "N/A"}</td>
                      <td className="p-2 border">{u.province || "N/A"}</td>
                      <td className="p-2 border">{u.email || "N/A"}</td>
                      <td className="p-2 border">{u.contact_number || "N/A"}</td>
                      <td className="p-2 border">{u.role || "N/A"}</td>
                      <td className="p-2 border capitalize">{u.status || "N/A"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default UserManagement; 