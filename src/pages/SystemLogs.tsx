import React, { useState, useEffect, useMemo } from 'react';
import { FiSearch, FiRefreshCw, FiClock, FiActivity, FiUser, FiTerminal, FiFilter, FiDownload, FiTrash2, FiInfo, FiAlertCircle } from 'react-icons/fi';
import PageMeta from "../components/common/PageMeta";
import { toast } from 'react-hot-toast';
import { apiFetch } from '../utils/api';

const SystemLogs: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLevel, setFilterLevel] = useState('All');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('system-logs.php');
            const data = await res.json();
            if (Array.isArray(data)) setLogs(data);
        } catch (e) {
            toast.error("Failed to load audit logs");
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch = 
                (log.action?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (log.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (log.details?.toLowerCase() || '').includes(searchTerm.toLowerCase());
            
            const matchesLevel = filterLevel === 'All' || log.level === filterLevel;
            return matchesSearch && matchesLevel;
        });
    }, [logs, searchTerm, filterLevel]);

    const getLevelStyle = (level: string) => {
        switch(level?.toLowerCase()) {
            case 'error': return 'bg-rose-50 text-rose-600 border-rose-100';
            case 'warning': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'success': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            default: return 'bg-blue-50 text-blue-600 border-blue-100';
        }
    };

    const getActionIcon = (action: string) => {
        const a = action?.toLowerCase() || '';
        if (a.includes('delete') || a.includes('remove')) return <FiTrash2 className="text-rose-500" />;
        if (a.includes('login') || a.includes('auth')) return <FiUser className="text-blue-500" />;
        if (a.includes('update') || a.includes('edit')) return <FiActivity className="text-amber-500" />;
        return <FiInfo className="text-slate-400" />;
    };

    return (
        <div className="tactical-page">
            <PageMeta title="System Logs | E-LigtasMo Admin" description="Audit trail and activity monitoring for system-wide operations." />
            
            <div className="tactical-container">
                
                {/* Header */}
                <div className="tactical-header">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="tactical-status-pill mb-4">
                                <div className="tactical-status-dot bg-blue-500 animate-pulse" />
                                <span>AUDIT_LOGS: REALTIME_SYNC</span>
                            </div>
                            <h1 className="tactical-title">System Audit Logs</h1>
                            <p className="tactical-subtitle">Monitor administrative activities, operator behaviors, and core system events.</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="tactical-button-ghost">
                                <FiDownload /> Export_LOG
                            </button>
                            <button 
                                onClick={fetchLogs}
                                className="tactical-icon-container hover:bg-white hover:text-blue-600"
                            >
                                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search by action, operator, or details..."
                            className="tactical-input w-full pl-9 h-10 text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="tactical-input h-10 text-sm appearance-none min-w-[150px]"
                        value={filterLevel}
                        onChange={e => setFilterLevel(e.target.value)}
                    >
                        <option value="All">All Levels</option>
                        <option value="Info">Info</option>
                        <option value="Warning">Warning</option>
                        <option value="Error">Error</option>
                    </select>
                </div>

                {/* Main Log View */}
                <div className="tactical-table-wrapper">
                    <div className="overflow-x-auto">
                        <table className="tactical-table">
                            <thead>
                                <tr>
                                    <th className="tactical-th">Action</th>
                                    <th className="tactical-th">Operator</th>
                                    <th className="tactical-th">Status</th>
                                    <th className="tactical-th">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse h-20">
                                            <td colSpan={4} className="px-8 py-4 bg-slate-50/20" />
                                        </tr>
                                    ))
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-32 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <FiTerminal size={32} className="text-slate-200" />
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No_Activity_Signals_Detected</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredLogs.map((log, idx) => (
                                    <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                                        <td className="tactical-td max-w-md">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                                    {getActionIcon(log.action)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">{log.action || 'System Event'}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{log.details}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="tactical-td">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 bg-slate-900 text-white rounded-lg flex items-center justify-center text-[10px] font-bold">
                                                    {log.username?.substring(0, 2).toUpperCase() || 'SY'}
                                                </div>
                                                <span className="text-sm font-medium text-slate-700">{log.username || 'system'}</span>
                                            </div>
                                        </td>
                                        <td className="tactical-td">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getLevelStyle(log.level)}`}>
                                                {log.level || 'Info'}
                                            </span>
                                        </td>
                                        <td className="tactical-td whitespace-nowrap">
                                            <span className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between mt-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{filteredLogs.length} event{filteredLogs.length !== 1 ? 's' : ''}</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">System Audit Trail</span>
                </div>
            </div>
        </div>
    );
};

export default SystemLogs;
