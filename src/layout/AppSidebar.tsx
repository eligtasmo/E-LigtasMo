import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  GridIcon,
  ChevronDownIcon,
  HorizontaLDots,
} from "../icons";
import { GoLocation as RouteIcon } from "react-icons/go";
import { BsShieldShaded as ShelterIcon, BsGeoAltFill } from "react-icons/bs";
import { IoWarningOutline as WarningIcon } from "react-icons/io5";
import { TiWeatherPartlySunny as WeatherIcon } from "react-icons/ti";
import { FiBell, FiUsers as UsersIcon, FiDatabase as LogsIcon, FiHelpCircle as HelpIcon, FiAlertCircle, FiUser, FiActivity, FiSettings, FiLogOut, FiAlertTriangle, FiSearch, FiTruck, FiPlusCircle } from "react-icons/fi";

import { FaPhone, FaUser, FaMapMarkerAlt, FaWater, FaHome, FaBook } from "react-icons/fa";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";

// Extend NavItem to support role-based visibility
type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
  roles?: string[]; // visible to these roles; omit to default to admin-only
  pathByRole?: { admin?: string; brgy?: string; resident?: string }; // role-aware target paths
  nameByRole?: { admin?: string; brgy?: string; resident?: string }; // role-aware display names
  badge?: string; // optional right-side badge (e.g., ML, INDEX, NLP, LIVE, AI)
};

// Command Center - Primary Operations
const commandCenterItems: NavItem[] = [
  {
    icon: <GridIcon className="w-5 h-5" />,
    name: "Dashboard",
    path: "/admin",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { admin: "/admin", brgy: "/brgy", resident: "/resident/home" },
    nameByRole: { admin: "Dashboard", brgy: "Barangay Dashboard", resident: "Dashboard" },
  },
  {
    icon: <FaMapMarkerAlt size={20} />,
    name: "Local Area Map",
    roles: ["brgy"],
    pathByRole: { brgy: "/brgy/barangay-map" },
    nameByRole: { brgy: "Barangay Map" },
  },
];

// Incident Management - Core Emergency Response
  const incidentManagementItems: NavItem[] = [
    {
      icon: <FiAlertTriangle size={20} />,
      name: "Emergency Reports",
      path: "/admin/incident-reports",
      roles: ["admin", "brgy", "resident"],
      pathByRole: { 
        admin: "/admin/incident-reports", 
        brgy: "/brgy/report-incident", 
        resident: "/resident/report-incident" 
      },
      nameByRole: { 
        admin: "Tactical Command", 
        brgy: "Hazard Management", 
        resident: "Report Emergency" 
      },
    },
  ];

// Resource Management - Infrastructure & Assets
const resourceManagementItems: NavItem[] = [
  {
    icon: <FaHome size={20} />,
    name: "Shelter Management",
    path: "/admin/shelters",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { brgy: "/brgy/shelters", resident: "/shelters" },
    nameByRole: { admin: "Shelter Management", brgy: "Shelters", resident: "Shelters" },
  },
  {
    icon: <RouteIcon size={20} />,
    name: "Safe Routes & Hazards",
    path: "/admin/admin-routes",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { admin: "/admin/admin-routes", brgy: "/brgy/safe-routes", resident: "/route-planner" },
    nameByRole: { admin: "Safe Routes", brgy: "Safe Routes", resident: "Route Planner" },
  },
];

// Monitoring & Communications - Information Systems
  const monitoringItems: NavItem[] = [
  {
    icon: <WeatherIcon size={18} />,
    name: "Weather Updates",
    path: "/admin/weather",
    roles: ["resident"],
    pathByRole: { resident: "/weather" },
    nameByRole: { resident: "Weather" },
  },

  {
    icon: <FiBell size={18} />,
    name: "Announcements",
    path: "/admin/announcements",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { brgy: "/barangay/announcements", resident: "/announcements" },
    nameByRole: { admin: "Announcements", brgy: "Community Alerts", resident: "Announcements" },
  },
  {
    icon: <FaPhone size={18} />,
    name: "Contact Directory",
    path: "/admin/contacts",
    roles: ["admin", "brgy"],
    pathByRole: { brgy: "/barangay/contacts" },
    nameByRole: { admin: "Contacts", brgy: "Contacts" },
  },
];

