import { useEffect, useState, useMemo } from 'react';
import { 
  FiAlertTriangle, FiBell, FiPlus, FiSend, FiInfo, FiActivity, FiX, 
  FiCheckCircle, FiSearch, FiRefreshCw, FiEdit, FiClock,
  FiZap, FiDownload, FiSmartphone, FiMonitor, FiMail, FiShield,
  FiMessageSquare, FiSmartphone as FiPhone, FiWifi, FiPackage, FiTruck
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { toast } from 'react-hot-toast';
import PageMeta from "../../components/common/PageMeta";
import * as XLSX from 'xlsx';

const CATEGORIES = ["Disaster", "Safety", "Relief", "Intel", "Recovery", "Preparedness", "Health", "Traffic"];

const TEMPLATES = [
  { id: 'flood', category: 'Disaster', title: '🔴 FLASH FLOOD', message: 'CRITICAL: Water levels rising. Immediate evacuation recommended.', type: 'error', icon: <FiAlertTriangle /> },
  { id: 'relief', category: 'Relief', title: '📦 RELIEF GOODS', message: 'Assistance packets are available at the Barangay Hall. Bring QR ID.', type: 'success', icon: <FiPackage /> },
  { id: 'road', category: 'Traffic', title: '🚧 ROAD CLOSURE', message: 'Major obstruction detected on Main Ave. Tactical rerouting advised.', type: 'warning', icon: <FiTruck /> },
  { id: 'outage', category: 'Safety', title: '⚡ POWER OUTAGE', message: 'Unplanned outage reported. Estimated restoration: 1800H.', type: 'info', icon: <FiZap /> },
  { id: 'medical', category: 'Health', title: '🩺 MEDICAL MISSION', message: 'Emergency medical services available at the Multi-purpose Center.', type: 'success', icon: <FiActivity /> },
  { id: 'prepare', category: 'Preparedness', title: '🛡️ PREP DRILL', message: 'Scheduled disaster preparedness drill today at 1400H.', type: 'info', icon: <FiShield /> },
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
  const [previewIndex, setPreviewIndex] = useState(0);

  const [barangays, setBarangays] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: 'RELIEF DISTRIBUTION NOTICE',
    message: 'Relief goods will be distributed today at the Municipal Gym starting 1:00 PM. Please bring your family ID and observe social distancing.',
    smsMessage: 'RELIEF NOTICE: Distribution at Municipal Gym today, 1PM. Bring Family ID. Stay safe!',
    category: 'Relief',
    audience: role === 'admin' ? 'all' : 'brgy_specific',
    brgy_name: role === 'admin' ? '' : brgyName,
    isUrgent: false,
    alsoSendSms: true,
    sendPush: true,
  });

  const handleSlideChange = (idx: number) => setPreviewIndex(idx);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [annRes, brgyRes] = await Promise.all([
        apiFetch('list-announcements.php'),
        apiFetch('list-barangays.php')
      ]);
      const annData = await annRes.json();
      const brgyData = await brgyRes.json();

      console.log('[Broadcast] Sync Intelligence:', annData);
      if (annData.success) {
        // Fix: list-announcements.php returns { announcements: [...] }, not { data: [...] }
        const rows = annData.announcements || annData.data || [];
        setAnnouncements(Array.isArray(rows) ? rows : []);
      }
      if (brgyData.success) {
        setBarangays(brgyData.barangays?.map((b: any) => b.name) || []);
      }
    } catch (err) {
      console.error('[Broadcast] Sync Failure:', err);
      toast.error('Sync failed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleExecute = async () => {
    console.log('[Broadcast] Initiating Transmission...', form);
    if (!form.title || !form.message) {
      toast.error('Fields are incomplete');
      return;
    }
    setIsSending(true);
    try {
      const payload = {
        ...form,
        brgy_name: role === 'admin' ? 'Global' : brgyName,
        brgy_name_target: form.audience === 'brgy_specific' ? form.brgy_name : null,
        sender: user?.username,
        also_send_sms: form.alsoSendSms,
        sendPush: form.sendPush
      };

      const res = await apiFetch('create-announcement.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Broadcast Sent: ${data.push_sent} Push, ${data.sms_sent} SMS`);
        loadData();
      } else {
        toast.error(data.message || 'Failed');
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
    let segments = text.length > 0 ? 1 : 0;
    if (text.length > limit) segments = Math.ceil(text.length / multipartLimit);
    return { length: text.length, limit, segments, isUnicode };
  }, [form.smsMessage]);

  const exportLogs = () => {
    if (!announcements.length) { toast.error('No logs'); return; }
    const ws = XLSX.utils.json_to_sheet(announcements);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Logs');
    XLSX.writeFile(wb, `broadcast_logs_${Date.now()}.xlsx`);
  };

  const filtered = useMemo(() => {
    let list = Array.isArray(announcements) ? announcements : [];
    if (selectedCategory) list = list.filter(a => a.category === selectedCategory);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(s) || a.message.toLowerCase().includes(s));
    }
    if (role === 'brgy' || role === 'brgy_chair') {
      list = list.filter(a => 
        a.audience === 'all' || 
        a.brgy_name === brgyName || 
        a.brgy_name_target === brgyName ||
        a.sender === user?.username
      );
    }
    return list;
  }, [announcements, selectedCategory, search, role, brgyName, user?.username]);

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
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 font-sans p-4 md:p-6 custom-scrollbar">
      <PageMeta title="Command Center | E-LigtasMo" description="Tactical Broadcast Interface" />
      
      <div className="max-w-[1500px] mx-auto grid grid-cols-12 gap-5">
        
        {/* Compact Header */}
        <div className="col-span-12 flex flex-col lg:flex-row justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xl">
              <FiZap size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1 uppercase">Broadcast Command</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operation Center Alpha • {brgyName || 'Santa Cruz'}</p>
            </div>
          </div>
          
          <div className="flex gap-6 items-center px-4">
             <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Total Reach</span>
                <span className="text-lg font-mono font-black text-blue-600 leading-none mt-1">{stats.reach.toLocaleString()}</span>
             </div>
             <div className="w-px h-8 bg-slate-100" />
             <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Active Alerts</span>
                <span className="text-lg font-mono font-black text-red-500 leading-none mt-1">{stats.urgent}</span>
             </div>
             <div className="w-px h-8 bg-slate-100" />
             <button 
                onClick={loadData}
                className="p-2 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-all text-slate-500"
             >
                <FiRefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
             </button>
          </div>
        </div>

        {/* High-Density Composer */}
        <section className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <FiEdit className="text-blue-500" /> Mission Composer
            </h2>
            <div className="flex gap-2">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Network Online</span>
            </div>
          </div>

          <div className="p-5 space-y-5 flex-grow overflow-y-auto no-scrollbar">
            {/* Expanded Template Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {TEMPLATES.map(t => (
                <button 
                  key={t.id}
                  onClick={() => setForm(prev => ({ ...prev, title: t.title, message: t.message, category: t.category }))}
                  className="group flex flex-col items-start justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-blue-300 hover:bg-blue-50 transition-all active:scale-95 gap-1.5 h-full"
                >
                  <div className="flex items-center gap-2 w-full overflow-hidden">
                    <span className="text-blue-500 shrink-0">{t.icon}</span>
                    <span className="text-[10px] font-black text-slate-800 uppercase leading-none truncate">{t.title}</span>
                  </div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">{t.category}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Urgency</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                  value={form.isUrgent ? 'Critical' : 'Notice'}
                  onChange={(e) => setForm(prev => ({ ...prev, isUrgent: e.target.value === 'Critical' }))}
                >
                  <option value="Critical">RED: Critical</option>
                  <option value="High">ORANGE: High</option>
                  <option value="Notice">BLUE: Notice</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Sector</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                  value={form.audience}
                  onChange={(e) => setForm(prev => ({ ...prev, audience: e.target.value }))}
                >
                  {role === 'admin' ? (
                    <>
                      <option value="all">ALL: Global Reach</option>
                      <option value="residents">RESIDENTS: Public</option>
                      <option value="barangay">COORDINATORS: All</option>
                      <option value="brgy_specific">BRGY: Specific Sector</option>
                    </>
                  ) : (
                    <>
                      <option value="brgy_specific">MY SECTOR: {brgyName}</option>
                      <option value="residents">RESIDENTS: Local</option>
                    </>
                  )}
                </select>
              </div>
              {form.audience === 'brgy_specific' && (
                <div className="space-y-1 animate-in zoom-in-95 duration-200">
                  <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1">Select Barangay</label>
                  <select 
                    className="w-full bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-[11px] font-bold text-blue-700 outline-none"
                    value={form.brgy_name}
                    onChange={(e) => setForm(prev => ({ ...prev, brgy_name: e.target.value }))}
                  >
                    <option value="">Select Barangay...</option>
                    {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Intel Category</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                  value={form.category}
                  onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Headline Intelligence</label>
              <input 
                type="text" 
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:border-blue-500 outline-none transition-all shadow-inner"
                placeholder="Brief summary for notification headers..."
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.sendPush ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-white text-slate-400'}`}>
                <input type="checkbox" className="hidden" checked={form.sendPush} onChange={e => {
                  setForm(prev => ({ ...prev, sendPush: e.target.checked }));
                  if (e.target.checked) setPreviewIndex(1);
                }} />
                <FiBell size={14} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest">App Push</span>
                  <span className="text-[7px] font-bold uppercase tracking-tighter opacity-70">Expo Relay</span>
                </div>
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.alsoSendSms ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-white text-slate-400'}`}>
                <input type="checkbox" className="hidden" checked={form.alsoSendSms} onChange={e => {
                  setForm(prev => ({ ...prev, alsoSendSms: e.target.checked }));
                  if (e.target.checked) setPreviewIndex(2);
                }} />
                <FiWifi size={14} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest">Cellular Link</span>
                  <span className="text-[7px] font-bold uppercase tracking-tighter opacity-70">PhilSMS Node</span>
                </div>
              </label>
            </div>

            <div className={`grid grid-cols-1 ${form.alsoSendSms ? 'lg:grid-cols-2' : ''} gap-4`}>
                 <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">App Intelligence</label>
                      <span className="text-[8px] font-bold text-slate-300">{form.message.length} chars</span>
                    </div>
                    <textarea 
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-600 placeholder:text-slate-300 focus:border-blue-500 outline-none transition-all h-28 resize-none" 
                      placeholder="Detailed intelligence report for app users..."
                      value={form.message}
                      onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
                    />
                 </div>
                 {form.alsoSendSms && (
                   <div className="space-y-1 animate-in fade-in slide-in-from-right-2 duration-300">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1">SMS Comms</label>
                        <div className={`text-[8px] font-black px-1.5 py-0.5 rounded ${smsMetrics.length > smsMetrics.limit ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                          {smsMetrics.length}/{smsMetrics.limit} • {smsMetrics.segments} SEG
                        </div>
                      </div>
                      <textarea 
                        className="w-full bg-blue-50/30 border border-blue-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:border-blue-400 outline-none transition-all h-28 resize-none" 
                        placeholder="Shortened tactical SMS update..."
                        value={form.smsMessage}
                        onChange={e => setForm(prev => ({ ...prev, smsMessage: e.target.value }))}
                      />
                   </div>
                 )}
            </div>

            <button 
              onClick={handleExecute}
              disabled={isSending}
              className="w-full bg-slate-900 text-white rounded-2xl py-4 flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98] disabled:opacity-50"
            >
              {isSending ? <FiRefreshCw className="animate-spin" /> : <FiSend />}
              <span className="text-xs font-black uppercase tracking-[0.2em]">{isSending ? 'Transmitting...' : 'Execute Broadcast'}</span>
            </button>
          </div>
        </section>

        {/* Mobile Device Preview Slider */}
        <aside className="col-span-12 lg:col-span-4 space-y-5">
           <div className="bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl border-[6px] border-slate-800 h-[720px] relative overflow-hidden flex flex-col">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-800 rounded-b-2xl z-20 flex items-center justify-center">
                 <div className="w-10 h-1 bg-slate-700 rounded-full" />
              </div>

              <div className="flex-grow bg-white rounded-[2rem] overflow-hidden relative flex flex-col">
                <div className="h-full flex transition-transform duration-500" style={{ transform: `translateX(-${previewIndex * 100}%)` }}>
                  
                  {/* Dashboard Preview */}
                  <div className="min-w-full h-full bg-[#f8fafc] flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center mt-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100" />
                      <div className="w-16 h-2 bg-slate-100 rounded-full" />
                      <FiBell className="text-slate-300" />
                    </div>
                    <div className="p-4 space-y-3 overflow-y-auto no-scrollbar">
                       <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                          <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${form.isUrgent ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{form.category} ALERT</span>
                          </div>
                          <h3 className="text-xs font-black text-slate-800 leading-tight uppercase">{form.title}</h3>
                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{form.message}</p>
                          <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
                             <span className="text-[7px] font-bold text-slate-300 uppercase">Just Now • System</span>
                             <button className="text-[8px] font-black text-blue-600 uppercase tracking-tighter">View Protocol</button>
                          </div>
                       </div>
                       <div className="h-24 bg-slate-50 border border-dashed border-slate-200 rounded-2xl" />
                    </div>
                  </div>

                  {/* Push Notification Preview */}
                  <div className="min-w-full h-full relative overflow-hidden bg-slate-100 flex items-center justify-center p-6">
                    <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover blur-sm opacity-20" alt="" />
                    <div className="w-full bg-white/80 backdrop-blur-xl p-4 rounded-3xl shadow-xl border border-white/50 space-y-2 animate-in slide-in-from-top duration-700">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-lg bg-slate-900 flex items-center justify-center text-[10px] text-white">L</div>
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">E-LigtasMo</span>
                          </div>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">Now</span>
                       </div>
                       <div>
                          <p className="text-[11px] font-black text-slate-900 uppercase leading-none mb-1">{form.title}</p>
                          <p className="text-[10px] text-slate-600 font-bold leading-tight line-clamp-2">{form.message}</p>
                       </div>
                    </div>
                  </div>

                  {/* SMS Message Preview */}
                  <div className="min-w-full h-full bg-[#f2f2f7] flex flex-col">
                    <div className="h-20 bg-white border-b border-slate-200 flex flex-col items-center justify-center px-4 mt-4">
                       <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400"><FiPhone size={20} /></div>
                       <span className="text-[9px] font-bold text-slate-500 mt-1">E-LigtasMo Alert</span>
                    </div>
                    <div className="p-4 flex-grow">
                       <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 ml-auto max-w-[85%] relative">
                          <p className="text-[11px] text-slate-700 font-medium leading-relaxed">{form.smsMessage}</p>
                          <div className="absolute -right-1 bottom-1 w-2 h-2 bg-white rotate-45 border-r border-b border-slate-200" />
                       </div>
                    </div>
                  </div>
                </div>

                {/* Slider Indicators */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-10">
                  {[0, 1, 2].map(i => (
                    <button 
                      key={i} 
                      onClick={() => setPreviewIndex(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${previewIndex === i ? 'w-8 bg-slate-900' : 'w-1.5 bg-slate-300 hover:bg-slate-400'}`} 
                    />
                  ))}
                </div>
              </div>
           </div>

           <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><FiDownload size={16} /></div>
                 <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Audit Trail</p>
                    <p className="text-[10px] font-bold text-slate-700">Export History (.xlsx)</p>
                 </div>
              </div>
              <button onClick={exportLogs} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Download</button>
           </div>
        </aside>

        {/* Transmission Log Registry */}
        <section className="col-span-12 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <FiClock className="text-blue-500" /> Transmission Registry
            </h2>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
              <input 
                type="text" 
                placeholder="Search history..." 
                className="pl-8 pr-4 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-600 focus:ring-0 outline-none w-48"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Protocol Type</th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Headline Intelligence</th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Sector</th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Saturation</th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((ann, i) => (
                  <tr key={ann.id || i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${ann.is_urgent === "1" ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{ann.category}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-800 uppercase leading-none mb-1">{ann.title}</span>
                        <span className="text-[10px] text-slate-400 font-medium truncate max-w-[300px]">{ann.message}</span>
                      </div>
                    </td>
                    <td className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{ann.audience}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-[10px] font-mono font-black text-blue-600">
                        <FiMail size={12} className="text-slate-300" />
                        {ann.sms_sent || 0}
                      </div>
                    </td>
                    <td className="p-4 text-[10px] font-bold text-slate-400 font-mono">{ann.created_at}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
                        <FiCheckCircle size={10} /> Sync
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
