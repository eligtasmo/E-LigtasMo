import React from 'react';
import { FiList, FiPlusCircle, FiRefreshCw } from 'react-icons/fi';

type TabKey = 'requests' | 'create';

interface AdminEmergencyNavBarProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  counts?: { total?: number; active?: number; resolved?: number };
}

const AdminEmergencyNavBar: React.FC<AdminEmergencyNavBarProps> = ({ active, onChange, counts }) => {
  const items: { key: TabKey; label: string; icon: React.ReactNode; badge?: string }[] = [
    { key: 'requests', label: `Requests${counts?.total ? ` (${counts.total})` : ''}`, icon: <FiList size={16} /> },
    { key: 'create', label: 'Emergency Request Form', icon: <FiPlusCircle size={16} /> },
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
              <span>Refresh_Ops</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEmergencyNavBar;