const othersItems: NavItem[] = [
  {
    icon: <UsersIcon size={20} />,
    name: "User Management",
    path: "/admin/user-management",
    roles: ["admin"],
    nameByRole: { admin: "Users" },
  },
  {
    icon: <FaBook size={20} />,
    name: "Emergency Guides",
    path: "/admin/resources",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { brgy: "/brgy/resources", resident: "/resources" },
    nameByRole: { admin: "Emergency Guides", brgy: "Emergency Guides", resident: "Emergency Guides" },
  },
  {
    icon: <FaUser size={20} />,
    name: "Barangay Coordinators",
    path: "/admin/barangay-coordinators",
    roles: ["admin", "resident"],
    pathByRole: { resident: "/coordinators" },
    nameByRole: { admin: "Coordinators", resident: "Coordinators" },
  },
  {
    icon: <FiUser size={20} />,
    name: "Profile & Settings",
    path: "/admin/profile",
    roles: ["admin", "brgy"],
    pathByRole: { brgy: "/brgy/profile" },
    nameByRole: { admin: "Profile", brgy: "Profile" },
  },
  {
    icon: <LogsIcon size={20} />,
    name: "System Logs",
    path: "/admin/system-logs",
    roles: ["admin"],
    nameByRole: { admin: "Logs" },
  },
  {
    icon: <HelpIcon size={20} />,
    name: "Help/Support",
    path: "/help-support-on-progress",
    roles: ["admin", "brgy", "resident"],
    pathByRole: { resident: "/help" },
    nameByRole: { admin: "Help", brgy: "Help", resident: "Help" },
  },
];
// NEW: Community Management (brgy only)
const communityItems: NavItem[] = [
  {
    icon: <UsersIcon size={20} />,
    name: "Resident Directory",
    roles: ["brgy"],
    pathByRole: { brgy: "/brgy/residents" },
    nameByRole: { brgy: "Residents" },
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => location.pathname === path;
  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? [...commandCenterItems, ...incidentManagementItems, ...resourceManagementItems, ...monitoringItems] : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  // Helper: filter items visible to current role
  const getVisibleItemsForRole = (items: NavItem[]) => {
    const role = (user?.role || "admin").toLowerCase();
    const base = items.filter((i) => {
      if (!i.roles || i.roles.length === 0) return role === "admin";
      return i.roles.map((r) => r.toLowerCase()).includes(role);
    });
    if (role === "resident") {
      return base.filter((i) => ["Dashboard", "Emergency Reports"].includes(i.name));
    }
    return base;
  };

  // Helper: resolve target path based on current role
  const getTargetPathForRole = (nav: NavItem) => {
    const role = (user?.role || "admin").toLowerCase();
    const byRole = nav.pathByRole || {};
    const explicit = (byRole as any)[role];
    return explicit || nav.path || "";
  };

  const getHomePathForRole = () => {
    const role = (user?.role || "admin").toLowerCase();
    if (role === "admin") return "/admin";
    if (role === "brgy") return "/brgy";
    return "/resident/home";
  };

  const profilePath = user?.role === 'brgy' ? '/brgy/profile' : user?.role === 'admin' ? '/admin/profile' : '/profile';

  // Helper: resolve display name based on current role
  const getDisplayNameForRole = (nav: NavItem) => {
    const role = (user?.role || "admin").toLowerCase();
    const names = nav.nameByRole || {};
    const explicit = (names as any)[role];
    return explicit || nav.name;
  };

  // Helper: role-aware section labels (shortened)
  const getSectionLabelForRole = (section: "command" | "incident" | "community" | "resource" | "monitor" | "others") => {
    const role = (user?.role || "admin").toLowerCase();
    switch (section) {
      case "command":
        if (role === "resident") return "Community";
        if (role === "brgy") return "Barangay Dashboard";
        return "Dashboard";
      case "incident":
        if (role === "resident") return "Reports";
        if (role === "brgy") return "Incident Handling";
        return "Incidents";
      case "community":
        return "Community";
      case "resource":
        if (role === "resident") return "Shelters & Routes";
        if (role === "brgy") return "Barangay Assets";
        return "Resources";
      case "monitor":
        if (role === "resident") return "Updates";
        return "Monitoring";
      case "others":
        if (role === "resident") return "More";
        if (role === "brgy") return "Profile";
        return "Administration";
      default:
        return "Section";
    }
  };

  // UI: sample dynamic values to match requested format (compact design)
  const [alertsLabel] = useState<string>("24/7");
  // Set explicit app version per request
  const appVersion = "v.1.0.0";

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-1">
      {getVisibleItemsForRole(items).map((nav, index) => {
        const targetPath = getTargetPathForRole(nav);
        const displayName = getDisplayNameForRole(nav);
        return (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              data-slot="button"
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`transition-all duration-200 text-left ${
                !isExpanded && !isHovered
                  ? "lg:justify-center lg:px-2"
                  : "lg:justify-start"
              } ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "is-active"
                  : ""
              }`}
            >
              <span className={`flex-shrink-0 w-4 h-4 flex items-center justify-center ${
                openSubmenu?.type === menuType && openSubmenu?.index === index ? 'sentinelx-glow' : ''
              }`}>
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="font-medium text-sm flex-1 text-left truncate">{displayName}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && nav.badge && (
                <span data-slot="badge" className="inline-flex items-center justify-center">
                  {nav.badge}
                </span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-4 h-4 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-amber-400"
                      : "text-gray-500"
                  }`}
                />
              )}
            </button>
          ) : (
            targetPath && (
              <Link
                to={targetPath}
                data-slot="button"
                className={`transition-all duration-200 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center lg:px-2"
                    : "lg:justify-start"
                } ${isActive(targetPath) ? "is-active" : ""}`}
              >
                <span className={`flex-shrink-0 w-4 h-4 flex items-center justify-center ${isActive(targetPath) ? 'sentinelx-glow' : ''}`}>
                  {nav.icon}
                </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="font-medium text-sm flex-1 text-left truncate">{displayName}</span>
              )}
                {(isExpanded || isHovered || isMobileOpen) && nav.badge && (
                  <span data-slot="badge" className="inline-flex items-center justify-center">
                    {nav.badge}
                  </span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-1 space-y-1 ml-8">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive(subItem.path)
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <span>{subItem.name}</span>
                      <span className="flex items-center gap-1">
                        {subItem.new && (
                          <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium border border-green-200">
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium border border-purple-200">
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      );})}
    </ul>
  );

  // Section title styled like the provided design
  const SectionDivider: React.FC<{ label: string; }> = ({ label }) => (
    <div className="mb-3 px-3 select-none">
      <div className="section-label">{label}</div>
    </div>
  );

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-[1100] transition-opacity lg:hidden"
          onClick={toggleMobileSidebar}
          aria-label="Close sidebar"
        />
      )}
      <aside
        className={`sx-sidebar border-r border-sentinelx-glass-border fixed flex flex-col top-[72px] px-0 left-0 h-[calc(100vh-72px)] transition-all duration-300 ease-in-out z-[1200]
          ${
            isExpanded || isMobileOpen
              ? "w-[278px]"
              : isHovered
              ? "w-[278px]"
              : "w-[80px]"
          }
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0`}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar flex-1">
          <nav className="px-4 py-6">
            <div className="space-y-2">
              {/* Section 1: Monitoring Modules (Ops + Incidents + Monitoring) */}
              <div>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <SectionDivider label={"Operations"} />
                )}
                {renderMenuItems(commandCenterItems, "main")}
                {renderMenuItems(incidentManagementItems, "main")}
                {renderMenuItems(monitoringItems, "main")}
              </div>

        {/* Section 2: Community & Emergency Guides */}
              <div>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <SectionDivider label={"Community & Assets"} />
                )}
                {renderMenuItems(communityItems, "main")}
                {renderMenuItems(resourceManagementItems, "main")}
              </div>

              {/* Section 3: System */}
              <div>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <SectionDivider label={"Administration"} />
                )}
                {renderMenuItems(othersItems, "others")}
              </div>
            </div>
          </nav>
        </div>
        {/* Footer system status */}
        {(isExpanded || isHovered || isMobileOpen) && (
          <div className="system-status px-3 py-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="dot inline-block" />
                <span>{`System Online ${appVersion}`}</span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default AppSidebar;
