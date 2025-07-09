// context/AuthContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";  // Import useNavigate and useLocation
import { logActivity, LogActions, ResourceTypes } from "../utils/logger";

interface User {
  username: string;
  role: string;  // Add role to distinguish between admin and brgy
  email: string;
  full_name: string;
  brgy_name: string;
  city: string;
  province: string;
  contact_number: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, role: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = `${window.location.protocol}//${window.location.hostname}/eligtasmo/api`;
const PUBLIC_ROUTES = ["/signin", "/brgy-signup", "/forgot-password", "/residents"];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Initialize user state from localStorage if available
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
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
          username: data.username,
          role: data.role,
          email: data.email,
          full_name: data.full_name,
          brgy_name: data.brgy_name,
          city: data.city,
          province: data.province,
          contact_number: data.contact_number
        });
      } else {
        setUser(null);
        if (!PUBLIC_ROUTES.some(route => location.pathname === route || location.pathname.startsWith(route + "/"))) {
          navigate("/signin");
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

  const login = async (username: string, password: string, role: string) => {
    try {
      const response = await fetch(`${API_BASE}/login.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        setUser({
          username,
          role,
          email: data.email,
          full_name: data.full_name,
          brgy_name: data.brgy_name,
          city: data.city,
          province: data.province,
          contact_number: data.contact_number
        });
        
        // Log successful login
        logActivity(
          LogActions.LOGIN,
          `User ${username} logged in successfully`,
          ResourceTypes.USER,
          data.user_id?.toString()
        );
        
        if (role === "admin") {
          navigate("/");
        } else if (role === "brgy") {
          navigate("/barangay");
        }
      } else {
        // Log failed login attempt
        logActivity(
          LogActions.LOGIN,
          `Failed login attempt for username: ${username}`,
          ResourceTypes.USER,
          undefined,
          'error',
          data.message || "Login failed"
        );
        alert(data.message || "Login failed");
      }
    } catch (error) {
      alert("Error logging in. Please try again.");
    }
  };

  const logout = async () => {
    // Log logout before clearing user data
    if (user) {
      logActivity(
        LogActions.LOGOUT,
        `User ${user.username} logged out`,
        ResourceTypes.USER
      );
    }
    
    await fetch(`${API_BASE}/logout.php`, { credentials: "include" });
    setUser(null);
    localStorage.removeItem('user');
    window.location.href = "/signin"; // Force a full reload to bust bfcache
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
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
