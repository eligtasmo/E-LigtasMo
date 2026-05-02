import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FiHome, 
  FiMap, 
  FiSearch, 
  FiBarChart, 
  FiBell, 
  FiUser, 
  FiMenu, 
  FiX,
  FiShield,
  FiChevronDown
} from 'react-icons/fi';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

interface ModernNavBarProps {
  userRole?: 'admin' | 'resident' | 'brgy';
  userName?: string;
  userEmail?: string;
  notificationCount?: number;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
  onLogout?: () => void;
}

const ModernNavBar: React.FC<ModernNavBarProps> = ({
  userRole = 'admin',
  userName = 'John Doe',
  userEmail = 'john@example.com',
  notificationCount = 3,
  onNotificationClick,
  onProfileClick,
  onLogout
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const location = useLocation();

  const navigationItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <FiHome size={20} />,
      path: userRole === 'resident' ? '/resident' : '/dashboard'
    },
    {
      id: 'routes',
      label: 'Routes',
      icon: <FiMap size={20} />,
      path: '/routes'
    },
    {
      id: 'search',
      label: 'Search',
      icon: <FiSearch size={20} />,
      path: '/search'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <FiBarChart size={20} />,
      path: '/analytics'
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: <FiBell size={20} />,
      path: '/alerts',
      badge: 0
    }
  ];

  const isActiveRoute = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  return (
    <>
      {/* Main Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex justify-between items-center h-20">
            
            {/* Logo Section */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center shadow-lg shadow-black/10">
                  <FiShield size={22} className="text-white" />
                </div>
                <span className="text-xl font-black tracking-tighter text-black font-jetbrains uppercase">EligTasmo</span>
              </Link>
            </div>

            {/* Desktop Navigation Items */}
            <div className="hidden md:flex items-center gap-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 relative ${
                    isActiveRoute(item.path)
                      ? 'text-white bg-black shadow-xl shadow-black/20 scale-105'
                      : 'text-gray-400 hover:text-black hover:bg-gray-50'
                  }`}
                >
                  {item.icon}
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center shadow-lg">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* Right Section - Notifications & Profile */}
            <div className="flex items-center gap-4">
              
              {/* Notification Icon */}
              <button
                onClick={onNotificationClick}
                className="relative w-12 h-12 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 rounded-2xl transition-all duration-300"
              >
                <FiBell size={20} />
                {notificationCount > 0 && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black rounded-full h-4 w-4 flex items-center justify-center shadow-lg">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={toggleProfileDropdown}
                  className="flex items-center space-x-3 p-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                >
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <FiUser size={16} className="text-gray-600" />
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-gray-900">{userName}</div>
                    <div className="text-xs text-gray-500 capitalize">{userRole}</div>
                  </div>
                  <FiChevronDown 
                    size={16} 
                    className={`text-gray-500 transition-transform duration-200 ${
                      isProfileDropdownOpen ? 'rotate-180' : ''
                    }`} 
                  />
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="text-sm font-medium text-gray-900">{userName}</div>
                      <div className="text-sm text-gray-500">{userEmail}</div>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={onProfileClick}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <FiUser size={16} className="mr-3" />
                        View Profile
                      </button>
                      <button
                        onClick={onLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={toggleMobileMenu}
                className="md:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors duration-200"
              >
                {isMobileMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3">
              <div className="flex items-center justify-center space-x-6">
                {navigationItems.map((item) => (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-200 relative ${
                      isActiveRoute(item.path)
                        ? 'text-gray-900 bg-gray-100'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon}
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Overlay for mobile dropdown */}
      {(isMobileMenuOpen || isProfileDropdownOpen) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={() => {
            setIsMobileMenuOpen(false);
            setIsProfileDropdownOpen(false);
          }}
        />
      )}
    </>
  );
};

export default ModernNavBar;
