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
            const res = await apiFetch('log-activity.php');
            const data = await res.json();
            if (data.success && Array.isArray(data.logs)) {
                // Map the schema from system_logs table to the UI expectations
                const mappedLogs = data.logs.map((l: any) => ({
                    action: l.action_type || l.action,
                    username: l.username,
                    details: l.action_description || l.details,
                    level: l.status === 'success' ? 'Info' : 'Error',
                    created_at: l.created_at
                }));
                setLogs(mappedLogs);
            }
        } catch (e) {
            toast.error("Failed to load audit logs");
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = useMemo(() => {
        const list = Array.isArray(logs) ? logs : [];
        return list.filter(log => {
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
            
            {/* Header */}
            <div className="tactical-header">
                <div>
                    <h1 className="tactical-title">System Audit Logs</h1>
                    <p className="tactical-subtitle">Monitor administrative activities, operator behaviors, and core system events.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="tactical-btn-secondary flex items-center gap-2">
                        <FiDownload /> Export Logs
                    </button>
                    <button 
                        onClick={fetchLogs}
                        className="tactical-btn-secondary p-2"
                    >
                        <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 tactical-card p-4 mb-6">
                <div className="relative flex-1">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        className="tactical-input w-full pl-11"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="tactical-input min-w-[200px]"
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
            <div className="tactical-card">
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
                                    <tr key={i} className="animate-pulse h-16">
                                        <td colSpan={4} className="px-6 py-4 bg-slate-50/20" />
                                    </tr>
                                ))
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-24 text-center">
                                        <FiTerminal size={40} className="text-slate-200 mx-auto mb-4" />
                                        <p className="text-sm text-gray-400 font-medium">No activity detected</p>
                                    </td>
                                </tr>
                            ) : filteredLogs.map((log, idx) => (
                                <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                                    <td className="tactical-td max-w-md">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                                {getActionIcon(log.action)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{log.action || 'System Event'}</p>
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{log.details}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="tactical-td">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 bg-slate-900 text-white rounded-lg flex items-center justify-center text-[10px] font-bold">
                                                {log.username?.substring(0, 2).toUpperCase() || 'SY'}
                                            </div>
                                            <span className="font-medium">{log.username || 'system'}</span>
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
                
                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400">{filteredLogs.length} Events Detected</span>
                    <span className="text-xs font-bold text-gray-400 tracking-wider">Audit Trail Active</span>
                </div>
            </div>
        </div>
    );
};

export default SystemLogs;
