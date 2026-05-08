import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { 
  DashboardIcon, 
  ManagementIcon, 
  RouteIcon, 
  IntelIcon, 
  HazardIcon, 
  ShelterIcon, 
  ResidentsIcon, 
  BellIcon, 
  PhoneIcon, 
  HotlineIcon, 
  ProfileIcon, 
  BookIcon 
} from "../components/TacticalIcons";
import { FiDatabase as LogsIcon, FiActivity, FiShield } from "react-icons/fi";

type NavItem = {
  name: string;
  icon: (active: boolean) => React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; iew?: boolean }[];
  roles?: string[];
  pathByRole?: { admin?: string; brgy?: string; resident?: string };
  nameByRole?: { admin?: string; brgy?: string; resident?: string };
  badge?: string;
};

// --- UNIFIED NAVIGATION ITEMS ---

  const operationsItems: NavItem[] = [
  {
    icon: (active) => <DashboardIcon active={active} className={`w-5 h-5 ${active ? 'text-[#1e1b4b]' : 'text-blue-400'}`} />,
    name: "Dashboard",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { admin: "/admin", brgy: "/brgy", resident: "/resident/home" },
  },
  {
    icon: (active) => <ManagementIcon active={active} className={`w-5 h-5 ${active ? 'text-[#1e1b4b]' : 'text-blue-500'}`} />,
    name: "Barangay Management",
    roles: ["admin", "brgy"],
    pathByRole: { admin: "/admin/brgy-map", brgy: "/brgy/brgy-map" },
    badge: "LIVE"
  },
  {
    icon: (active) => <RouteIcon active={active} className={`w-5 h-5 ${active ? 'text-[#1e1b4b]' : 'text-blue-500'}`} />,
    name: "Route Planner",
    roles: ["resident"],
    pathByRole: { resident: "/route-planner" },
  },
];

const intelItems: NavItem[] = [
  {
    icon: (active) => <IntelIcon active={active} className={`w-5 h-5 ${active ? 'text-[#1e1b4b]' : 'text-blue-400'}`} />,
    name: "Reports",
    roles: ["admin", "brgy"],
    pathByRole: { admin: "/admin/incident-reports", brgy: "/brgy/flood-reports" },
  },
  {
    icon: (active) => <HazardIcon active={active} className={`w-5 h-5 ${active ? 'text-red-600' : 'text-red-400'}`} />,
    name: "Hazard Management",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { 
      admin: "/admin/report-incident", 
      brgy: "/brgy/report-incident", 
      resident: "/resident/report-incident" 
    },
  },
  {
    icon: (active) => <ShelterIcon active={active} className={`w-5 h-5 ${active ? 'text-[#1e1b4b]' : 'text-blue-500'}`} />,
    name: "Shelter Management",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { admin: "/admin/shelters", brgy: "/brgy/shelters", resident: "/shelters" },
  },
];

const communityItems: NavItem[] = [
  {
    icon: (active) => <FiShield size={20} className={active ? 'text-[#1e1b4b]' : 'text-blue-500'} />,
    name: "Barangay Accounts",
    roles: ["admin"],
    path: "/admin/brgy-accounts",
  },
  {
    icon: (active) => <ResidentsIcon active={active} className={`w-5 h-5 ${active ? 'text-[#1e1b4b]' : 'text-blue-400'}`} />,
    name: "Resident Directory",
    roles: ["admin", "brgy"],
    pathByRole: { admin: "/admin/user-management", brgy: "/brgy/residents" },
  },
  {
    icon: (active) => <BellIcon active={active} className={`w-5 h-5 ${active ? 'text-orange-600' : 'text-orange-400'}`} />,
    name: "Announcements & Alerts",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { admin: "/admin/announcements", brgy: "/brgy/announcements", resident: "/announcements" },
  },
  {
    icon: (active) => <PhoneIcon active={active} className={`w-5 h-5 ${active ? 'text-[#1e1b4b]' : 'text-blue-400'}`} />,
    name: "Strategic Directory",
    roles: ["admin", "brgy"],
    pathByRole: { admin: "/admin/directory", brgy: "/brgy/directory" },
  },
];

