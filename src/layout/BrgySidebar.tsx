import { useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "../context/SidebarContext";
import { 
  DashboardIcon, 
  ManagementIcon, 
  IntelIcon, 
  HazardIcon, 
  ShelterIcon, 
  ResidentsIcon, 
  BellIcon, 
  PhoneIcon, 
  ProfileIcon, 
  BookIcon 
} from "../components/TacticalIcons";

type NavItem = {
  name: string;
  icon: (active: boolean) => React.ReactNode;
  path: string;
};

const localCommandItems: NavItem[] = [
  { icon: (active) => <DashboardIcon active={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />, name: "Dashboard", path: "/brgy" },
];

const safeRouteItems: NavItem[] = [
  { icon: (active) => <ManagementIcon active={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />, name: "Barangay Control", path: "/brgy/brgy-map" },
  { icon: (active) => <IntelIcon active={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />, name: "Incident Reports", path: "/brgy/flood-reports" },
  { icon: (active) => <HazardIcon active={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />, name: "Hazard Analysis", path: "/brgy/report-incident" },
  { icon: (active) => <ShelterIcon active={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />, name: "Shelter Management", path: "/brgy/shelters" },
];

const communityItems: NavItem[] = [
  { icon: (active) => <ResidentsIcon active={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />, name: "Resident Registry", path: "/brgy/residents" },
  { icon: (active) => <BellIcon active={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />, name: "Community Alerts", path: "/brgy/announcements" },
  { icon: (active) => <PhoneIcon active={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />, name: "Strategic Contacts", path: "/brgy/directory" },
];

const monitoringItems: NavItem[] = [
  { icon: (active) => <ProfileIcon active={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />, name: "Profile & Settings", path: "/brgy/profile" },
  { icon: (active) => <BookIcon active={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />, name: "Emergency Guides", path: "/brgy/resources" },
];

const BrgySidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const location = useLocation();

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-1 mb-6">
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
              } ${!isExpanded && !isHovered && !isMobileOpen ? "justify-center px-0" : ""}`}
            >
              <span className="flex-shrink-0">
                {nav.icon(active)}
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
          {renderMenuItems(localCommandItems)}
          {renderMenuItems(safeRouteItems)}
          {renderMenuItems(communityItems)}
          {renderMenuItems(monitoringItems)}
        </div>

        {(isExpanded || isHovered || isMobileOpen) && (
          <div className="p-4 mt-auto">
            <div className="bg-brand-50 rounded-2xl p-4 border border-brand-100">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                <span className="text-[10px] font-bold text-brand-700">Brgy Node Active</span>
              </div>
              <p className="text-[10px] text-gray-500 font-medium">Mission Control v.1.0</p>
            </div>
          </div>
        )}
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-[1100] lg:hidden" onClick={toggleMobileSidebar} />
      )}
    </>
  );
};

export default BrgySidebar;
