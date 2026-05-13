import { useCallback } from "react";
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
  ProfileIcon, 
  BookIcon 
} from "../components/TacticalIcons";
import { FiDatabase as LogsIcon, FiShield } from "react-icons/fi";

type NavItem = {
  name: string;
  icon: (active: boolean) => React.ReactNode;
  path?: string;
  roles?: string[];
  pathByRole?: { admin?: string; brgy?: string; resident?: string };
  nameByRole?: { admin?: string; brgy?: string; resident?: string };
  badge?: string;
};

const operationsItems: NavItem[] = [
  {
    icon: (active) => <DashboardIcon active={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />,
    name: "Dashboard",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { admin: "/admin", brgy: "/brgy", resident: "/resident/home" },
  },
  {
    icon: (active) => <ManagementIcon active={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />,
    name: "Barangay Management",
    roles: ["admin", "brgy"],
    pathByRole: { admin: "/admin/brgy-map", brgy: "/brgy/brgy-map" },
    badge: "Live"
  },
];

const intelItems: NavItem[] = [
  {
    icon: (active) => <IntelIcon active={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />,
    name: "Incident Reports",
    roles: ["admin", "brgy"],
    pathByRole: { admin: "/admin/incident-reports", brgy: "/brgy/flood-reports" },
  },
  {
    icon: (active) => <HazardIcon active={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />,
    name: "Hazard Control",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { admin: "/admin/report-incident", brgy: "/brgy/report-incident", resident: "/resident/report-incident" },
  },
  {
    icon: (active) => <ShelterIcon active={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />,
    name: "Evacuation Shelters",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { admin: "/admin/shelters", brgy: "/brgy/shelters", resident: "/shelters" },
  },
];

const communityItems: NavItem[] = [
  {
    icon: (active) => <FiShield size={20} className={active ? 'text-white' : 'text-gray-400'} />,
    name: "Barangay Accounts",
    roles: ["admin"],
    path: "/admin/brgy-accounts",
  },
  {
    icon: (active) => <ResidentsIcon active={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />,
    name: "Resident Directory",
    roles: ["admin", "brgy"],
    pathByRole: { admin: "/admin/user-management", brgy: "/brgy/residents" },
  },
  {
    icon: (active) => <BellIcon active={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />,
    name: "Announcements",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { admin: "/admin/announcements", brgy: "/brgy/announcements", resident: "/announcements" },
  },
  {
    icon: (active) => <PhoneIcon active={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />,
    name: "Strategic Contacts",
    roles: ["admin", "brgy"],
    pathByRole: { admin: "/admin/directory", brgy: "/brgy/directory" },
  },
];

const systemItems: NavItem[] = [
  {
    icon: (active) => <ProfileIcon active={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />,
    name: "Profile Settings",
    roles: ["admin", "brgy"],
    pathByRole: { admin: "/admin/settings", brgy: "/brgy/profile" },
  },
  {
    icon: (active) => <BookIcon active={active} className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />,
    name: "Emergency Guides",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { admin: "/admin/resources", brgy: "/brgy/resources", resident: "/resources" },
  },
  {
    icon: (active) => <LogsIcon size={20} className={active ? 'text-white' : 'text-gray-400'} />,
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

  const renderSection = (items: NavItem[]) => {
    const visible = items.filter(i => !i.roles || i.roles.includes(role));
    if (visible.length === 0) return null;

    return (
      <ul className="space-y-1 mb-6">
        {visible.map((nav) => {
          const target = nav.pathByRole?.[role as keyof typeof nav.pathByRole] || nav.path || "#";
          const active = isActive(target);
          return (
            <li key={nav.name}>
              <Link
                to={target}
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
                    {nav.nameByRole?.[role as keyof typeof nav.nameByRole] || nav.name}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  };

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
          {renderSection(operationsItems)}
          {renderSection(intelItems)}
          {renderSection(communityItems)}
          {renderSection(systemItems)}
        </div>

        {(isExpanded || isHovered || isMobileOpen) && (
          <div className="p-4 mt-auto">
            <div className="bg-brand-50 rounded-2xl p-4 border border-brand-100">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                <span className="text-[10px] font-bold text-brand-700">Operational</span>
              </div>
              <p className="text-[10px] text-gray-500 font-medium">Standard Node v.4.2</p>
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

export default AppSidebar;
