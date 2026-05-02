import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import NotificationDropdown from '../components/header/NotificationDropdown';
import UserDropdown from '../components/header/UserDropdown';
import { useAuth } from '../context/AuthContext';
import { FiGrid, FiAlertTriangle, FiTruck, FiBell, FiMap, FiCloud, FiShield } from 'react-icons/fi';

const PHClock: React.FC = () => {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const phTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(time);

  const phDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  }).format(time);

  return (
    <div className="flex items-center gap-4 font-jetbrains group">
      <div className="flex flex-col items-end leading-none">
        <span className="text-2xl font-black tracking-tighter text-black dark:text-white uppercase tabular-nums">
          {phTime}
        </span>
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mt-0.5">
          {phDate}
        </span>
      </div>
      <div className="h-10 w-[1px] bg-gray-100 dark:bg-gray-800" />
      <div className="flex flex-col items-center justify-center px-3 py-1 bg-black text-white rounded-xl shadow-lg shadow-black/10 border border-white/10">
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-black tracking-[0.2em]">LIVE</span>
        </div>
        <span className="text-[14px] font-black tracking-widest leading-none">PH</span>
      </div>
    </div>
  );
};

const AppHeader: React.FC = () => {
  const { toggleSidebar } = useSidebar();
  const location = useLocation();
  const { user } = useAuth();
  const role = (user?.role || 'resident').toLowerCase();

  return (
    <header className="fixed top-0 left-0 w-full h-[64px] flex items-center z-[1300] bg-white/95 backdrop-blur-md dark:bg-gray-900/95 border-b border-gray-100 dark:border-gray-800 transition-all duration-300">
      <div className="w-full px-4 lg:px-8">
        <div className="flex items-center justify-between h-full">
          {/* Left side - Logo & Tactical Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="w-10 h-10 rounded-xl text-gray-500 hover:text-black hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </button>
            <Link to={role === 'admin' ? '/admin' : role === 'brgy' ? '/brgy' : '/'} className="flex items-center group">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 active:scale-95">
                <img src="/images/logo/logo-icon.png" alt="Logo" className="w-7 h-7 dark:hidden" />
                <img src="/images/logo/logo-icon-dark.svg" alt="Logo" className="w-7 h-7 hidden dark:block" />
              </div>
            </Link>
          </div>

          {/* Center: PH Time Clock */}
          <div className="hidden lg:flex flex-1 items-center justify-center pointer-events-none">
            <PHClock />
          </div>

          {/* Right side - User & Notifications */}
          <div className="flex items-center gap-3">
            {role === 'resident' ? (
              <NotificationDropdown notificationCount={2} />
            ) : (
              <div className="flex items-center gap-2">
                <NotificationDropdown notificationCount={5} />
                <UserDropdown />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
