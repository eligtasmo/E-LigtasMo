import React, { useState, useEffect, useMemo } from 'react';
import { FiPhone, FiPlus, FiTrash2, FiEdit2, FiSearch, FiRefreshCw, FiX, FiChevronLeft, FiChevronRight, FiUsers, FiShield, FiActivity, FiMapPin } from 'react-icons/fi';
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import { toast } from 'react-hot-toast';
import PageMeta from '../components/common/PageMeta';

interface Contact {
  id: number; category: string; number: string; description: string;
  type: string; priority: string; created_by: string; created_brgy: string | null; created_at: string;
  image_url: string | null;
}

const CATEGORIES = ["Police", "Fire", "Medical/Health", "Rescue/DRRMO", "Coast/Water", "Emergency/911", "Barangay Coordinator", "Other"];
const PAGE_SIZE = 12;

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
      const payload = { ...formData, id: currentId, created_by: user?.username };
      const res = await apiFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.success) { 
        toast.success(isEditing ? 'Protocol Updated' : 'Asset Deployed'); 
        setShowModal(false); 
        loadContacts(); 
      } else toast.error(result.message || 'Transmission Failed');
    } catch { toast.error('Comms Error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Decommission this asset?')) return;
    try {
      const res = await apiFetch('contacts-delete.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const result = await res.json();
      if (result.success) { toast.success('Asset Decommissioned'); loadContacts(); }
    } catch { toast.error('Deletion Failed'); }
  };

  const filtered = useMemo(() => contacts.filter(c => {
    const s = searchTerm.toLowerCase();
    return (c.category.toLowerCase().includes(s) || c.number.includes(s) || (c.description || '').toLowerCase().includes(s))
      && (filterCategory === 'All' || c.category === filterCategory);
  }), [contacts, searchTerm, filterCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => [
    { label: 'Tactical Assets', value: contacts.length, icon: <FiUsers className="text-blue-500" /> },
    { label: 'Emergency Nodes', value: contacts.filter(c => c.type === 'Emergency').length, icon: <FiShield className="text-red-500" /> },
    { label: 'Operational Reach', value: 'Global', icon: <FiMapPin className="text-green-500" /> },
    { label: 'Sync Status', value: 'Active', icon: <FiRefreshCw className="text-orange-500 animate-spin-slow" /> },
  ], [contacts]);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 font-['Outfit']">
      <PageMeta title="Tactical Directory | E-LigtasMo" description="Tactical Contacts Directory" />
      
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Tactical Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <h1 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Asset Intelligence</h1>
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Mission Control Directory</h2>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Search assets..." 
                  className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-500/20 outline-none w-64 transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
             <button onClick={handleOpenAdd} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-900/10">
               <FiPlus size={14} /> Register Asset
             </button>
          </div>
        </div>

        {/* Tactical Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl shadow-inner">
                 {s.icon}
               </div>
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{s.label}</p>
                 <p className="text-xl font-black text-slate-800">{s.value}</p>
               </div>
            </div>
          ))}
        </div>

        {/* Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white h-48 rounded-3xl border border-slate-100 animate-pulse" />
            ))
          ) : paginated.map(c => (
            <div key={c.id} className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all overflow-hidden relative">
               <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${c.type === 'Emergency' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      {c.type}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenEdit(c)} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-blue-500 transition-colors"><FiEdit2 size={12} /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 transition-colors"><FiTrash2 size={12} /></button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 overflow-hidden shrink-0">
                      {c.image_url ? (
                        <img src={c.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FiPhone size={20} className="text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-800 text-sm truncate uppercase tracking-tight">{c.category}</h3>
                      <p className="text-lg font-black text-blue-600 tabular-nums">{c.number}</p>
                    </div>
                  </div>

                  <p className="text-[10px] font-bold text-slate-400 line-clamp-2 h-8 leading-relaxed mb-4">
                    {c.description || 'No operational brief available for this asset.'}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{c.created_brgy || 'Global Sector'}</span>
                    <div className={`w-2 h-2 rounded-full ${c.priority === 'Critical' ? 'bg-red-500' : c.priority === 'High' ? 'bg-orange-500' : 'bg-slate-300'}`} title={`Priority: ${c.priority}`} />
                  </div>
               </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
             Nodes {filtered.length > 0 ? (page-1)*PAGE_SIZE + 1 : 0} - {Math.min(page*PAGE_SIZE, filtered.length)} / {filtered.length}
           </span>
           <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
                className="p-2 rounded-xl border border-slate-100 text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all"
              >
                <FiChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={page === totalPages}
                className="p-2 rounded-xl border border-slate-100 text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all"
              >
                <FiChevronRight size={16} />
              </button>
           </div>
        </div>

      </div>

      {/* Register Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl border border-white/50 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Asset Registration</p>
                  <h2 className="text-xl font-black text-slate-800">{isEditing ? 'Modify Protocol' : 'Deploy New Asset'}</h2>
                </div>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-600 transition-all shadow-sm"><FiX size={18} /></button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                    <select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                    <input type="text" required className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 transition-all" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} placeholder="09xx..." />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Threat Level (Priority)</label>
                    <select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                      <option value="Normal">NORMAL</option>
                      <option value="High">HIGH</option>
                      <option value="Critical">CRITICAL</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Type</label>
                    <select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                      <option value="Emergency">EMERGENCY</option>
                      <option value="Support">SUPPORT</option>
                      <option value="Information">INFORMATION</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Identification (Image URL)</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 transition-all" value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..." />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Operational Brief (Description)</label>
                  <textarea className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 transition-all h-24 resize-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Details on agency scope and protocols..." />
                </div>

                <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98]">
                  {isEditing ? 'Confirm Protocol Update' : 'Finalize Deployment'}
                </button>
              </form>
           </div>
        </div>
      )}

      <style>{`
        .animate-spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default TacticalContactManager;
