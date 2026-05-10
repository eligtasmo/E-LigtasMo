import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiPhone, FiPlus, FiTrash2, FiEdit2, FiSearch, 
  FiRefreshCw, FiX, FiActivity, FiShield, FiZap,
  FiGlobe, FiLock, FiExternalLink, FiFilter,
  FiLayout, FiList
} from 'react-icons/fi';
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import { toast } from 'react-hot-toast';

interface DirectoryEntry {
  id: number;
  source: 'contact' | 'hotline';
  name?: string; 
  category: string;
  number: string;
  description: string;
  type?: string; 
  priority?: string; 
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
  const brgyName = (user as any)?.brgy_name || (user as any)?.brgy || '';

  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<DirectoryEntry | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

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
      const [contactsRes, hotlinesRes] = await Promise.all([
        apiFetch(isAdmin ? 'contacts-list.php' : `contacts-list.php?brgy=${encodeURIComponent(brgyName || '')}`),
        apiFetch('hotlines-list.php')
      ]);

      const contactsData = await contactsRes.json();
      const hotlinesData = await hotlinesRes.json();

      const normalizedContacts = (Array.isArray(contactsData) ? contactsData : []).map((c: any) => ({
        ...c,
        source: 'contact',
        name: c.name || c.description?.split('\n')[0] || 'Agency Contact',
        isPublic: false
      }));

      const normalizedHotlines = (hotlinesData.success ? hotlinesData.data : []).map((h: any) => ({
        ...h,
        source: 'hotline',
        isPublic: true
      }));

