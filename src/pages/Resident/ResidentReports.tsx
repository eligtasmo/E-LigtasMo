import React, { useState, useEffect } from 'react';
import { BiSearch, BiFilter, BiChevronRight, BiInfoCircle } from 'react-icons/bi';
import { FiDownload, FiMapPin, FiClock, FiFileText } from 'react-icons/fi';
import { apiFetch } from '../../utils/api';
import PageMeta from '../../components/common/PageMeta';

interface ReportItem {
  id: number;
  type: string;
  location: string;
  datetime: string;
  severity: string;
  status: string;
  category: string;
}

export default function ResidentReports() {
  const [activeTab, setActiveTab] = useState('My Reports');
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch('/api/list-incidents.php?status=Approved&limit=10');
        const data = await res.json();
        if (data.success && Array.isArray(data.incidents)) {
          setReports(data.incidents.map((inc: any) => ({
            id: inc.id,
            type: inc.type || 'Incident',
            location: inc.location || inc.address || 'Unknown',
            datetime: new Date(inc.datetime || inc.created_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
            }),
            severity: inc.severity,
            status: inc.status,
            category: inc.type === 'Flood' ? 'Environmental' : inc.type === 'Fire' ? 'Public Safety' : 'General'
          })));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  return (
    <div className="min-h-screen bg-[#fcfcfd] px-4 pb-32 pt-8">
      <PageMeta 
        title="My Incident Reports" 
        description="View and track your submitted incident reports and their current status." 
      />
      
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Title */}
        <h1 className="text-4xl font-black text-black tracking-tight">Reports</h1>

        {/* Segmented Control */}
        <div className="bg-gray-100 p-1.5 rounded-[2rem] flex items-center shadow-sm">
          <button 
            onClick={() => setActiveTab('My Reports')}
            className={`flex-1 py-3.5 rounded-[1.8rem] text-sm font-bold transition-all ${activeTab === 'My Reports' ? 'bg-black text-white shadow-lg' : 'text-gray-500'}`}
          >
            My Reports
          </button>
          <button 
            onClick={() => setActiveTab('Report Summary')}
            className={`flex-1 py-3.5 rounded-[1.8rem] text-sm font-bold transition-all ${activeTab === 'Report Summary' ? 'bg-black text-white shadow-lg' : 'text-gray-500'}`}
          >
            Report Summary
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <BiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
            <input 
              type="text" 
              placeholder="Search category or location"
              className="w-full bg-white border border-gray-100 rounded-3xl pl-14 pr-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="bg-white border border-gray-100 p-4 rounded-3xl shadow-sm hover:bg-gray-50 transition-colors">
            <BiFilter className="text-2xl text-black" />
          </button>
        </div>

        {/* Time Filters */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {['All', 'Today', 'This Week', 'Last Week', 'This Month'].map((filter) => (
            <button 
              key={filter}
              className={`capsule-chip whitespace-nowrap border ${filter === 'All' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-100 shadow-sm'}`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Conversion Banner */}
        <div className="bento-card p-5 bg-white border-gray-100 flex gap-4 items-start">
          <BiInfoCircle className="text-gray-400 text-2xl shrink-0 mt-0.5" />
          <p className="text-sm text-gray-500 font-medium leading-relaxed">
            All reports are automatically processed by MMDRMO and relayed to local coordinators.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="bento-card overflow-hidden !rounded-[2.5rem]">
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            <div className="p-8 text-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Reports</span>
              <div className="text-4xl font-black text-black mt-2">{reports.length}</div>
            </div>
            <div className="p-8 text-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Efficiency</span>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-2xl">🇵🇭</span>
                <span className="text-3xl font-black text-black tracking-tighter">High</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bento-card p-6 flex items-center justify-between group active:scale-[0.98] transition-transform">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-lg font-black text-black truncate uppercase tracking-tight">{report.type}</h3>
                <p className="text-sm font-bold text-gray-400 mt-1">{report.datetime}</p>
                <div className="flex mt-3">
                  <span className="capsule-chip bg-gray-50 text-gray-500 text-[10px] uppercase font-black tracking-widest px-3 py-1 border border-gray-100">
                    {report.category}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 mb-1">
                  <span className="text-lg">🇵🇭</span>
                  <span className="text-xl font-black text-black tracking-tighter">ACTIVE</span>
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Verification Status</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-50 animate-pulse rounded-3xl" />)}
            </div>
          )}
        </div>
      </div>

      {/* Floating Download Button */}
      <button className="fixed bottom-32 right-8 w-16 h-16 bg-black text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-black/40 hover:scale-110 active:scale-90 transition-all z-40">
        <FiDownload size={28} />
      </button>
    </div>
  );
}
