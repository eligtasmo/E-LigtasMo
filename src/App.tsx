import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { MapProvider } from "./context/MapContext";
import ErrorBoundary from "./components/common/ErrorBoundary";

// Layouts
import RootLayout from "./layout/RootLayout";
import AppLayout from "./layout/AppLayout";
import BrgyLayout from "./layout/BrgyLayout";
import ResidentLayout from "./layout/ResidentLayout";
import AuthPageLayout from "./pages/AuthPages/AuthPageLayout";

// Pages
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

// Resident Pages
import React, { Suspense } from "react";
import ResidentSafeRoutes from "@/pages/Resident/ResidentSafeRoutes";
const ResidentSafeRoutePlanner = React.lazy(() => import("./pages/Resident/ResidentSafeRoutePlanner"));
const ResidentShelterView = React.lazy(() => import("./pages/Resident/ResidentShelterView"));
const ResidentWeather = React.lazy(() => import("./pages/Resident/ResidentWeather"));
const ResidentHazardMap = React.lazy(() => import("./pages/Resident/ResidentHazardMap"));
const ResidentReportIncident = React.lazy(() => import("./pages/Resident/ResidentReportIncident"));
const ResidentHelp = React.lazy(() => import("./pages/Resident/ResidentHelp"));
const ResidentSettings = React.lazy(() => import("./pages/Resident/ResidentSettings"));
const ResidentReports = React.lazy(() => import("./pages/Resident/ResidentReports"));

// Auth Pages
import SignIn from "./pages/AuthPages/SignIn";
import Register from "./pages/AuthPages/Register";
import ForgotPassword from "./pages/AuthPages/ForgotPassword";

// Analytics Dashboard (keeping the new analytics)
import AnalyticsDashboard from "./components/dashboard/AnalyticsDashboard";

// MMDRMO Emergency Operations Center
import MMDRMODashboard from "./components/dashboard/MMDRMODashboard";

// Unified Emergency Dashboard
import UnifiedEmergencyDashboard from "./components/dashboard/UnifiedEmergencyDashboard";
import EmergencyRequestManagement from "./pages/Admin/EmergencyRequestManagement";
import AdminDispatchResponse from "./pages/Admin/DispatchResponse";
import BrgyDispatchBoard from "./pages/Brgy/DispatchBoard";
import IncidentReport from "./pages/Admin/IncidentReport";
import FloodReport from "./pages/Admin/FloodReport";
import HotlineManagement from "./pages/Admin/HotlineManagement";
import PublicRouteShare from "./pages/PublicRouteShare";

// Protected Routes
import ProtectedRoute from "./components/common/ProtectedRoute";
import ResidentProtectedRoute from "./components/common/ResidentProtectedRoute";

