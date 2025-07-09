import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  GridIcon,
  ChevronDownIcon,
  HorizontaLDots,
} from "../icons";
import { GoLocation as RouteIcon } from "react-icons/go";
import { BsShieldShaded as ShelterIcon } from "react-icons/bs";
import { IoWarningOutline as WarningIcon } from "react-icons/io5";
import { TiWeatherPartlySunny as WeatherIcon } from "react-icons/ti";
import { FiBell, FiUsers as UsersIcon, FiDatabase as LogsIcon, FiHelpCircle as HelpIcon, FiAlertCircle, FiUser } from "react-icons/fi";
import { FaPhone, FaUser } from "react-icons/fa";
import { useSidebar } from "../context/SidebarContext";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/",
  },
  {
    icon: <RouteIcon size={22} />,
    name: "Manage Routes",
    path: "/admin-routes",
  },
  {
    icon: <ShelterIcon size={22} />,
    name: "Manage Shelters",
    path: "/shelters",
  },
  {
    icon: <WarningIcon size={22} />,
    name: "Incident Command",
    path: "/incident-dashboard",
  },
  {
    icon: <FiAlertCircle size={22} />,
    name: "Incident Moderation",
    path: "/incident-moderation",
  },
  {
    icon: <WeatherIcon size={22} />,
    name: "Weather",
    path: "/weather-flood-tracking",
  },
  {
    icon: <FiBell size={22} />,
    name: "Announcements",
    path: "/announcements",
  },
];

const othersItems: NavItem[] = [
  {
    icon: <UsersIcon size={22} />,
    name: "User Management",
    path: "/user-management",
  },
  {
    icon: <FaPhone size={22} />,
    name: "Emergency Contacts",
    path: "/emergency-contacts",
  },
  {
    icon: <FaUser size={22} />,
    name: "Barangay Coordinators",
    path: "/barangay-coordinators",
  },
  {
    icon: <FiUser size={22} />,
    name: "Profile & Settings",
    path: "/profile",
  },
  {
    icon: <LogsIcon size={22} />,
    name: "System Logs",
    path: "/system-logs",
  },
  {
    icon: <HelpIcon size={22} />,
    name: "Help/Support",
    path: "/help-support-on-progress",
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const location = useLocation();

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
      const items = menuType === "main" ? navItems : othersItems;
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

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-2 sm:gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              } min-h-[48px] sm:min-h-[44px]`}
            >
              <span
                className={`menu-item-icon-size  ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
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
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                } min-h-[48px] sm:min-h-[44px]`}
              >
                <span
                  className={`menu-item-icon-size ${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
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
                      } min-h-[40px] sm:min-h-[36px]`}
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
        className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-[1200] border-r border-gray-200 
          ${
            isExpanded || isMobileOpen
              ? "w-[290px]"
              : isHovered
              ? "w-[290px]"
              : "w-[90px]"
          }
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0`}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={`py-8 flex ${
            !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
        >
          <Link to="/">
            {isExpanded || isHovered || isMobileOpen ? (
              <>
                <img
                  className="dark:hidden"
                  src="/images/logo/logo.png"
                  alt="Logo"
                  width={150}
                  height={40}
                />
                <img
                  className="hidden dark:block"
                  src="/images/logo/logo-dark.svg"
                  alt="Logo"
                  width={150}
                  height={40}
                />
              </>
            ) : (
              <img
                src="/images/logo/logo-icon.svg"
                alt="Logo"
                width={32}
                height={32}
              />
            )}
          </Link>
        </div>
        <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
          <nav className="mb-6">
            <div className="flex flex-col gap-4">
              <div>
                {renderMenuItems([navItems[0]], "main")}
              </div>
              <div className="">
                <div className="text-xs text-gray-400 mt-4 mb-1 uppercase tracking-widest">OPERATIONS</div>
                {renderMenuItems(navItems.slice(1), "main")}
                <div className="text-xs text-gray-400 mt-4 mb-1 uppercase tracking-widest">MANAGEMENT</div>
                {renderMenuItems(othersItems, "others")}
                <div className="mt-4">
                  <Link to="/help-support" className="menu-item group min-h-[48px]">
                    <span className="menu-item-icon-size">
                      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 19v.01M12 15a4 4 0 1 0-4-4"/><circle cx="12" cy="12" r="10"/></svg>
                    </span>
                    <span className="menu-item-text">Help & Support</span>
                  </Link>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
