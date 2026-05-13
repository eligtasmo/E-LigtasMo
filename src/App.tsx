import React, { Suspense } from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { MapProvider } from "./context/MapContext";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { Toaster } from 'react-hot-toast';

// Layouts
import RootLayout from "./layout/RootLayout";
import AppLayout from "./layout/AppLayout";
import BrgyLayout from "./layout/BrgyLayout";
import ResidentLayout from "./layout/ResidentLayout";
import AuthPageLayout from "./pages/AuthPages/AuthPageLayout";
import PublicLayout from "./components/common/PublicLayout";

// Pages
import LandingPage from "./pages/LandingPage";
import SignIn from "./pages/AuthPages/SignIn";
import Register from "./pages/AuthPages/Register";
import RegisterOfficial from "./pages/AuthPages/RegisterOfficial";
import ForgotPassword from "./pages/AuthPages/ForgotPassword";

// Pages - Dashboard & General
import Home from "./pages/Dashboard/Home";
import BrgyHome from "./pages/Dashboard/BrgyHome";
import ResidentHome from "./pages/Dashboard/ResidentHome";
import SafeRoutes from "./pages/SafeRoutes";
import ManageShelters from "./pages/ManageShelters";
import IncidentReports from "./pages/IncidentReports";
import WeatherFloods from "./pages/WeatherFloods";
import Weather from "./pages/Weather";
import UserManagement from "./pages/UserManagement";
import Resources from "./pages/Resources";
import BarangayCoordinators from "./pages/BarangayCoordinators";
import UserProfiles from "./pages/UserProfiles";
import SystemLogs from "./pages/SystemLogs";
import HelpSupport from "./pages/HelpSupport";
import IncidentReportingWrapper from "./pages/IncidentReportingWrapper";
import BarangayMapView from "./components/saferoutes/BarangayMapView";
import Announcements from "./pages/Dashboard/Announcements";
import TacticalApprovalDashboard from "./pages/TacticalApprovalDashboard";
import BrgyAccountManagement from "./pages/BrgyAccountManagement";
import PublicRouteShare from "./pages/PublicRouteShare";
import NotFound from "./pages/OtherPage/NotFound";
import BrgyProfile from "./pages/BrgyProfile";

// Pages - Admin Specific
import AnalyticsDashboard from "./components/dashboard/AnalyticsDashboard";
import MMDRMODashboard from "./components/dashboard/MMDRMODashboard";
import UnifiedEmergencyDashboard from "./components/dashboard/UnifiedEmergencyDashboard";
import EmergencyRequestManagement from "./pages/Admin/EmergencyRequestManagement";
import AdminDispatchResponse from "./pages/Admin/DispatchResponse";
import BrgyDispatchBoard from "./pages/Brgy/DispatchBoard";
import IncidentReport from "./pages/Admin/IncidentReport";
import FloodReport from "./pages/Admin/FloodReport";

// Lazy Loaded Components (Optimized)
const ResidentSafeRoutePlanner = React.lazy(() => import("./pages/Resident/ResidentSafeRoutePlanner"));
const ResidentShelterView = React.lazy(() => import("./pages/Resident/ResidentShelterView"));
const ResidentWeather = React.lazy(() => import("./pages/Resident/ResidentWeather"));
const ResidentHazardMap = React.lazy(() => import("./pages/Resident/ResidentHazardMap"));
const ResidentReportIncident = React.lazy(() => import("./pages/Resident/ResidentReportIncident"));
const ResidentHelp = React.lazy(() => import("./pages/Resident/ResidentHelp"));
const ResidentSettings = React.lazy(() => import("./pages/Resident/ResidentSettings"));
const ResidentReports = React.lazy(() => import("./pages/Resident/ResidentReports"));
const StrategicDirectory = React.lazy(() => import("./pages/StrategicDirectory"));
const WebAccessRestricted = React.lazy(() => import("./pages/WebAccessRestricted"));