const systemItems: NavItem[] = [
  {
    icon: (active) => <ProfileIcon active={active} className={`w-5 h-5 ${active ? 'text-[#1e1b4b]' : 'text-blue-400'}`} />,
    name: "Profile & Settings",
    roles: ["admin", "brgy"],
    pathByRole: { admin: "/admin/settings", brgy: "/brgy/profile" },
  },
  {
    icon: (active) => <BookIcon active={active} className={`w-5 h-5 ${active ? 'text-[#1e1b4b]' : 'text-blue-400'}`} />,
    name: "Emergency Guides",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { admin: "/admin/resources", brgy: "/brgy/resources", resident: "/resources" },
  },
  {
    icon: (active) => <LogsIcon size={20} className={active ? 'text-[#1e1b4b]' : 'text-blue-400'} />,
    name: "Audit Logs",
    roles: ["admin"],
    path: "/admin/system-logs",
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

  const renderSection = (items: NavItem[]) => {
    const visible = getVisibleItems(items);
    if (visible.length === 0) return null;

    return (
      <div className="mb-2">
        <ul className="space-y-1">
          {visible.map((nav) => {
            const target = getPath(nav);
            const active = isActive(target);
            return (
              <li key={nav.name}>
                <Link
                  to={target}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 group relative font-sans font-bold ${
                    active 
                      ? "bg-white text-[#1e1b4b] shadow-xl shadow-black/20 scale-[1.02]" 
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  } ${!isExpanded && !isHovered && !isMobileOpen ? "justify-center" : ""}`}
                >
                  <span className={`flex-shrink-0 transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-110"}`}>
                    {nav.icon(active)}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className={`sidebar-link-text flex-1 truncate ${active ? "text-[#1e1b4b]" : "text-inherit"}`}>
                      {getName(nav)}
                    </span>
                  )}
                  {(isExpanded || isHovered || isMobileOpen) && nav.badge && (
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-tight ${active ? "bg-[#1e1b4b] text-white" : "bg-white/10 text-white"}`}>
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
      <aside
        className={`h-screen bg-[#1e1b4b] transition-all duration-300 z-[1200] flex flex-col font-sans shadow-2xl relative ${
          isExpanded || isHovered || isMobileOpen ? "w-[260px]" : "w-[80px]"
        } ${isMobileOpen ? "fixed inset-y-0 left-0 translate-x-0" : "hidden lg:flex"}`}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="h-[70px] flex items-center px-6 mb-4">
          <Link to={role === 'admin' ? '/admin' : '/brgy'} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white shadow-lg flex items-center justify-center transition-transform group-hover:scale-105 active:scale-95">
               <img src="/images/logo/logo-icon.png" alt="Logo" className="w-7 h-7" />
            </div>
            {(isExpanded || isHovered || isMobileOpen) && (
              <div className="flex flex-col leading-none">
                <span className="text-xl font-black tracking-tighter text-white italic">E-LigtasMo</span>
                <span className="text-[10px] font-bold text-blue-300 tracking-tight mt-0.5">{role === 'admin' ? 'HQ Command' : 'Barangay Node'}</span>
              </div>
            )}
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2">
          {renderSection(operationsItems)}
          {renderSection(intelItems)}
          {renderSection(communityItems)}
          {renderSection(systemItems)}
        </div>

        {(isExpanded || isHovered || isMobileOpen) && (
          <div className="p-4 border-t border-white/5">
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">System Live</span>
              </div>
              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">v.4.2.0 Standard</div>
            </div>
          </div>
        )}
      </aside>

      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1100] lg:hidden transition-opacity duration-300" 
          onClick={toggleMobileSidebar} 
        />
      )}
    </>
  );
};

export default AppSidebar;