// Other
import NotFound from "./pages/OtherPage/NotFound";
import Blank from "./pages/Blank";
import BrgyProfile from "./pages/BrgyProfile";
import NavigationDemo from "./pages/NavigationDemo";
const TacticalContactManager = React.lazy(() => import("./pages/TacticalContactManager"));
const WebAccessRestricted = React.lazy(() => import("./pages/WebAccessRestricted"));

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        path: "access-restricted",
        element: <WebAccessRestricted />,
      },
      {
        path: "share-route",
        element: <PublicRouteShare />,
      },
      {
        path: "/",
        element: <ResidentLayout />,
        children: [
          {
            index: true,
            element: (
              <ResidentProtectedRoute>
                <ResidentHome />
              </ResidentProtectedRoute>
            ),
          },
          {
            path: "safe-routes",
            element: (
              <ResidentProtectedRoute>
                <ResidentSafeRoutes />
              </ResidentProtectedRoute>
            ),
          },
          {
            path: "route-planner",
            element: (
              <ResidentProtectedRoute>
                <Suspense fallback={<div className="p-6">Loading planner…</div>}>
                  <ResidentSafeRoutePlanner />
                </Suspense>
              </ResidentProtectedRoute>
            ),
          },
          {
            path: "shelters",
            element: (
              <ResidentProtectedRoute>
                <Suspense fallback={<div className="p-6">Loading shelters…</div>}>
                  <ResidentShelterView />
                </Suspense>
              </ResidentProtectedRoute>
            ),
          },
          {
            path: "weather",
            element: (
              <ResidentProtectedRoute>
                <Suspense fallback={<div className="p-6">Loading weather…</div>}>
                  <ResidentWeather />
                </Suspense>
              </ResidentProtectedRoute>
            ),
          },
          {
            path: "settings",
            element: (
              <ResidentProtectedRoute>
                <Suspense fallback={<div className="p-6">Loading settings…</div>}>
                  <ResidentSettings />
                </Suspense>
              </ResidentProtectedRoute>
            ),
          },
          {
            path: "hazard-map",
            element: (
              <ResidentProtectedRoute>
                <Suspense fallback={<div className="p-6">Loading hazard map…</div>}>
                  <ResidentHazardMap />
                </Suspense>
              </ResidentProtectedRoute>
            ),
          },
          {
            path: "report-incident",
            element: (
              <ResidentProtectedRoute>
                <Suspense fallback={<div className="p-6">Loading report form…</div>}>
                  <ResidentReportIncident />
                </Suspense>
              </ResidentProtectedRoute>
            ),
          },
          {
            path: "reports",
            element: (
              <ResidentProtectedRoute>
                <Suspense fallback={<div className="p-6">Loading reports…</div>}>
                  <ResidentReports />
                </Suspense>
              </ResidentProtectedRoute>
            ),
          },
          {
            path: "help",
            element: (
              <ResidentProtectedRoute>
                <Suspense fallback={<div className="p-6">Loading help…</div>}>
                  <ResidentHelp />
                </Suspense>
              </ResidentProtectedRoute>
            ),
          },
          {
            path: "announcements",
            element: (
              <ResidentProtectedRoute>
                <Announcements />
              </ResidentProtectedRoute>
            ),
          },
          {
            path: "resources",
            element: (
              <ResidentProtectedRoute>
                <Resources />
              </ResidentProtectedRoute>
            ),
          },
          {
            path: "coordinators",
            element: (
              <ResidentProtectedRoute>
                <BarangayCoordinators />
              </ResidentProtectedRoute>
            ),
          },
        ],
      },
      {
        path: "/admin",
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: (
              <ProtectedRoute requiredRole="admin">
                <MMDRMODashboard />
              </ProtectedRoute>
            ),
          },
          {
            path: "admin-routes",
            element: (
              <ProtectedRoute requiredRole="admin" requiredPermission="routes.suggest">
                <SafeRoutes />
              </ProtectedRoute>
            ),
          },
          {
            path: "shelters",
            element: (
              <ProtectedRoute requiredRole="admin" requiredPermission="shelter.manage">
                <ManageShelters />
              </ProtectedRoute>
            ),
          },
          {
            path: "contacts",
            element: (
              <ProtectedRoute requiredRole="admin">
                <Suspense fallback={<div className="p-6">Loading contacts…</div>}>
                  <TacticalContactManager />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: "incident-reports",
            element: (
              <ProtectedRoute requiredRole="admin">
                <TacticalApprovalDashboard />
              </ProtectedRoute>
            ),
          },
          {
            path: "barangay-map",
            element: (
              <ProtectedRoute requiredRole="admin">
                <BarangayMapView />
              </ProtectedRoute>
            ),
          },
          {
            path: "flood-reports",
            element: (
              <ProtectedRoute requiredRole="admin">
                <FloodReport />
              </ProtectedRoute>
            ),
          },
          {
            path: "flood-report",
            element: (
              <ProtectedRoute requiredRole="admin">
                <TacticalApprovalDashboard />
              </ProtectedRoute>
            ),
          },
          {
            path: "weather",
            element: (
              <ProtectedRoute requiredRole="admin">
                <Weather />
              </ProtectedRoute>
            ),
          },
          {
            path: "announcements",
            element: (
              <ProtectedRoute requiredRole="admin">
                <Announcements />
              </ProtectedRoute>
            ),
          },
          {
            path: "user-management",
            element: (
              <ProtectedRoute requiredRole="admin" requiredPermission="users.manage">
                <UserManagement />
              </ProtectedRoute>
            ),
          },
          {
            path: "resources",
            element: (
              <ProtectedRoute requiredRole="admin">
                <Resources />
              </ProtectedRoute>
            ),
          },
          {
            path: "barangay-coordinators",
            element: (
              <ProtectedRoute requiredRole="admin">
                <BarangayCoordinators />
              </ProtectedRoute>
            ),
          },
          {
            path: "profile",
            element: (
              <ProtectedRoute requiredRole="admin">
                <UserProfiles />
              </ProtectedRoute>
            ),
          },
          {
            path: "system-logs",
            element: (
              <ProtectedRoute requiredRole="admin" requiredPermission="logs.export">
                <SystemLogs />
              </ProtectedRoute>
            ),
          },
          {
            path: "help-support-on-progress",
            element: (
              <ProtectedRoute requiredRole="admin">
                <HelpSupport />
              </ProtectedRoute>
            ),
          },
          {
            path: "analytics",
            element: (
              <ProtectedRoute requiredRole="admin">
                <AnalyticsDashboard />
              </ProtectedRoute>
            ),
          },
          {
            path: "emergency-operations",
            element: (
              <ProtectedRoute requiredRole="admin">
                <MMDRMODashboard />
              </ProtectedRoute>
            ),
          },
          {
            path: "unified-command",
            element: (
              <ProtectedRoute requiredRole="admin">
                <UnifiedEmergencyDashboard />
              </ProtectedRoute>
            ),
          },
          {
            path: "emergency-requests",
            element: (
              <ProtectedRoute requiredRole="admin">
                <EmergencyRequestManagement />
              </ProtectedRoute>
            ),
          },
          {
            path: "dispatch-response",
            element: (
              <ProtectedRoute requiredRole="admin">
                <AdminDispatchResponse />
              </ProtectedRoute>
            ),
          },
          {
            path: "incident-report/:runId",
            element: (
              <ProtectedRoute requiredRole="admin">
                <IncidentReport />
              </ProtectedRoute>
            ),
          },
          {
            path: "hotlines",
            element: (
              <ProtectedRoute requiredRole="admin">
                <HotlineManagement />
              </ProtectedRoute>
            ),
          },
          {
            path: "settings",
            element: (
              <ProtectedRoute requiredRole="admin">
                <UserProfiles />
              </ProtectedRoute>
            ),
          },
        ],
      },
      {
        path: "/brgy",
        element: <BrgyLayout />,
        children: [
      {
        index: true,
        element: (
          <ProtectedRoute requiredRole="brgy">
            <BrgyHome />
          </ProtectedRoute>
        ),
      },
      {
        path: "safe-routes",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <SafeRoutes />
          </ProtectedRoute>
        ),
      },
      {
        path: "report-incident",
        element: (
          <ProtectedRoute requiredRole="brgy" requiredPermission="incident.create">
            <IncidentReportingWrapper />
          </ProtectedRoute>
        ),
      },
      {
        path: "shelters",
        element: (
          <ProtectedRoute requiredRole="brgy" requiredPermission="shelter.manage">
            <ManageShelters />
          </ProtectedRoute>
        ),
      },
      {
        path: "flood-reports",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <FloodReport />
          </ProtectedRoute>
        ),
      },
      {
        path: "residents",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <UserManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: "coordinators",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <BarangayCoordinators />
          </ProtectedRoute>
        ),
      },
      {
        path: "resources",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <Resources />
          </ProtectedRoute>
        ),
      },
      {
        path: "barangay-map",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <BarangayMapView />
          </ProtectedRoute>
        ),
      },
      {
        path: "weather",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <Weather />
          </ProtectedRoute>
        ),
      },
      {
        path: "flood-tracking",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <WeatherFloods />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <BrgyProfile />
          </ProtectedRoute>
        ),
      },
      {
        path: "analytics",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <AnalyticsDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "dispatch-board",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <BrgyDispatchBoard />
          </ProtectedRoute>
        ),
      },
    ],
  },
      {
        path: "/barangay",
        element: <BrgyLayout />,
        children: [
      {
        index: true,
        element: (
          <ProtectedRoute requiredRole="brgy">
            <BrgyHome />
          </ProtectedRoute>
        ),
      },
      {
        path: "safe-routes",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <SafeRoutes />
          </ProtectedRoute>
        ),
      },
      {
        path: "report-incident",
        element: (
          <ProtectedRoute requiredRole="brgy" requiredPermission="incident.create">
            <IncidentReportingWrapper />
          </ProtectedRoute>
        ),
      },
      {
        path: "shelters",
        element: (
          <ProtectedRoute requiredRole="brgy" requiredPermission="shelter.manage">
            <ManageShelters />
          </ProtectedRoute>
        ),
      },
      {
        path: "flood-reports",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <TacticalApprovalDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "residents",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <UserManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: "coordinators",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <BarangayCoordinators />
          </ProtectedRoute>
        ),
      },
      {
        path: "resources",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <Resources />
          </ProtectedRoute>
        ),
      },
      {
        path: "barangay-map",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <BarangayMapView />
          </ProtectedRoute>
        ),
      },
      {
        path: "weather",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <Weather />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <BrgyProfile />
          </ProtectedRoute>
        ),
      },
      {
        path: "analytics",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <AnalyticsDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "dispatch-board",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <BrgyDispatchBoard />
          </ProtectedRoute>
        ),
      },
      {
        path: "contacts",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <Suspense fallback={<div className="p-6">Loading directory…</div>}>
              <TacticalContactManager />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "announcements",
        element: (
          <ProtectedRoute requiredRole="brgy">
            <Announcements />
          </ProtectedRoute>
        ),
      },
    ],
  },

      {
        path: "/auth",
        element: <AuthPageLayout />,
        children: [
          {
            path: "signin",
            element: <SignIn />,
          },
          {
            path: "register",
            element: <Register />,
          },
          {
            path: "forgot-password",
            element: <ForgotPassword />,
          },
        ],
      },
      {
        path: "/residents",
        element: <ResidentLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/residents/app" replace />,
          },
          {
            path: "app",
            element: (
              <ResidentProtectedRoute>
                <Suspense fallback={<div className="p-6">Loading residents app…</div>}>
                  <ResidentHome />
                </Suspense>
              </ResidentProtectedRoute>
            ),
          },
          {
            path: "report-incident",
            element: (
              <ResidentProtectedRoute>
                <Suspense fallback={<div className="p-6">Loading report form…</div>}>
                  <ResidentReportIncident />
                </Suspense>
              </ResidentProtectedRoute>
            ),
          },
        ],
      },
      {
        path: "/resident",
        element: <ResidentLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/resident/home" replace />,
          },
          {
            path: "home",
            element: (
              <ResidentProtectedRoute>
                <Suspense fallback={<div className="p-6">Loading residents home…</div>}>
                  <ResidentHome />
                </Suspense>
              </ResidentProtectedRoute>
            ),
          },
          {
            path: "report-incident",
            element: (
              <ResidentProtectedRoute>
                <Suspense fallback={<div className="p-6">Loading report form…</div>}>
                  <ResidentReportIncident />
                </Suspense>
              </ResidentProtectedRoute>
            ),
          },
        ],
      },
      {
        path: "/auth/signin",
        element: <SignIn />,
      },
      {
        path: "/signin",
        element: <SignIn />,
      },
      {
        path: "/register",
        element: <Register />,
      },
      {
        path: "/navigation-demo",
        element: <NavigationDemo />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <MapProvider>
          <RouterProvider router={router} />
        </MapProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
