import { useEffect, useState, useMemo } from 'react';
import { FiAlertTriangle, FiBell, FiPlus, FiSend, FiLink, FiInfo, FiLayers, FiActivity, FiX, FiCheckCircle, FiGlobe, FiFilter, FiExternalLink, FiShield, FiRefreshCw } from 'react-icons/fi';
import { FaBoxes, FaWind, FaExclamationCircle } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { toast } from 'react-hot-toast';

const CATEGORIES = [
  { id: 'disaster', name: 'Disaster News', icon: <FaExclamationCircle />, color: 'red' },
  { id: 'safety', name: 'Safety Tips', icon: <FiShield />, color: 'blue' },
  { id: 'recovery', name: 'Recovery Updates', icon: <FiRefreshCw />, color: 'emerald' },
  { id: 'preparedness', name: 'Preparedness Guide', icon: <FiLayers />, color: 'amber' },
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
    category: 'disaster',
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
      category: 'disaster',
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
    <div className="min-h-screen bg-[#f1f5f9] font-['Outfit'] antialiased">
      <div className="flex h-screen overflow-hidden">
        
        {/* Sleek Tactical Sidebar */}
        <div className="w-72 bg-slate-900 flex flex-col border-r border-slate-800 shadow-2xl z-20">
          <div className="p-6 border-b border-slate-800/50">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Comms_Node: {user?.brgy_name || 'Global'}</span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase leading-none">Operations</h1>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
            <div className="px-2 mb-4">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Intelligence_Filters</span>
            </div>
            
            <button 
              onClick={() => setSelectedCategory(null)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group ${!selectedCategory ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
            >
              <FiLayers size={14} />
              <span className="text-[11px] font-bold uppercase tracking-wider">All Intel</span>
            </button>

            {CATEGORIES.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group ${selectedCategory === cat.id ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'}`}
              >
                <span className={`transition-transform group-hover:scale-110 ${selectedCategory === cat.id ? 'text-blue-400' : 'text-slate-500'}`}>{cat.icon}</span>
                <span className="text-[11px] font-bold uppercase tracking-wider">{cat.name}</span>
              </button>
            ))}

            <div className="pt-8 px-2">
              <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <FiActivity size={12} className="text-blue-400" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Network_Status</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-bold text-slate-500 uppercase">Uptime</span>
                    <span className="text-[8px] font-black text-emerald-400">99.9%</span>
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[99%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {canSend && (
            <div className="p-4 border-t border-slate-800/50 bg-slate-900/50 backdrop-blur-md">
              <button 
                onClick={() => setShowModal(true)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-all"
              >
                <FiPlus size={14} /> New Broadcast
              </button>
            </div>
          )}
        </div>

        {/* Main Command Console */}
        <div className="flex-1 flex flex-col h-screen bg-[#f8fafc]">
          
          {/* Compact Top Bar */}
          <div className="bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between z-10 shadow-sm">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational_Status</span>
                <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black uppercase tracking-tighter">Live_Comms</div>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-6">
                {[
                  { label: 'Total', value: announcements.length, color: 'slate' },
                  { label: 'Urgent', value: announcements.filter(a => a.is_urgent === "1").length, color: 'red' },
                  { label: 'Barangay', value: announcements.filter(a => a.audience === 'barangay').length, color: 'blue' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{s.label}:</span>
                    <span className={`text-xs font-black text-${s.color}-600 tabular-nums`}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={loadAnnouncements} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <FiActivity size={16} className={isLoading ? 'animate-spin' : ''} />
              </button>
              <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest tabular-nums">Sync_v4.2.1</div>
            </div>
          </div>

          {/* Feed Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            <div className="max-w-5xl mx-auto space-y-4">
              
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FiLayers size={14} className="text-slate-400" />
                  <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Strategic_Intelligence_Feed</h2>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sort: Latest_First</span>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(n => (
                    <div key={n} className="h-24 bg-white border border-slate-200 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : filteredAnnouncements.length > 0 ? (
                <div className="space-y-2.5">
                  {filteredAnnouncements.map((a: any) => {
                    const cat = CATEGORIES.find(c => c.id === a.category);
                    const isUrgent = a.is_urgent === "1";
                    
                    return (
                      <div 
                        key={a.id} 
                        className={`group relative bg-white border transition-all hover:border-slate-300 hover:shadow-md rounded-2xl overflow-hidden ${isUrgent ? 'border-red-200 shadow-sm shadow-red-50' : 'border-slate-200 shadow-sm'}`}
                      >
                        {isUrgent && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />}
                        
                        <div className="p-4 flex items-center gap-5">
                          <div className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-lg border ${isUrgent ? 'bg-red-50 text-red-600 border-red-100 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                            {getCategoryIcon(a.category)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${isUrgent ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                                {isUrgent ? 'CRITICAL_ALERT' : cat?.name.toUpperCase() || 'INFO'}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter tabular-nums">
                                {new Date(a.created_at).toLocaleDateString()} // {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase truncate group-hover:text-blue-600 transition-colors">
                              {a.title}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed truncate mt-0.5">
                              {a.message}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 pl-4 border-l border-slate-100">
                            <div className="text-right hidden sm:block">
                              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{a.audience?.toUpperCase()}</div>
                              <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest tabular-nums">ID: {a.id}</div>
                            </div>
                            
                            {a.external_link && (
                              <a 
                                href={a.external_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-blue-600 text-slate-400 hover:text-white rounded-lg transition-all shadow-sm border border-slate-100"
                              >
                                <FiExternalLink size={14} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center flex flex-col items-center gap-4 shadow-sm border-dashed">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                    <FiBell size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">Operational_Silence</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Waiting for incoming intelligence updates.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal - Improved Layout */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200 overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
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
                        <option value="All Residents">All Residents</option>
                        <option value="Barangay Only">Barangay Only</option>
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

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(203, 213, 225, 0.4); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.6); }
      `}} />
    </div>
  );
}
