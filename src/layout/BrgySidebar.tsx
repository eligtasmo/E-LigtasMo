import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "../context/SidebarContext";
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
import { FiActivity } from "react-icons/fi";

type NavItem = {
  name: string;
  icon: (active: boolean) => React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const localCommandItems: NavItem[] = [
  { icon: (active) => <DashboardIcon active={active} className={`w-5 h-5 ${active ? 'text-[#1e1b4b]' : 'text-blue-400'}`} />, name: "Dashboard", path: "/brgy" },
];

const safeRouteItems: NavItem[] = [
  { icon: (active) => <ManagementIcon active={active} className={`w-5 h-5 ${active ? 'text-[#1e1b4b]' : 'text-blue-500'}`} />, name: "Barangay Management", path: "/brgy/brgy-map" },
  { icon: (active) => <IntelIcon active={active} className={`w-5 h-5 ${active ? 'text-[#1e1b4b]' : 'text-blue-500'}`} />, name: "Reports", path: "/brgy/flood-reports" },
  { icon: (active) => <HazardIcon active={active} className={`w-5 h-5 ${active ? 'text-[#1e1b4b]' : 'text-red-500'}`} />, name: "Hazard Management", path: "/brgy/report-incident" },
  { icon: (active) => <ShelterIcon active={active} className={`w-5 h-5 ${active ? 'text-[#1e1b4b]' : 'text-blue-500'}`} />, name: "Shelter Management", path: "/brgy/shelters" },
];

const communityItems: NavItem[] = [
  { icon: (active) => <ResidentsIcon active={active} className={`w-5 h-5 ${active ? 'text-[#1e1b4b]' : 'text-blue-400'}`} />, name: "Resident Directory", path: "/brgy/residents" },
  { icon: (active) => <BellIcon active={active} className={`w-5 h-5 ${active ? 'text-[#1e1b4b]' : 'text-orange-400'}`} />, name: "Community Alerts", path: "/brgy/announcements" },
  { icon: (active) => <PhoneIcon active={active} className={`w-5 h-5 ${active ? 'text-[#1e1b4b]' : 'text-blue-400'}`} />, name: "Manage Contacts", path: "/brgy/contacts" },
  { icon: (active) => <HotlineIcon active={active} className={`w-5 h-5 ${active ? 'text-[#1e1b4b]' : 'text-blue-400'}`} />, name: "Barangay Hotlines", path: "/brgy/hotlines" },
];

const monitoringItems: NavItem[] = [
  { icon: (active) => <ProfileIcon active={active} className={`w-5 h-5 ${active ? 'text-[#1e1b4b]' : 'text-blue-400'}`} />, name: "Profile & Settings", path: "/brgy/profile" },
  { icon: (active) => <BookIcon active={active} className={`w-5 h-5 ${active ? 'text-[#1e1b4b]' : 'text-blue-400'}`} />, name: "Emergency Guides", path: "/brgy/resources" },
];

const BrgySidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const location = useLocation();

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-1">
      {items.map((nav) => {
        const active = isActive(nav.path || "");
        return (
          <li key={nav.name}>
            {nav.path && (
              <Link
                to={nav.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 group relative font-bold ${
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
                    {nav.name}
                  </span>
                )}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );

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
          <Link to="/brgy" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white shadow-lg flex items-center justify-center transition-transform group-hover:scale-105 active:scale-95">
               <img src="/images/logo/logo-icon.png" alt="Logo" className="w-7 h-7" />
            </div>
            {(isExpanded || isHovered || isMobileOpen) && (
              <div className="flex flex-col leading-none">
                <span className="text-xl font-black tracking-tighter text-white italic">E-LigtasMo</span>
                <span className="text-[10px] font-bold text-blue-300 tracking-tight mt-0.5">Barangay Node</span>
              </div>
            )}
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2">
          {renderMenuItems(localCommandItems)}
          {renderMenuItems(safeRouteItems)}
          {renderMenuItems(communityItems)}
          {renderMenuItems(monitoringItems)}
        </div>

        {(isExpanded || isHovered || isMobileOpen) && (
          <div className="p-4 border-t border-white/5">
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">EOC Brgy Live</span>
              </div>
              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">v.1.0.0 Stable</div>
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

export default BrgySidebar;
