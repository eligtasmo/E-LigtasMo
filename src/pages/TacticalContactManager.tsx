import React, { useState, useEffect, useMemo } from 'react';
import { FiPhone, FiPlus, FiTrash2, FiEdit2, FiSearch, FiRefreshCw, FiX, FiChevronLeft, FiChevronRight, FiMoreHorizontal } from 'react-icons/fi';
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import { toast } from 'react-hot-toast';

interface Contact {
  id: number; category: string; number: string; description: string;
  type: string; priority: string; created_by: string; created_brgy: string | null; created_at: string;
  image_url: string | null;
}

const CATEGORIES = ["Police", "Fire", "Medical/Health", "Rescue/DRRMO", "Coast/Water", "Emergency/911", "Barangay Coordinator", "Other"];
const PAGE_SIZE = 10;

const SortIcon = () => (
  <svg className="inline ml-1 w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
  </svg>
);

const priorityStyle = (p: string) => {
  if (p === 'Critical') return 'bg-[#fef2f2] text-[#991b1b]';
  if (p === 'High') return 'bg-[#fffbeb] text-[#92400e]';
  return 'bg-[#f3f4f6] text-[#374151]';
};

const TacticalContactManager = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const brgyName = user?.brgy_name;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({ category: 'Police', number: '', description: '', type: 'Emergency', priority: 'Normal', image_url: '', created_brgy: isAdmin ? '' : (brgyName || '') });

  const loadContacts = async () => {
    setLoading(true);
    try {
      const url = isAdmin ? 'contacts-list.php' : `contacts-list.php?brgy=${encodeURIComponent(brgyName || '')}`;
      const res = await apiFetch(url);
      const data = await res.json();
      if (Array.isArray(data)) setContacts(data);
    } catch { toast.error('Failed to load contacts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadContacts(); }, []);

  const handleOpenAdd = () => {
    setIsEditing(false); setCurrentId(null);
    setFormData({ category: 'Police', number: '', description: '', type: 'Emergency', priority: 'Normal', image_url: '', created_brgy: isAdmin ? '' : (brgyName || '') });
    setShowModal(true);
  };

  const handleOpenEdit = (c: Contact) => {
    setIsEditing(true); setCurrentId(c.id);
    setFormData({ 
      category: c.category, 
      number: c.number, 
      description: c.description || '', 
      type: c.type || 'Emergency', 
      priority: c.priority || 'Normal',
      image_url: c.image_url || '',
      created_brgy: c.created_brgy || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = isEditing ? 'contacts-update.php' : 'contacts-add.php';
      const payload = { 
        ...formData, 
        id: currentId, 
        created_brgy: formData.created_brgy || null,
        created_by: user?.username 
      };
      const res = await apiFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.id || result.success) { toast.success(isEditing ? 'Updated' : 'Contact added'); setShowModal(false); loadContacts(); }
      else toast.error(result.error || 'Failed');
    } catch { toast.error('Network error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this contact?')) return;
    try {
      const res = await apiFetch('contacts-delete.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const result = await res.json();
      if (result.success) { toast.success('Removed'); loadContacts(); }
    } catch { toast.error('Failed'); }
  };

  const filtered = useMemo(() => contacts.filter(c => {
    if (!c) return false;
    const s = searchTerm.toLowerCase();
    return (c.category.toLowerCase().includes(s) || c.number.includes(s) || (c.description || '').toLowerCase().includes(s))
      && (filterCategory === 'All' || c.category === filterCategory);
  }), [contacts, searchTerm, filterCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelect = (id: number) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOnPage = paginated.length > 0 && paginated.every(c => selected.has(c.id));
  const toggleAll = () => {
    if (allOnPage) { const n = new Set(selected); paginated.forEach(c => n.delete(c.id)); setSelected(n); }
    else { const n = new Set(selected); paginated.forEach(c => n.add(c.id)); setSelected(n); }
  };

  const counts = useMemo(() => ({
    all: contacts.length,
    emergency: contacts.filter(c => c.type === 'Emergency').length,
    global: contacts.filter(c => !c.created_brgy).length,
    local: contacts.filter(c => !!c.created_brgy).length,
  }), [contacts]);

  const statCards = [
    { label: 'Total Contacts', value: counts.all, dot: '#6366f1' },
    { label: 'Emergency', value: counts.emergency, dot: '#ef4444' },
    { label: 'Global', value: counts.global, dot: '#3b82f6' },
    { label: 'Local Sector', value: counts.local, dot: '#10b981' },
  ];

  return (
    <div className="tactical-page">
      <div className="tactical-container" style={{ fontFamily: 'Inter, Outfit, system-ui, sans-serif' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agency & Coordination Directory</h1>
            <p className="text-sm text-gray-500 mt-0.5">{isAdmin ? 'Official directory for emergency agencies, sector partners, and inter-agency coordination.' : `${brgyName} tactical directory for agency partners.`}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadContacts} className="p-2.5 border border-gray-200 rounded-lg bg-white text-gray-500 hover:bg-gray-50 transition-colors">
              <FiRefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={handleOpenAdd} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-black transition-colors shadow-sm">
              <FiPlus size={14} /> Add Contact
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" placeholder="Search by category, number, or description..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all"
              value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} />
          </div>
          <select className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none appearance-none min-w-[160px] cursor-pointer"
            value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}>
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
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
                  {['Contact', 'Number', 'Type', 'Priority', 'Sector', 'Description'].map(h => (
                    <th key={h} className="tactical-th">{h}<SortIcon /></th>
                  ))}
                  <th className="tactical-th text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="tactical-td"><div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" /></td></tr>
                )) : paginated.length === 0 ? (
                  <tr><td colSpan={8} className="tactical-td py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FiPhone size={32} className="text-gray-200" />
                      <span className="text-sm text-gray-400">No contacts found</span>
                    </div>
                  </td></tr>
                ) : paginated.map(c => (
                  <tr key={c.id} className={`group transition-colors ${selected.has(c.id) ? 'bg-[#f5f3ff]' : 'hover:bg-[#f9fafb]'}`}>
                    <td className="tactical-td" style={{ width: 40 }}>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4 rounded border-gray-300 accent-gray-900 cursor-pointer" />
                    </td>
                    <td className="tactical-td">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden border border-gray-200">
                          {c.image_url ? (
                            <img src={c.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <FiPhone size={12} className="text-gray-400" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 leading-none mb-1">{c.category}</span>
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{c.type || 'Contact'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="tactical-td">
                      <div className="flex items-center gap-2">
                        <FiPhone size={12} className="text-gray-400" />
                        <span className="font-semibold tabular-nums">{c.number}</span>
                      </div>
                    </td>
                    <td className="tactical-td text-gray-600">{c.type || '—'}</td>
                    <td className="tactical-td">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityStyle(c.priority)}`}>{c.priority || 'Normal'}</span>
                    </td>
                    <td className="tactical-td text-gray-600">{c.created_brgy || 'Global'}</td>
                    <td className="tactical-td text-gray-500 max-w-[200px]"><span className="truncate block">{c.description || '—'}</span></td>
                    <td className="tactical-td text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleOpenEdit(c)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"><FiEdit2 size={14} /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><FiTrash2 size={14} /></button>
                        <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><FiMoreHorizontal size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white">
            <span className="text-sm text-gray-500">Showing <span className="font-medium text-gray-700">{filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-medium text-gray-700">{filtered.length}</span> contacts</span>
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
                <h2 className="text-base font-semibold text-gray-900">{isEditing ? 'Edit Contact' : 'Add Contact'}</h2>
                <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-all"><FiX size={15} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
                    <select className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 appearance-none" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Number</label>
                    <input type="text" required className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} placeholder="09xx..." />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Priority</label>
                    <select className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 appearance-none" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                      <option value="Normal">Normal</option><option value="High">High</option><option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Type</label>
                    <select className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 appearance-none" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                      <option value="Emergency">Emergency</option><option value="Support">Support</option><option value="Information">Information</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Image URL (Icon/Logo)</label>
                  <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all" value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..." />
                </div>
                {isAdmin && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Barangay (Optional - Leave blank for Global)</label>
                    <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all" value={formData.created_brgy || ''} onChange={e => setFormData({ ...formData, created_brgy: e.target.value })} placeholder="Barangay Name" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Description</label>
                  <textarea className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 h-20 resize-none transition-all" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Optional details..." />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-black transition-all">{isEditing ? 'Update' : 'Add Contact'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TacticalContactManager;
