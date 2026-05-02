import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiHome,
  FiMap,
  FiSearch,
  FiBarChart,
  FiBell,
  FiMenu,
  FiX,
  FiUser,
  FiSettings,
  FiShield,
  FiMapPin,
  FiAlertTriangle,
  FiPhone,
  FiFileText
} from 'react-icons/fi';
import { TiWeatherPartlySunny as WeatherIcon } from 'react-icons/ti';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
  isActive?: boolean;
}

interface MobileNavigationProps {
  userRole?: 'resident' | 'coordinator' | 'admin';
  notificationCount?: number;
  showBottomBar?: boolean; // control rendering of fixed bottom navigation (optional)
  showTopMobileBar?: boolean; // control rendering of the mobile top nav bar
  showDesktopBar?: boolean; // control rendering of the desktop nav bar
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  userRole = 'resident',
  notificationCount = 0,
  showBottomBar,
  showTopMobileBar,
  showDesktopBar
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Main navigation items based on user role
  const getMainNavItems = (): NavigationItem[] => {
    // Resident: simplified 4-tab bottom nav (Home, Tools, Info, Contacts)
    if (userRole === 'resident') {
      const residentItems: NavigationItem[] = [
        {
          id: 'scan',
          label: 'Scan',
          icon: <FiSearch size={22} />,
          path: '/report-incident'
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: <FiFileText size={22} />,
          path: '/reports'
        },
        {
          id: 'achievements',
          label: 'Stats',
          icon: <FiBarChart size={22} />,
          path: '/'
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: <FiSettings size={22} />,
          path: '/settings'
        }
      ];
      return residentItems.map(item => ({
        ...item,
        isActive: location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
      }));
    }

    // Default navigation for other roles
    const baseItems: NavigationItem[] = [
      {
        id: 'home',
        label: 'Home',
        icon: <FiHome size={20} />,
        path: '/dashboard'
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
        id: 'notifications',
        label: 'Alerts',
        icon: <FiBell size={20} />,
        path: '/notifications',
        badge: notificationCount
      }
    ];

    return baseItems.map(item => ({
      ...item,
      isActive: location.pathname.startsWith(item.path)
    }));
  };

  // Side menu items
  const getSideMenuItems = (): NavigationItem[] => {
    const commonItems: NavigationItem[] = [
      {
        id: 'profile',
        label: 'Profile',
        icon: <FiUser size={20} />,
        path: '/profile'
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: <FiSettings size={20} />,
        path: '/settings'
      }
    ];

    if (userRole === 'resident') {
      return [
        ...commonItems,
        {
          id: 'resources',
          label: 'Emergency Guides',
          icon: <FiPhone size={20} />,
          path: '/resources'
        },
        {
          id: 'shelters',
          label: 'Nearby Shelters',
          icon: <FiShield size={20} />,
          path: '/shelters'
        },
        {
          id: 'incidents',
          label: 'Report Incident',
          icon: <FiAlertTriangle size={20} />,
          path: '/report'
        }
      ];
    } else {
      return [
        ...commonItems,
        {
          id: 'manage-incidents',
          label: 'Manage Incidents',
          icon: <FiAlertTriangle size={20} />,
          path: '/manage/incidents'
        },
        {
          id: 'manage-shelters',
          label: 'Manage Shelters',
          icon: <FiShield size={20} />,
          path: '/manage/shelters'
        },
        {
          id: 'manage-routes',
          label: 'Manage Routes',
          icon: <FiMapPin size={20} />,
          path: '/manage/routes'
        }
      ];
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const mainNavItems = getMainNavItems();
  const sideMenuItems = getSideMenuItems();
  // Default behavior: hide bottom bar for residents unless explicitly enabled
  const bottomBarEnabled =
    typeof showBottomBar === 'boolean' ? showBottomBar : userRole !== 'resident';
  // Default behavior: hide top/desktop bars for residents (ResidentHeader handles these)
  const topMobileBarEnabled =
    typeof showTopMobileBar === 'boolean' ? showTopMobileBar : userRole !== 'resident';
  const desktopBarEnabled =
    typeof showDesktopBar === 'boolean' ? showDesktopBar : userRole !== 'resident';

  return (
    <>
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 text-sm font-medium z-50">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            You're offline. Some features may be limited.
          </div>
        </div>
      )}

      {/* Side Menu Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Side Menu */}
      <div className={`
        fixed top-0 left-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 z-50 md:hidden
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Menu Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">EligTasmo</h2>
              <p className="text-blue-100 text-sm capitalize">{userRole} Portal</p>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <div className="p-4 space-y-2">
          {sideMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`
                w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left
                ${location.pathname.startsWith(item.path)
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Menu Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="text-center text-sm text-gray-500">
            <p>Version 1.0.0</p>
            <p className="mt-1">
              Status: <span className={isOnline ? 'text-green-500' : 'text-red-500'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Top Navigation Bar (Mobile) */}
      {topMobileBarEnabled && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiMenu size={24} className="text-gray-700" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FiShield size={20} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">EligTasmo</span>
          </div>

          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <FiUser size={20} className="text-gray-600" />
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar (Mobile) */}
      {bottomBarEnabled && (
        <div className="md:hidden fixed bottom-6 left-4 right-4 bg-white/90 backdrop-blur-xl border border-gray-200 px-2 py-3 z-30 rounded-3xl shadow-premium-lg">
          <div className="flex items-center justify-around">
            {mainNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`
                  flex flex-col items-center gap-1 p-1 rounded-2xl transition-all duration-300 min-w-[70px] relative
                  ${item.isActive ? "text-gray-900" : "text-gray-400"}
                `}
              >
                <div 
                  className={`
                    w-12 h-10 flex items-center justify-center rounded-2xl transition-all duration-300
                    ${item.isActive ? "bg-black text-white shadow-lg shadow-black/20" : "bg-transparent"}
                  `}
                >
                  {item.icon}
                </div>
                <span className={`text-[11px] font-semibold transition-all ${item.isActive ? "opacity-100" : "opacity-0"}`}>
                  {item.label}
                </span>
                
                {/* Badge */}
                {item.badge && item.badge > 0 && (
                  <div className="absolute top-0 right-2 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {item.badge > 99 ? '99+' : item.badge}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Desktop Navigation (Hidden on mobile) */}
      {desktopBarEnabled && (
        <div className="hidden md:block">
          {/* Desktop navigation would go here */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <FiShield size={20} className="text-white" />
                  </div>
                  <span className="font-bold text-gray-900 text-xl">EligTasmo</span>
                </div>
                
                <nav className="flex items-center gap-6">
                  {mainNavItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.path)}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg transition-colors relative
                        ${item.isActive
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                        }
                      `}
                    >
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="flex items-center gap-4">
                {!isOnline && (
                  <div className="flex items-center gap-2 text-red-500 text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Offline
                  </div>
                )}
                
                <button
                  onClick={() => handleNavigation('/profile')}
                  className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                >
                  <FiUser size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for fixed bottom navigation */}
      {bottomBarEnabled && <div className="md:hidden h-14"></div>}
    </>
  );
};

export default MobileNavigation;
