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
    <div className="sticky top-16 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-between h-12">
          <div className="flex gap-1">
            {items.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => onChange(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  active === key
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {icon}
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
              <FiRefreshCw size={16} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEmergencyNavBar;
