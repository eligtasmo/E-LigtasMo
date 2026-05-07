import React, { useState, useEffect, useMemo } from 'react';
import { FiPhone, FiPlus, FiTrash2, FiEdit2, FiSearch, FiRefreshCw, FiX, FiChevronLeft, FiChevronRight, FiMoreHorizontal } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth } from "../../context/AuthContext";

const PAGE_SIZE = 10;

const SortIcon = () => (
  <svg className="inline ml-1 w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
  </svg>
);

const catStyle = (cat: string) => {
  if (cat === 'Emergency') return 'bg-[#fef2f2] text-[#991b1b]';
  if (cat === 'Non-Emergency') return 'bg-[#eff6ff] text-[#1e40af]';
  if (cat === 'Inquiry') return 'bg-[#fffbeb] text-[#92400e]';
  return 'bg-[#f3f4f6] text-[#374151]';
};

const HotlineManagement: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const brgyName = user?.brgy_name;

  const [hotlines, setHotlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({ name: '', number: '', description: '', category: 'Emergency', image_url: '' });

  useEffect(() => { fetchHotlines(); }, []);

  const fetchHotlines = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/hotlines-list.php`);
      const data = await res.json();
      if (data.success) setHotlines(data.data);
    } catch { toast.error('Failed to load hotlines'); }
    finally { setLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = editingItem ? 'hotlines-update.php' : 'hotlines-add.php';
    const payload = editingItem ? { ...formData, id: editingItem.id } : formData;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingItem ? 'Updated' : 'Hotline added');
        setShowModal(false); setEditingItem(null);
        setFormData({ name: '', number: '', description: '', category: 'Emergency', image_url: '' });
        fetchHotlines();
      } else toast.error(data.message || 'Failed');
    } catch { toast.error('Connection error'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Remove this hotline?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/hotlines-delete.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) { toast.success('Removed'); fetchHotlines(); }
    } catch { toast.error('Failed'); }
  };

  const filtered = useMemo(() => hotlines.filter(h =>
    h.name?.toLowerCase().includes(searchTerm.toLowerCase()) || h.number?.includes(searchTerm)
  ), [hotlines, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelect = (id: number) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOnPage = paginated.length > 0 && paginated.every(h => selected.has(h.id));
  const toggleAll = () => {
    if (allOnPage) { const n = new Set(selected); paginated.forEach(h => n.delete(h.id)); setSelected(n); }
    else { const n = new Set(selected); paginated.forEach(h => n.add(h.id)); setSelected(n); }
  };

  const counts = useMemo(() => ({
    all: hotlines.length,
    emergency: hotlines.filter(h => h.category === 'Emergency').length,
    nonEmergency: hotlines.filter(h => h.category === 'Non-Emergency').length,
    other: hotlines.filter(h => h.category !== 'Emergency' && h.category !== 'Non-Emergency').length,
  }), [hotlines]);

  const statCards = [
    { label: 'Total Hotlines', value: counts.all, dot: '#6366f1' },
    { label: 'Emergency', value: counts.emergency, dot: '#ef4444' },
    { label: 'Non-Emergency', value: counts.nonEmergency, dot: '#3b82f6' },
    { label: 'Other', value: counts.other, dot: '#10b981' },
  ];

  const pageTitle = isAdmin ? 'Emergency Hotlines' : 'Barangay Hotlines';

  return (
    <div className="tactical-page">
      <div className="tactical-container" style={{ fontFamily: 'Inter, Outfit, system-ui, sans-serif' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{isAdmin ? 'Configure and manage emergency communication channels.' : `${brgyName} hotlines visible in the mobile app.`}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchHotlines} className="p-2.5 border border-gray-200 rounded-lg bg-white text-gray-500 hover:bg-gray-50 transition-colors">
              <FiRefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => { setEditingItem(null); setFormData({ name: '', number: '', description: '', category: 'Emergency', image_url: '' }); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-black transition-colors shadow-sm"
            >
              <FiPlus size={14} /> Add Hotline
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.dot }} />
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" placeholder="Search by name or number..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all"
              value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} />
          </div>
        </div>

        {/* Table */}
        <div className="tactical-table-wrapper">
          <div className="overflow-x-auto">
            <table className="tactical-table">
              <thead>
                <tr>
                  <th className="tactical-th" style={{ width: 40 }}>
                    <input type="checkbox" checked={allOnPage} onChange={toggleAll} className="w-4 h-4 rounded border-gray-300 accent-gray-900 cursor-pointer" />
                  </th>
                  {['Channel Name', 'Number', 'Category', 'Description', 'Enrolled'].map(h => (
                    <th key={h} className="tactical-th">{h}<SortIcon /></th>
                  ))}
                  <th className="tactical-th text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="tactical-td"><div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" /></td></tr>
                )) : paginated.length === 0 ? (
                  <tr><td colSpan={7} className="tactical-td py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FiPhone size={32} className="text-gray-200" />
                      <span className="text-sm text-gray-400">No hotlines configured</span>
                    </div>
                  </td></tr>
                ) : paginated.map(h => (
                  <tr key={h.id} className={`group transition-colors ${selected.has(h.id) ? 'bg-[#f5f3ff]' : 'hover:bg-[#f9fafb]'}`}>
                    <td className="tactical-td" style={{ width: 40 }}>
                      <input type="checkbox" checked={selected.has(h.id)} onChange={() => toggleSelect(h.id)} className="w-4 h-4 rounded border-gray-300 accent-gray-900 cursor-pointer" />
                    </td>
                    <td className="tactical-td">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {h.image_url ? (
                            <img src={h.image_url} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <FiPhone size={12} className="text-gray-400" />
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{h.name}</span>
                      </div>
                    </td>
                    <td className="tactical-td font-semibold tabular-nums text-gray-900">{h.number}</td>
                    <td className="tactical-td">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${catStyle(h.category)}`}>{h.category}</span>
                    </td>
                    <td className="tactical-td text-gray-500 max-w-[220px]"><span className="truncate block text-sm">{h.description || '—'}</span></td>
                    <td className="tactical-td text-gray-500 text-sm tabular-nums">{h.created_at ? new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Legacy'}</td>
                    <td className="tactical-td text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditingItem(h); setFormData({ name: h.name, number: h.number, description: h.description, category: h.category, image_url: h.image_url || '' }); setShowModal(true); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"><FiEdit2 size={14} /></button>
                        <button onClick={() => handleDelete(h.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><FiTrash2 size={14} /></button>
                        <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><FiMoreHorizontal size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white">
            <span className="text-sm text-gray-500">Showing <span className="font-medium text-gray-700">{filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-medium text-gray-700">{filtered.length}</span> hotlines</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"><FiChevronLeft size={14} /> Previous</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => { const p = i + 1; if (p > totalPages) return null; return <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${page === p ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>{p}</button>; })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">Next <FiChevronRight size={14} /></button>
            </div>
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-white border border-gray-200 rounded-2xl shadow-xl animate-in slide-in-from-bottom duration-200">
            <span className="text-sm font-semibold text-gray-700">{selected.size} selected</span>
            <div className="w-px h-4 bg-gray-200" />
            <button onClick={() => setSelected(new Set())} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">✕</button>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">{editingItem ? 'Edit Hotline' : 'Add Hotline'}</h2>
                <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-all"><FiX size={15} /></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Channel Name</label>
                  <input required className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Police Station" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Logo URL</label>
                  <input className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all" value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://image-link.com/logo.png" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Number</label>
                    <input required className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} placeholder="09xx..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
                    <select className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none appearance-none" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                      <option value="Emergency">Emergency</option>
                      <option value="Non-Emergency">Non-Emergency</option>
                      <option value="Inquiry">Inquiry</option>
                      <option value="Support">Support</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Description</label>
                  <textarea className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 h-20 resize-none transition-all" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description..." />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-black transition-all">{editingItem ? 'Update' : 'Add Hotline'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HotlineManagement;