// Route Guards
import ProtectedRoute from "./components/common/ProtectedRoute";
import ResidentProtectedRoute from "./components/common/ResidentProtectedRoute";
import ResidentSafeRoutes from "@/pages/Resident/ResidentSafeRoutes";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      // Public Routes (Shared Layout)
      {
        element: <PublicLayout />,
        children: [
          { index: true, element: <LandingPage /> },
          {
            path: "/auth",
            element: <AuthPageLayout />,
            children: [
              { path: "signin", element: <SignIn /> },
              { path: "register", element: <Register /> },
              { path: "register-official", element: <RegisterOfficial /> },
              { path: "forgot-password", element: <ForgotPassword /> },
            ],
          },
        ]
      },
      
      { path: "access-restricted", element: <Suspense fallback={<div className="p-6">Loading...</div>}><WebAccessRestricted /></Suspense> },
      { path: "share-route", element: <PublicRouteShare /> },
      
      // Resident App (Moved to /resident)
      {
        path: "/resident",
        element: <ResidentLayout />,
        children: [
          { path: "home", element: <ResidentProtectedRoute><ResidentHome /></ResidentProtectedRoute> },
          { path: "safe-routes", element: <ResidentProtectedRoute><ResidentSafeRoutes /></ResidentProtectedRoute> },
          { path: "route-planner", element: <ResidentProtectedRoute><Suspense fallback={null}><ResidentSafeRoutePlanner /></Suspense></ResidentProtectedRoute> },
          { path: "shelters", element: <ResidentProtectedRoute><Suspense fallback={null}><ResidentShelterView /></Suspense></ResidentProtectedRoute> },
          { path: "weather", element: <ResidentProtectedRoute><Suspense fallback={null}><ResidentWeather /></Suspense></ResidentProtectedRoute> },
          { path: "settings", element: <ResidentProtectedRoute><Suspense fallback={null}><ResidentSettings /></Suspense></ResidentProtectedRoute> },
          { path: "hazard-map", element: <ResidentProtectedRoute><Suspense fallback={null}><ResidentHazardMap /></Suspense></ResidentProtectedRoute> },
          { path: "report-incident", element: <ResidentProtectedRoute><Suspense fallback={null}><ResidentReportIncident /></Suspense></ResidentProtectedRoute> },
          { path: "reports", element: <ResidentProtectedRoute><Suspense fallback={null}><ResidentReports /></Suspense></ResidentProtectedRoute> },
          { path: "help", element: <ResidentProtectedRoute><Suspense fallback={null}><ResidentHelp /></Suspense></ResidentProtectedRoute> },
          { path: "announcements", element: <ResidentProtectedRoute><Announcements /></ResidentProtectedRoute> },
          { path: "resources", element: <ResidentProtectedRoute><Resources /></ResidentProtectedRoute> },
          { path: "coordinators", element: <ResidentProtectedRoute><BarangayCoordinators /></ResidentProtectedRoute> },
        ],
      },

      // Admin Dashboard
      {
        path: "/admin",
        element: <AppLayout />,
        children: [
          { index: true, element: <ProtectedRoute requiredRole="admin"><MMDRMODashboard /></ProtectedRoute> },
          { path: "analytics", element: <ProtectedRoute requiredRole="admin"><AnalyticsDashboard /></ProtectedRoute> },
          { path: "incident-reports", element: <ProtectedRoute requiredRole="admin"><TacticalApprovalDashboard /></ProtectedRoute> },
          { path: "emergency-requests", element: <ProtectedRoute requiredRole="admin"><EmergencyRequestManagement /></ProtectedRoute> },
          { path: "dispatch-response", element: <ProtectedRoute requiredRole="admin"><AdminDispatchResponse /></ProtectedRoute> },
          { path: "user-management", element: <ProtectedRoute requiredRole="admin" requiredPermission="users.manage"><UserManagement /></ProtectedRoute> },
          { path: "brgy-accounts", element: <ProtectedRoute requiredRole="admin"><BrgyAccountManagement /></ProtectedRoute> },
          { path: "system-logs", element: <ProtectedRoute requiredRole="admin" requiredPermission="logs.export"><SystemLogs /></ProtectedRoute> },
          { path: "profile", element: <ProtectedRoute requiredRole="admin"><UserProfiles /></ProtectedRoute> },
          { path: "settings", element: <ProtectedRoute requiredRole="admin"><UserProfiles /></ProtectedRoute> },
          { path: "directory", element: <ProtectedRoute requiredRole="admin"><Suspense fallback={null}><StrategicDirectory /></Suspense></ProtectedRoute> },
        ],
      },

      // Barangay Panel
      {
        path: "/brgy",
        element: <BrgyLayout />,
        children: [
          { index: true, element: <ProtectedRoute requiredRole="brgy"><BrgyHome /></ProtectedRoute> },
          { path: "dispatch-board", element: <ProtectedRoute requiredRole="brgy"><BrgyDispatchBoard /></ProtectedRoute> },
          { path: "residents", element: <ProtectedRoute requiredRole="brgy"><UserManagement /></ProtectedRoute> },
          { path: "flood-reports", element: <ProtectedRoute requiredRole="brgy"><TacticalApprovalDashboard /></ProtectedRoute> },
          { path: "analytics", element: <ProtectedRoute requiredRole="brgy"><AnalyticsDashboard /></ProtectedRoute> },
          { path: "directory", element: <ProtectedRoute requiredRole="brgy"><Suspense fallback={null}><StrategicDirectory /></Suspense></ProtectedRoute> },
          { path: "settings", element: <ProtectedRoute requiredRole="brgy"><BrgyProfile /></ProtectedRoute> },
        ],
      },
      
      // Compatibility Redirects
      { path: "signin", element: <Navigate to="/auth/signin" replace /> },
      { path: "login", element: <Navigate to="/auth/signin" replace /> },
      { path: "register", element: <Navigate to="/auth/register" replace /> },
      { path: "forgot-password", element: <Navigate to="/auth/forgot-password" replace /> },
      { path: "residents", element: <Navigate to="/access-restricted" replace /> },
      { path: "resident", element: <Navigate to="/access-restricted" replace /> },
      { path: "barangay", element: <Navigate to="/brgy" replace /> },

      { path: "*", element: <NotFound /> },
    ],
  },
]);

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <MapProvider>
          <Toaster 
            position="top-right" 
            toastOptions={{
              className: 'tactical-toast',
              style: {
                background: 'var(--color-gray-900)',
                color: '#fff',
                borderRadius: '16px',
                border: '1px solid var(--color-brand-100)',
                fontSize: '12px',
                fontWeight: 'bold',
                padding: '16px',
              },
            }}
          />
          <RouterProvider router={router} />
        </MapProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
