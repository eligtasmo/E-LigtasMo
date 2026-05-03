import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  GridIcon,
  ChevronDownIcon,
} from "../icons";
import { GoLocation as RouteIcon } from "react-icons/go";
import { BsShieldShaded as ShelterIcon } from "react-icons/bs";
import { FiBell, FiUsers as UsersIcon, FiDatabase as LogsIcon, FiHelpCircle as HelpIcon, FiUser, FiActivity, FiSettings, FiAlertTriangle, FiShield, FiWind, FiMap, FiMessageSquare } from "react-icons/fi";
import { FaPhone, FaUser, FaMapMarkerAlt, FaHome, FaBook, FaGlobeAmericas, FaTint } from "react-icons/fa";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; iew?: boolean }[];
  roles?: string[];
  pathByRole?: { admin?: string; brgy?: string; resident?: string };
  nameByRole?: { admin?: string; brgy?: string; resident?: string };
  badge?: string;
};

// --- NAVIGATION SECTIONS ---

const operationsItems: NavItem[] = [
  {
    icon: <GridIcon className="w-5 h-5" />,
    name: "Dashboard",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { admin: "/admin", brgy: "/brgy", resident: "/resident/home" },
    nameByRole: { admin: "EOC Dashboard", brgy: "Brgy Dashboard", resident: "Dashboard" },
  },
  {
    icon: <FaMapMarkerAlt size={20} />,
    name: "Tactical Map",
    roles: ["admin", "brgy"],
    pathByRole: { admin: "/admin/barangay-map", brgy: "/brgy/barangay-map" },
    nameByRole: { admin: "Global Map", brgy: "Local Area Map" },
    badge: "LIVE"
  },
  {
    icon: <FiAlertTriangle size={20} />,
    name: "Incident Control",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { 
      admin: "/admin/incident-reports", 
      brgy: "/brgy/report-incident", 
      resident: "/resident/report-incident" 
    },
    nameByRole: { 
      admin: "Incident Tactical", 
      brgy: "Hazard Control", 
      resident: "Report Emergency" 
    },
  },
  {
    icon: <FaTint size={18} />,
    name: "Env Intel",
    roles: ["admin", "brgy"],
    pathByRole: { admin: "/admin/flood-reports", brgy: "/brgy/flood-reports" },
    nameByRole: { admin: "Global Intel", brgy: "Flood Intel" },
  },
];

const resourceItems: NavItem[] = [
  {
    icon: <FaHome size={20} />,
    name: "Shelters",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { admin: "/admin/shelters", brgy: "/brgy/shelters", resident: "/shelters" },
  },
  {
    icon: <RouteIcon size={20} />,
    name: "Route Planner",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { admin: "/admin/admin-routes", brgy: "/brgy/safe-routes", resident: "/route-planner" },
    nameByRole: { admin: "Mission Routing", brgy: "Local Routes", resident: "Route Planner" },
  },
];

const communityItems: NavItem[] = [
  {
    icon: <UsersIcon size={20} />,
    name: "Residents",
    roles: ["admin", "brgy"],
    pathByRole: { admin: "/admin/user-management", brgy: "/brgy/residents" },
    nameByRole: { admin: "User Registry", brgy: "Resident Registry" },
  },
  {
    icon: <FiBell size={18} />,
    name: "Alerts",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { admin: "/admin/announcements", brgy: "/barangay/announcements", resident: "/announcements" },
    nameByRole: { admin: "Broadcasts", brgy: "Community Alerts", resident: "Announcements" },
  },
  {
    icon: <FaPhone size={18} />,
    name: "Directory",
    roles: ["admin", "brgy"],
    pathByRole: { admin: "/admin/contacts", brgy: "/barangay/contacts" },
  },
];

const systemItems: NavItem[] = [
  {
    icon: <FaBook size={18} />,
    name: "Emergency Guides",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { admin: "/admin/resources", brgy: "/brgy/resources", resident: "/resources" },
  },
  {
    icon: <FiUser size={20} />,
    name: "Profile",
    roles: ["admin", "brgy"],
    pathByRole: { admin: "/admin/profile", brgy: "/brgy/profile" },
  },
  {
    icon: <LogsIcon size={20} />,
    name: "Audit Logs",
    roles: ["admin"],
    path: "/admin/system-logs",
  },
  {
    icon: <FiSettings size={20} />,
    name: "Settings",
    roles: ["admin", "brgy"],
    pathByRole: { admin: "/admin/settings", brgy: "/brgy/settings" },
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const location = useLocation();
  const { user } = useAuth();
  const role = (user?.role || "admin").toLowerCase();

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  const getVisibleItems = (items: NavItem[]) => {
    return items.filter(i => {
      if (!i.roles) return true;
      return i.roles.includes(role);
    });
  };

  const getPath = (nav: NavItem) => {
    return nav.pathByRole?.[role as keyof typeof nav.pathByRole] || nav.path || "#";
  };

  const getName = (nav: NavItem) => {
    return nav.nameByRole?.[role as keyof typeof nav.nameByRole] || nav.name;
  };

  const renderSection = (title: string, items: NavItem[], icon?: React.ReactNode) => {
    const visible = getVisibleItems(items);
    if (visible.length === 0) return null;

    return (
      <div className="mb-6">
        {(isExpanded || isHovered || isMobileOpen) && (
          <div className="flex items-center gap-2 px-3 mb-3 text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase select-none">
            {icon}
            {title}
          </div>
        )}
        <ul className="space-y-1">
          {visible.map((nav) => {
            const target = getPath(nav);
            const active = isActive(target);
            return (
              <li key={nav.name}>
                <Link
                  to={target}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group ${
                    active 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                      : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white"
                  } ${!isExpanded && !isHovered && !isMobileOpen ? "justify-center" : ""}`}
                >
                  <span className={`flex-shrink-0 transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-110"}`}>
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="text-sm font-bold flex-1 truncate uppercase tracking-tight">{getName(nav)}</span>
                  )}
                  {(isExpanded || isHovered || isMobileOpen) && nav.badge && (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${active ? "bg-white/20" : "bg-red-500 text-white animate-pulse"}`}>
                      {nav.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[1100] lg:hidden" onClick={toggleMobileSidebar} />
      )}
      <aside
        className={`fixed top-[64px] left-0 h-[calc(100vh-64px)] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-100 dark:border-gray-800 transition-all duration-300 z-[1200] flex flex-col ${
          isExpanded || isHovered || isMobileOpen ? "w-[260px]" : "w-[80px]"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex-1 overflow-y-auto no-scrollbar p-4">
          {renderSection("Operations", operationsItems, <FiActivity />)}
          {renderSection("Resources", resourceItems, <FiShield />)}
          {renderSection("Community", communityItems, <UsersIcon />)}
          {renderSection("System", systemItems, <FiSettings />)}
        </div>

        {/* Footer info */}
        {(isExpanded || isHovered || isMobileOpen) && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">EOC ONLINE</span>
              </div>
              <div className="text-[10px] text-gray-400 font-bold uppercase">v.1.0.0 Alpha</div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default AppSidebar;
