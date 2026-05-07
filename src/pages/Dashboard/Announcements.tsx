import { useEffect, useState, useMemo } from 'react';
import { FiAlertTriangle, FiBell, FiPlus, FiSend, FiLink, FiInfo, FiLayers, FiActivity, FiX, FiCheckCircle, FiGlobe, FiFilter, FiExternalLink, FiChevronRight } from 'react-icons/fi';
import { FaBoxes, FaWind, FaExclamationCircle } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { toast } from 'react-hot-toast';

const CATEGORIES = [
  { id: 'general', name: 'General News', icon: <FiInfo />, color: 'blue' },
  { id: 'typhoon', name: 'Typhoon Update', icon: <FaWind />, color: 'sky' },
  { id: 'relief', name: 'Relief Operation', icon: <FaBoxes />, color: 'emerald' },
  { id: 'incident', name: 'Incident Alert', icon: <FaExclamationCircle />, color: 'red' },
];

export default function Announcements() {
  const { user } = useAuth();
  const role = (user?.role || 'resident').toLowerCase();
  const brgyName = (user as any)?.brgy_name || (user as any)?.brgy || '';
  const canSend = role === 'admin' || role === 'brgy' || role === 'brgy_chair';
  
  const [showModal, setShowModal] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const [form, setForm] = useState({ 
    title: '', 
    message: '', 
    type: 'info', 
    audience: 'All Residents', 
    category: 'general',
    externalLink: '',
    isUrgent: false
  });

  const [phase, setPhase] = useState<'compose'|'confirm'>('compose');
  const [existing, setExisting] = useState<any | null>(null);

  const loadAnnouncements = async () => {
    setIsLoading(true);
    try {
      const aud = role === 'admin' ? 'all' : (role.includes('brgy') ? 'barangay' : 'residents');
      const brgyParam = brgyName && aud !== 'all' ? `&brgy=${encodeURIComponent(brgyName)}` : '';
      const res = await apiFetch(`list-announcements.php?audience=${encodeURIComponent(aud)}&limit=100${brgyParam}`, { headers: { 'X-Role': role } });
      const data = await res.json();
      if (data.success) {
        setAnnouncements(data.announcements || []);
      }
    } catch {
      toast.error("Failed to load feed sync.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAnnouncements = useMemo(() => {
    if (!selectedCategory) return announcements;
    return announcements.filter(a => a.category === selectedCategory);
  }, [announcements, selectedCategory]);

  useEffect(() => { loadAnnouncements(); }, [role]);

  const handleSend = async () => {
    if (!form.title || !form.message) {
      toast.error("Title and message are required.");
      return;
    }

    try {
      const audience = form.audience === 'Barangay Only' ? 'barangay' : (form.audience === 'All Residents' ? 'residents' : 'all');
      
      // If it's an urgent alert, we also create a notification
      const endpoint = form.isUrgent ? 'create-notification.php' : 'create-announcement.php';
      
      const payload = { 
        title: form.title, 
        message: form.message, 
        type: form.isUrgent ? 'error' : form.type, 
        audience,
        category: form.category,
        external_link: form.externalLink,
        is_urgent: form.isUrgent ? 1 : 0
      };

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Role': role },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!data.success && data.existing && data.id) {
        setExisting({ id: data.id });
        setPhase('confirm');
        return;
      } else if (!data.success) {
        throw new Error('Failed announcement');
      }

      toast.success(form.isUrgent ? "Urgent Alert Broadcasted!" : "Announcement Published.");
      setShowModal(false);
      resetForm();
      loadAnnouncements();
    } catch {
      toast.error("Network communication failure.");
    }
  };

  const confirmUpdate = async () => {
    if (!existing) return;
    try {
      const audience = form.audience === 'Barangay Only' ? 'barangay' : (form.audience === 'All Residents' ? 'residents' : 'all');
      const endpoint = form.isUrgent ? 'create-notification.php' : 'create-announcement.php';
      
      const payload = { 
        title: form.title, 
        message: form.message, 
        type: form.isUrgent ? 'error' : form.type, 
        audience,
        category: form.category,
        external_link: form.externalLink,
        is_urgent: form.isUrgent ? 1 : 0,
        overwrite: true,
        existing_id: existing.id
      };

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Role': role },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success("Broadcast Overwritten & Synced.");
        setShowModal(false);
        resetForm();
        loadAnnouncements();
      } else {
        throw new Error('Overwrite failed');
      }
    } catch {
      toast.error("Critical update synchronization failure.");
    }
  };

  const resetForm = () => {
    setForm({ 
      title: '', 
      message: '', 
      type: 'info', 
      audience: 'All Residents', 
      category: 'general',
      externalLink: '',
      isUrgent: false
    });
    setExisting(null);
    setPhase('compose');
  };

  const getCategoryIcon = (catId: string) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    return cat ? cat.icon : <FiInfo />;
  };

  return (
    <div className="tactical-page">
      <div className="tactical-container">
        
        {/* Header Section */}
        <div className="tactical-header">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="tactical-status-pill mb-4">
                <div className="tactical-status-dot bg-blue-500 animate-pulse" />
                <span>COMMS_HUB: {user?.brgy_name?.toUpperCase() || 'SANTA CRUZ'}</span>
              </div>
              <h1 className="tactical-title">Announcements & Alerts</h1>
              <p className="tactical-subtitle">Unified broadcast center for public information, disaster advisories, and relief operation updates.</p>
            </div>
            {canSend && (
              <button 
                onClick={() => setShowModal(true)}
                className="tactical-button-accent"
              >
                <FiPlus /> New Broadcast
              </button>
            )}
          </div>
        </div>

        {/* Metrics Section - More Compact */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active Broadcasts', value: announcements.length, icon: <FiBell />, color: 'blue' },
            { label: 'Urgent Alerts', value: announcements.filter(a => a.is_urgent === "1").length, icon: <FiAlertTriangle />, color: 'red' },
            { label: 'Sync Status', value: '100%', icon: <FiActivity />, color: 'emerald' },
            { label: 'Reach', value: 'Live', icon: <FiGlobe />, color: 'sky' },
          ].map((m, i) => (
            <div key={i} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-4">
              <div className={`p-2.5 rounded-xl bg-${m.color}-50 text-${m.color}-600`}>
                {m.icon}
              </div>
              <div>
                <div className="text-xl font-black text-slate-900 tracking-tight">{m.value}</div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{m.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters - More Presence, Wider */}
          <div className="lg:w-80 flex-shrink-0 space-y-6">
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm sticky top-6">
              <div className="flex items-center gap-2 mb-6">
                <FiFilter className="text-slate-900" size={14} />
                <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Intel_Filters</h2>
              </div>
              
              <div className="space-y-2">
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all group ${!selectedCategory ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  <div className="flex items-center gap-3">
                    <FiLayers size={14} className={!selectedCategory ? 'text-blue-400' : 'text-slate-400'} />
                    <span className="text-[10px] font-black uppercase tracking-widest">All Intelligence</span>
                  </div>
                </button>

                {CATEGORIES.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all group ${selectedCategory === cat.id ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-base transition-transform group-hover:scale-110 ${selectedCategory === cat.id ? 'text-blue-400' : `text-${cat.color}-600`}`}>{cat.icon}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">{cat.name}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-1 h-1 rounded-full bg-blue-500" />
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Comms_Status</span>
                </div>
                <p className="text-[8px] font-bold text-slate-400 leading-relaxed uppercase tracking-tighter italic">
                  Feed is synchronized with regional command nodes in real-time.
                </p>
              </div>
            </div>
          </div>

          {/* Main Feed - More Compact Cards */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Operational_Feed</span>
              </div>
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest tabular-nums">Assets: {filteredAnnouncements.length}</span>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-40 bg-white border border-slate-100 rounded-3xl animate-pulse" />
                ))}
              </div>
            ) : filteredAnnouncements.length > 0 ? (
              <div className="space-y-4">
                {filteredAnnouncements.map((a: any) => {
                  const cat = CATEGORIES.find(c => c.id === a.category);
                  const isUrgent = a.is_urgent === "1";
                  
                  return (
                    <div 
                      key={a.id} 
                      className={`group relative bg-white rounded-3xl border transition-all hover:shadow-xl ${isUrgent ? 'border-red-100 shadow-lg shadow-red-50/50' : 'border-slate-100 shadow-sm'}`}
                    >
                      <div className="p-6">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl border transition-all group-hover:scale-110 ${isUrgent ? 'bg-red-50 text-red-600 border-red-100 shadow-lg shadow-red-100' : 'bg-slate-50 text-slate-600 border-slate-100 shadow-inner'}`}>
                              {getCategoryIcon(a.category)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isUrgent ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
                                  {isUrgent ? 'URGENT' : cat?.name.toUpperCase() || 'INFO'}
                                </span>
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest tabular-nums">
                                  {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase group-hover:text-blue-600 transition-colors line-clamp-1">
                                {a.title}
                              </h3>
                            </div>
                          </div>
                          
                          <div className="flex md:flex-col items-center md:items-end gap-2 md:gap-0">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{a.audience?.toUpperCase()}</span>
                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter italic tabular-nums">{new Date(a.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="relative pl-4 border-l-2 border-slate-100 group-hover:border-blue-200 transition-colors">
                          <p className="text-sm text-slate-600 font-bold leading-relaxed line-clamp-3">
                            {a.message}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-50">
                          {a.external_link ? (
                            <a 
                              href={a.external_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-blue-600 shadow-lg shadow-slate-200 transition-all active:scale-95"
                            >
                              <FiLink size={10} /> Intel_Source <FiExternalLink size={10} />
                            </a>
                          ) : <div />}
                          
                          <div className="flex items-center gap-2">
                             <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">Ref: {a.id}</span>
                             {isUrgent && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center flex flex-col items-center gap-4 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                  <FiBell size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Strategic_Silence</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1">Zero active broadcasts.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Broadcast Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200">
                  <FiSend size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                    {phase === 'confirm' ? 'Confirm Overwrite' : 'New Strategic Broadcast'}
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Comms_Protocol_v.4.2</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowModal(false); setPhase('compose'); }} 
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-900 hover:shadow-md transition-all border border-transparent hover:border-slate-100"
              >
                <FiX size={20} />
              </button>
            </div>

            {phase === 'compose' ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Intel_Category</label>
                    <select 
                      className="w-full px-5 py-3.5 text-sm font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all appearance-none cursor-pointer" 
                      value={form.category} 
                      onChange={e => setForm({ ...form, category: e.target.value })}
                    >
                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target_Audience</label>
                    <select 
                      className="w-full px-5 py-3.5 text-sm font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all appearance-none cursor-pointer" 
                      value={form.audience} 
                      onChange={e => setForm({ ...form, audience: e.target.value })}
                    >
                      <option>All Residents</option>
                      <option>Barangay Only</option>
                      <option>Global Sector</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Broadcast_Title</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full px-5 py-3.5 text-sm font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all placeholder:text-slate-300" 
                    value={form.title} 
                    onChange={e => setForm({ ...form, title: e.target.value })} 
                    placeholder="Subject Heading..." 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Intelligence_Content</label>
                  <textarea 
                    required 
                    className="w-full px-5 py-4 text-sm font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 h-32 resize-none transition-all placeholder:text-slate-300" 
                    value={form.message} 
                    onChange={e => setForm({ ...form, message: e.target.value })} 
                    placeholder="Detailed situational update or advisory..." 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">External_Source_Link (Optional)</label>
                  <div className="relative">
                    <FiLink className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="url" 
                      className="w-full pl-12 pr-5 py-3.5 text-sm font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all placeholder:text-slate-300" 
                      value={form.externalLink} 
                      onChange={e => setForm({ ...form, externalLink: e.target.value })} 
                      placeholder="https://..." 
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-4 p-5 rounded-2xl border border-red-100 bg-red-50/30 cursor-pointer group hover:bg-red-50 transition-all">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${form.isUrgent ? 'bg-red-600 border-red-600' : 'border-red-200 bg-white group-hover:border-red-400'}`}>
                      {form.isUrgent && <FiCheckCircle className="text-white text-sm" />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={form.isUrgent} 
                      onChange={e => setForm({ ...form, isUrgent: e.target.checked })} 
                    />
                    <div>
                      <div className="text-[11px] font-black text-red-600 uppercase tracking-widest">Urgent_Priority_Broadcast</div>
                      <p className="text-[10px] font-bold text-red-400 mt-0.5 uppercase tracking-tighter italic">Trigger push notifications for mission-critical disaster alerts.</p>
                    </div>
                  </label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => { setShowModal(false); resetForm(); }} 
                    className="flex-1 py-4 rounded-2xl border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all"
                  >
                    Abort_Protocol
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-4 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-black shadow-xl shadow-slate-200 active:scale-[0.98] transition-all"
                  >
                    Execute_Broadcast
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-10 text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mx-auto border-4 border-white shadow-xl">
                  <FiAlertTriangle size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Duplicate Intel Detected</h3>
                  <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto">An active broadcast with this title already exists. Overwriting will replace the current situational update.</p>
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setPhase('compose')} 
                    className="flex-1 py-4 rounded-2xl border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Back_To_Comms
                  </button>
                  <button 
                    onClick={confirmUpdate} 
                    className="flex-1 py-4 rounded-2xl bg-orange-600 text-white text-xs font-black uppercase tracking-widest hover:bg-orange-700 shadow-xl shadow-orange-200 transition-all"
                  >
                    Confirm_Overwrite
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const FiChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);
