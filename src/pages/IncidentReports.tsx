import React, { useState, useEffect, useMemo } from 'react';
import { FiMapPin, FiClock, FiAlertTriangle, FiChevronRight, FiMap, FiRefreshCw, FiSearch, FiTruck, FiX } from 'react-icons/fi';
import { FaCheck } from 'react-icons/fa';
import PageMeta from "../components/common/PageMeta";
import 'leaflet/dist/leaflet.css';

// Enhanced incident interface for real-time data
interface IncidentData {
  id: number;
  type: string;
  location: string;
  address: string;
  severity: 'Low' | 'Moderate' | 'High' | 'Critical';
  status: 'Pending' | 'Approved' | 'Rejected' | 'Resolved' | 'Active' | 'Responding';
  datetime: string;
  description: string;
  lat: number;
  lng: number;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  reporter: string;
  contact: string;
  photo_url?: string;
  responders?: number;
  response_time?: string;
  flood_level_cm?: number;
  allowed_vehicles?: string;
  source?: 'incident' | 'flood_report';
  brgy?: string;
}

const IncidentReports = () => {
  const [incidents, setIncidents] = useState<IncidentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('datetime');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedIncidentForDetails, setSelectedIncidentForDetails] = useState<IncidentData | null>(null);

  // Helper to construct full photo URL
  const getFullPhotoUrl = (path: string | undefined | null) => {
    if (!path) return undefined;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('api/')) return `http://localhost/eligtasmo/${path}`;
    return `/api/${path}`;
  };

  // Clean address formatting by removing "From:" and "To:" prefixes
  const cleanAddress = (address: string): string => {
    if (!address) return 'Address not provided';
    let cleaned = address
      .replace(/^From:\s*/i, '')
      .replace(/\s+To:\s*/i, ' → ')
      .trim();
    if (cleaned.includes('→') && cleaned.match(/\d+\.\d+,\s*\d+\.\d+/)) {
      const parts = cleaned.split('→');
      if (parts.length === 2) {
        const fromPart = parts[0].trim();
        const toPart = parts[1].trim();
        const fromLocation = fromPart.split(/\d+\.\d+/)[0].trim().replace(/,$/, '');
        const toLocation = toPart.split(/\d+\.\d+/)[0].trim().replace(/,$/, '');
        if (fromLocation && toLocation && fromLocation !== toLocation) {
          return `${fromLocation} → ${toLocation}`;
        } else if (fromLocation) {
          return fromLocation;
        }
      }
    }
    cleaned = cleaned.replace(/\s*\d+\.\d+,\s*\d+\.\d+\s*$/, '').trim();
    return cleaned || 'Location not specified';
  };

  // Transform API data to match our interface
  const transformIncidentData = (apiIncidents: any[]): IncidentData[] => {
    return apiIncidents.map(incident => ({
      id: incident.id,
      type: incident.type || 'Unknown',
      location: incident.address?.split(',')[0] || 'Unknown Location',
      address: cleanAddress(incident.address),
      severity: incident.severity || 'Moderate',
      status: incident.status || 'Pending',
      datetime: incident.datetime || incident.created_at,
      description: incident.description || 'No description provided',
      lat: parseFloat(incident.lat) || 0,
      lng: parseFloat(incident.lng) || 0,
      start_lat: (incident.start_lat !== null && incident.start_lat !== undefined) ? Number(incident.start_lat) : undefined,
      start_lng: (incident.start_lng !== null && incident.start_lng !== undefined) ? Number(incident.start_lng) : undefined,
      end_lat: (incident.end_lat !== null && incident.end_lat !== undefined) ? Number(incident.end_lat) : undefined,
      end_lng: (incident.end_lng !== null && incident.end_lng !== undefined) ? Number(incident.end_lng) : undefined,
      reporter: incident.reporter || 'Anonymous',
      contact: incident.contact || 'No contact provided',
      photo_url: getFullPhotoUrl(incident.photo_url),
      responders: Math.floor(Math.random() * 5) + 1,
      response_time: `${Math.floor(Math.random() * 10) + 1} min`,
      flood_level_cm: (incident.flood_level_cm !== null && incident.flood_level_cm !== undefined)
        ? Number(incident.flood_level_cm)
        : undefined,
      source: 'incident'
    }));
  };

  const transformFloodReportData = (apiReports: any[]): IncidentData[] => {
    return apiReports.map(report => ({
      id: Number(report.id) + 1000000,
      type: 'Flood',
      location: report.location_text || report.brgy || 'Unknown Location',
      address: report.location_text || (report.brgy ? `Barangay ${report.brgy}` : 'Location not specified'),
      severity: report.severity || 'Moderate',
      status: report.status === 'Verified' ? 'Approved' : (report.status || 'Pending'),
      datetime: report.time || report.created_at,
      description: report.description || 'No description provided',
      lat: parseFloat(report.lat) || 0,
      lng: parseFloat(report.lng) || 0,
      reporter: report.reporter_name || 'Anonymous',
      contact: report.reporter_contact || 'No contact provided',
      photo_url: getFullPhotoUrl(report.media_path),
      responders: 0,
      response_time: 'N/A',
      source: 'flood_report',
      brgy: report.brgy ? `Barangay ${report.brgy}` : undefined
    }));
  };

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const [incidentsRes, floodReportsRes] = await Promise.all([
        fetch('/api/list-incidents.php?limit=100'),
        fetch('/api/list-incident-reports.php?limit=1000&all_time=true&_t=' + Date.now())
      ]);
      const incidentsData = await incidentsRes.json();
      const floodReportsData = await floodReportsRes.json();
      let allIncidents: IncidentData[] = [];
      if (incidentsData.success && incidentsData.incidents) {
        allIncidents = [...allIncidents, ...transformIncidentData(incidentsData.incidents)];
      }
      if (Array.isArray(floodReportsData)) {
        allIncidents = [...allIncidents, ...transformFloodReportData(floodReportsData)];
      }
      setIncidents(allIncidents.filter(i => !(i.type === 'Emergency Call' && i.reporter === 'System')));
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id: number) => {
    try {
      const incident = incidents.find(i => i.id === id);
      if (incident?.source === 'flood_report') {
        const response = await fetch('/api/approve-incident-report.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id - 1000000, approved_by: 'Admin' })
        });
        const data = await response.json();
        if (data.success) {
          await fetchIncidents();
        }
        return;
      }
      const response = await fetch('/api/update-incident-status.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'Approved' })
      });
      if (response.ok) {
        await fetchIncidents();
      }
    } catch (error) {
      console.error('Error approving incident:', error);
    }
  };

  // Filter and sort incidents
  const filteredIncidents = useMemo(() => {
    let result = incidents.filter(i => {
      const searchStr = `${i.type} ${i.location} ${i.address} ${i.description} ${i.id}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      const matchesSeverity = filterSeverity === 'all' || i.severity.toLowerCase() === filterSeverity.toLowerCase();
      const matchesStatus = filterStatus === 'all' || i.status.toLowerCase() === filterStatus.toLowerCase();
      
      let matchesDate = true;
      if (dateFrom || dateTo) {
        const iDate = new Date(i.datetime).toISOString().slice(0, 10);
        if (dateFrom && iDate < dateFrom) matchesDate = false;
        if (dateTo && iDate > dateTo) matchesDate = false;
      }

      return matchesSearch && matchesSeverity && matchesStatus && matchesDate;
    });

    return result.sort((a, b) => {
      if (sortBy === 'severity') {
        const priority = { Critical: 4, High: 3, Moderate: 2, Low: 1 };
        return priority[b.severity as keyof typeof priority] - priority[a.severity as keyof typeof priority];
      }
      return new Date(b.datetime).getTime() - new Date(a.datetime).getTime();
    });
  }, [incidents, searchTerm, filterSeverity, filterStatus, sortBy, dateFrom, dateTo]);

  const counts = useMemo(() => ({
    all: incidents.length,
    pending: incidents.filter(i => i.status === 'Pending').length,
    active: incidents.filter(i => ['Active', 'Responding', 'Approved'].includes(i.status)).length,
    resolved: incidents.filter(i => i.status === 'Resolved').length,
  }), [incidents]);

  const formatTime = (datetime: string) => {
    const date = new Date(datetime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="tactical-page">
      <PageMeta title="Incident Registry | E-LigtasMo" description="Comprehensive mission log and incident signature database." />
      
      <div className="tactical-container">
        {/* Tactical Header */}
        <div className="tactical-header">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div>
                 <div className="tactical-status-pill mb-4">
                    <div className="tactical-status-dot bg-blue-500 animate-pulse" />
                    <span>REGISTRY_LINK: ONLINE</span>
                 </div>
                 <h1 className="tactical-title">Incident Registry</h1>
                 <p className="tactical-subtitle">Sector-wide historical data and real-time situational tracking.</p>
              </div>

              <div className="flex items-center gap-3">
                 <button onClick={fetchIncidents} className="tactical-icon-container w-12 h-12 bg-white hover:bg-slate-50">
                    <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                 </button>
              </div>
           </div>
        </div>

        {/* Tactical Filters Control Room */}
        <div className="tactical-card p-10 mb-10">
           <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-2">
                 <label className="tactical-label">Search_Intelligence</label>
                 <div className="tactical-search-group mb-0 flex items-center h-14 p-1.5">
                    <FiSearch className="ml-4 text-slate-400" />
                    <input 
                      className="tactical-input !border-none !bg-transparent h-full flex-1 pl-3" 
                      placeholder="Filter by ID, Type, or Physical_Location..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                 </div>
              </div>
              <div>
                 <label className="tactical-label">Criticality_Filter</label>
                 <select 
                    className="tactical-input w-full h-14 appearance-none"
                    value={filterSeverity}
                    onChange={e => setFilterSeverity(e.target.value)}
                 >
                    <option value="all">All_Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="moderate">Moderate</option>
                    <option value="low">Low</option>
                 </select>
              </div>
              <div>
                 <label className="tactical-label">Operational_Status</label>
                 <select 
                    className="tactical-input w-full h-14 appearance-none"
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                 >
                    <option value="all">All_Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="active">Active</option>
                    <option value="resolved">Resolved</option>
                 </select>
              </div>
           </div>
        </div>

        {/* Global Operational Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
           {[
              { label: 'TOTAL_SIGNATURES', value: counts.all, color: 'text-slate-900', icon: <FiMap /> },
              { label: 'PENDING_VERIFICATION', value: counts.pending, color: 'text-blue-600', icon: <FiAlertTriangle /> },
              { label: 'ACTIVE_DEPLOYMENTS', value: counts.active, color: 'text-emerald-600', icon: <FiTruck /> },
              { label: 'RESOLVED_MISSIONS', value: counts.resolved, color: 'text-slate-400', icon: <FaCheck /> }
           ].map((stat, i) => (
              <div key={i} className="tactical-card p-6 border-slate-200">
                 <div className="flex items-center justify-between mb-2">
                    <span className="tactical-label mb-0">{stat.label}</span>
                    <div className="text-slate-300">{stat.icon}</div>
                 </div>
                 <div className={`text-2xl font-black tabular-nums ${stat.color}`}>{stat.value.toString().padStart(2, '0')}</div>
              </div>
           ))}
        </div>

        {/* Incident Feed Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
           {loading && incidents.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                 <div key={i} className="tactical-card h-64 animate-pulse bg-slate-50 border-slate-100" />
              ))
           ) : filteredIncidents.length === 0 ? (
              <div className="col-span-full py-32 text-center">
                 <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em]">Zero_Target_Matches_In_Registry</span>
              </div>
           ) : (
              filteredIncidents.map(incident => (
                 <div 
                    key={incident.id} 
                    onClick={() => {
                      setSelectedIncidentForDetails(incident);
                      setShowDetailsModal(true);
                    }}
                    className="tactical-card p-8 group hover:border-blue-400 hover:shadow-2xl transition-all cursor-pointer flex flex-col relative overflow-hidden"
                 >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 -mr-12 -mt-12 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex justify-between items-start mb-6 relative z-10">
                       <div className="flex flex-col gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm ${
                             incident.severity === 'Critical' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                             incident.severity === 'High' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                             'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                             {incident.severity}
                          </span>
                          <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm ${
                             incident.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                             incident.status === 'Pending' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                             'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                             {incident.status}
                          </span>
                       </div>
                       <span className="text-[9px] font-black text-slate-400 tracking-widest">REF_{incident.id}</span>
                    </div>

                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2 group-hover:text-blue-600 transition-colors">{incident.type}</h3>
                    
                    <div className="flex items-center gap-2 text-slate-400 mb-6">
                       <FiMapPin className="text-[10px] text-blue-600 shrink-0" />
                       <span className="text-[10px] font-bold uppercase tracking-tight truncate">{cleanAddress(incident.address)}</span>
                    </div>

                    <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <FiClock className="text-slate-300" />
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest tabular-nums">{formatTime(incident.datetime)}</span>
                       </div>
                       <div className="flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                          <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Details</span>
                          <FiChevronRight className="text-blue-600" />
                       </div>
                    </div>
                 </div>
              ))
           )}
        </div>
      </div>

      {/* Details Overlay */}
      {showDetailsModal && selectedIncidentForDetails && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 lg:p-8 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="p-10 border-b border-slate-100 flex items-center justify-between shrink-0">
                 <div>
                    <div className="tactical-status-pill mb-3">
                       <div className="tactical-status-dot bg-amber-500 animate-pulse" />
                       <span>INSPECTION_NODE: DECRYPTED</span>
                    </div>
                    <h2 className="tactical-title text-2xl">{selectedIncidentForDetails.type}_DATA_PACKET</h2>
                 </div>
                 <button onClick={() => setShowDetailsModal(false)} className="tactical-icon-container w-14 h-14 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <FiX size={24} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-8">
                       <div className="tactical-card p-8 border-slate-200">
                          <label className="tactical-label">Geographic_Signature</label>
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight leading-relaxed mb-4">{selectedIncidentForDetails.address}</p>
                          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <FiMapPin className="text-blue-600" />
                             <span className="text-[11px] font-black text-slate-500 tracking-widest tabular-nums">{selectedIncidentForDetails.lat.toFixed(5)}, {selectedIncidentForDetails.lng.toFixed(5)}</span>
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="tactical-card p-6">
                             <label className="tactical-label">Source_Link</label>
                             <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{selectedIncidentForDetails.reporter}</span>
                          </div>
                          <div className="tactical-card p-6">
                             <label className="tactical-label">Comms_ID</label>
                             <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{selectedIncidentForDetails.contact}</span>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-8">
                       <div className="tactical-card p-8 border-slate-200 h-full relative overflow-hidden">
                          <label className="tactical-label">Incident_Intelligence</label>
                          <p className="text-xs text-slate-600 leading-relaxed font-bold italic opacity-90">
                             "{selectedIncidentForDetails.description}"
                          </p>
                          <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
                             <div>
                                <label className="tactical-label mb-1">Time_Log</label>
                                <p className="text-[11px] font-black text-slate-900 tracking-widest tabular-nums">{selectedIncidentForDetails.datetime}</p>
                             </div>
                             <div>
                                <label className="tactical-label mb-1">Criticality</label>
                                <p className={`text-[11px] font-black uppercase tracking-widest ${
                                   selectedIncidentForDetails.severity === 'Critical' ? 'text-rose-600' : 'text-blue-600'
                                }`}>{selectedIncidentForDetails.severity}</p>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>

                 {selectedIncidentForDetails.photo_url && (
                    <div className="space-y-4">
                       <label className="tactical-label">Visual_Evidence_Packet</label>
                       <div className="rounded-[40px] overflow-hidden border border-slate-200 shadow-2xl bg-slate-50 relative group">
                          <img 
                            src={selectedIncidentForDetails.photo_url} 
                            alt="Incident Evidence" 
                            className="w-full h-auto max-h-[500px] object-contain group-hover:scale-[1.02] transition-transform duration-700" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent pointer-events-none" />
                       </div>
                    </div>
                 )}
              </div>

              <div className="p-10 border-t border-slate-100 bg-slate-50/50 shrink-0 flex items-center justify-end gap-4">
                 <button onClick={() => setShowDetailsModal(false)} className="tactical-button-ghost py-4 px-8">Close_Terminal</button>
                 {selectedIncidentForDetails.status === 'Pending' && (
                    <button onClick={() => { handleApprove(selectedIncidentForDetails.id); setShowDetailsModal(false); }} className="tactical-button-accent py-4 px-10">
                       <FaCheck /> Verify_Mission
                    </button>
                 )}
              </div>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default IncidentReports;
