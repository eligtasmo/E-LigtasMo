import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import AppHeader from "./AppHeader";
import ResidentSidebar from "./ResidentSidebar";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const location = useLocation();
  
  const isPlannerRoute = [
    "/safe-routes", 
    "/route-planner", 
    "/shelters", 
    "/hazard-map", 
    "/report-incident",
    "/reports",
    "/weather"
  ].some((p) => location.pathname === p || location.pathname.startsWith(p));

  const sidebarMargin = isExpanded || isHovered ? "lg:ml-64" : "lg:ml-20";

  return (
    <div className="flex min-h-screen bg-brand-25 font-sans">
      <ResidentSidebar />
      
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

const ResidentLayout: React.FC = () => {
  const auth = useContext(AuthContext);
  const role = auth?.user?.role;
  
  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "brgy") return <Navigate to="/brgy" replace />;

  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default ResidentLayout;
