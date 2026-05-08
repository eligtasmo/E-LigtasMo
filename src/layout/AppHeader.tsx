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
    <div className="flex items-center gap-4 bg-slate-50 px-5 py-2 rounded-2xl border border-slate-100">
      <div className="flex flex-col items-end leading-tight">
        <span className="text-xl font-bold tabular-nums tracking-tight text-slate-900">
          {phTime}
        </span>
        <span className="text-[10px] font-bold text-blue-500 tracking-wide uppercase">
          {phDate}
        </span>
      </div>
      <div className="h-8 w-px bg-slate-200 mx-1" />
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">System Status</span>
        </div>
        <span className="navbar-text text-slate-900 leading-none">Operational</span>
      </div>
    </div>
  );
};

const AppHeader: React.FC = () => {
  const { toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const role = (user?.role || 'resident').toLowerCase();

  return (
    <header className="h-[60px] flex items-center bg-white/80 backdrop-blur-xl border-b border-slate-100 transition-all duration-300 font-sans w-full sticky top-0 z-50">
      <div className="w-full px-6">
        <div className="flex items-center justify-between h-full">
          {/* Left side */}
          <div className="flex items-center gap-5">
          </div>

          {/* Center: PH Time Clock */}
          <div className="hidden lg:flex flex-1 items-center justify-center pointer-events-none">
            <PHClock />
          </div>

          {/* Right side - User & Notifications */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <NotificationDropdown notificationCount={5} />
              <div className="w-px h-8 bg-slate-100 mx-1" />
              <UserDropdown />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
