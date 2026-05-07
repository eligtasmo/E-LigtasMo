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
              <h1 className="tactical-title">Community Alerts</h1>
              <p className="tactical-subtitle">Operational updates, typhoon warnings, and relief schedules for the sector.</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between px-2">
              <span className="tactical-label">Operational Feed</span>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <FiActivity className="animate-pulse text-emerald-500" /> LIVE_SYNCED
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-6">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-40 bg-slate-100 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : filteredAnnouncements.length > 0 ? (
              <div className="space-y-6">
                {filteredAnnouncements.map((a: any) => (
                  <div 
                    key={a.id} 
                    className="tactical-card group hover:translate-y-[-4px] transition-all"
                  >
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl bg-${CATEGORIES.find(c => c.id === a.category)?.color || 'blue'}-50 text-${CATEGORIES.find(c => c.id === a.category)?.color || 'blue'}-600 flex items-center justify-center border border-current/10 shadow-sm transition-transform group-hover:scale-110`}>
                            {getCategoryIcon(a.category)}
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase group-hover:text-blue-600 transition-colors">{a.title}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest tabular-nums">{new Date(a.created_at).toLocaleString()}</span>
                              <div className="w-1 h-1 rounded-full bg-slate-200" />
                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{a.audience?.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>
                        {a.is_urgent === "1" && (
                          <div className="tactical-status-pill !bg-red-50 !text-red-600 !border-red-100">
                            <FiAlertTriangle className="animate-pulse" /> URGENT_PRIORITY
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6">
                        {a.message}
                      </p>

                      <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                        {a.external_link ? (
                          <a 
                            href={a.external_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:translate-x-1 transition-transform"
                          >
                            <FiLink /> Intelligence_Source <FiChevronRight />
                          </a>
                        ) : <div />}
                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                          ID: SCT_TRANS_{a.id}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredAnnouncements.length === 0 && (
                  <div className="tactical-card p-20 text-center flex flex-col items-center gap-6 opacity-40">
                    <FiBell size={48} className="text-slate-300" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">Zero_Active_Broadcasts_In_Feed</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-40 bg-slate-100 animate-pulse rounded-2xl" />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="tactical-card p-8">
              <label className="tactical-label">Filter_Intelligence</label>
              <div className="space-y-3">
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${!selectedCategory ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <FiLayers className="text-lg" />
                    <span className="text-xs font-bold tracking-wide">All Broadasts</span>
                  </div>
                </button>
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all group ${selectedCategory === cat.id ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-lg ${selectedCategory === cat.id ? 'text-white' : `text-${cat.color}-600`}`}>{cat.icon}</span>
                      <span className="text-xs font-bold tracking-wide">{cat.name}</span>
                    </div>
                    <FiChevronRight className={selectedCategory === cat.id ? 'text-white' : 'text-slate-300'} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const FiChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);
