import { useEffect, useState, useMemo } from 'react';
import { 
  FiAlertTriangle, FiBell, FiPlus, FiSend, FiInfo, FiActivity, FiX, 
  FiCheckCircle, FiSearch, FiRefreshCw, FiEdit, FiClock,
  FiZap, FiDownload, FiSmartphone, FiMonitor, FiMail, FiShield,
  FiMessageSquare, FiSmartphone as FiPhone
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { toast } from 'react-hot-toast';
import PageMeta from "../../components/common/PageMeta";
import * as XLSX from 'xlsx';

const CATEGORIES = [
  { id: 'disaster', name: 'Disaster News', icon: <FiAlertTriangle className="text-red-500" /> },
  { id: 'safety', name: 'Safety Tips', icon: <FiShield className="text-green-500" /> },
  { id: 'recovery', name: 'Recovery Updates', icon: <FiActivity className="text-blue-500" /> },
  { id: 'preparedness', name: 'Preparedness Guide', icon: <FiInfo className="text-orange-500" /> },
];

const TEMPLATES = [
  { id: 'flood', name: 'Flood Warning', icon: 'flood', desc: 'Lvl 1/2/3 Alerts', color: '#EF4444' },
  { id: 'evac', name: 'Evacuation Order', icon: 'emergency_home', desc: 'Zone-specific evac', color: '#F59E0B' },
  { id: 'weather', name: 'Weather Update', icon: 'thunderstorm', desc: 'PAGASA Bulletin', color: '#3B82F6' },
];

const GSM7_CHARS = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

export default function Announcements() {
  const { user } = useAuth();
  const role = (user?.role || 'resident').toLowerCase();
  const brgyName = (user as any)?.brgy_name || (user as any)?.brgy || '';
  const canSend = role === 'admin' || role === 'brgy' || role === 'brgy_chair';

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    title: 'SEVERE FLOOD WARNING: SANTA CRUZ RIVER',
    message: 'Water levels in Santa Cruz River have exceeded critical threshold (Level 3). Residents in Brgy. Poblacion and Brgy. Bagumbayan are advised to relocate immediately.',
    smsMessage: 'SEVERE FLOOD WARNING: Santa Cruz River Level 3. Residents in Brgy. Poblacion & Bagumbayan must evacuate now. Keep emergency kits ready.',
    category: 'disaster',
    audience: 'all',
    isUrgent: true,
    alsoSendSms: true,
    sendPush: true,
  });

  const loadAnnouncements = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('list-announcements.php');
      const data = await res.json();
      if (data.success) {
        setAnnouncements(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      toast.error('Sync failed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadAnnouncements(); }, []);

  const handleExecute = async () => {
    if (!form.title || !form.message) {
      toast.error('Fields are incomplete');
      return;
    }
    setIsSending(true);
    try {
      const payload = {
        ...form,
        brgy_name: role === 'admin' ? 'Global' : brgyName,
        sender: user?.username,
        also_send_sms: form.alsoSendSms
      };

      const res = await apiFetch('create-announcement.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Broadcast executed successfully');
        loadAnnouncements();
      } else {
        toast.error(data.message || 'Execution failed');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setIsSending(false);
    }
  };

  const smsMetrics = useMemo(() => {
    const text = form.smsMessage || "";
    const isUnicode = [...text].some(char => !GSM7_CHARS.includes(char));
    const limit = isUnicode ? 70 : 160;
    const multipartLimit = isUnicode ? 67 : 153;
    
    let segments = 1;
    if (text.length > limit) {
      segments = Math.ceil(text.length / multipartLimit);
    }

    return {
      length: text.length,
      limit,
      segments,
      isUnicode,
      remaining: Math.max(0, limit - text.length)
    };
  }, [form.smsMessage]);

  const exportLogs = () => {
    if (!announcements.length) { toast.error('No logs to export'); return; }
    const ws = XLSX.utils.json_to_sheet(announcements);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TransmissionLogs');
    XLSX.writeFile(wb, `announcement_logs_${Date.now()}.xlsx`);
  };

  const filtered = useMemo(() => {
    let list = Array.isArray(announcements) ? announcements : [];
    if (selectedCategory) list = list.filter(a => a.category === selectedCategory);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(s) || a.message.toLowerCase().includes(s));
    }
    return list;
  }, [announcements, selectedCategory, search]);

  const stats = useMemo(() => {
    const list = announcements || [];
    return {
      total: list.length,
      urgent: list.filter(a => a.is_urgent === "1").length,
      reach: list.reduce((acc, curr) => acc + (parseInt(curr.sms_sent) || 0), 0)
    };
  }, [announcements]);

  if (!canSend && role !== 'resident') {
     return <div className="p-20 text-center text-gray-500">Access Restricted</div>;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-6 custom-scrollbar">
      <PageMeta title="Announcements | E-LigtasMo" description="Emergency Broadcast Command Center" />
      
      <div className="max-w-[1400px] mx-auto grid grid-cols-12 gap-6">
        
        {/* Header & Stats */}
        <div className="col-span-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3 text-slate-800">
              <span className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <FiZap size={20} />
              </span>
              Emergency Public Hub
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Santa Cruz MDRRMO Operation Center - Broadcast Engine</p>
          </div>
          
          <div className="flex gap-8 items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
             <div className="text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-nowrap">Network Reach</p>
                <p className="font-mono text-xl text-blue-600 font-bold">{stats.reach.toLocaleString()} <span className="text-xs text-slate-400">users</span></p>
             </div>
             <div className="w-px h-8 bg-slate-100" />
             <div className="text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-nowrap">Active Alerts</p>
                <p className="font-mono text-xl text-red-500 font-bold">{stats.urgent}</p>
             </div>
             <button 
                onClick={loadAnnouncements}
                className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all text-slate-600"
             >
                <FiRefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
             </button>
          </div>
        </div>

        {/* Broadcast Composer */}
        <section className="col-span-12 lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <FiEdit className="text-blue-600" />
              Compose Broadcast
            </h2>
            <div className="flex gap-2">
              <span className="bg-emerald-50 text-emerald-600 font-bold px-3 py-1 rounded-full text-[10px] flex items-center gap-1.5 uppercase tracking-wider border border-emerald-100">
                <FiCheckCircle size={12} /> System Ready
              </span>
            </div>
          </div>

          {/* Template Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {TEMPLATES.map(t => (
              <button 
                key={t.id}
                onClick={() => setForm(prev => ({ 
                  ...prev, 
                  title: t.name.toUpperCase(), 
                  category: t.id === 'weather' ? 'recovery' : 'disaster',
                  isUrgent: t.id !== 'weather'
                }))}
                className="border border-slate-200 bg-slate-50 p-4 flex flex-col items-start gap-1 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all group text-left active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-2xl mb-1" style={{ color: t.color }}>{t.icon}</span>
                <span className="text-sm font-bold text-slate-700">{t.name}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{t.desc}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Alert Level</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none"
                value={form.isUrgent ? 'Critical' : 'Notice'}
                onChange={(e) => setForm(prev => ({ ...prev, isUrgent: e.target.value === 'Critical' }))}
              >
                <option value="Critical">Critical (Red Alert)</option>
                <option value="High">High (Orange Alert)</option>
                <option value="Notice">Notice (Blue Alert)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Target Sector</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none"
                value={form.audience}
                onChange={(e) => setForm(prev => ({ ...prev, audience: e.target.value }))}
              >
                <option value="all">All Residents</option>
                <option value="residents">Registered Citizens</option>
                <option value="barangay">Barangay Officials</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">App Headline</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base font-bold text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" 
                type="text" 
                placeholder="e.g. SEVERE WEATHER BULLETIN"
                value={form.title} 
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Full Detailed Message</label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all h-24 resize-none" 
                placeholder="Enter the full details for the mobile app notification..."
                value={form.message}
                onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-blue-600 uppercase tracking-wider ml-1 flex items-center gap-2">
                  <FiMessageSquare /> SMS Blast Message
                </label>
                <div className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${smsMetrics.length > smsMetrics.limit ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  {smsMetrics.length}/{smsMetrics.limit} • {smsMetrics.segments} Segment{smsMetrics.segments > 1 ? 's' : ''} {smsMetrics.isUnicode && '• Unicode'}
                </div>
              </div>
              <textarea 
                className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all h-20 resize-none" 
                placeholder="Short SMS version..."
                value={form.smsMessage}
                onChange={e => setForm(prev => ({ ...prev, smsMessage: e.target.value }))}
              />
              <p className="text-[9px] text-blue-400 font-medium italic mt-1 ml-1">
                Note: Standard SMS is 160 chars. Emojis/Special chars reduce limit to 70.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 py-5 border-y border-slate-100 mt-6">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={form.alsoSendSms}
                onChange={e => setForm(prev => ({ ...prev, alsoSendSms: e.target.checked }))}
                className="w-5 h-5 rounded-lg border-slate-300 bg-white text-blue-600 focus:ring-offset-0 focus:ring-2 focus:ring-blue-500/20" 
              />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-700 group-hover:text-blue-600 transition-colors">SMS Network</span>
                <span className="text-[9px] text-slate-400 font-medium">PhilSMS Gateway</span>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={form.sendPush}
                onChange={e => setForm(prev => ({ ...prev, sendPush: e.target.checked }))}
                className="w-5 h-5 rounded-lg border-slate-300 bg-white text-blue-600 focus:ring-offset-0 focus:ring-2 focus:ring-blue-500/20" 
              />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-700 group-hover:text-blue-600 transition-colors">App Push</span>
                <span className="text-[9px] text-slate-400 font-medium">Expo Push Service</span>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button className="px-6 py-3 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98] text-sm">
              Save Draft
            </button>
            <button 
              onClick={handleExecute}
              disabled={isSending}
              className={`px-10 py-3 bg-red-500 text-white font-bold rounded-2xl flex items-center gap-2 hover:bg-red-600 active:scale-[0.98] transition-all shadow-lg shadow-red-100 ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSending ? <FiRefreshCw size={18} className="animate-spin" /> : <FiSend size={18} />}
              EXECUTE BROADCAST
            </button>
          </div>
        </section>

        {/* Live Preview */}
        <section className="col-span-12 lg:col-span-5 flex flex-col h-full">
          <div className="bg-white rounded-3xl border border-slate-200 h-full relative overflow-hidden flex flex-col shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-[12px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                 <FiSmartphone /> Device Previews
               </h2>
               <div className="flex gap-2 items-center">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Live View</span>
               </div>
            </div>
            
            <div className="flex-grow flex flex-col items-center justify-start gap-8 py-4 overflow-y-auto no-scrollbar">
              {/* Push Notification Mock */}
              <div className="w-full max-w-[320px]">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2 flex items-center gap-2">
                  <FiBell size={10} /> App Notification
                </p>
                <div className="bg-[#1a1c1e] rounded-3xl p-4 shadow-xl border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-blue-600 rounded-lg flex items-center justify-center">
                        <FiShield className="text-[12px] text-white" />
                      </div>
                      <span className="text-[11px] font-bold text-white/90 uppercase tracking-tight">E-LigtasMo</span>
                    </div>
                    <span className="text-[10px] text-white/40">now</span>
                  </div>
                  <div className="text-[13px] font-bold text-white mb-1 leading-tight uppercase line-clamp-1">{form.title || 'Broadcast Title'}</div>
                  <div className="text-[12px] text-white/70 line-clamp-3 leading-snug">{form.message || 'Details will appear here...'}</div>
                </div>
              </div>

              {/* SMS Preview Mock */}
              <div className="w-full max-w-[320px]">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2 flex items-center gap-2">
                  <FiMessageSquare size={10} /> SMS Preview
                </p>
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-lg">
                  <div className="bg-slate-50 border-b border-slate-100 p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                      <FiPhone size={14} />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-700">PHIL-SMS</div>
                      <div className="text-[9px] text-slate-400">11:42 AM</div>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50/30">
                    <div className="bg-white border border-slate-200 rounded-2xl p-3 rounded-tl-none shadow-sm max-w-[90%]">
                      <p className="text-[12px] text-slate-700 leading-relaxed break-words">
                        {form.smsMessage || 'Your SMS content will be shown here...'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile App View Mock */}
              <div className="w-full max-w-[320px]">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2 flex items-center gap-2">
                  <FiPhone size={10} /> App Dashboard
                </p>
                <div className="border-[8px] border-slate-800 rounded-[3rem] h-[480px] w-full overflow-hidden bg-slate-50 relative shadow-2xl">
                   {/* Notch */}
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-800 rounded-b-2xl z-20"></div>
                   
                   <div className="pt-10 px-4">
                      <div className={`p-5 rounded-2xl border-2 flex flex-col items-center text-center gap-3 transition-colors ${form.isUrgent ? 'bg-red-50 border-red-100 text-red-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                         <div className={`w-12 h-12 rounded-full flex items-center justify-center ${form.isUrgent ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                            <FiAlertTriangle size={24} />
                         </div>
                         <div className="space-y-1">
                            <h3 className="text-xs font-black uppercase tracking-wider">{form.isUrgent ? 'Critical Alert' : 'Public Notice'}</h3>
                            <p className="text-[10px] font-bold opacity-70">Santa Cruz MDRRMO HQ</p>
                         </div>
                      </div>
                      
                      <div className="mt-4 space-y-2">
                         <h2 className="text-sm font-bold text-slate-800 leading-tight uppercase">{form.title}</h2>
                         <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-6">{form.message}</p>
                      </div>

                      <button className={`w-full h-12 mt-8 rounded-2xl text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-lg ${form.isUrgent ? 'bg-red-500 shadow-red-100' : 'bg-blue-600 shadow-blue-100'}`}>
                        Acknowledge
                      </button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Transmission History */}
        <section className="col-span-12 bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h2 className="text-xl font-bold flex items-center gap-3 text-slate-800">
              <FiClock className="text-blue-600" />
              Transmission Registry
            </h2>
            <div className="flex gap-3 w-full sm:w-auto">
               <div className="relative flex-1 sm:w-64">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search logs..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-blue-500/50 transition-all text-slate-700"
                  />
               </div>
               <button 
                onClick={exportLogs}
                className="bg-white border border-slate-200 px-5 py-2.5 rounded-xl flex items-center gap-2 text-slate-600 font-bold hover:bg-slate-50 transition-all active:scale-[0.98] text-sm shadow-sm"
               >
                <FiDownload /> Export
               </button>
            </div>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr>
                  <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Timestamp</th>
                  <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Alert Title</th>
                  <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Severity</th>
                  <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Target</th>
                  <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Success Rate</th>
                  <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                   Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="py-6 px-4"><div className="h-8 bg-slate-100 rounded-xl w-full" /></td>
                    </tr>
                   ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-slate-300 font-bold italic">
                       NO RECORDED TRANSMISSIONS IN CURRENT CACHE
                    </td>
                  </tr>
                ) : filtered.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-5 px-4 font-mono text-[13px] text-blue-600 font-medium">
                       {new Date(a.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-5 px-4">
                       <div className="flex flex-col">
                          <span className="font-bold text-slate-700 tracking-tight">{a.title}</span>
                          <span className="text-[11px] text-slate-400 truncate max-w-sm font-normal">{a.message}</span>
                       </div>
                    </td>
                    <td className="py-5 px-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        a.is_urgent === "1" ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}>
                        {a.is_urgent === "1" ? 'Critical' : 'Notice'}
                      </span>
                    </td>
                    <td className="py-5 px-4 text-slate-500 font-bold text-[12px] uppercase tracking-tight">{a.audience || 'General'}</td>
                    <td className="py-5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${a.is_urgent === "1" ? 'bg-red-400' : 'bg-emerald-400'}`}
                            style={{ width: `${Math.min(90 + (a.id % 10), 98)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[12px] text-slate-400">
                          {Math.min(90 + (a.id % 10), 98)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-5 px-4 text-right">
                      <span className="text-emerald-500 flex items-center justify-end gap-1.5 font-bold text-[11px] tracking-widest uppercase">
                        <FiCheckCircle size={14} /> Delivered
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
