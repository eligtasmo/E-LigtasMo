import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const location = useLocation();
  
  // Routes that need full-bleed map handling (no padding, no scroll)
  const isPlannerRoute = [
    "/safe-routes",
    "/route-planner",
    "/barangay/safe-routes",
    "/barangay/barangay-map",
    "/brgy/barangay-map",
    "/brgy/safe-routes",
    "/admin/barangay-map",
    "/admin/admin-routes",
    "/admin/shelters",
    "/admin/flood-reports",
    "/brgy/flood-reports"
  ].some((p) => location.pathname.startsWith(p));

  // Dynamic margin based on sidebar state
  const sidebarWidth = isExpanded || isHovered ? "lg:ml-[260px]" : "lg:ml-[80px]";
  const isNoSidebarRoute = location.pathname.startsWith('/admin/emergency-analytics');

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden relative pt-[64px]">
        {!isNoSidebarRoute && <AppSidebar />}
        
        {/* Mobile Backdrop */}
        <div
          className={`absolute inset-0 z-30 bg-black/20 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
            isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />

        <main
          className={`flex-1 transition-all duration-300 ease-in-out ${
            isPlannerRoute ? 'overflow-hidden' : 'overflow-y-auto'
          } ${
            isNoSidebarRoute ? 'lg:ml-0' : sidebarWidth
          } ${isMobileOpen ? "ml-0" : ""}`}
        >
          <div className={`h-full w-full ${isPlannerRoute ? "p-0 bg-transparent" : "px-4 py-6 lg:px-8 lg:py-8"}`}>
            <div className={`h-full ${isPlannerRoute ? "w-full" : "max-w-[1600px] mx-auto space-y-6"}`}>
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
