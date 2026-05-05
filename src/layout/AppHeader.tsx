import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import NotificationDropdown from '../components/header/NotificationDropdown';
import UserDropdown from '../components/header/UserDropdown';
import { useAuth } from '../context/AuthContext';
import { FiMenu, FiClock, FiActivity } from 'react-icons/fi';

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
    <div className="flex items-center gap-4 group bg-black/5 dark:bg-white/5 px-4 py-1.5 rounded-2xl border border-black/5 dark:border-white/5 backdrop-blur-sm">
      <div className="flex flex-col items-end leading-tight">
        <span className="text-xl font-black tabular-nums tracking-tight text-gray-900 dark:text-white uppercase">
          {phTime}
        </span>
        <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">
          {phDate}
        </span>
      </div>
      <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
          <span className="text-[9px] font-black tracking-widest text-gray-500 dark:text-gray-400">EOC LIVE</span>
        </div>
        <span className="text-[12px] font-black tracking-tighter text-gray-900 dark:text-white leading-none">STX-OPS</span>
      </div>
    </div>
  );
};

const AppHeader: React.FC = () => {
  const { toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const role = (user?.role || 'resident').toLowerCase();

  return (
    <header className="fixed top-0 left-0 w-full h-[64px] flex items-center z-[1300] bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 transition-all duration-300 shadow-sm">
      <div className="w-full px-4 lg:px-6">
        <div className="flex items-center justify-between h-full">
          {/* Left side - Logo & Tactical Toggle */}
          <div className="flex items-center gap-5">
            <button
              onClick={toggleSidebar}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-black dark:hover:bg-white transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-black dark:hover:border-white"
            >
              <FiMenu className="w-5 h-5 text-gray-500 group-hover:text-white dark:group-hover:text-black transition-colors" />
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white dark:group-hover:text-black">Menu</span>
            </button>
            
            <Link to={role === 'admin' ? '/admin' : role === 'brgy' ? '/brgy' : '/'} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-600/20 flex items-center justify-center transition-transform group-hover:scale-105 active:scale-95">
                <img src="/images/logo/logo-icon.png" alt="Logo" className="w-7 h-7 brightness-0 invert" />
              </div>
              <div className="hidden md:flex flex-col leading-none">
                <span className="text-sm font-black tracking-tighter text-gray-900 dark:text-white uppercase">E-LigtasMo</span>
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{role === 'admin' ? 'MDRRMO HQ' : 'Brgy Command'}</span>
              </div>
            </Link>
          </div>

          {/* Center: PH Time Clock */}
          <div className="hidden lg:flex flex-1 items-center justify-center pointer-events-none">
            <PHClock />
          </div>

          {/* Right side - User & Notifications */}
          <div className="flex items-center gap-4">
            <div className="h-8 w-px bg-gray-100 dark:bg-gray-800 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <NotificationDropdown notificationCount={5} />
              <div className="w-px h-6 bg-gray-100 dark:bg-gray-800 mx-1" />
              <UserDropdown />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
