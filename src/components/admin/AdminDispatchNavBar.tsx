import React from 'react';
import { FiSend, FiShield, FiFileText, FiRefreshCw } from 'react-icons/fi';

export type TabKey = 'dispatch' | 'response' | 'records';

interface AdminDispatchNavBarProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  counts?: { runs?: number; active?: number; responders?: number };
}

const AdminDispatchNavBar: React.FC<AdminDispatchNavBarProps> = ({ active, onChange, counts }) => {
  const items: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'dispatch', label: 'Dispatch & Response', icon: <FiSend size={16} /> },
    { key: 'response', label: `Response${counts?.active ? ` (${counts.active})` : ''}`, icon: <FiShield size={16} /> },
    { key: 'records', label: `Records${counts?.runs ? ` (${counts.runs})` : ''}`, icon: <FiFileText size={16} /> },
  ];

  return (
    <div className="sticky top-[72px] z-40 bg-white border-b border-gray-100 font-jetbrains">
      <div className="px-4 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex gap-2">
            {items.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => onChange(key)}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all border ${
                  active === key
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20'
                    : 'text-slate-400 hover:text-slate-900 hover:bg-gray-50 border-transparent'
                }`}
              >
                <span className="text-xs">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 border border-transparent transition-all">
              <FiRefreshCw className="text-xs" />
              <span>Sync_Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDispatchNavBar;
