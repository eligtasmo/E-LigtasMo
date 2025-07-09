// App.tsx
// Triggering a re-check of imports
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import ManageSheltersView from "./components/saferoutes/ManageSheltersView";
import RoutesView from './components/saferoutes/RoutesView';
import ShelterMapView from './components/saferoutes/ShelterMapView';
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import ResidentLayout from "./layout/ResidentLayout";
import ResidentHome from "./pages/Dashboard/ResidentHome";
import BrgyHome from "./pages/Dashboard/BrgyHome";
import BrgyLayout from "./layout/BrgyLayout";
import WeatherFloodTrackingView from './components/saferoutes/WeatherFloodTrackingView';
import ResidentSafeRoutePlanner from './pages/Resident/ResidentSafeRoutePlanner';
import ResidentReportIncident from './pages/Resident/ResidentReportIncident';
import ResidentHazardMap from './pages/Resident/ResidentHazardMap';
import ResidentWeather from './pages/Resident/ResidentWeather';
import ResidentHelp from './pages/Resident/ResidentHelp';
import ResidentShelterView from "./pages/Resident/ResidentShelterView";
import IncidentDashboardView from "./components/saferoutes/IncidentDashboardView";
import { MapContainer, TileLayer } from "react-leaflet";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import useSessionGuard from "./hooks/useSessionGuard";
import UserManagement from "./pages/UserManagement";
import BrgySignUp from "./pages/AuthPages/BrgySignIn";
import ForgotPassword from "./pages/AuthPages/ForgotPassword";
import BrgyProfile from "./pages/BrgyProfile";
import EmergencyContacts from "./pages/EmergencyContacts";
import BarangayCoordinators from "./pages/BarangayCoordinators";
import IncidentModerationView from "./components/saferoutes/IncidentModerationView";
import BarangayMapView from "./components/saferoutes/BarangayMapView";
import Announcements from "./pages/Dashboard/Announcements";
import SystemLogs from "./pages/SystemLogs";
import IncidentReportingWrapper from './pages/IncidentReportingWrapper';

const PUBLIC_ROUTES = ["/signin", "/brgy-signup", "/forgot-password"];

function AuthGuard() {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    console.log("AuthGuard", location.pathname);
    // Only run for protected routes (admin and brgy)
    if (
      !user &&
      !PUBLIC_ROUTES.includes(location.pathname) &&
      (
        location.pathname === "/" ||
        location.pathname.startsWith("/admin") ||
        location.pathname.startsWith("/manage") ||
        location.pathname.startsWith("/incident") ||
        location.pathname.startsWith("/weather") ||
        location.pathname.startsWith("/profile") ||
        location.pathname.startsWith("/user") ||
        location.pathname.startsWith("/system") ||
        location.pathname.startsWith("/barangay")
      )
    ) {
      window.location.href = "/signin";
    }
  }, [user, location]);

  return null;
}

function BfcacheGuard() {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    console.log("BfcacheGuard", location.pathname);
    function handlePageShow(event: PageTransitionEvent) {
      if (
        event.persisted &&
        !user &&
        !PUBLIC_ROUTES.includes(location.pathname)
      ) {
        window.location.href = "/signin";
      }
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [user, location]);

  return null;
}

function SessionGuardWrapper({ children }: { children: React.ReactNode }) {
  useSessionGuard();
  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        {/* <BfcacheGuard /> */}
        <ScrollToTop />
        <Routes>
          <Route
            element={
              <ProtectedRoute requiredRole="admin">
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index path="/" element={<Home />} />
            <Route path="/admin-routes" element={<RoutesView />} />
            <Route path="/shelters" element={<ManageSheltersView />} />
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/blank" element={<Blank />} />
            <Route path="/incident-report" element={<IncidentReportingWrapper />} />
            <Route path="/incident-dashboard" element={<IncidentDashboardView />} />
            <Route path="/incidents" element={<IncidentDashboardView />} />
            <Route path="/admin/incidents" element={<IncidentDashboardView />} />
            <Route path="/weather-flood-tracking" element={<WeatherFloodTrackingView />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/emergency-contacts" element={<EmergencyContacts />} />
            <Route path="/barangay-coordinators" element={<BarangayCoordinators />} />
            <Route path="/incident-moderation" element={<IncidentModerationView />} />
            <Route path="/system-logs" element={<SystemLogs />} />
            <Route path="/announcements" element={<Announcements />} />
          </Route>
          <Route
            element={
              <ProtectedRoute requiredRole="brgy">
                <BrgyLayout />
              </ProtectedRoute>
            }
          >
            <Route index path="/barangay" element={<BrgyHome />} />
            <Route path="/barangay/report-incident" element={<IncidentReportingWrapper />} />
            <Route path="/barangay/profile" element={<BrgyProfile />} />
            <Route path="/barangay/shelters" element={<ManageSheltersView />} />
            <Route path="/barangay/emergency-contacts" element={<EmergencyContacts />} />
            <Route path="/barangay/coordinators" element={<BarangayCoordinators />} />
            <Route path="/barangay-map" element={<BarangayMapView />} />
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/announcements" element={<Announcements />} />
          </Route>

          <Route path="/residents" element={<ResidentLayout />}>
            <Route index element={<ResidentHome />} />
            <Route path="planner" element={<ResidentSafeRoutePlanner />} />
            <Route path="shelters" element={<ResidentShelterView />} />
            <Route path="report" element={<IncidentReportingWrapper />} />
            <Route path="hazards" element={<ResidentHazardMap />} />
            <Route path="weather" element={<ResidentWeather />} />
            <Route path="help" element={<ResidentHelp />} />
            <Route path="emergency-contacts" element={<EmergencyContacts />} />
            <Route path="coordinators" element={<BarangayCoordinators />} />
            <Route path="announcements" element={<Announcements />} />
          </Route>
          <Route path="/brgy-signup" element={<BrgySignUp />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
