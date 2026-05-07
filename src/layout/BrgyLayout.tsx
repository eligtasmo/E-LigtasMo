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
    "/brgy/brgy-map",
    "/brgy/shelters",
    "/brgy/report-incident",
    "/brgy/flood-reports",
    "/brgy/dispatch-board",
    "/brgy/analytics",
    "/brgy/flood-tracking"
  ].some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));

  // Width strategy for brgy: default full-width; center selected content pages
  const fullWidthRoutes = [
    "/brgy",
    "/brgy/safe-routes",
    "/brgy/brgy-map",
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
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-500 font-jetbrains">
      {/* Fixed Full Height Sidebar */}
      <BrgySidebar />
      
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

          <div className="p-0 h-full w-full bg-transparent overflow-hidden">
            <div className={`mx-auto h-full ${isFullWidth ? "max-w-none" : isCentered ? "max-w-7xl" : "max-w-none"}`}>
              <Outlet />
            </div>
          </div>
        </main>
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
