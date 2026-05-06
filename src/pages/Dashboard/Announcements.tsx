import { useEffect, useState, useMemo } from 'react';
import { FiAlertTriangle, FiBell, FiPlus, FiSend, FiLink, FiInfo, FiLayers, FiActivity, FiX, FiCheckCircle } from 'react-icons/fi';
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
      const aud = role === 'admin' ? 'all' : (role.includes('brgy') ? 'brgy' : 'residents');
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
      const audience = form.audience === 'Barangay Only' ? 'brgy' : (form.audience === 'All Residents' ? 'residents' : 'all');
      
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
      const audience = form.audience === 'Barangay Only' ? 'brgy' : (form.audience === 'All Residents' ? 'residents' : 'all');
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
    <div className="max-w-5xl mx-auto font-jetbrains">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-8 rounded-[2.5rem] text-gray-900 shadow-xl border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 text-blue-600">
          <FiBell size={100} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[10px] font-bold tracking-tight text-blue-600">Communication hub active</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Community Alerts</h1>
          <p className="text-gray-500 text-sm font-bold">Broadcast operational updates, typhoon warnings, and relief schedules to residents.</p>
        </div>
        {canSend && (
          <button 
            onClick={() => setShowModal(true)}
            className="relative z-10 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold tracking-wide text-xs shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
          >
            <FiPlus /> New Broadcast
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-bold text-gray-500 tracking-wide">Operational Feed</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
              <FiActivity className="animate-pulse text-emerald-500" /> Live Synced
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-32 bg-gray-50 animate-pulse rounded-3xl" />
              ))}
            </div>
          ) : filteredAnnouncements.length > 0 ? (
            <div className="space-y-4">
              {filteredAnnouncements.map((a: any) => (
                <div 
                  key={a.id} 
                  className={`bg-white rounded-3xl border ${a.is_urgent ? 'border-red-500/20 shadow-lg shadow-red-500/5' : 'border-gray-100'} p-6 transition-all hover:shadow-md group`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                        a.category === 'typhoon' ? 'bg-sky-50 text-sky-600' :
                        a.category === 'relief' ? 'bg-emerald-50 text-emerald-600' :
                        a.category === 'incident' ? 'bg-red-50 text-red-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {getCategoryIcon(a.category)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 tracking-tight leading-none">{a.title}</h3>
                          {a.is_urgent === 1 && (
                            <span className="px-2 py-0.5 bg-red-600 text-white text-[8px] font-bold tracking-wide rounded-md">Urgent</span>
                          )}
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 tracking-wide mt-1">
                          {new Date(a.created_at).toLocaleString()} • {a.audience}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">
                    {a.message}
                  </p>
                  {a.external_link && (
                    <a 
                      href={a.external_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[10px] font-bold text-blue-600 tracking-tight hover:underline"
                    >
                      <FiLink /> Source Intelligence
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100 p-12 text-center">
              <FiBell className="mx-auto text-gray-200 mb-4" size={40} />
              <p className="text-gray-400 font-bold tracking-tight text-xs">No active broadcasts found</p>
            </div>
          )}
        </div>

        {/* Categories / Side Info */}
        <div className="space-y-6">
          <div className="bento-card p-6">
            <h2 className="text-xs font-bold text-gray-500 tracking-wide mb-6">Dispatch Filters</h2>
            <div className="space-y-3">
              <button 
                onClick={() => setSelectedCategory(null)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all group ${!selectedCategory ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <FiLayers className={!selectedCategory ? 'text-white' : 'text-gray-400'} />
                  <span className={`text-xs font-bold tracking-wide ${!selectedCategory ? 'text-white' : 'text-gray-700'}`}>All Broadcasts</span>
                </div>
                <FiChevronRight className={!selectedCategory ? 'text-white' : 'text-gray-300'} />
              </button>
              {CATEGORIES.map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all group ${selectedCategory === cat.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-lg ${selectedCategory === cat.id ? 'text-white' : `text-${cat.color}-600`}`}>{cat.icon}</span>
                    <span className={`text-xs font-bold tracking-wide ${selectedCategory === cat.id ? 'text-white' : 'text-gray-700'}`}>{cat.name}</span>
                  </div>
                  <FiChevronRight className={selectedCategory === cat.id ? 'text-white' : 'text-gray-300'} />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden group">
            <div className="absolute -bottom-4 -right-4 text-white/10 rotate-12 transition-transform group-hover:scale-110">
              <FiSend size={100} />
            </div>
            <h3 className="text-lg font-bold tracking-tight mb-2">Direct Notification</h3>
            <p className="text-white/80 text-xs leading-relaxed mb-4">Urgent alerts are pushed directly to resident devices as high-priority interruptions.</p>
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-wide">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Mobile Push Enabled
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetForm} />
          <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden">
            {phase === 'compose' ? (
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">New Tactical Broadcast</h2>
                    <p className="text-xs text-gray-500 font-medium">Configure alert parameters and audience targeting.</p>
                  </div>
                  <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><FiX size={24} /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-[10px] font-bold tracking-wide text-gray-400 mb-2">Category</label>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setForm(f => ({ ...f, category: cat.id }))}
                          className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                            form.category === cat.id 
                            ? `border-${cat.color}-600 bg-${cat.color}-50 text-${cat.color}-600 shadow-sm` 
                            : 'border-gray-100 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-lg">{cat.icon}</span>
                          <span className="text-[10px] font-bold truncate">{cat.name.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold tracking-wide text-gray-400 mb-2">Broadcast Priority</label>
                    <button
                      onClick={() => setForm(f => ({ ...f, isUrgent: !f.isUrgent }))}
                      className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        form.isUrgent 
                        ? 'border-red-600 bg-red-50 text-red-600 shadow-md ring-2 ring-red-100' 
                        : 'border-gray-100 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FiAlertTriangle className={form.isUrgent ? 'animate-pulse' : ''} size={20} />
                        <span className="text-[10px] font-bold tracking-wide">Urgent Alert</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                        form.isUrgent ? 'border-red-600 bg-red-600' : 'border-gray-200'
                      }`}>
                        {form.isUrgent && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-[10px] font-bold tracking-wide text-gray-400 mb-2">Headline</label>
                    <input 
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-sm font-bold placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Enter a compelling subject line..."
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold tracking-wide text-gray-400 mb-2">Intelligence Brief (Message)</label>
                    <textarea 
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-sm font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 transition-all min-h-[120px]"
                      placeholder="Details of the announcement, relief schedule, or incident..."
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold tracking-wide text-gray-400 mb-2">External Intelligence Source (URL)</label>
                    <div className="relative">
                      <FiLink className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="Paste news link from NDRRMC, PAGASA, or relief sources..."
                        value={form.externalLink}
                        onChange={e => setForm(f => ({ ...f, externalLink: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold tracking-wide text-gray-400 mb-2">Audience Targeting</label>
                    <div className="flex gap-2">
                      {['All Residents', 'Barangay Only', 'Everyone'].map(target => (
                        <button
                          key={target}
                          onClick={() => setForm(f => ({ ...f, audience: target }))}
                          className={`flex-1 py-3 rounded-xl border text-[10px] font-bold tracking-wide transition-all ${
                            form.audience === target 
                            ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                            : 'border-gray-100 text-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          {target}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={resetForm} className="flex-1 py-4 text-xs font-bold tracking-wide text-gray-500 hover:bg-gray-50 rounded-2xl transition-all">Cancel</button>
                  <button 
                    onClick={handleSend}
                    className={`flex-1 py-4 rounded-2xl text-white text-xs font-bold tracking-wide shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                      form.isUrgent ? 'bg-red-600 shadow-red-600/20 hover:bg-red-700' : 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-700'
                    }`}
                  >
                    <FiSend /> Broadcast Alert
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <FiAlertTriangle size={40} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">Update Deployment?</h2>
                <p className="text-gray-500 text-sm mb-8">An active broadcast for this audience already exists. Do you want to overwrite it with this new intelligence?</p>
                <div className="flex gap-4">
                  <button onClick={() => setPhase('compose')} className="flex-1 py-4 text-xs font-bold tracking-wide text-gray-500 hover:bg-gray-50 rounded-2xl transition-all">Back to Edit</button>
                  <button 
                    onClick={confirmUpdate}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-xs font-bold tracking-wide shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
                  >
                    Overwrite Sync
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
