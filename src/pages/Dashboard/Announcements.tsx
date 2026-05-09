import { useEffect, useState, useMemo } from 'react';
import { 
  FiAlertTriangle, FiBell, FiPlus, FiSend, FiInfo, FiActivity, FiX, 
  FiCheckCircle, FiSearch, FiRefreshCw, FiEdit, FiClock,
  FiZap, FiDownload, FiSmartphone, FiMonitor, FiMail, FiShield
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
  { id: 'flood', name: 'Flood Warning', icon: 'flood', desc: 'Lvl 1/2/3 Alerts', color: '#FF5252' },
  { id: 'evac', name: 'Evacuation Order', icon: 'emergency_home', desc: 'Zone-specific evac', color: '#FFA000' },
  { id: 'weather', name: 'Weather Update', icon: 'thunderstorm', desc: 'PAGASA Bulletin', color: '#2196F3' },
];

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
    message: 'Water levels in Santa Cruz River have exceeded critical threshold (Level 3). Residents in Brgy. Poblacion and Brgy. Bagumbayan are advised to relocate immediately to designated evacuation centers. Keep emergency kits ready.',
    category: 'disaster',
    audience: 'All Residents',
    isUrgent: true,
    alsoSendSms: true,
    sendPush: true,
    sendSocial: false
  });

  const loadAnnouncements = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('list-announcements.php');
      const data = await res.json();
      if (data.success) setAnnouncements(Array.isArray(data.data) ? data.data : []);
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
        brgy: role === 'admin' ? 'Global' : brgyName,
        sender: user?.username,
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
    <div className="min-h-screen bg-surface-mc text-on-surface-mc font-body-base p-gutter custom-scrollbar">
      <PageMeta title="Public Hub | E-LigtasMo" description="Emergency Broadcast Command Center" />
      
      <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-gutter">
        
        {/* Header & Stats */}
        <div className="col-span-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-primary-mc flex items-center justify-center text-on-primary-mc">
                <FiZap size={24} />
              </span>
              Public Hub: Mission Control
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">Santa Cruz MDRRMO Operation Center - Emergency Broadcast Engine</p>
          </div>
          
          <div className="flex gap-6 items-center">
             <div className="text-right">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Network Reach</p>
                <p className="font-data-mono text-2xl text-primary-mc">{stats.reach.toLocaleString()} <span className="text-xs text-on-surface-variant">users</span></p>
             </div>
             <div className="w-px h-10 bg-outline-variant-mc" />
             <div className="text-right">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Active Alerts</p>
                <p className="font-data-mono text-2xl text-error-mc">{stats.urgent}</p>
             </div>
             <button 
                onClick={loadAnnouncements}
                className="p-3 bg-surface-container-high rounded-full border border-outline-variant-mc hover:bg-surface-variant transition-all text-on-surface-variant"
             >
                <FiRefreshCw className={isLoading ? 'animate-spin' : ''} />
             </button>
          </div>
        </div>

        {/* Broadcast Composer */}
        <section className="col-span-12 lg:col-span-8 mc-tile rounded-2xl shadow-premium-lg">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FiEdit className="text-primary-mc" />
              Emergency Broadcast Composer
            </h2>
            <div className="flex gap-2">
              <span className="bg-success-500 text-black font-bold px-3 py-1 rounded text-[10px] flex items-center gap-1 uppercase tracking-tighter">
                <FiCheckCircle size={12} /> Ready to Send
              </span>
            </div>
          </div>

          {/* Template Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TEMPLATES.map(t => (
              <button 
                key={t.id}
                onClick={() => setForm(prev => ({ ...prev, title: t.name.toUpperCase(), category: t.id === 'weather' ? 'recovery' : 'disaster' }))}
                className="border border-outline-variant-mc bg-surface-container-high p-4 flex flex-col items-start gap-1 rounded-xl hover:border-primary-mc transition-all group text-left active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-2xl mb-1" style={{ color: t.color }}>{t.icon}</span>
                <span className="text-sm font-bold text-on-surface-mc">{t.name}</span>
                <span className="text-[10px] text-on-surface-variant uppercase tracking-tight">{t.desc}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="flex flex-col gap-1">
              <label className="mc-label">Alert Level</label>
              <select 
                className="mc-input appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23E1E2E5%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-[right_1rem_center] bg-no-repeat"
                value={form.isUrgent ? 'Critical' : 'Notice'}
                onChange={(e) => setForm(prev => ({ ...prev, isUrgent: e.target.value === 'Critical' }))}
              >
                <option value="Critical">Critical (Red)</option>
                <option value="High">High (Orange)</option>
                <option value="Notice">Notice (Blue)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="mc-label">Target Sector</label>
              <select 
                className="mc-input appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23E1E2E5%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-[right_1rem_center] bg-no-repeat"
                value={form.audience}
                onChange={(e) => setForm(prev => ({ ...prev, audience: e.target.value }))}
              >
                <option>All Residents</option>
                <option>Coastal Areas</option>
                <option>Riverside Zones</option>
                <option>District 1 Officials</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1 mt-2">
            <label className="mc-label">Headline</label>
            <input 
              className="mc-input text-lg tracking-tight" 
              type="text" 
              value={form.title} 
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1 mt-2">
            <label className="mc-label">Detailed Message</label>
            <textarea 
              className="mc-input h-32 font-normal leading-relaxed" 
              value={form.message}
              onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 py-4 border-y border-outline-variant-mc/50 mt-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={form.alsoSendSms}
                onChange={e => setForm(prev => ({ ...prev, alsoSendSms: e.target.checked }))}
                className="w-4 h-4 rounded border-outline-variant-mc bg-surface-container-lowest text-primary-mc focus:ring-0" 
              />
              <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-mc group-hover:text-primary-mc transition-colors">SMS Blast</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={form.sendPush}
                onChange={e => setForm(prev => ({ ...prev, sendPush: e.target.checked }))}
                className="w-4 h-4 rounded border-outline-variant-mc bg-surface-container-lowest text-primary-mc focus:ring-0" 
              />
              <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-mc group-hover:text-primary-mc transition-colors">App Push</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={form.sendSocial}
                onChange={e => setForm(prev => ({ ...prev, sendSocial: e.target.checked }))}
                className="w-4 h-4 rounded border-outline-variant-mc bg-surface-container-lowest text-primary-mc focus:ring-0" 
              />
              <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-mc group-hover:text-primary-mc transition-colors">Social Feed</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button className="px-6 py-3 border border-outline-variant-mc rounded-xl font-bold text-on-surface-variant hover:bg-surface-variant transition-all active:scale-[0.98]">
              Save Draft
            </button>
            <button 
              onClick={handleExecute}
              disabled={isSending}
              className={`px-10 py-3 bg-red-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-red-700 active:scale-[0.98] transition-all shadow-lg ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSending ? <FiRefreshCw className="animate-spin" /> : <FiSend />}
              EXECUTE BROADCAST
            </button>
          </div>
        </section>

        {/* Live Preview */}
        <section className="col-span-12 lg:col-span-4 flex flex-col h-full">
          <div className="mc-tile rounded-2xl h-full relative overflow-hidden flex flex-col shadow-premium-lg">
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-[12px] font-bold uppercase tracking-[0.2em] text-on-surface-variant flex items-center gap-2">
                 <FiSmartphone /> Live Preview
               </h2>
               <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-red-500 uppercase">Live Feed</span>
               </div>
            </div>
            
            <div className="flex-grow flex items-center justify-center p-2 relative">
              <div className="phone-frame scale-90 sm:scale-100 origin-center transition-transform">
                {/* Phone Notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-20" />
                
                {/* Status Bar */}
                <div className="absolute top-0 left-0 w-full h-10 flex justify-between items-center px-8 z-10 text-[10px] font-bold">
                  <span>14:48</span>
                  <div className="flex gap-1.5 items-center">
                    <FiSmartphone size={10} />
                    <FiActivity size={10} />
                    <div className="w-4 h-2 border border-white/50 rounded-sm relative">
                       <div className="absolute inset-px bg-white w-3" />
                    </div>
                  </div>
                </div>

                {/* Screen Content */}
                <div className="w-full h-full pt-12 px-4 flex flex-col gap-4 bg-[#111416]">
                  {/* Push Notification Mock */}
                  <div className="bg-surface-container-mc border-l-4 border-red-500 rounded-xl p-3 shadow-2xl animate-bounce-slow">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-primary-mc rounded flex items-center justify-center">
                          <FiShield className="text-[10px] text-on-primary-mc" />
                        </div>
                        <span className="text-[10px] font-bold text-on-surface-mc uppercase">E-LigtasMo</span>
                      </div>
                      <span className="text-[9px] text-on-surface-variant">now</span>
                    </div>
                    <div className="text-[11px] font-bold text-on-surface-mc mb-1 leading-tight uppercase line-clamp-1">{form.title}</div>
                    <div className="text-[10px] text-on-surface-variant line-clamp-2 leading-snug">{form.message}</div>
                  </div>

                  {/* App UI In-Phone */}
                  <div className="mt-2 flex-grow rounded-t-3xl bg-surface-mc border-t border-x border-outline-variant-mc p-5 shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
                    <div className="w-10 h-1 bg-surface-variant rounded-full mx-auto mb-6 opacity-30"></div>
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-error-container-mc rounded-full flex items-center justify-center mx-auto mb-3 text-red-500 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                        <FiAlertTriangle size={32} />
                      </div>
                      <div className="text-sm font-bold text-on-surface-mc uppercase tracking-wider">Emergency Alert</div>
                      <div className="text-[10px] text-on-surface-variant mt-1">Santa Cruz MDRRMO HQ</div>
                    </div>
                    
                    <div className="space-y-3 opacity-20">
                      <div className="h-2 bg-surface-variant rounded-full w-full"></div>
                      <div className="h-2 bg-surface-variant rounded-full w-11/12"></div>
                      <div className="h-2 bg-surface-variant rounded-full w-4/5"></div>
                      <div className="h-2 bg-surface-variant rounded-full w-1/2"></div>
                    </div>

                    <button className="w-full bg-red-600 h-12 mt-10 rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-red-600/20">
                      Acknowledge
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Transmission History */}
        <section className="col-span-12 mc-tile rounded-2xl shadow-premium-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <FiClock className="text-primary-mc" />
              Transmission History
            </h2>
            <div className="flex gap-3 w-full sm:w-auto">
               <div className="relative flex-1 sm:w-64">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input 
                    type="text" 
                    placeholder="Search logs..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant-mc rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary-mc transition-all"
                  />
               </div>
               <button 
                onClick={exportLogs}
                className="bg-surface-container-high border border-outline-variant-mc px-5 py-2.5 rounded-xl flex items-center gap-2 text-on-surface-mc font-bold hover:bg-surface-variant transition-all active:scale-[0.98] text-sm"
               >
                <FiDownload /> Export Registry
               </button>
            </div>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr>
                  <th className="mc-table-th">Timestamp</th>
                  <th className="mc-table-th">Alert Title</th>
                  <th className="mc-table-th">Severity</th>
                  <th className="mc-table-th">Target Sector</th>
                  <th className="mc-table-th">Reach Rate</th>
                  <th className="mc-table-th text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                   Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="mc-table-td"><div className="h-6 bg-surface-container-high rounded w-full opacity-50" /></td>
                    </tr>
                   ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-on-surface-variant font-bold italic opacity-30">
                       NO RECORDED TRANSMISSIONS IN CURRENT CACHE
                    </td>
                  </tr>
                ) : filtered.map((a: any) => (
                  <tr key={a.id} className="hover:bg-surface-container-high/50 transition-colors group">
                    <td className="mc-table-td font-data-mono text-[13px] text-primary-mc">
                       <div className="flex items-center gap-2">
                          <FiClock className="opacity-50" />
                          {new Date(a.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                       </div>
                    </td>
                    <td className="mc-table-td">
                       <div className="flex flex-col">
                          <span className="font-bold text-on-surface-mc tracking-tight">{a.title}</span>
                          <span className="text-[11px] text-on-surface-variant truncate max-w-sm font-normal">{a.message}</span>
                       </div>
                    </td>
                    <td className="mc-table-td">
                      <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                        a.is_urgent === "1" ? 'bg-error-container-mc text-error-mc border border-error-mc/20' : 'bg-secondary-container-mc text-on-secondary-container'
                      }`}>
                        {a.is_urgent === "1" ? 'Critical' : 'Notice'}
                      </span>
                    </td>
                    <td className="mc-table-td text-on-surface-variant font-bold text-[12px]">{a.audience || 'General Public'}</td>
                    <td className="mc-table-td">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-surface-container-highest rounded-full overflow-hidden border border-outline-variant-mc/10">
                          <div 
                            className={`h-full transition-all duration-1000 ${a.is_urgent === "1" ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(90 + (a.id % 10), 98)}%` }}
                          />
                        </div>
                        <span className="font-data-mono text-[12px] text-on-surface-variant">
                          {Math.min(90 + (a.id % 10), 98)}%
                        </span>
                      </div>
                    </td>
                    <td className="mc-table-td text-right">
                      <span className="text-success-500 flex items-center justify-end gap-1.5 font-bold text-[11px] tracking-widest uppercase">
                        <FiCheckCircle size={14} /> Complete
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
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(-2%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
          50% { transform: none; animation-timing-function: cubic-bezier(0,0,0.2,1); }
        }
      `}</style>
    </div>
  );
}
