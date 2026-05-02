import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import BrgySidebar from "./BrgySidebar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const location = useLocation();
  const isPlannerRoute = [
    "/safe-routes", 
    "/route-planner", 
    "/barangay/safe-routes",
    "/barangay/barangay-map",
    "/barangay/shelters",
    "/barangay/report-incident",
    "/barangay/flood-reports"
  ].some((p) => location.pathname.startsWith(p));

  // Width strategy for barangay: default full-width; center selected content pages
  const fullWidthRoutes = [
    "/barangay",
    "/barangay/safe-routes",
    "/barangay/barangay-map",
    "/barangay/analytics",
    "/barangay/dispatch-board",
    "/barangay/report-incident",
    "/barangay/flood-reports",
  ];
  const centeredRoutes = [
    "/barangay/profile",
    "/barangay/resources",
    "/barangay/coordinators",
    "/barangay/residents",
  ];
  const isFullWidth = fullWidthRoutes.some((p) => location.pathname.startsWith(p));
  const isCentered = centeredRoutes.some((p) => location.pathname.startsWith(p));

  return (
    <div className={`${isPlannerRoute ? 'h-screen' : 'min-h-screen'} bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden`}>
      <AppHeader />
      <div className="flex flex-1 overflow-hidden relative">
        <div className={isPlannerRoute ? "" : "pt-[72px]"}>
          <BrgySidebar />
          <Backdrop />
        </div>
        <div
          className={`flex-1 transition-all duration-300 ease-in-out pt-[72px] ${
            isPlannerRoute ? "overflow-hidden" : "overflow-y-auto"
          } ${
            isExpanded || isHovered ? "lg:ml-[278px]" : "lg:ml-[80px]"
          } ${isMobileOpen ? "ml-0" : ""}`}
        >
          <div className={`${isPlannerRoute ? "p-0 h-full w-full bg-transparent overflow-hidden" : "px-4 py-6 lg:px-8 lg:py-8 bg-gray-50 dark:bg-gray-900"}`}>
            <div className={`mx-auto h-full ${isFullWidth ? "max-w-none" : isCentered ? "max-w-7xl" : "max-w-none"} ${isPlannerRoute ? "" : "space-y-6"}`}>
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BrgyLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default BrgyLayout;
