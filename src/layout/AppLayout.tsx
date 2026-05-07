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
    "/brgy/safe-routes",
    "/brgy/brgy-map",
    "/brgy/brgy-map",
    "/brgy/safe-routes",
    "/admin/brgy-map",
    "/admin/admin-routes",
    "/admin/shelters",
    "/admin/flood-reports",
    "/brgy/flood-reports",
    "/admin/incident-reports",
    "/admin/unified-command",
    "/admin/emergency-requests",
    "/admin/dispatch-response",
    "/admin/emergency-operations",
    "/admin/analytics",
    "/admin/emergency-analytics"
  ].some((p) => location.pathname === p || location.pathname === "/admin/");

  // Dynamic margin based on sidebar state
  const sidebarWidth = isExpanded || isHovered ? "lg:ml-[278px]" : "lg:ml-[80px]";
  const isNoSidebarRoute = location.pathname.startsWith('/admin/emergency-analytics');

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-500 font-jetbrains">
      {/* Fixed Full Height Sidebar */}
      {!isNoSidebarRoute && <AppSidebar />}
      
      {/* Right side content area */}
      <div className="flex flex-col flex-1 min-w-0 relative">
        <AppHeader />
        
        {/* Main Content Area */}
        <main
          className={`flex-1 overflow-hidden relative ${
            isPlannerRoute ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          {/* Mobile Backdrop */}
          <div
            className={`absolute inset-0 z-30 bg-black/20 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
              isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />

          <div className="h-full w-full p-0 bg-transparent">
            <div className={`h-full ${isPlannerRoute ? "w-full" : "max-w-[1600px] mx-auto"}`}>
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
