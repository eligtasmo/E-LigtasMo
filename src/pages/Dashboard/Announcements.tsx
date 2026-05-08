import { useEffect, useState, useMemo } from 'react';
import { FiAlertTriangle, FiBell, FiPlus, FiSend, FiLink, FiInfo, FiLayers, FiActivity, FiX, FiCheckCircle, FiGlobe, FiFilter, FiExternalLink, FiShield, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { toast } from 'react-hot-toast';
import PageMeta from "../../components/common/PageMeta";

const CATEGORIES = [
  { id: 'disaster', name: 'Disaster News' },
  { id: 'safety', name: 'Safety Tips' },
  { id: 'recovery', name: 'Recovery Updates' },
  { id: 'preparedness', name: 'Preparedness Guide' },
];

export default function Announcements() {
  const { user } = useAuth();
  const role = (user?.role || 'resident').toLowerCase();
  const brgyName = (user as any)?.brgy_name || (user as any)?.brgy || '';
  const canSend = role === 'admin' || role === 'brgy' || role === 'brgy_chair';

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [phase, setPhase] = useState<'compose' | 'confirm'>('compose');
  const [existing, setExisting] = useState<any>(null);

  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'broadcast',
    audience: 'All Residents',
    category: 'disaster',
    externalLink: '',
    isUrgent: false,
    alsoSendSms: false
  });

  const loadAnnouncements = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('list-announcements.php');
      const data = await res.json();
      if (data.success) setAnnouncements(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error(err);
      toast.error('Sync failed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadAnnouncements(); }, []);

  const resetForm = () => {
    setForm({
      title: '',
      message: '',
      type: 'broadcast',
      audience: 'All Residents',
      category: 'disaster',
      externalLink: '',
      isUrgent: false,
      alsoSendSms: false
    });
    setExisting(null);
  };

  const handleSend = async () => {
    if (!form.title || !form.message) {
      toast.error('Fields are incomplete');
      return;
    }

    const dup = announcements.find(a => a.title.toLowerCase() === form.title.toLowerCase() && a.brgy_name === (role === 'admin' ? 'Global' : brgyName));
    if (dup && phase === 'compose') {
      setExisting(dup);
      setPhase('confirm');
      return;
    }

    try {
      const payload = {
        ...form,
        brgy: role === 'admin' ? 'Global' : brgyName,
        sender: user?.username,
        isUpdate: phase === 'confirm',
        id: existing?.id
      };

      const res = await apiFetch('create-announcement.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        toast.success(phase === 'confirm' ? 'Updated' : 'Sent');
        setShowModal(false);
        setPhase('compose');
        resetForm();
        loadAnnouncements();
      } else {
        toast.error(data.message || 'Failed to send');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    }
  };

  const confirmUpdate = () => handleSend();

  const filteredAnnouncements = useMemo(() => {
    const list = Array.isArray(announcements) ? announcements : [];
    if (!selectedCategory) return list;
    return list.filter(a => a.category === selectedCategory);
  }, [announcements, selectedCategory]);

  return (
    <div className="tactical-page">
      <PageMeta title="Broadcast Hub" description="Manage announcements and SMS." />
      
      {/* Header Section */}
      <div className="tactical-header">
        <div>
          <h1 className="tactical-title">Broadcast Hub</h1>
          <p className="tactical-subtitle">Manage and track your sector messages.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadAnnouncements} className="tactical-btn-secondary p-2">
            <FiRefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {canSend && (
            <button onClick={() => setShowModal(true)} className="tactical-btn-primary flex items-center gap-2">
              <FiPlus size={18} /> New Broadcast
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
         {[
            { label: 'Total Records', value: (announcements || []).length, color: 'text-gray-900' },
            { label: 'Urgent Alerts', value: (announcements || []).filter(a => a.is_urgent === "1").length, color: 'text-red-600' },
            { label: 'SMS Outreach', value: (announcements || []).reduce((acc, curr) => acc + (parseInt(curr.sms_sent) || 0), 0), color: 'text-blue-600' }
         ].map((stat, i) => (
            <div key={i} className="tactical-card p-6">
               <p className="tactical-stat-label">{stat.label}</p>
               <div className={`tactical-stat-value ${stat.color}`}>{stat.value}</div>
            </div>
         ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 tactical-card p-4 mb-6">
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search history..."
            className="tactical-input w-full pl-11"
          />
        </div>
        <select 
          className="tactical-input min-w-[200px]"
          value={selectedCategory || 'all'}
          onChange={(e) => setSelectedCategory(e.target.value === 'all' ? null : e.target.value)}
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table Wrapper */}
      <div className="tactical-card">
        <div className="overflow-x-auto">
          <table className="tactical-table">
            <thead>
              <tr>
                <th className="tactical-th">Date</th>
                <th className="tactical-th">Subject</th>
                <th className="tactical-th">Sector</th>
                <th className="tactical-th">Audience</th>
                <th className="tactical-th">SMS Reach</th>
                <th className="tactical-th text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-6 py-8">
                      <div className="h-4 bg-gray-50 rounded animate-pulse w-3/4 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredAnnouncements.length > 0 ? (
                filteredAnnouncements.map((a: any) => {
                  const isUrgent = a.is_urgent === "1";
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="tactical-td">
                        <div className="flex flex-col">
                          <span className="font-semibold">{new Date(a.created_at).toLocaleDateString()}</span>
                          <span className="text-sm text-gray-400">{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="tactical-td">
                        <div className="flex flex-col">
                          <span className="font-bold">{a.title}</span>
                          <span className="text-sm text-gray-500 truncate max-w-xs">{a.message}</span>
                        </div>
                      </td>
                      <td className="tactical-td">
                        <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">{a.brgy_name || 'Global'}</span>
                      </td>
                      <td className="tactical-td">
                        <span className={`text-sm font-semibold ${isUrgent ? 'text-red-600' : 'text-blue-600'}`}>
                          {a.audience}
                        </span>
                      </td>
                      <td className="tactical-td">
                        <span className="font-bold text-gray-700">{a.sms_sent || 0}</span>
                      </td>
                      <td className="tactical-td text-right">
                        <button 
                          onClick={() => {
                            setForm({
                              title: a.title,
                              message: a.message,
                              type: a.type,
                              audience: a.audience,
                              category: a.category,
                              externalLink: a.external_link || '',
                              isUrgent: a.is_urgent === "1",
                              alsoSendSms: false
                            });
                            setExisting({ id: a.id });
                            setPhase('confirm');
                            setShowModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <FiRefreshCw size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <FiBell size={40} className="text-gray-200 mx-auto mb-4" />
                    <p className="text-sm text-gray-400 font-medium">No history found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {phase === 'confirm' ? 'Update Broadcast' : 'New Broadcast'}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">Direct system message distribution</p>
                </div>
                <button onClick={() => { setShowModal(false); setPhase('compose'); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                  <FiX size={24} />
                </button>
              </div>

              {phase === 'compose' ? (
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Category</label>
                      <select 
                        className="tactical-input w-full h-11"
                        value={form.category} 
                        onChange={e => setForm({ ...form, category: e.target.value })}
                      >
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Audience</label>
                      <select 
                        className="tactical-input w-full h-11"
                        value={form.audience} 
                        onChange={e => setForm({ ...form, audience: e.target.value })}
                      >
                        <option value="All Residents">All Residents</option>
                        <option value="Barangay Only">Barangay Only</option>
                        {role === 'admin' && <option value="Global Admin">Global Admin</option>}
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-4 p-5 rounded-2xl border border-blue-100 bg-blue-50/30 cursor-pointer group hover:bg-blue-50 transition-all">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-gray-300 accent-blue-600"
                      checked={form.alsoSendSms} 
                      onChange={e => setForm({ ...form, alsoSendSms: e.target.checked })} 
                    />
                    <div>
                      <p className="text-sm font-bold text-blue-700">Broadcast via SMS</p>
                      <p className="text-sm text-blue-500 mt-1">Send as a text message to all sector residents.</p>
                    </div>
                  </label>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Subject</label>
                    <input 
                      type="text" 
                      required 
                      className="tactical-input w-full h-11 bg-white border-gray-200"
                      value={form.title} 
                      onChange={e => setForm({ ...form, title: e.target.value })} 
                      placeholder="e.g. Flood Advisory" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Message</label>
                    <textarea 
                      required 
                      className="tactical-input w-full h-32 resize-none bg-white border-gray-200"
                      value={form.message} 
                      onChange={e => setForm({ ...form, message: e.target.value })} 
                      placeholder="Type your message..." 
                    />
                  </div>

                  <label className="flex items-center gap-4 p-5 rounded-2xl border border-red-100 bg-red-50/30 cursor-pointer group hover:bg-red-50 transition-all">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-gray-300 accent-red-600"
                      checked={form.isUrgent} 
                      onChange={e => setForm({ ...form, isUrgent: e.target.checked })} 
                    />
                    <div>
                      <p className="text-sm font-bold text-red-700">Urgent Alert</p>
                      <p className="text-sm text-red-500 mt-1">Trigger priority notifications.</p>
                    </div>
                  </label>

                  <div className="flex gap-4 pt-6">
                    <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all">Cancel</button>
                    <button type="submit" className="tactical-btn-primary flex-1 py-3 h-auto">Send Now</button>
                  </div>
                </form>
              ) : (
                <div className="text-center space-y-6">
                  <FiAlertTriangle size={48} className="text-orange-500 mx-auto" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Duplicate Title</h3>
                    <p className="text-sm text-gray-500 mt-2">A message with this subject already exists. Update it instead?</p>
                  </div>
                  <div className="flex gap-4 pt-6">
                    <button onClick={() => setPhase('compose')} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all border border-gray-200">Back</button>
                    <button onClick={confirmUpdate} className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl shadow-lg transition-all">Yes, Update</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
