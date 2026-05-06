import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import BrgySidebar from "./BrgySidebar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const location = useLocation();
  const isPlannerRoute = [
    "/brgy",
    "/brgy/safe-routes", 
    "/brgy/barangay-map",
    "/brgy/shelters",
    "/brgy/report-incident",
    "/brgy/flood-reports",
    "/brgy/dispatch-board",
    "/brgy/analytics",
    "/brgy/flood-tracking"
  ].some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));

  // Width strategy for barangay: default full-width; center selected content pages
  const fullWidthRoutes = [
    "/brgy",
    "/brgy/safe-routes",
    "/brgy/barangay-map",
    "/brgy/analytics",
    "/brgy/dispatch-board",
    "/brgy/report-incident",
    "/brgy/flood-reports",
    "/brgy/flood-tracking"
  ];
  const centeredRoutes = [
    "/brgy/profile",
    "/brgy/resources",
    "/brgy/coordinators",
    "/brgy/residents",
  ];
  const isFullWidth = fullWidthRoutes.some((p) => location.pathname === p || location.pathname.startsWith(p));
  const isCentered = centeredRoutes.some((p) => location.pathname === p || location.pathname.startsWith(p));

  return (
    <div className={`${isPlannerRoute ? 'h-screen' : 'min-h-screen'} bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden`}>
      <AppHeader />
      <div className="flex flex-1 overflow-hidden relative">
        <div className={isPlannerRoute ? "" : "pt-[64px]"}>
          <BrgySidebar />
          <Backdrop />
        </div>
        <div
          className={`flex-1 transition-all duration-300 ease-in-out pt-[64px] ${
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
