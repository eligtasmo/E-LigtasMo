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
};

const safeRouteTools: NavItem[] = [
  { name: "Plan Safe Route", icon: <RouteIcon size={18} />, path: "/safe-routes" },
  { name: "Find Shelters", icon: <ShelterIcon size={18} />, path: "/shelters" },
  { name: "Report Emergency", icon: <WarningIcon size={18} />, path: "/report-incident" },
];

const essentialInfo: NavItem[] = [
  { name: "Weather Alerts", icon: <WeatherIcon size={18} />, path: "/weather" },
  { name: "Public Announcements", icon: <FiBell size={18} />, path: "/announcements" },
];

const supportContacts: NavItem[] = [
  { name: "Emergency Guides", icon: <FiPhone size={18} />, path: "/resources" },
  { name: "Local Coordinators", icon: <FiUsers size={18} />, path: "/coordinators" },
  { name: "Help & Guide", icon: <HelpIcon size={18} />, path: "/help" },
];

const ResidentSidebar: React.FC = () => {
  const { isMobileOpen, toggleMobileSidebar, isExpanded, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  const renderLinkList = (items: NavItem[]) => (
    <ul className="flex flex-col gap-1.5 mb-6">
      {items.map((nav) => {
        const active = isActive(nav.path);
        return (
          <li key={nav.name}>
            <Link
              to={nav.path}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                active 
                  ? "bg-brand-600 text-white shadow-premium-md" 
                  : "text-gray-600 hover:bg-brand-50 hover:text-brand-700"
              } ${!isExpanded && !isHovered ? "justify-center px-0" : ""}`}
            >
              <span className="flex-shrink-0">
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="text-sm font-semibold flex-1 truncate">
                  {nav.name}
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
      <aside
        className={`h-[calc(100vh-64px)] fixed top-16 bg-white border-r border-brand-100 transition-all duration-300 z-[1200] flex flex-col shadow-premium-sm ${
          isExpanded || isHovered || isMobileOpen ? "w-64" : "w-20"
        } ${isMobileOpen ? "fixed inset-y-0 left-0" : "hidden lg:flex"}`}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex-1 overflow-y-auto no-scrollbar p-4">
          <Link
            to="/"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 mb-6 ${
              isActive("/") 
                ? "bg-brand-600 text-white shadow-premium-md" 
                : "text-gray-600 hover:bg-brand-50 hover:text-brand-700"
            } ${!isExpanded && !isHovered ? "justify-center px-0" : ""}`}
          >
            <span className="flex-shrink-0">
              <GridIcon />
            </span>
            {(isExpanded || isHovered || isMobileOpen) && (
              <span className="text-sm font-semibold flex-1 truncate">Home</span>
            )}
          </Link>

          {renderLinkList(safeRouteTools)}
          {renderLinkList(essentialInfo)}
          {renderLinkList(supportContacts)}
        </div>
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-[1100] lg:hidden" onClick={toggleMobileSidebar} />
      )}
    </>
  );
};

export default ResidentSidebar;
