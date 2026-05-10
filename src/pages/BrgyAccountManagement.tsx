import React, { useEffect, useState, useMemo } from "react";
import * as XLSX from 'xlsx';
import { FiSearch, FiUsers, FiDownload, FiRefreshCw, FiChevronLeft, FiChevronRight, FiEdit2, FiTrash2, FiUserCheck, FiX, FiPlus, FiShield } from 'react-icons/fi';
import { useAuth } from "../context/AuthContext";
import { toast } from 'react-hot-toast';
import { apiFetch } from "../utils/api";

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
  created_at?: string;
}

const PAGE_SIZE = 10;

const statusStyle = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'approved' || s === 'active') return 'bg-[#ecfdf5] text-[#065f46]';
  if (s === 'pending') return 'bg-[#fffbeb] text-[#92400e]';
  if (s === 'rejected' || s === 'blocked') return 'bg-[#fef2f2] text-[#991b1b]';
  return 'bg-[#f3f4f6] text-[#374151]';
};

const SortIcon = () => (
  <svg className="inline ml-1 w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
  </svg>
);

const BrgyAccountManagement: React.FC = () => {
  const { user } = useAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterBrgy, setFilterBrgy] = useState('');
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState<string>('full_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [createData, setCreateData] = useState({ username: '', password: '', confirmPassword: '', first_name: '', last_name: '', email: '', contact_number: '', brgy_name: '', role: 'brgy' });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [allBrgys, setAllBrgys] = useState<string[]>([]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch only brgy roles
      const res = await apiFetch(`list-users.php?role=brgy&brgy=${encodeURIComponent(filterBrgy)}`);
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      if (data.success) {
        // Filter additionally just in case the API doesn't support the role param yet
        setUsers(data.users.filter((u: User) => u.role === 'brgy'));
      }
    } catch { }
    setLoading(false);
  };

  const fetchBrgys = async () => {
    const fallbackBrgys = [
      'Alipit', 'Bagumbayan', 'Bubukal', 'Calios', 'Duhat', 'Gatid', 'Jasaan', 
      'Labuin', 'Malinao', 'Oogong', 'Pagsawitan', 'Palasan', 'Patimbao', 
      'Poblacion I', 'Poblacion II', 'Poblacion III', 'Poblacion IV', 'Poblacion V', 
      'San Jose', 'San Juan', 'San Pablo Norte', 'San Pablo Sur', 'Santisima Cruz', 
      'Santo Angel Central', 'Santo Angel Norte', 'Santo Angel Sur'
    ];
    try {
      const res = await apiFetch("list-barangays.php");
      const data = await res.json();
      if (data.success && Array.isArray(data.barangays)) {
        // Extract names and filter out purely numeric values
        const apiBrgys = data.barangays
          .map((b: any) => b.name)
          .filter((n: string) => n && isNaN(Number(n)) && n.length > 2);
        
        // Use fallbacks if API returns suspicious or empty data
        if (apiBrgys.length < 5) {
          setAllBrgys(fallbackBrgys);
        } else {
          setAllBrgys(apiBrgys);
        }
      } else {
        setAllBrgys(fallbackBrgys);
      }
    } catch {
      setAllBrgys(fallbackBrgys);
    }
  };

  useEffect(() => { 
    fetchUsers(); 
    fetchBrgys();
  }, [filterBrgy]);


  const filtered = useMemo(() => {
    let r = users;
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(u => u.full_name?.toLowerCase().includes(s) || u.username?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s));
    }
    r = [...r].sort((a, b) => {
      const av = (a as any)[sortCol] || '';
      const bv = (b as any)[sortCol] || '';
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return r;
  }, [users, search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  const handleDeleteUser = async (userId: number) => {
    if (!userId) { toast.error("Invalid User ID"); return; }
    if (!window.confirm("ARE YOU SURE? This will permanently delete this official account from the system registry. This action is IRREVERSIBLE.")) return;
    try {
      const res = await apiFetch("admin-delete-user.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: Number(userId) }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Account deleted successfully");
        fetchUsers();
      } else {
        toast.error(data.message || "Failed to delete account");
      }
    } catch { toast.error("Connection error"); }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = `${createData.first_name}, ${createData.last_name}`;

    // 1. Name Validation
    if (!createData.first_name.trim() || !createData.last_name.trim()) {
      toast.error("Both First Name and Last Name are required");
      return;
    }

    // 2. Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // 3. Phone Validation
    const cleanPhone = createData.contact_number.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('09')) {
      toast.error("Please enter a valid 11-digit phone number starting with 09");
      return;
    }

    // 4. Password Confirmation
    if (createData.password !== createData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (createData.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setCreating(true);
    try {
      const res = await apiFetch("admin-create-user.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...createData, full_name: fullName, contact_number: cleanPhone }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Barangay account created successfully");
        setShowCreateModal(false);
        setCreateData({ username: '', password: '', confirmPassword: '', first_name: '', last_name: '', email: '', contact_number: '', brgy_name: '', role: 'brgy' });
        fetchUsers();
      } else {
        toast.error(data.message || "Failed to create account");
      }
    } catch { toast.error("Connection error"); }
    setCreating(false);
  };

  const handleEditUser = (u: User) => {
    const [fname, lname] = (u.full_name || '').split(',').map(s => s.trim());
    setEditData({ ...u, first_name: fname || '', last_name: lname || '', password: '' });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = `${editData.first_name}, ${editData.last_name}`;

    if (!editData.first_name?.trim() || !editData.last_name?.trim()) {
      toast.error("Both First Name and Last Name are required");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (editData.email && !emailRegex.test(editData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    const cleanPhone = editData.contact_number?.replace(/[^0-9]/g, '');
    if (cleanPhone && (cleanPhone.length !== 11 || !cleanPhone.startsWith('09'))) {
      toast.error("Please enter a valid 11-digit phone number starting with 09");
      return;
    }
    setUpdating(true);
    try {
      const res = await apiFetch("admin-update-user.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editData, full_name: fullName, contact_number: cleanPhone }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Account updated successfully");
        setShowEditModal(false);
        fetchUsers();
      } else {
        toast.error(data.message || "Failed to update account");
      }
    } catch { toast.error("Connection error"); }
    setUpdating(false);
  };

  const exportData = () => {
    if (!filtered.length) { toast.error('No data to export'); return; }
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BrgyAccounts');
    XLSX.writeFile(wb, `brgy_accounts_${Date.now()}.xlsx`);
  };

  const COLS = [
    { key: 'full_name', label: 'Official Name' },
    { key: 'username', label: 'Username' },
    { key: 'email', label: 'Email' },
    { key: 'contact_number', label: 'Phone Number' },
    { key: 'brgy_name', label: 'Barangay' },
    { key: 'created_at', label: 'Account Created' },
  ];

  return (
    <div className="tactical-page">
      <div className="tactical-container">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Barangay Accounts</h1>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Manage and enroll local sector commanders and officials.</p>
          </div>
          <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-black text-white bg-[#1e1b4b] rounded-lg hover:bg-blue-900 transition-all shadow-sm uppercase tracking-widest"
              >
                <FiPlus size={14} /> Enroll Official
              </button>
              <button 
                onClick={exportData} 
                className="px-4 py-2 text-xs font-black text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 uppercase tracking-widest"
              >
                <FiDownload size={14} /> Export
              </button>
          </div>
        </div>


        {/* Search + filter row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search by name, ID, or email..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 appearance-none min-w-[160px] cursor-pointer"
            value={filterBrgy}
            onChange={e => { setFilterBrgy(e.target.value); setPage(1); }}
          >
            <option value="">All Barangays</option>
            {allBrgys.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <button onClick={fetchUsers} className="p-2.5 border border-gray-200 rounded-lg bg-white text-gray-500 hover:bg-gray-50 transition-colors">
            <FiRefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Table */}
        <div className="tactical-table-wrapper">
          <div className="overflow-x-auto">
            <table className="tactical-table">
              <thead>
                <tr>
                  {/* Removed checkbox column */}
                  {COLS.map(col => (
                    <th
                      key={col.key}
                      className="tactical-th cursor-pointer hover:text-gray-800 hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      <SortIcon />
                    </th>
                  ))}
                  <th className="tactical-th text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={COLS.length + 2} className="tactical-td">
                        <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                      </td>
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length + 2} className="tactical-td py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FiShield size={32} className="text-gray-200" />
                        <span className="text-sm text-gray-400">No barangay accounts found</span>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map(u => (
                  <tr
                    key={u.id}
                    className="group transition-colors hover:bg-[#f9fafb]"
                  >
                    {/* Removed checkbox column */}
                    <td className="tactical-td">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#1e1b4b] flex items-center justify-center text-sm font-semibold text-white shrink-0">
                          {(u.full_name || u.username || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{u.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="tactical-td text-gray-600 font-mono text-xs">{u.username}</td>
                    <td className="tactical-td text-gray-600 lowercase">{u.email || '—'}</td>
                    <td className="tactical-td text-gray-600 tabular-nums">{u.contact_number || '—'}</td>
                    <td className="tactical-td text-gray-700 font-medium">{u.brgy_name || '—'}</td>
                    <td className="tactical-td text-gray-500 tabular-nums">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending'}
                    </td>
                    <td className="tactical-td text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          onClick={() => handleEditUser(u)}
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white">
            <span className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-700">{filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-medium text-gray-700">{filtered.length}</span> officials
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronLeft size={14} /> Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = totalPages <= 5 ? i + 1 : (page <= 3 ? i + 1 : page - 2 + i);
                  if (p > totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${page === p ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <FiChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Enroll Brgy Official</h2>
                  <p className="text-xs font-semibold text-gray-400 mt-1">Direct system registration for sector officials.</p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <FiX size={24} className="text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="tactical-label">First Name</label>
                    <input 
                      required
                      className="tactical-input w-full h-10 py-1"
                      value={createData.first_name}
                      onChange={e => setCreateData({...createData, first_name: e.target.value})}
                      placeholder="Juan"
                    />
                  </div>
                  <div>
                    <label className="tactical-label">Last Name</label>
                    <input 
                      required
                      className="tactical-input w-full h-10 py-1"
                      value={createData.last_name}
                      onChange={e => setCreateData({...createData, last_name: e.target.value})}
                      placeholder="Dela Cruz"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="tactical-label">Username</label>
                    <input 
                      required
                      className="tactical-input w-full h-10 py-1"
                      value={createData.username}
                      onChange={e => setCreateData({...createData, username: e.target.value})}
                      placeholder="user_brgy"
                    />
                  </div>
                  <div>
                    <label className="tactical-label">Email Address</label>
                    <input 
                      required
                      type="email"
                      className="tactical-input w-full h-10 py-1"
                      value={createData.email}
                      onChange={e => setCreateData({...createData, email: e.target.value})}
                      placeholder="brgy@eligtasmo.gov"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="tactical-label">Password</label>
                    <input 
                      required
                      type="password"
                      className="tactical-input w-full h-10 py-1"
                      value={createData.password}
                      onChange={e => setCreateData({...createData, password: e.target.value})}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="tactical-label">Confirm Password</label>
                    <input 
                      required
                      type="password"
                      className="tactical-input w-full h-10 py-1"
                      value={createData.confirmPassword}
                      onChange={e => setCreateData({...createData, confirmPassword: e.target.value})}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="tactical-label">Phone Number</label>
                    <input 
                      required
                      maxLength={11}
                      className="tactical-input w-full h-10 py-1"
                      value={createData.contact_number}
                      onChange={e => setCreateData({...createData, contact_number: e.target.value.replace(/[^0-9]/g, '')})}
                      placeholder="09123456789"
                    />
                  </div>
                  <div>
                    <label className="tactical-label">Barangay Assignment</label>
                    <select 
                      required
                      className="tactical-input w-full h-10 py-1 appearance-none cursor-pointer pr-10"
                      value={createData.brgy_name}
                      onChange={e => setCreateData({...createData, brgy_name: e.target.value})}
                    >
                      <option value="">Select Sector...</option>
                      {allBrgys.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)}
                    className="tactical-button-ghost flex-1 h-10"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={creating}
                    className="tactical-button-accent flex-1 h-10"
                  >
                    {creating ? 'Confirming...' : 'Confirm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Edit Account Modal */}
      {showEditModal && editData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Edit Official Profile</h2>
                  <p className="text-xs font-semibold text-gray-400 mt-1">Update system credentials and sector assignment.</p>
                </div>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <FiX size={24} className="text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="tactical-label">First Name</label>
                    <input 
                      required
                      className="tactical-input w-full h-10 py-1"
                      value={editData.first_name}
                      onChange={e => setEditData({...editData, first_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="tactical-label">Last Name</label>
                    <input 
                      required
                      className="tactical-input w-full h-10 py-1"
                      value={editData.last_name}
                      onChange={e => setEditData({...editData, last_name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="tactical-label">Username</label>
                    <input 
                      disabled
                      className="tactical-input w-full h-10 py-1 bg-gray-50 opacity-70 cursor-not-allowed"
                      value={editData.username}
                    />
                  </div>
                  <div>
                    <label className="tactical-label">Official Email</label>
                    <input 
                      required
                      type="email"
                      className="tactical-input w-full h-10 py-1"
                      value={editData.email}
                      onChange={e => setEditData({...editData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="tactical-label">Phone Number</label>
                    <input 
                      required
                      maxLength={11}
                      className="tactical-input w-full h-10 py-1"
                      value={editData.contact_number}
                      onChange={e => setEditData({...editData, contact_number: e.target.value.replace(/[^0-9]/g, '')})}
                    />
                  </div>
                  <div>
                    <label className="tactical-label">Barangay Assignment</label>
                    <select 
                      required
                      className="tactical-input w-full h-10 py-1 appearance-none cursor-pointer pr-10"
                      value={editData.brgy_name}
                      onChange={e => setEditData({...editData, brgy_name: e.target.value})}
                    >
                      {allBrgys.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="tactical-label">Reset Password</label>
                  <input 
                    type="password"
                    className="tactical-input w-full h-10 py-1"
                    value={editData.password || ''}
                    onChange={e => setEditData({...editData, password: e.target.value})}
                    placeholder="Leave blank to keep same"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowEditModal(false)}
                    className="tactical-button-ghost flex-1 h-10"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={updating}
                    className="tactical-button-accent flex-1 h-10"
                  >
                    {updating ? 'Updating...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BrgyAccountManagement;
