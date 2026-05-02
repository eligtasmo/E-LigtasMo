import React, { useState, useEffect, useMemo } from 'react';
import PageMeta from "../components/common/PageMeta";
import { FaPhone, FaPlus, FaTrash, FaEdit, FaSearch, FaFilter, FaTimes, FaCheckCircle, FaUserShield, FaGlobe, FaChevronRight } from 'react-icons/fa';
import { FiRefreshCw, FiMoreVertical } from 'react-icons/fi';
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import { toast } from 'react-hot-toast';

interface Contact {
  id: number;
  category: string;
  number: string;
  description: string;
  type: string;
  priority: string;
  created_by: string;
  created_brgy: string | null;
  created_at: string;
}

const CATEGORIES = [
  "Police", "Fire", "Medical/Health", "Rescue/DRRMO", "Coast/Water", "Emergency/911", "Barangay Coordinator", "Other"
];

const TacticalContactManager = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const brgyName = user?.brgy_name;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    category: "Police",
    number: "",
    description: "",
    type: "Emergency",
    priority: "Normal"
  });

  const loadContacts = async () => {
    try {
      setLoading(true);
      const url = isAdmin ? 'contacts-list.php' : `contacts-list.php?brgy=${encodeURIComponent(brgyName || '')}`;
      const res = await apiFetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setContacts(data);
      }
    } catch (error) {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      category: "Police",
      number: "",
      description: "",
      type: "Emergency",
      priority: "Normal"
    });
    setShowModal(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setIsEditing(true);
    setCurrentId(contact.id);
    setFormData({
      category: contact.category,
      number: contact.number,
      description: contact.description || "",
      type: contact.type || "Emergency",
      priority: contact.priority || "Normal"
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.number || !formData.category) {
      toast.error("Category and Number are required");
      return;
    }

    try {
      const endpoint = isEditing ? 'contacts-update.php' : 'contacts-add.php';
      const payload = {
        ...formData,
        id: currentId,
        created_brgy: isEditing ? undefined : (isAdmin ? null : brgyName),
        created_by: user?.username
      };

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.id || result.success) {
        toast.success(isEditing ? "Contact updated" : "Contact added");
        setShowModal(false);
        loadContacts();
      } else {
        toast.error(result.error || "Action failed");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      const res = await apiFetch('contacts-delete.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Contact deleted");
        loadContacts();
      } else {
        toast.error(result.error || "Delete failed");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = 
        c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = filterCategory === "All" || c.category === filterCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [contacts, searchTerm, filterCategory]);

  return (
    <>
      <PageMeta title="Contact Directory | Command Center" />
      <div className="flex flex-col gap-6 p-4 font-jetbrains">
        {/* Tactical Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-black p-6 rounded-3xl text-white shadow-2xl border border-white/10 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black tracking-[0.3em] text-emerald-500 uppercase">Communications Active</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase leading-none mb-2">
              Contact <span className="text-gray-500 text-xl font-medium tracking-normal">Directory Console</span>
            </h1>
            <p className="text-gray-400 text-sm font-medium max-w-xl">
              {isAdmin ? "Global emergency and inter-barangay communication management." : `Local coordinator and emergency directory for ${brgyName}.`}
            </p>
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <button 
              onClick={loadContacts}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Sync
            </button>
            <button 
              onClick={handleOpenAdd}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black tracking-widest uppercase text-xs shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center gap-2"
            >
              <FaPlus /> Add New Contact
            </button>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text"
              placeholder="Search by name, number, or description..."
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select 
              className="px-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-xs uppercase tracking-widest cursor-pointer"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>

        {/* Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-48 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-3xl" />
            ))
          ) : filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => {
              const isGlobal = !contact.created_brgy;
              const isMine = contact.created_brgy === brgyName;
              const canManage = isAdmin || isMine;

              const getTacticalIcon = (cat: string) => {
                const c = cat.toLowerCase();
                if (c.includes('fire')) return { icon: <FaPlus className="text-orange-500" />, color: 'bg-orange-500/10', border: 'border-orange-500/20' };
                if (c.includes('police')) return { icon: <FaUserShield className="text-blue-500" />, color: 'bg-blue-500/10', border: 'border-blue-500/20' };
                if (c.includes('medical') || c.includes('health')) return { icon: <FaCheckCircle className="text-red-500" />, color: 'bg-red-500/10', border: 'border-red-500/20' };
                if (c.includes('rescue') || c.includes('drrmo')) return { icon: <FaUserShield className="text-emerald-500" />, color: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
                if (c.includes('coast') || c.includes('water')) return { icon: <FaGlobe className="text-cyan-500" />, color: 'bg-cyan-500/10', border: 'border-cyan-500/20' };
                if (c.includes('emergency') || c.includes('911')) return { icon: <FaPhone className="text-red-600 animate-pulse" />, color: 'bg-red-600/10', border: 'border-red-600/20' };
                return { icon: <FaPhone className="text-gray-500" />, color: 'bg-gray-500/10', border: 'border-gray-500/20' };
              };

              const style = getTacticalIcon(contact.category);

              return (
                <div key={contact.id} className={`bg-white dark:bg-gray-900 border ${style.border} rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden`}>
                  <div className={`absolute -right-4 -top-4 w-24 h-24 ${style.color} rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity`} />
                  
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      isGlobal ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      {isGlobal ? 'Global Asset' : `${contact.created_brgy} Auth`}
                    </span>
                    {canManage && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(contact)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-emerald-500"><FaEdit /></button>
                        <button onClick={() => handleDelete(contact.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-red-500"><FaTrash /></button>
                      </div>
                    )}
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-black tracking-tight mb-1 truncate uppercase">{contact.category}</h3>
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black mb-3">
                          <span className="p-1.5 rounded-lg bg-emerald-500/10">
                            {style.icon}
                          </span>
                          <span className="text-base tabular-nums tracking-widest">{contact.number}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 h-8 font-medium">
                      {contact.description || "Active emergency response resource."}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between relative z-10">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                      Synced {new Date(contact.created_at).toLocaleDateString()}
                    </span>
                    <button 
                      onClick={() => window.open(`tel:${contact.number}`)}
                      className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                      Call <FaChevronRight />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
              <div className="text-5xl">📵</div>
              <div>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No Signal Detected</p>
                <p className="text-gray-500 text-sm">Refine your search or add a new tactical contact.</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Modal */}
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-800">
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">
                    {isEditing ? "Modify" : "Provision"} <span className="text-emerald-500">Contact</span>
                  </h2>
                  <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-black transition-all">
                    <FaTimes />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Category Segment</label>
                    <select 
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-sm"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Tactical Number</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-emerald-500 transition-all font-mono font-bold"
                      placeholder="e.g. 0917 XXX XXXX"
                      value={formData.number}
                      onChange={(e) => setFormData({...formData, number: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Resource Description</label>
                    <textarea 
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-emerald-500 transition-all text-sm h-24 resize-none"
                      placeholder="Identify the coordinator or station details..."
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="py-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all"
                    >
                      Abort
                    </button>
                    <button 
                      type="submit"
                      className="py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                    >
                      {isEditing ? "Sync Changes" : "Deploy Contact"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TacticalContactManager;
