import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import NotificationDropdown from '../components/header/NotificationDropdown';
import { FiHome, FiMap, FiShield, FiAlertTriangle, FiPhone } from 'react-icons/fi';

const ResidentHeader: React.FC = () => {
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
    { name: 'Home', path: '/', icon: <FiHome size={18} /> },
    { name: 'Safe Routes', path: '/route-planner', icon: <FiMap size={18} /> },
    { name: 'Shelters', path: '/shelters', icon: <FiShield size={18} /> },
    { name: 'Report', path: '/report-incident', icon: <FiAlertTriangle size={18} /> },
    { name: 'Emergency Guides', path: '/resources', icon: <FiPhone size={18} /> }
  ];

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="px-4 lg:px-6 py-1.5">
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
            <Link to="/" className="lg:hidden">
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
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.icon}
                {location.pathname === item.path && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full"></div>
                )}
              </Link>
            ))}
          </nav>

          {/* Right side - Notifications only (no user dropdown for residents) */}
          <div className="flex items-center gap-2">
            <NotificationDropdown notificationCount={2} />
            
            {/* Emergency button for quick access */}
            <Link
              to="/resources"
              className="hidden sm:flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <FiPhone size={16} />
              <span className="hidden md:inline">Emergency Guides</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ResidentHeader;