      setEntries([...normalizedHotlines, ...normalizedContacts]);
    } catch {
      toast.error('Sync failed');
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
      isPublic: isAdmin // Default to false for brgy
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
        toast.success(editingItem ? 'Updated' : 'Added');
        setShowModal(false);
        loadData();
      } else {
        toast.error(result.message || 'Failed');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleDelete = async (entry: DirectoryEntry) => {
    if (!confirm('Delete this contact?')) return;
    try {
      const endpoint = `${entry.source === 'hotline' ? 'hotlines' : 'contacts'}-delete.php`;
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id })
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Deleted');
        loadData();
      }
    } catch {
      toast.error('Delete failed');
    }
  };

  const filtered = useMemo(() => {
    const list = Array.isArray(entries) ? entries : [];
    return list.filter(e => {
      const s = searchTerm.toLowerCase();
      const matchesSearch = (e.name?.toLowerCase().includes(s) || e.number.includes(s) || e.category.toLowerCase().includes(s) || e.description?.toLowerCase().includes(s));
      const matchesCategory = filterCategory === 'All' || e.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [entries, searchTerm, filterCategory]);

  const stats = useMemo(() => {
    const list = Array.isArray(entries) ? entries : [];
    return {
      total: list.length,
      public: list.filter(e => e.isPublic).length,
      internal: list.filter(e => !e.isPublic).length,
      emergency: list.filter(e => e.category === 'Emergency/911' || e.type === 'Emergency' || e.priority === 'Critical').length
    };
  }, [entries]);

  return (
    <div className="tactical-page">
      {/* Header */}
      <div className="tactical-header">
        <div>
          <h1 className="tactical-title">{isAdmin ? 'Contact Directory' : 'Barangay Manage Contacts'}</h1>
          <p className="tactical-subtitle">{isAdmin ? 'Agency coordination and public channels.' : `Internal directory for ${brgyName}.`}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
            className="tactical-btn-secondary p-2"
          >
            {viewMode === 'grid' ? <FiList size={18} /> : <FiLayout size={18} />}
          </button>
          <button onClick={loadData} className="tactical-btn-secondary p-2">
            <FiRefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleOpenAdd} className="tactical-btn-primary flex items-center gap-2">
            <FiPlus size={18} /> New Contact
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Contacts', value: stats.total, color: 'text-gray-900' },
          { label: 'Public Lines', value: stats.public, color: 'text-emerald-600' },
          { label: 'Internal Lines', value: stats.internal, color: 'text-blue-600' },
          { label: 'Priority Lines', value: stats.emergency, color: 'text-orange-600' },
        ].map((s, idx) => (
          <div key={idx} className="tactical-card p-6">
            <p className="tactical-stat-label">{s.label}</p>
            <div className={`tactical-stat-value ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 tactical-card p-4 mb-6">
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search contacts..."
            className="tactical-input w-full pl-11 h-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="tactical-input h-10 min-w-[200px]"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      {/* List Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-40 bg-gray-50 border border-gray-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(entry => (
              <div key={`${entry.source}-${entry.id}`} className="tactical-card hover:shadow-md transition-all group overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${entry.isPublic ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                        {entry.isPublic ? 'Public' : 'Internal'}
                      </span>
                      <h3 className="font-bold text-gray-900 text-lg mt-1">{entry.name || entry.category}</h3>
                      <p className="text-xs text-gray-500">{entry.category}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleOpenEdit(entry)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><FiEdit2 size={16} /></button>
                      <button onClick={() => handleDelete(entry)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><FiTrash2 size={16} /></button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 group/phone">
                    <div className="flex items-center gap-3">
                      <FiPhone size={18} className="text-gray-400 group-hover/phone:text-blue-500" />
                      <span className="text-lg font-bold text-gray-900">{entry.number}</span>
                    </div>
                    <a href={`tel:${entry.number}`} className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                      <FiExternalLink size={18} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="tactical-card">
            <table className="tactical-table">
              <thead>
                <tr>
                  <th className="tactical-th">Entity</th>
                  <th className="tactical-th">Phone</th>
                  <th className="tactical-th">Type</th>
                  <th className="tactical-th">Priority</th>
                  <th className="tactical-th text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(entry => (
                  <tr key={`${entry.source}-${entry.id}`} className="hover:bg-gray-50 transition-colors">
                    <td className="tactical-td">
                      <div className="flex flex-col">
                        <span className="font-bold">{entry.name || entry.category}</span>
                        <span className="text-xs text-gray-500">{entry.category}</span>
                      </div>
                    </td>
                    <td className="tactical-td font-bold">{entry.number}</td>
                    <td className="tactical-td">
                      <span className={`text-xs font-bold ${entry.isPublic ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {entry.isPublic ? 'Public' : 'Internal'}
                      </span>
                    </td>
                    <td className="tactical-td text-xs font-medium text-gray-500">{entry.priority || 'Normal'}</td>
                    <td className="tactical-td text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenEdit(entry)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><FiEdit2 size={16} /></button>
                        <button onClick={() => handleDelete(entry)} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><FiTrash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="tactical-card p-20 text-center">
          <FiSearch size={48} className="text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900">No Contacts Found</h3>
          <p className="text-sm text-gray-400 mt-1">Zero matching entries in the directory.</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{editingItem ? 'Edit Contact' : 'New Contact'}</h2>
                <p className="text-sm text-gray-400 mt-1">Update directory information</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"><FiX size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Category</label>
                  <select 
                    className="tactical-input w-full h-11"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Phone Number</label>
                  <input 
                    required
                    type="text"
                    className="tactical-input w-full h-11 bg-white"
                    placeholder="Number"
                    value={formData.number}
                    onChange={e => setFormData({...formData, number: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Agency Name</label>
                <input 
                  required
                  type="text"
                  className="tactical-input w-full h-11 bg-white"
                  placeholder="Name"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Priority</label>
                  <select 
                    className="tactical-input w-full h-11"
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Visibility</label>
                  <label className={`flex items-center gap-4 h-[44px] bg-gray-50 px-4 rounded-xl border border-gray-200 ${!isAdmin ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-gray-300 accent-blue-600"
                      checked={formData.isPublic}
                      disabled={!isAdmin}
                      onChange={e => setFormData({...formData, isPublic: e.target.checked})}
                    />
                    <span className="text-sm font-bold text-gray-700">{isAdmin ? 'App Visible' : 'Restricted to Barangay'}</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Description</label>
                <textarea 
                  className="tactical-input w-full h-24 resize-none bg-white"
                  placeholder="Agency details..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all">Cancel</button>
                <button type="submit" className="tactical-btn-primary flex-1 py-3 h-auto">Save Contact</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategicDirectory;
