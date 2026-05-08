import React, { useEffect, useState, useMemo } from "react";
import * as XLSX from 'xlsx';
import { FiSearch, FiUsers, FiDownload, FiUserPlus, FiRefreshCw, FiChevronLeft, FiChevronRight, FiEdit2, FiTrash2, FiMoreHorizontal, FiUserCheck, FiX, FiPlus, FiShield } from 'react-icons/fi';
import { useAuth } from "../context/AuthContext";
import { toast } from 'react-hot-toast';

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

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const isBrgy = user?.role === 'brgy';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterBrgy, setFilterBrgy] = useState(isBrgy ? (user?.brgy_name || '') : '');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState<string>('full_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({ username: '', password: '', full_name: '', email: '', contact_number: '', brgy_name: '', role: 'brgy' });
  const [creating, setCreating] = useState(false);
  const [allBrgys, setAllBrgys] = useState<string[]>([]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const brgyParam = isBrgy ? (user?.brgy_name || '') : filterBrgy;
      const res = await fetch(`/api/list-users.php?status=&brgy=${encodeURIComponent(brgyParam)}`, { credentials: "include" });
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch { }
    setLoading(false);
  };

  const fetchBrgys = async () => {
    try {
      const res = await fetch("/api/list-barangays.php");
      const data = await res.json();
      if (data.success) setAllBrgys(data.data.map((b: any) => b.name));
    } catch {}
  };

  useEffect(() => { 
    fetchUsers(); 
    if (!isBrgy) fetchBrgys();
  }, [filterBrgy]);


  const brgys = useMemo(() => Array.from(new Set(users.map(u => u.brgy_name).filter(Boolean))), [users]);

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

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const allOnPageSelected = paginated.length > 0 && paginated.every(u => selected.has(u.id));
  const toggleAll = () => {
    if (allOnPageSelected) {
      const next = new Set(selected);
      paginated.forEach(u => next.delete(u.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      paginated.forEach(u => next.add(u.id));
      setSelected(next);
    }
  };

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  const handleApproveAction = async (userId: number, action: 'approve' | 'reject') => {
    if (!window.confirm(`Are you sure you want to ${action} this account?`)) return;
    try {
      const res = await fetch("/api/approve-brgy-account.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, action }),
        credentials: "include"
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Account ${action}ed`);
        fetchUsers();
      } else {
        toast.error(data.message || "Failed to update status");
      }
    } catch { toast.error("Connection error"); }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin-create-user.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createData),
        credentials: "include"
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Account created successfully");
        setShowCreateModal(false);
        setCreateData({ username: '', password: '', full_name: '', email: '', contact_number: '', brgy_name: '', role: 'brgy' });
        fetchUsers();
      } else {
        toast.error(data.message || "Failed to create account");
      }
    } catch { toast.error("Connection error"); }
    setCreating(false);
  };

  const exportData = () => {
    if (!filtered.length) { toast.error('No data to export'); return; }
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Residents');
    XLSX.writeFile(wb, `residents_${Date.now()}.xlsx`);
  };

  const pageTitle = isBrgy ? `${user?.brgy_name || 'Barangay'} Residents` : 'Residents';

  const COLS = [
    { key: 'full_name', label: 'Full Name' },
    { key: 'username', label: 'Username' },
    { key: 'email', label: 'Email' },
    { key: 'contact_number', label: 'Contact' },
    ...(!isBrgy ? [{ key: 'brgy_name', label: 'Barangay' }] : []),
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Enrolled' },
  ];

  return (
    <div className="tactical-page">
      <div className="tactical-container" style={{ fontFamily: "Inter, Outfit, system-ui, sans-serif" }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{isBrgy ? "Resident database for your sector." : "System-wide user and resident database."}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportData} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
              <FiDownload size={14} /> Export
            </button>
            {!isBrgy && (
              <>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <FiPlus size={14} /> Create Account
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/invites-generate.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: 'brgy' }), credentials: "include" });
                      const data = await res.json();
                      if (data.success) {
                        const link = `${window.location.origin}/brgy-signin?mode=brgy&invite=${data.code}`;
                        navigator.clipboard.writeText(link);
                        toast.success('Invite link copied');
                      }
                    } catch { toast.error('Failed'); }
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <FiUserPlus size={14} /> Invite
                </button>
              </>
            )}
          </div>
        </div>


        {/* Search + filter row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search by name, username, or email..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          {!isBrgy && (
            <select
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 appearance-none min-w-[160px] cursor-pointer"
              value={filterBrgy}
              onChange={e => { setFilterBrgy(e.target.value); setPage(1); }}
            >
              <option value="">All Barangays</option>
              {brgys.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          )}
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
                  <th className="tactical-th" style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-gray-300 accent-gray-900 cursor-pointer"
                    />
                  </th>
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
                        <FiUsers size={32} className="text-gray-200" />
                        <span className="text-sm text-gray-400">No residents found</span>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map(u => (
                  <tr
                    key={u.id}
                    className={`group transition-colors ${selected.has(u.id) ? 'bg-[#f5f3ff]' : 'hover:bg-[#f9fafb]'}`}
                  >
                    <td className="tactical-td" style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={() => toggleSelect(u.id)}
                        className="w-4 h-4 rounded border-gray-300 accent-gray-900 cursor-pointer"
                      />
                    </td>
                    <td className="tactical-td">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
                          {(u.full_name || u.username || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{u.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="tactical-td text-gray-600">{u.username}</td>
                    <td className="tactical-td text-gray-600 lowercase">{u.email || '—'}</td>
                    <td className="tactical-td text-gray-600 tabular-nums">{u.contact_number || '—'}</td>
                    {!isBrgy && <td className="tactical-td text-gray-700 font-medium">{u.brgy_name || '—'}</td>}
                    <td className="tactical-td">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyle(u.status)}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="tactical-td text-gray-500 text-xs tabular-nums">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="tactical-td text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleApproveAction(u.id, 'approve')}
                              className="p-1.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                              title="Approve"
                            >
                              <FiUserCheck size={14} />
                            </button>
                            <button 
                              onClick={() => handleApproveAction(u.id, 'reject')}
                              className="p-1.5 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                              title="Reject"
                            >
                              <FiX size={14} />
                            </button>
                          </>
                        )}
                        <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                          <FiEdit2 size={14} />
                        </button>
                        <button className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
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
              Showing <span className="font-medium text-gray-700">{filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-medium text-gray-700">{filtered.length}</span> residents
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronLeft size={14} /> Previous
              </button>
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
              {totalPages > 5 && <span className="text-gray-400 px-1">…</span>}
              {totalPages > 5 && (
                <button onClick={() => setPage(totalPages)} className="w-8 h-8 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 border border-gray-200">{totalPages}</button>
              )}
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

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-white border border-gray-200 rounded-2xl shadow-xl animate-in slide-in-from-bottom duration-200">
            <span className="text-sm font-semibold text-gray-700">{selected.size} selected</span>
            <div className="w-px h-4 bg-gray-200" />
            <button onClick={exportData} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
              <FiDownload size={14} /> Export
            </button>
            <button onClick={() => setSelected(new Set())} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors ml-1">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Enroll Coordinator</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Direct System Registration</p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <FiX size={20} className="text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Lead_Full_Name</label>
                  <input 
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    value={createData.full_name}
                    onChange={e => setCreateData({...createData, full_name: e.target.value})}
                    placeholder="e.g. Juan Dela Cruz"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Username</label>
                    <input 
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      value={createData.username}
                      onChange={e => setCreateData({...createData, username: e.target.value})}
                      placeholder="user_brgy"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Password</label>
                    <input 
                      required
                      type="password"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      value={createData.password}
                      onChange={e => setCreateData({...createData, password: e.target.value})}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email_Address</label>
                    <input 
                      required
                      type="email"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      value={createData.email}
                      onChange={e => setCreateData({...createData, email: e.target.value})}
                      placeholder="brgy@eligtasmo.gov"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Phone_Number</label>
                    <input 
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      value={createData.contact_number}
                      onChange={e => setCreateData({...createData, contact_number: e.target.value})}
                      placeholder="09123456789"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Barangay_Assignment</label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                    value={createData.brgy_name}
                    onChange={e => setCreateData({...createData, brgy_name: e.target.value})}
                  >
                    <option value="">Select Sector...</option>
                    {allBrgys.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit"
                    disabled={creating}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                  >
                    {creating ? 'Syncing...' : 'Confirm Enrollment'}
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

export default UserManagement;
