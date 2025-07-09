import { useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "../context/SidebarContext";
import { GoLocation as RouteIcon } from "react-icons/go";
import { BsShieldShaded as ShelterIcon } from "react-icons/bs";
import { IoWarningOutline as WarningIcon } from "react-icons/io5";
import { FaRegMap as MapIcon, FaPhone, FaUser } from "react-icons/fa";
import { TiWeatherPartlySunny as WeatherIcon } from "react-icons/ti";
import { FiHelpCircle as HelpIcon, FiBell } from "react-icons/fi";
import { GridIcon } from "../icons";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
};

const safetyTools: NavItem[] = [
  { name: "Safe Route Planner", icon: <RouteIcon size={22} />, path: "/residents/planner" },
  { name: "Find Nearby Shelters", icon: <ShelterIcon size={22} />, path: "/residents/shelters" },
  { name: "Report an Incident", icon: <WarningIcon size={22} />, path: "/residents/report" },
];

const information: NavItem[] = [
  { name: "Weather", icon: <WeatherIcon size={22} />, path: "/residents/weather" },
];

const others: NavItem[] = [
    { name: "Emergency Contacts", icon: <FaPhone size={22} />, path: "/residents/emergency-contacts" },
    { name: "Barangay Coordinators", icon: <FaUser size={22} />, path: "/residents/coordinators" },
    { name: "About & Help", icon: <HelpIcon size={22} />, path: "/residents/help" },
    { name: "Announcements", icon: <FiBell size={22} />, path: "/announcements" },
];

const homeNav: NavItem = { name: "Home", icon: <GridIcon />, path: "/residents" };

const ResidentSidebar: React.FC = () => {
  const { isMobileOpen, toggleMobileSidebar, isExpanded, setIsHovered } = useSidebar();
  const location = useLocation();

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  const renderLinkList = (items: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav) => (
        <li key={nav.name}>
          <Link
            to={nav.path}
            className={`menu-item group ${
              isActive(nav.path)
                ? "menu-item-active"
                : "menu-item-inactive"
            }`}
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
            <span className="menu-item-text">{nav.name}</span>
          </Link>
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
        className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-transform duration-300 ease-in-out z-[1200] border-r border-gray-200 w-[290px] ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="py-8 flex justify-start">
          <Link to="/residents">
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
          </Link>
        </div>
        <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
          <nav className="mb-6">
            <div className="flex flex-col gap-4">
              <ul className="flex flex-col gap-4 mb-2">
                <li>
                  <Link
                    to={homeNav.path}
                    className={`menu-item group ${
                      isActive(homeNav.path)
                        ? "menu-item-active"
                        : "menu-item-inactive"
                    }`}
                  >
                    <span
                      className={`menu-item-icon-size ${
                        isActive(homeNav.path)
                          ? "menu-item-icon-active"
                          : "menu-item-icon-inactive"
                      }`}
                    >
                      {homeNav.icon}
                    </span>
                    <span className="menu-item-text">{homeNav.name}</span>
                  </Link>
                </li>
              </ul>
              <div>
                <h2 className="mb-4 text-xs uppercase flex leading-[20px] text-gray-400 justify-start">
                  Safety Tools
                </h2>
                {renderLinkList(safetyTools)}
              </div>
              <div>
                <h2 className="mb-4 text-xs uppercase flex leading-[20px] text-gray-400 justify-start">
                  Information
                </h2>
                {renderLinkList(information)}
              </div>
              <div className="">
                {renderLinkList(others)}
              </div>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
};

export default ResidentSidebar;