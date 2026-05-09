// context/AuthContext.tsx
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";  // Import useNavigate and useLocation
import { logActivity, LogActions, ResourceTypes } from "../utils/logger";

interface User {
  id?: number;
  username: string;
  role: string;  // Add role to distinguish between admin and brgy
  email: string;
  full_name: string;
  brgy_name: string;
  brgy?: string;
  city: string;
  province: string;
  contact_number: string;
  gender?: string;
  preferred_vehicle?: string | null;
  access_token?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  updatePreferredVehicle: (mode: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const API_BASE = import.meta.env.VITE_API_URL || "/api";
const PUBLIC_ROUTES = ["/signin", "/register", "/forgot-password", "/residents"];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) return JSON.parse(savedUser);
    return null;
  });
  const navigate = useNavigate();
  const [role, setRole] = useState("admin");
  const location = useLocation();

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // Check session on mount and on navigation
  useEffect(() => {
    const checkSession = async () => {
      const res = await fetch(`${API_BASE}/session.php`, { credentials: "include" });
      const data = await res.json();
      if (data.authenticated) {
        setUser({
          id: data.user_id,
          username: data.username,
          role: data.role,
          email: data.email,
          full_name: data.full_name,
          brgy_name: data.brgy_name,
          brgy: data.brgy ?? data.brgy_name,
          city: data.city,
          province: data.province,
          contact_number: data.contact_number,
          gender: data.gender,
          preferred_vehicle: data.preferred_vehicle ?? null,
          access_token: localStorage.getItem('access_token') || undefined
        });
      } else {
        const path = location.pathname;
        
        // If we have a user in localStorage, don't redirect even if session check fails 
        // (Helps with cross-domain testing locally)
        if (localStorage.getItem('user')) return;

        // Skip redirect logic for public routes
        if (PUBLIC_ROUTES.includes(path)) {
          setUser(null);
          return;
        }

        const adminRestricted =
          path.startsWith("/admin") ||
          path.startsWith("/brgy") ||
          path.startsWith("/brgy");
        setUser(null);
        if (adminRestricted) {
          navigate('/signin');
        }
      }
    };
    checkSession();
    // Listen for bfcache restores
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) checkSession();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [navigate, location]);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/login.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      // Read as text first to guard against non-JSON responses (e.g., PHP warnings)
      const raw = await response.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        // Not JSON; surface server response to help diagnose
        throw new Error(`Login failed: ${response.status} ${response.statusText}. Server said: ${raw.slice(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(data?.message || `Login failed with status ${response.status}`);
      }

      if (data.success) {
        if (data.access_token) {
          localStorage.setItem('access_token', data.access_token);
        }
        setUser({
          id: data.user_id,
          username,
          role: data.role,
          email: data.email,
          full_name: data.full_name,
          brgy_name: data.brgy_name,
          brgy: data.brgy ?? data.brgy_name,
          city: data.city,
          province: data.province,
          contact_number: data.contact_number,
          gender: data.gender,
          preferred_vehicle: data.preferred_vehicle ?? null,
          access_token: data.access_token
        });
        
        // Log successful login
        logActivity(
          LogActions.LOGIN,
          `User ${username} logged in successfully`,
          ResourceTypes.USER,
          data.user_id?.toString()
        );
        
        if (data.role === "admin") {
          navigate("/admin");
        } else if (data.role === "brgy") {
          navigate("/brgy");
        } else if (String(data.role || '').toLowerCase() === 'resident') {
          // Residents are restricted from the web portal entirely
          alert("Access Denied: Residents must use the mobile application.");
          setUser(null);
          await fetch(`${API_BASE}/logout.php`, { credentials: "include" });
          navigate("/access-restricted");
          return;
        }
      } else {
        // Log failed login attempt
        logActivity(
          LogActions.LOGIN,
          `Failed login attempt for username: ${username}`,
          ResourceTypes.USER,
          undefined,
          'error',
          data.message || "Wrong username or password"
        );
        alert("Wrong username or password");
      }
    } catch (error: any) {
      alert(error?.message || "Error logging in. Please try again.");
    }
  };

  const logout = async () => {
    // Log logout before clearing user data
    const prevRole = user?.role?.toLowerCase();
    if (user) {
      logActivity(
        LogActions.LOGOUT,
        `User ${user.username} logged out`,
        ResourceTypes.USER
      );
    }

    try {
      await fetch(`${API_BASE}/logout.php`, { credentials: "include" });
    } catch {}

    // Clear local auth and redirect based on previous role
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');

    if (prevRole === 'admin') {
      window.location.assign('/signin');
      return;
    }
    if (prevRole === 'brgy') {
      window.location.assign('/signin');
      return;
    }
    window.location.assign('/');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
    }
  };

  const updatePreferredVehicle = async (mode: string) => {
    try {
      await fetch(`${API_BASE}/update-preferred-vehicle.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ preferred_vehicle: mode })
      });
      if (user) {
        const updatedUser = { ...user, preferred_vehicle: mode };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        if (updatedUser.access_token) {
           localStorage.setItem('access_token', updatedUser.access_token);
        }
      }
    } catch (e) {
      // Non-blocking: keep UI responsive even if persistence fails
      console.warn('Failed to update preferred vehicle', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, updatePreferredVehicle }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
