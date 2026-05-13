import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const location = useLocation();
  
  const isPlannerRoute = [
    "/safe-routes",
    "/route-planner",
    "/brgy/safe-routes",
    "/brgy/brgy-map",
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
    "/admin/analytics"
  ].some((p) => location.pathname === p || location.pathname === "/admin/");

  const sidebarMargin = isExpanded || isHovered ? "lg:ml-64" : "lg:ml-20";

  return (
    <div className="flex min-h-screen bg-brand-25 font-sans">
      <AppSidebar />
      
      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${sidebarMargin}`}>
        <AppHeader />
        
        <main
          className={`flex-1 relative ${
            isPlannerRoute ? 'h-[calc(100vh-64px)] overflow-hidden' : 'min-h-[calc(100vh-64px)]'
          }`}
        >
          <div
            className={`absolute inset-0 z-30 bg-gray-900/10 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
              isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />

          <div className="h-full w-full">
            <Outlet />
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
