import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const location = useLocation();
  // Include admin planner path so the map gets full-height and overflow handling
  const isPlannerRoute = [
    "/safe-routes",
    "/route-planner",
    "/barangay/safe-routes",
    "/barangay/flood-reports",
    "/admin/admin-routes",
    "/admin/shelters",
    "/admin/emergency-operations",
    "/admin/unified-command",
    "/admin/incident-reports",
    "/admin/flood-reports"
  ].some((p) => location.pathname.startsWith(p));

  // Width strategy: default full-width; center selected content pages
  const fullWidthRoutes = [
    "/admin",
    "/admin/admin-routes",
    "/admin/emergency-operations",
    "/admin/unified-command",
    "/admin/analytics",
    "/admin/incident-reports",
    "/admin/weather",
    "/admin/weather-floods",
    "/admin/flood-report",
    "/admin/announcements",
    "/route-planner",
    "/safe-routes"
  ];
  const centeredRoutes = [
    "/admin/emergency-requests",
    "/admin/dispatch-response",
    "/admin/profile",
    "/admin/user-management",
    "/admin/resources",
    "/admin/barangay-coordinators",
    "/admin/system-logs",
    "/admin/help-support-on-progress"
  ];
  const isFullWidth = fullWidthRoutes.some((p) => location.pathname.startsWith(p));
  const isCentered = centeredRoutes.some((p) => location.pathname.startsWith(p));

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden relative pt-[72px]">
        {location.pathname.startsWith('/admin/emergency-analytics') ? null : <AppSidebar />}
        <div
          className={`absolute inset-0 z-30 bg-black/50 transition-opacity duration-300 lg:hidden ${
            isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />
        <main
          className={`flex-1 transition-all duration-300 ease-in-out ${
            isPlannerRoute ? 'overflow-hidden' : 'overflow-y-auto'
          } ${
            (location.pathname.startsWith('/admin/emergency-analytics') ? 'lg:ml-0' : (isExpanded || isHovered ? "lg:ml-[278px]" : "lg:ml-[80px]"))
          } ${isMobileOpen ? "ml-0" : ""}`}
        >
          <div className={`${isPlannerRoute ? "p-0 h-full w-full bg-transparent overflow-hidden" : "px-4 py-6 lg:px-8 lg:py-8 bg-gray-50 dark:bg-gray-900"}`}>
            <div className={`mx-auto h-full ${isFullWidth ? "max-w-none" : isCentered ? "max-w-7xl" : "max-w-none"} ${isPlannerRoute ? "" : "space-y-6"}`}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
