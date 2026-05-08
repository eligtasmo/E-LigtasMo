import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import NotificationDropdown from '../components/header/NotificationDropdown';
import UserDropdown from '../components/header/UserDropdown';
import { FiHome, FiShield, FiUsers, FiBarChart, FiAlertTriangle, FiMap } from 'react-icons/fi';

const BrgyHeader: React.FC = () => {
  const { toggleSidebar, toggleMobileSidebar } = useSidebar();
  const location = useLocation();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const navigationItems = [
    { name: 'Dashboard', path: '/brgy', icon: <FiHome size={18} /> },
    { name: 'Shelters', path: '/brgy/shelters', icon: <FiShield size={18} /> },
    { name: 'Residents', path: '/brgy/residents', icon: <FiUsers size={18} /> },
    { name: 'Reports', path: '/brgy/reports', icon: <FiBarChart size={18} /> },
    { name: 'Incidents', path: '/brgy/incidents', icon: <FiAlertTriangle size={18} /> },
    { name: 'Routes', path: '/brgy/routes', icon: <FiMap size={18} /> }
  ];

  return (
    <header className="h-[60px] flex items-center bg-white/80 backdrop-blur-xl border-b border-slate-100 transition-all duration-300 font-sans w-full sticky top-0 z-50">
      <div className="px-4 lg:px-6 py-1.5 w-full">
        <div className="flex items-center justify-between">
          {/* Left side - Mobile menu button and Logo */}
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={handleToggle}
              className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Logo for mobile */}
            <Link to="/brgy" className="lg:hidden">
              <img className="h-8 dark:hidden" src="./images/logo/logo.svg" alt="E-LigtasMo" />
              <img className="h-8 hidden dark:block" src="./images/logo/logo-dark.svg" alt="E-LigtasMo" />
            </Link>
          </div>

          {/* Centered Navigation Items - Hidden on mobile */}
          <nav className="hidden lg:flex items-center space-x-6">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 relative ${
                  location.pathname === item.path
                    ? 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'
                }`}
                title={item.name}
              >
                {item.icon}
                {location.pathname === item.path && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-green-600 dark:bg-green-400 rounded-full"></div>
                )}
              </Link>
            ))}
          </nav>

          {/* Right side - Notifications and User dropdown */}
          <div className="flex items-center gap-2">
            <NotificationDropdown notificationCount={3} />
            <UserDropdown />
          </div>
        </div>
      </div>
    </header>
  );
};

export default BrgyHeader;
