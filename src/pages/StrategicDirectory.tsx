import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiPhone, FiPlus, FiTrash2, FiEdit2, FiSearch, 
  FiRefreshCw, FiX, FiChevronLeft, FiChevronRight, 
  FiMoreHorizontal, FiActivity, FiShield, FiZap,
  FiGlobe, FiLock, FiShare2, FiExternalLink, FiFilter
} from 'react-icons/fi';
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import { toast } from 'react-hot-toast';

interface DirectoryEntry {
  id: number;
  source: 'contact' | 'hotline';
  name?: string; // from hotline
  category: string;
  number: string;
  description: string;
  type?: string; // from contact
  priority?: string; // from contact
  created_brgy?: string | null;
  image_url?: string | null;
  isPublic: boolean;
}

const CATEGORIES = [
  "Police", "Fire", "Medical/Health", "Rescue/DRRMO", 
  "Coast/Water", "Emergency/911", "Barangay Coordinator", "Other"
];

const StrategicDirectory = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const brgyName = user?.brgy_name;

  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<DirectoryEntry | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [formData, setFormData] = useState({
    name: '',
    category: 'Police',
    number: '',
    description: '',
    type: 'Emergency',
    priority: 'Normal',
    image_url: '',
    isPublic: true
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch from both sources
      const [contactsRes, hotlinesRes] = await Promise.all([
        apiFetch(isAdmin ? 'contacts-list.php' : `contacts-list.php?brgy=${encodeURIComponent(brgyName || '')}`),
        apiFetch('hotlines-list.php')
      ]);

      const contactsData = await contactsRes.json();
      const hotlinesData = await hotlinesRes.json();

      const normalizedContacts = (Array.isArray(contactsData) ? contactsData : []).map((c: any) => ({
        ...c,
        source: 'contact',
        name: c.description?.split('\n')[0] || 'Agency Contact', // fallback name
        isPublic: false
      }));

      const normalizedHotlines = (hotlinesData.success ? hotlinesData.data : []).map((h: any) => ({
        ...h,
        source: 'hotline',
        isPublic: true
      }));

      setEntries([...normalizedHotlines, ...normalizedContacts]);
    } catch {
      toast.error('Tactical comms failure: Could not sync directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'Police',
      number: '',
      description: '',
      type: 'Emergency',
      priority: 'Normal',
      image_url: '',
      isPublic: true
    });
    setShowModal(true);
  };

  const handleOpenEdit = (entry: DirectoryEntry) => {
    setEditingItem(entry);
    setFormData({
      name: entry.name || '',
      category: entry.category,
      number: entry.number,
      description: entry.description || '',
      type: entry.type || 'Emergency',
      priority: entry.priority || 'Normal',
      image_url: entry.image_url || '',
      isPublic: entry.isPublic
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Determine endpoint based on isPublic toggle
      const base = formData.isPublic ? 'hotlines' : 'contacts';
      const action = editingItem ? 'update' : 'add';
      const endpoint = `${base}-${action}.php`;
      
      const payload = {
        ...formData,
        id: editingItem?.id,
        created_brgy: isAdmin ? null : brgyName,
        created_by: user?.username
      };

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      if (result.success || result.id) {
        toast.success(editingItem ? 'Protocol Updated' : 'New Entry Enrolled');
        setShowModal(false);
        loadData();
      } else {
        toast.error(result.message || result.error || 'Operation Failed');
      }
    } catch {
      toast.error('Network synchronization failure');
    }
  };

  const handleDelete = async (entry: DirectoryEntry) => {
    if (!confirm('Permanent deletion of this tactical node?')) return;
    try {
      const endpoint = `${entry.source === 'hotline' ? 'hotlines' : 'contacts'}-delete.php`;
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id })
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Node Decommissioned');
        loadData();
      }
    } catch {
      toast.error('Deletion protocol failed');
    }
  };

  const filtered = useMemo(() => entries.filter(e => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = (e.name?.toLowerCase().includes(s) || e.number.includes(s) || e.category.toLowerCase().includes(s) || e.description?.toLowerCase().includes(s));
    const matchesCategory = filterCategory === 'All' || e.category === filterCategory;
    return matchesSearch && matchesCategory;
  }), [entries, searchTerm, filterCategory]);

  const stats = useMemo(() => ({
    total: entries.length,
    public: entries.filter(e => e.isPublic).length,
    internal: entries.filter(e => !e.isPublic).length,
    emergency: entries.filter(e => e.category === 'Emergency/911' || e.type === 'Emergency').length
  }), [entries]);

  return (
    <div className="tactical-page !bg-[#f8fafc]">
      <div className="tactical-container">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl shadow-slate-200">
                <FiZap className="text-blue-400 text-xl" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">COMMS_NETWORK_ACTIVE</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none mt-1">Strategic Directory</h1>
              </div>
            </div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider max-w-xl leading-relaxed">
              Unified command directory for agency coordination, sector partners, and public emergency channels.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
              className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 hover:border-slate-400 transition-all shadow-sm"
            >
              {viewMode === 'grid' ? <FiActivity /> : <FiZap />}
            </button>
            <button onClick={loadData} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 transition-all shadow-sm">
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={handleOpenAdd} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black shadow-xl shadow-slate-200 flex items-center gap-2 active:scale-95 transition-all">
              <FiPlus /> Enroll Node
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Network Nodes', value: stats.total, icon: <FiActivity />, color: 'blue' },
            { label: 'Public Channels', value: stats.public, icon: <FiGlobe />, color: 'emerald' },
            { label: 'Internal Comms', value: stats.internal, icon: <FiLock />, color: 'purple' },
            { label: 'Priority Lines', value: stats.emergency, icon: <FiZap />, color: 'orange' },
          ].map((s, idx) => (
            <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-2xl bg-${s.color}-50 text-${s.color}-600 flex items-center justify-center transition-transform group-hover:scale-110`}>
                  {s.icon}
                </div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Live_Metric</span>
              </div>
              <div className="text-3xl font-black text-slate-900 tabular-nums">{s.value}</div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <input 
              type="text" 
              placeholder="Search by node name, number, or agency..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900/5 transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
            <button 
              onClick={() => setFilterCategory('All')}
              className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filterCategory === 'All' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            >
              All Assets
            </button>
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filterCategory === cat ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Entries Display */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 bg-white border border-slate-100 rounded-3xl animate-pulse" />)}
          </div>
        ) : filtered.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(entry => (
                <div key={`${entry.source}-${entry.id}`} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-105 transition-transform overflow-hidden">
                          {entry.image_url ? (
                            <img src={entry.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <FiActivity className="text-slate-300 text-xl" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${entry.isPublic ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                              {entry.isPublic ? 'PUBLIC_HOTLINE' : 'INTERNAL_CONTACT'}
                            </span>
                          </div>
                          <h3 className="font-black text-slate-900 tracking-tight uppercase mt-1 truncate max-w-[150px]">
                            {entry.name || entry.category}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(entry)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><FiEdit2 size={14} /></button>
                        <button onClick={() => handleDelete(entry)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><FiTrash2 size={14} /></button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-900 shadow-sm">
                            <FiPhone size={14} />
                          </div>
                          <span className="text-lg font-black tracking-tight text-slate-900 group-hover:text-white transition-colors tabular-nums">{entry.number}</span>
                        </div>
                        <a href={`tel:${entry.number}`} className="p-2 bg-white rounded-lg text-slate-900 hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                          <FiExternalLink size={14} />
                        </a>
                      </div>
                      
                      <div className="px-1">
                        <p className="text-xs text-slate-500 font-bold leading-relaxed line-clamp-2">
                          {entry.description || 'No detailed intelligence available for this node.'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{entry.category}</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${entry.priority === 'Critical' ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{entry.priority || 'Normal'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Strategic Node</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Line</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Visibility</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(entry => (
                    <tr key={`${entry.source}-${entry.id}`} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                            {entry.image_url ? <img src={entry.image_url} alt="" className="w-full h-full object-cover" /> : <FiActivity className="text-slate-400" />}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 tracking-tight uppercase text-sm">{entry.name || entry.category}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{entry.priority || 'Operational'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="font-black text-slate-900 tabular-nums tracking-tight">{entry.number}</span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${entry.isPublic ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                          {entry.isPublic ? 'PUBLIC' : 'INTERNAL'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-xs font-bold text-slate-500">{entry.category}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleOpenEdit(entry)} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><FiEdit2 size={14} /></button>
                          <button onClick={() => handleDelete(entry)} className="p-2 text-slate-400 hover:text-red-600 transition-all"><FiTrash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 p-20 text-center flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
              <FiSearch size={40} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">No Intel Found</h3>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-wider mt-2">Zero matching nodes in the strategic directory.</p>
            </div>
            <button onClick={() => {setSearchTerm(''); setFilterCategory('All');}} className="text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] hover:underline">Clear_All_Filters</button>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">{editingItem ? 'Edit Node Protocol' : 'Enroll New Node'}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Directory_Sync_v.4.2</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-900 hover:shadow-md transition-all"><FiX size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agency_Category</label>
                    <select 
                      className="w-full px-5 py-3 border border-slate-200 rounded-2xl bg-slate-50 font-bold text-sm focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Protocol_Line</label>
                    <input 
                      required
                      type="text"
                      className="w-full px-5 py-3 border border-slate-200 rounded-2xl bg-slate-50 font-bold text-sm focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                      placeholder="Number or Extension"
                      value={formData.number}
                      onChange={e => setFormData({...formData, number: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agency_Name</label>
                  <input 
                    required
                    type="text"
                    className="w-full px-5 py-3 border border-slate-200 rounded-2xl bg-slate-50 font-bold text-sm focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                    placeholder="e.g. Santa Cruz PNP HQ"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Priority_Tier</label>
                    <select 
                      className="w-full px-5 py-3 border border-slate-200 rounded-2xl bg-slate-50 font-bold text-sm focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                      value={formData.priority}
                      onChange={e => setFormData({...formData, priority: e.target.value})}
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Public_Exposure</label>
                    <div className="flex items-center gap-3 h-11 bg-slate-50 px-5 rounded-2xl border border-slate-200">
                      <input 
                        type="checkbox" 
                        id="isPublic"
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        checked={formData.isPublic}
                        onChange={e => setFormData({...formData, isPublic: e.target.checked})}
                      />
                      <label htmlFor="isPublic" className="text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer">Mobile App Visible</label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agency_Logo_URL</label>
                  <input 
                    type="text"
                    className="w-full px-5 py-3 border border-slate-200 rounded-2xl bg-slate-50 font-bold text-sm focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                    placeholder="https://..."
                    value={formData.image_url}
                    onChange={e => setFormData({...formData, image_url: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Intelligence_Summary</label>
                  <textarea 
                    className="w-full px-5 py-4 border border-slate-200 rounded-2xl bg-slate-50 font-bold text-sm focus:ring-4 focus:ring-blue-600/5 transition-all outline-none h-24 resize-none"
                    placeholder="Optional agency details..."
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all">Abort</button>
                  <button type="submit" className="flex-1 py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black shadow-xl shadow-slate-200 transition-all">Synchronize_Node</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategicDirectory;
