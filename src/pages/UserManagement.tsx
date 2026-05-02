import React, { useEffect, useState } from "react";
import * as XLSX from 'xlsx';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { useAuth } from "../context/AuthContext";

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

interface BrgyAccountRow {
  barangay_id: number;
  barangay_name: string;
  lat: any;
  lng: any;
  address: string;
  contact: string | null;
  user_id: number | null;
  username: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
}

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const isBrgy = user?.role === 'brgy';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  
  // Initialize activeTab based on role
  // Both admins and brgy officials can see approvals (officials only see their own residents)
  const [activeTab, setActiveTab] = useState<'approvals' | 'users' | 'brgyAccounts'>(
    'approvals'
  );
  
  const [showToast, setShowToast] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterBrgy, setFilterBrgy] = useState(isBrgy ? (user?.brgy_name || '') : '');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [brgyAccounts, setBrgyAccounts] = useState<BrgyAccountRow[]>([]);
  const [brgyLoading, setBrgyLoading] = useState(false);
  const [brgyError, setBrgyError] = useState("");

  // Ensure activeTab is correct. Brgy can access approvals now.
  useEffect(() => {
    if (isBrgy && activeTab === 'brgyAccounts') {
      setActiveTab('users');
    }
  }, [isBrgy, activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const brgyParam = isBrgy ? (user?.brgy_name || '') : filterBrgy;
      const res = await fetch(`/api/list-users.php?status=${filterStatus}&brgy=${encodeURIComponent(brgyParam)}`, {
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

  const fetchBrgyAccounts = async () => {
    if (isBrgy) return; // Don't fetch for barangay users
    setBrgyLoading(true);
    setBrgyError("");
    try {
      const res = await fetch(`/api/list-brgy-accounts.php`, {
        credentials: "include"
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        setBrgyError("Invalid JSON from server");
        setBrgyLoading(false);
        return;
      }
      if (data.success && Array.isArray(data.barangays)) {
        setBrgyAccounts(data.barangays);
      } else {
        setBrgyError(data.message || "Failed to fetch barangay accounts");
      }
    } catch (err) {
      setBrgyError("Server error. Please try again later.");
    }
    setBrgyLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [activeTab, filterBrgy, filterStatus]); // Refetch when filters change

  useEffect(() => {
    if (activeTab === 'brgyAccounts' && brgyAccounts.length === 0 && !brgyLoading && !isBrgy) {
      fetchBrgyAccounts();
    }
  }, [activeTab, isBrgy]);

  const updateStatus = async (user_id: number, status: "approved" | "rejected") => {
    setActionLoading(user_id);
    try {
      await fetch("/api/update-user-status.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, status }),
        credentials: "include"
      });
      fetchUsers();
      if (activeTab === 'brgyAccounts') {
        fetchBrgyAccounts();
      }
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
    <div className="w-full">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-600 mt-1">Manage user accounts{isBrgy ? '' : ' and approvals'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Last 24 Hours
            </button>
          </div>
        </div>
      {error && <div className="text-error-500 mb-2">{error}</div>}

        {/* Tab Bar */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex gap-2">
                <button
                  className={`px-4 py-2 rounded-lg font-medium text-sm focus:outline-none transition-all duration-200 ${activeTab === 'approvals' ? 'bg-[#1E3A8A] text-white shadow-lg shadow-blue-900/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => setActiveTab('approvals')}
                >
                  Approvals {pendingUsers.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">{pendingUsers.length}</span>}
                </button>

              <button
                className={`px-4 py-2 rounded-lg font-medium text-sm focus:outline-none transition-all duration-200 ${activeTab === 'users' ? 'bg-[#1E3A8A] text-white shadow-lg shadow-blue-900/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                onClick={() => setActiveTab('users')}
              >
                All Users
              </button>
              {!isBrgy && (
                <button
                  className={`px-4 py-2 rounded-lg font-medium text-sm focus:outline-none transition-all duration-200 ${activeTab === 'brgyAccounts' ? 'bg-[#1E3A8A] text-white shadow-lg shadow-blue-900/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => setActiveTab('brgyAccounts')}
                >
                  Barangay Accounts
                </button>
              )}
            </div>
            {activeTab !== 'brgyAccounts' && (
              <div className="flex gap-2">
                <button
                  className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-2 rounded-lg text-xs transition-colors"
                  onClick={() => {
                    const data = (activeTab === 'users' ? otherUsers : pendingUsers);
                    if (data.length === 0) { setShowToast('No users to export.'); return; }
                    const csvRows = [];
                    // Conditional headers based on role
                    const headers = isBrgy 
                      ? ['Username', 'Full Name', 'Barangay', 'City', 'Province', 'Email', 'Contact']
                      : ['Username', 'Full Name', 'Barangay', 'City', 'Province', 'Email', 'Contact', 'Role', 'Status'];
                    
                    csvRows.push(headers.join(','));
                    data.forEach(u => {
                      const row = isBrgy 
                        ? [u.username, u.full_name, u.brgy_name, u.city, u.province, u.email, u.contact_number]
                        : [u.username, u.full_name, u.brgy_name, u.city, u.province, u.email, u.contact_number, u.role, u.status];
                      
                      csvRows.push(row.map(val => `"${val ?? ''}"`).join(','));
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
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-2 rounded-lg text-xs transition-colors"
                  onClick={() => {
                    const data = (activeTab === 'users' ? otherUsers : pendingUsers);
                    if (data.length === 0) { setShowToast('No users to export.'); return; }
                    const ws = XLSX.utils.json_to_sheet(data.map(u => {
                      const row: any = {
                        Username: u.username,
                        'Full Name': u.full_name,
                        Barangay: u.brgy_name,
                        City: u.city,
                        Province: u.province,
                        Email: u.email,
                        Contact: u.contact_number,
                      };
                      if (!isBrgy) {
                        row.Role = u.role;
                        row.Status = u.status;
                      }
                      return row;
                    }));
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
                {!isBrgy && (
                  <button
                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-3 py-2 rounded-lg text-xs transition-colors"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/invites-generate.php", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ role: 'brgy' }),
                          credentials: "include"
                        });
                        const data = await res.json();
                        if (data.success) {
                          const link = `http://localhost:5173/brgy-signin?mode=brgy&invite=${data.code}`;
                          navigator.clipboard.writeText(link);
                          setShowToast(`Invite link copied to clipboard!`);
                        } else {
                          setShowToast(`Error: ${data.message}`);
                        }
                      } catch (e) {
                        setShowToast("Failed to generate invite.");
                      }
                    }}
                    title="Generate One-Time Invite Link"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                    Invite
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {showToast && (
          <div className="mb-4 text-xs text-green-700 bg-green-100 rounded-lg px-3 py-2">{showToast}</div>
        )}

        {activeTab !== 'brgyAccounts' && (
          <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow mb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <input
                  type="text"
                  className="border border-gray-300 rounded-lg px-3 py-2 pl-8 text-sm w-48 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search user..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                {search && (
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500" onClick={() => setSearch('')}><FaTimes /></button>
                )}
              </div>
              <select 
                className={`border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isBrgy ? 'bg-gray-50 opacity-70' : ''}`} 
                value={filterBrgy} 
                onChange={e => !isBrgy && setFilterBrgy(e.target.value)}
                disabled={isBrgy}
              >
                <option value="">{isBrgy ? filterBrgy : 'All Barangays'}</option>
                {!isBrgy && barangays.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              {!isBrgy && (
                <>
                  <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                    <option value="">All Roles</option>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </>
              )}
              <button
                className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium border border-gray-300 transition-colors"
                onClick={() => { setSearch(''); setFilterBrgy(''); setFilterRole(''); setFilterStatus(''); }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'approvals' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300">
            <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-[#0A192F]">Pending Approvals</h2>
                <p className="text-xs text-gray-500">Accounts waiting for validation from {isBrgy ? user?.brgy_name : 'all barangays'}.</p>
              </div>
              <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                {filteredUsers.length} total
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
              <thead className="bg-[#0A192F] text-white">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider">Resident Details</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider">Barangay</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider">Location</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider">Contact Info</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={5} className="text-center p-8"><div className="flex flex-col items-center gap-2"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div><span className="text-gray-500">Loading residents...</span></div></td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={5} className="text-center p-8 text-gray-400 italic font-light">No pending approvals found for this criteria.</td></tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{u.full_name || "Anonymous"}</span>
                            <span className="text-xs text-gray-500 tracking-tight">@{u.username}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-[11px] font-medium border border-gray-200">{u.brgy_name || "N/A"}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-xs text-gray-600">
                            <div>{u.city}</div>
                            <div className="text-[10px] text-gray-400">{u.province}</div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-0.5">
                             <a href={`mailto:${u.email}`} className="text-blue-600 hover:underline flex items-center gap-1">{u.email}</a>
                             <span className="text-xs text-gray-500 underline decoration-dotted capitalize">{u.contact_number}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-center gap-2">
                             <button 
                               onClick={() => updateStatus(u.id, 'approved')}
                               disabled={actionLoading === u.id}
                               className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-md shadow-green-900/10"
                             >
                               {actionLoading === u.id ? '...' : 'Approve'}
                             </button>
                             <button 
                               onClick={() => updateStatus(u.id, 'rejected')}
                               disabled={actionLoading === u.id}
                               className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-md shadow-red-900/10"
                             >
                               {actionLoading === u.id ? '...' : 'Reject'}
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300">
            <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-[#0A192F]">Registered Residents</h2>
                <p className="text-xs text-gray-500">Listing all validated accounts in {isBrgy ? user?.brgy_name : 'the system'}.</p>
              </div>
              <div className="flex gap-2">
                 <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full border border-gray-200">
                   {filteredUsers.length} total
                 </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#0A192F] text-white">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider">User Profile</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider">Barangay</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-center">Contact</th>
                    {!isBrgy && <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-center">Role</th>}
                    {!isBrgy && <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-center">Status</th>}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={isBrgy ? 3 : 5} className="text-center p-8"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={isBrgy ? 3 : 5} className="text-center p-8 text-gray-400 italic">No users found.</td></tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-blue-300/10 transition-colors group">
                        <td className="px-5 py-4">
                           <div className="flex flex-col">
                              <span className="font-bold text-gray-900 group-hover:text-[#1E3A8A] transition-colors">{u.full_name || "N/A"}</span>
                              <span className="text-[11px] text-gray-500">@{u.username}</span>
                           </div>
                        </td>
                        <td className="px-5 py-4">
                           <div className="text-xs font-medium text-gray-800 bg-gray-50 px-2 py-1 rounded inline-block border border-gray-200">
                             {u.brgy_name || "N/A"}
                           </div>
                        </td>
                        <td className="px-5 py-4">
                           <div className="flex flex-col items-center gap-0.5 text-xs">
                             <span className="font-semibold text-gray-700">{u.contact_number}</span>
                             <span className="text-[10px] text-gray-400 break-all">{u.email}</span>
                           </div>
                        </td>
                        {!isBrgy && (
                          <td className="px-5 py-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {u.role || "N/A"}
                            </span>
                          </td>
                        )}
                        {!isBrgy && (
                          <td className="px-5 py-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.status === 'active' || u.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                              {u.status || "N/A"}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'brgyAccounts' && !isBrgy && (
          <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Barangay Accounts</h2>
              <p className="text-xs text-gray-500 mt-1">List of barangays and their linked barangay user accounts.</p>
            </div>
            <div className="overflow-x-auto">
              {brgyError && (
                <div className="px-4 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100">
                  {brgyError}
                </div>
              )}
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barangay</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {brgyLoading ? (
                    <tr><td colSpan={8} className="text-center p-4 text-gray-500">Loading...</td></tr>
                  ) : brgyAccounts.length === 0 ? (
                    <tr><td colSpan={8} className="text-center p-4 text-gray-500">No barangays found.</td></tr>
                  ) : (
                    brgyAccounts.map(row => (
                      <tr key={row.barangay_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">{row.barangay_name || "N/A"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{row.address || "N/A"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{row.contact || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {row.username || <span className="text-gray-400 italic">No account</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{row.email || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{row.role || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 capitalize">{row.status || "-"}</td>
                        <td className="px-4 py-3 text-sm">
                          {row.status === 'pending' && row.user_id && (
                            <div className="flex gap-2">
                              <button
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg disabled:opacity-50 transition-colors"
                                disabled={actionLoading === row.user_id}
                                onClick={() => updateStatus(row.user_id as number, "approved")}
                              >
                                {actionLoading === row.user_id ? "..." : "Approve"}
                              </button>
                              <button
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg disabled:opacity-50 transition-colors"
                                disabled={actionLoading === row.user_id}
                                onClick={() => updateStatus(row.user_id as number, "rejected")}
                              >
                                {actionLoading === row.user_id ? "..." : "Reject"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
