import { useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "../context/SidebarContext";
import { GoLocation as RouteIcon } from "react-icons/go";
import { BsShieldShaded as ShelterIcon } from "react-icons/bs";
import { IoWarningOutline as WarningIcon } from "react-icons/io5";
import { TiWeatherPartlySunny as WeatherIcon } from "react-icons/ti";
import { FiHelpCircle as HelpIcon, FiBell, FiPhone, FiUsers } from "react-icons/fi";
import { GridIcon } from "../icons";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
  description?: string;
  badge?: string;
};

// Core SafeRoute Tools - Primary focus for residents
const safeRouteTools: NavItem[] = [
  { 
    name: "Plan Safe Route", 
    icon: <RouteIcon size={18} />, 
    path: "/safe-routes",
    description: "Find the safest path to your destination"
  },
  { 
    name: "Find Shelters", 
    icon: <ShelterIcon size={18} />, 
    path: "/shelters",
    description: "Locate nearby evacuation centers"
  },
  { 
    name: "Report Emergency", 
    icon: <WarningIcon size={18} />, 
    path: "/report-incident",
    description: "Report incidents or hazards"
  },
];

// Essential Information - Secondary tools
const essentialInfo: NavItem[] = [
  { 
    name: "Weather Alerts", 
    icon: <WeatherIcon size={18} />, 
    path: "/weather",
    description: "Current weather and warnings"
  },
  { 
    name: "Public Announcements", 
    icon: <FiBell size={18} />, 
    path: "/announcements",
    description: "Official updates and alerts"
  },
];

// Support & Contacts - Tertiary tools
const supportContacts: NavItem[] = [
  { 
    name: "Emergency Guides", 
    icon: <FiPhone size={18} />, 
    path: "/resources",
    description: "Guides, kit, contacts"
  },
  { 
    name: "Local Coordinators", 
    icon: <FiUsers size={18} />, 
    path: "/coordinators",
    description: "Barangay emergency contacts"
  },
  { 
    name: "Help & Guide", 
    icon: <HelpIcon size={18} />, 
    path: "/help",
    description: "How to use SafeRoute"
  },
];

const homeNav: NavItem = { 
  name: "Home", 
  icon: <GridIcon />, 
  path: "/",
  description: "Dashboard overview"
};

const ResidentSidebar: React.FC = () => {
  const { isMobileOpen, toggleMobileSidebar, isExpanded, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  const renderLinkList = (items: NavItem[]) => (
    <ul className="flex flex-col gap-1.5">
      {items.map((nav) => {
        const active = isActive(nav.path);
        return (
          <li key={nav.name}>
            <Link
              to={nav.path}
              className={`menu-item ${active ? 'menu-item-active shadow-lg shadow-black/10' : 'menu-item-inactive'} ${
                !isExpanded && !isHovered ? "justify-center px-0" : ""
              }`}
            >
              <span className={`flex-shrink-0 flex items-center justify-center ${active ? 'text-white' : 'text-gray-500'}`}>
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="font-bold tracking-tight flex-1 text-left truncate font-sans">
                  {nav.name}
                </span>
              )}
              {nav.badge && (isExpanded || isHovered || isMobileOpen) && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {nav.badge}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[1100] transition-opacity lg:hidden"
          onClick={toggleMobileSidebar}
          aria-label="Close sidebar"
        />
      )}
      <aside
        className={`fixed top-[72px] left-0 h-[calc(100vh-72px)] bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 transition-all duration-300 ease-in-out z-[1200]
          ${
            isExpanded || isMobileOpen
              ? "w-[280px]"
              : isHovered
              ? "w-[280px]"
              : "w-[80px]"
          }
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0`}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >

        <div className="flex flex-col h-[calc(100vh-120px)] overflow-y-auto no-scrollbar px-4 pb-10">
          <nav className="space-y-8">
            {/* Home Link */}
            <div>
              <ul className="flex flex-col">
                <li>
                  <Link
                    to={homeNav.path}
                    className={`menu-item ${isActive(homeNav.path) ? 'menu-item-active shadow-lg shadow-black/10' : 'menu-item-inactive'} ${
                      !isExpanded && !isHovered ? "justify-center px-0" : ""
                    }`}
                  >
                    <span className={`flex-shrink-0 flex items-center justify-center ${isActive(homeNav.path) ? 'text-white' : 'text-gray-500'}`}>
                      {homeNav.icon}
                    </span>
                    {(isExpanded || isHovered || isMobileOpen) && (
                      <span className="font-bold tracking-tight flex-1 text-left truncate font-sans">
                        {homeNav.name}
                      </span>
                    )}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Primary SafeRoute Tools */}
            <div className="space-y-3">
              {(isExpanded || isHovered || isMobileOpen) && (
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-4 font-sans">
                  SafeRoute Tools
                </div>
              )}
              {renderLinkList(safeRouteTools)}
            </div>

            {/* Essential Information */}
            <div className="space-y-3">
              {(isExpanded || isHovered || isMobileOpen) && (
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-4 font-sans">
                  Stay Informed
                </div>
              )}
              {renderLinkList(essentialInfo)}
            </div>

            {/* Support & Contacts */}
            <div className="space-y-3">
              {(isExpanded || isHovered || isMobileOpen) && (
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-4 font-sans">
                  Support
                </div>
              )}
              {renderLinkList(supportContacts)}
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
};

export default ResidentSidebar;
