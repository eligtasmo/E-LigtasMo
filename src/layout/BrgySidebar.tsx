import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { IoWarningOutline as WarningIcon } from "react-icons/io5";
import { FiAlertCircle, FiBell, FiUser, FiActivity, FiShield, FiUsers } from "react-icons/fi";
import { FaPhone, FaUser, FaMapMarkerAlt, FaRoute } from "react-icons/fa";
import { BsShieldShaded as ShelterIcon } from "react-icons/bs";
import { GoLocation as RouteIcon } from "react-icons/go";
import { TiWeatherPartlySunny as WeatherIcon } from "react-icons/ti";

// Assume these icons are imported from an icon library
import {
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

// Local Command Center
const localCommandItems: NavItem[] = [
  {
    icon: <GridIcon className="w-5 h-5" />,
    name: "Barangay Dashboard",
    path: "/barangay",
  },
  {
    icon: <FaMapMarkerAlt size={20} />,
    name: "Local Area Map",
    path: "/barangay/barangay-map",
  },
];

// SafeRoute & Emergency Response
const safeRouteItems: NavItem[] = [
  {
    icon: <RouteIcon size={20} />,
    name: "Safe Routes Map",
    path: "/barangay/safe-routes",
  },
  {
    icon: <FiAlertCircle size={20} />,
    name: "Environmental Intel",
    path: "/barangay/flood-reports",
  },
  {
    icon: <WarningIcon size={20} />,
    name: "Hazard Management",
    path: "/barangay/report-incident",
  },
  {
    icon: <ShelterIcon size={20} />,
    name: "Shelter Management",
    path: "/barangay/shelters",
  },
];

// Community Management
const communityItems: NavItem[] = [
  {
    icon: <FiUsers size={20} />,
    name: "Resident Directory",
    path: "/barangay/residents",
  },
  {
    icon: <FiBell size={20} />,
    name: "Community Alerts",
    path: "/barangay/announcements",
  },
  {
    icon: <FaPhone size={18} />,
    name: "Contact Directory",
    path: "/barangay/contacts",
  },
];

// Monitoring & Support
const monitoringItems: NavItem[] = [
  {
    icon: <FaPhone size={20} />,
    name: "Emergency Guides",
    path: "/brgy/resources",
  },
  {
    icon: <FiUser size={20} />,
    name: "Profile & Settings",
    path: "/profile",
  },
];

const BrgySidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main";
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
      const items = menuType === "main" ? [...localCommandItems, ...safeRouteItems, ...communityItems, ...monitoringItems] : [];
      items.forEach((nav: NavItem, index: number) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem: { name: string; path: string; pro?: boolean; new?: boolean }) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main",
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

  const handleSubmenuToggle = (index: number, menuType: "main") => {
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

  const renderMenuItems = (items: NavItem[], menuType: "main") => (
    <ul className="flex flex-col gap-1">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              data-slot="button"
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`group transition-all duration-200 ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "is-active"
                  : ""
              } ${
                !isExpanded && !isHovered && !isMobileOpen
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={`flex-shrink-0 w-4 h-4 flex items-center justify-center ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "sentinelx-glow"
                    : ""
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="font-medium text-sm flex-1 text-left truncate">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                data-slot="button"
                className={`group transition-all duration-200 ${
                  isActive(nav.path) ? "is-active" : ""
                } ${
                  !isExpanded && !isHovered && !isMobileOpen
                    ? "lg:justify-center"
                    : "lg:justify-start"
                }`}
              >
                <span
                  className={`flex-shrink-0 w-4 h-4 flex items-center justify-center ${
                    isActive(nav.path) ? "sentinelx-glow" : ""
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="font-medium text-sm flex-1 text-left truncate">{nav.name}</span>
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
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
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
      ))}
    </ul>
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
        className={`sx-sidebar sentinelx-glass border-r border-sentinelx-glass-border fixed flex flex-col top-[72px] left-0 h-[calc(100vh-72px)] transition-transform duration-300 ease-in-out z-[1200] ${
          isExpanded || isHovered || isMobileOpen ? "w-[278px]" : "w-[80px]"
        } ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar mt-4 px-3">
          <nav className="mb-6">
            <div className="flex flex-col gap-6">
              {/* Local Command Center */}
              <div>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3 px-1 flex items-center">
                    <FiActivity size={12} className="mr-2" />
                    Local Command
                  </div>
                )}
                {renderMenuItems(localCommandItems, "main")}
              </div>
              
              {/* SafeRoute & Emergency Response */}
              <div>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <div className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-3 px-1 flex items-center">
                    <FiShield size={12} className="mr-2" />
                    SafeRoute & Emergency
                  </div>
                )}
                {renderMenuItems(safeRouteItems, "main")}
              </div>
              
              {/* Community Management */}
              <div>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-3 px-1 flex items-center">
                    <FiUsers size={12} className="mr-2" />
                    Community Management
                  </div>
                )}
                {renderMenuItems(communityItems, "main")}
              </div>
              
              {/* Monitoring & Support */}
              <div>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-3 px-1 flex items-center">
                    <WeatherIcon size={12} className="mr-2" />
                    Monitoring & Support
                  </div>
                )}
                {renderMenuItems(monitoringItems, "main")}
              </div>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
};

export default BrgySidebar;
