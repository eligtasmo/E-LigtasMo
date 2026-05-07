import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "./AppHeader";
import MobileNavigation from "../components/MobileOptimized/MobileNavigation";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
// duplicate import removed
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const location = useLocation();
  const isPlannerRoute = [
    "/safe-routes", 
    "/route-planner", 
    "/brgy/safe-routes", 
    "/shelters", 
    "/hazard-map", 
    "/report-incident",
    "/reports",
    "/weather"
  ].some((p) => location.pathname === p || location.pathname.startsWith(p));

  // Width strategy for residents: default full-width; center selected content pages
  const fullWidthRoutes = [
    "/",
    "/safe-routes",
    "/route-planner",
    "/shelters",
    "/weather",
    "/report-incident",
    "/announcements",
  ];
  const centeredRoutes = [
    "/settings",
    "/help",
    "/resources",
    "/coordinators",
  ];
  const isFullWidth = fullWidthRoutes.some((p) => location.pathname.startsWith(p));
  const isCentered = centeredRoutes.some((p) => location.pathname.startsWith(p));

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden relative pt-[64px]">
        <div>
          <AppSidebar />
          <Backdrop />
        </div>
        <div
          className={`flex-1 overflow-y-auto transition-all duration-300 ease-in-out ${
            isExpanded || isHovered ? "lg:ml-[278px]" : "lg:ml-[80px]"
          } ${isMobileOpen ? "ml-0" : ""}`}
        >
          {/* Mobile bottom navigation for residents */}
          <MobileNavigation userRole={"resident"} showBottomBar={true} showTopMobileBar={false} showDesktopBar={false} />
          
          <div className="h-full p-0 bg-transparent overflow-hidden">
            <div className={`mx-auto h-full ${isFullWidth ? "max-w-none" : isCentered ? "max-w-7xl" : "max-w-none"}`}>
              <Outlet />
            </div>
          </div>
          {/* Removed duplicate MobileNavigation instance to avoid extra renders */}
        </div>
      </div>
    </div>
  );
};

const ResidentLayout: React.FC = () => {
  const auth = useContext(AuthContext);
  const role = auth?.user?.role;
  // If logged in as admin or brgy, redirect to their role dashboard and do not render resident layout/sidebar
  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "brgy") return <Navigate to="/brgy" replace />;

  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default ResidentLayout;
